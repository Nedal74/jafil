import "server-only";

import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Storage adapter.
 *  - Supabase Storage when NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *    are set (required on serverless hosting such as Vercel, whose filesystem
 *    is not persistent).
 *  - Local disk otherwise (development, or a VPS with a persistent volume).
 */
export interface StorageAdapter {
  put(key: string, data: Buffer, mimeType: string): Promise<{ url: string }>;
  get(key: string): Promise<Buffer | null>;
  remove(key: string): Promise<void>;
}

// Vercel rejects request bodies above 4.5MB, so uploads are capped below that there.
const MB = 1024 * 1024;
const IMAGE_MAX = process.env.VERCEL ? 4 * MB : 8 * MB;
const PDF_MAX = process.env.VERCEL ? 4 * MB : 15 * MB;
const ALLOWED = {
  "image/jpeg": { ext: "jpg", max: IMAGE_MAX },
  "image/png": { ext: "png", max: IMAGE_MAX },
  "image/webp": { ext: "webp", max: IMAGE_MAX },
  "application/pdf": { ext: "pdf", max: PDF_MAX },
} as const;
export type AllowedMime = keyof typeof ALLOWED;

/** Detect type from magic bytes — the client-supplied MIME type is never trusted. */
export function sniffMime(buf: Buffer): AllowedMime | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  return null;
}

export function validateUpload(buf: Buffer): { ok: true; mime: AllowedMime; ext: string } | { ok: false; error: string } {
  const mime = sniffMime(buf);
  if (!mime) return { ok: false, error: "نوع الملف غير مسموح. المسموح: JPG, PNG, WEBP, PDF" };
  if (buf.length > ALLOWED[mime].max) {
    return { ok: false, error: `حجم الملف أكبر من الحد المسموح (${ALLOWED[mime].max / 1024 / 1024}MB)` };
  }
  return { ok: true, mime, ext: ALLOWED[mime].ext };
}

/** Width/height for PNG, JPEG and WebP (VP8/VP8L/VP8X) headers. */
export function imageSize(buf: Buffer): { width: number; height: number } | null {
  try {
    if (buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG") {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2;
      while (i < buf.length) {
        if (buf[i] !== 0xff) return null;
        const marker = buf[i + 1];
        const len = buf.readUInt16BE(i + 2);
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
        }
        i += 2 + len;
      }
      return null;
    }
    if (buf.toString("ascii", 0, 4) === "RIFF") {
      const chunk = buf.toString("ascii", 12, 16);
      if (chunk === "VP8X") return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
      if (chunk === "VP8 ") return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
      if (chunk === "VP8L") {
        const b = buf.readUInt32LE(21);
        return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function newStorageKey(ext: string): string {
  const d = new Date();
  return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${randomBytes(12).toString("hex")}.${ext}`;
}

const SAFE_KEY = /^\d{4}\/\d{2}\/[a-f0-9]{24}\.(jpg|png|webp|pdf)$/;
export function isSafeKey(key: string): boolean {
  return SAFE_KEY.test(key);
}

class LocalDiskStorage implements StorageAdapter {
  constructor(private readonly root: string) {}
  private resolve(key: string) {
    if (!isSafeKey(key)) throw new Error("invalid storage key");
    return path.join(this.root, key);
  }
  async put(key: string, data: Buffer) {
    const file = this.resolve(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data, { flag: "wx" });
    return { url: `/media/${key}` };
  }
  async get(key: string) {
    try {
      return await readFile(this.resolve(key));
    } catch {
      return null;
    }
  }
  async remove(key: string) {
    await unlink(this.resolve(key)).catch(() => {});
  }
}

/**
 * Supabase Storage (public bucket). Files are served straight from Supabase's
 * CDN; the bucket is created automatically on first upload if it is missing.
 * The secret key is used on the server only.
 */
export class SupabaseStorage implements StorageAdapter {
  private client: SupabaseClient;
  private bucketReady = false;
  constructor(
    private readonly url: string,
    key: string,
    private readonly bucket: string,
    fetchImpl?: typeof fetch,
  ) {
    this.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      ...(fetchImpl ? { global: { fetch: fetchImpl } } : {}),
    });
  }
  publicUrl(key: string) {
    return `${this.url.replace(/\/+$/, "")}/storage/v1/object/public/${this.bucket}/${key}`;
  }
  private async ensureBucket() {
    if (this.bucketReady) return;
    const { data } = await this.client.storage.getBucket(this.bucket);
    if (!data) {
      const { error } = await this.client.storage.createBucket(this.bucket, { public: true });
      if (error && !/already exists/i.test(error.message)) throw new Error(`Supabase bucket: ${error.message}`);
    }
    this.bucketReady = true;
  }
  async put(key: string, data: Buffer, mimeType: string) {
    if (!isSafeKey(key)) throw new Error("invalid storage key");
    await this.ensureBucket();
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(key, data, { contentType: mimeType, cacheControl: "31536000", upsert: false });
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);
    return { url: this.publicUrl(key) };
  }
  async get(key: string) {
    if (!isSafeKey(key)) return null;
    const { data, error } = await this.client.storage.from(this.bucket).download(key);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  }
  async remove(key: string) {
    if (!isSafeKey(key)) return;
    await this.client.storage.from(this.bucket).remove([key]);
  }
}

export function supabaseStorageConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let adapter: StorageAdapter | null = null;
export function storage(): StorageAdapter {
  if (!adapter) {
    adapter = supabaseStorageConfigured()
      ? new SupabaseStorage(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          process.env.SUPABASE_MEDIA_BUCKET || "media",
        )
      : new LocalDiskStorage(path.resolve(process.env.STORAGE_DIR || "./storage/uploads"));
  }
  return adapter;
}

export const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};
