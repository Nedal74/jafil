import "server-only";

import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Storage adapter. The local-disk adapter is used by default and suits a VPS or
 * container with a persistent volume. For serverless hosting implement the same
 * interface against S3-compatible object storage (see README "Media storage").
 */
export interface StorageAdapter {
  put(key: string, data: Buffer, mimeType: string): Promise<{ url: string }>;
  get(key: string): Promise<Buffer | null>;
  remove(key: string): Promise<void>;
}

const ALLOWED = {
  "image/jpeg": { ext: "jpg", max: 8 * 1024 * 1024 },
  "image/png": { ext: "png", max: 8 * 1024 * 1024 },
  "image/webp": { ext: "webp", max: 8 * 1024 * 1024 },
  "application/pdf": { ext: "pdf", max: 15 * 1024 * 1024 },
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

let adapter: StorageAdapter | null = null;
export function storage(): StorageAdapter {
  if (!adapter) adapter = new LocalDiskStorage(path.resolve(process.env.STORAGE_DIR || "./storage/uploads"));
  return adapter;
}

export const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};
