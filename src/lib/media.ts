import "server-only";

import { prisma } from "./db";
import { imageSize, newStorageKey, storage, validateUpload } from "./storage";
import { audit } from "./audit";

export async function saveUpload(file: File, userId: string) {
  if (file.size === 0) throw new UploadError("الملف فارغ");
  if (file.size > 16 * 1024 * 1024) throw new UploadError("حجم الملف كبير جداً");
  const buf = Buffer.from(await file.arrayBuffer());
  const check = validateUpload(buf);
  if (!check.ok) throw new UploadError(check.error);
  const key = newStorageKey(check.ext);
  const { url } = await storage().put(key, buf, check.mime);
  const dims = check.mime.startsWith("image/") ? imageSize(buf) : null;
  const media = await prisma.media.create({
    data: {
      storageKey: key,
      url,
      mimeType: check.mime,
      size: buf.length,
      width: dims?.width ?? null,
      height: dims?.height ?? null,
      originalName: file.name.replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 150) || "upload",
      createdById: userId,
    },
  });
  await audit({ userId, action: "upload", entity: "media", entityId: media.id, summary: `رفع ملف ${media.originalName}` });
  return media;
}

export class UploadError extends Error {}
