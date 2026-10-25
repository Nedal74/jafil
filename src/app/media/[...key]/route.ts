import { isSafeKey, MIME_BY_EXT, storage } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (!isSafeKey(key)) return new Response("Not found", { status: 404 });
  const data = await storage().get(key);
  if (!data) return new Response("Not found", { status: 404 });
  const ext = key.split(".").pop()!;
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": MIME_BY_EXT[ext] ?? "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      ...(ext === "pdf" ? { "content-disposition": "inline" } : {}),
    },
  });
}
