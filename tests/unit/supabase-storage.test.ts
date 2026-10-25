import { describe, expect, it } from "vitest";

import { SupabaseStorage } from "@/lib/storage";

type Call = { method: string; url: string; headers: Headers; body?: unknown };

function fakeFetch(bucketExists: boolean) {
  const calls: Call[] = [];
  const impl = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = (init?.method ?? "GET").toUpperCase();
    calls.push({ method, url, headers: new Headers(init?.headers), body: init?.body });
    const json = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    if (url.endsWith("/storage/v1/bucket/media") && method === "GET")
      return bucketExists ? json(200, { id: "media", name: "media", public: true }) : json(404, { statusCode: "404", error: "Bucket not found", message: "Bucket not found" });
    if (url.endsWith("/storage/v1/bucket") && method === "POST") return json(200, { name: "media" });
    if (url.includes("/storage/v1/object/media/") && method === "POST") return json(200, { Key: "media/x" });
    if (url.endsWith("/storage/v1/object/media") && method === "DELETE") return json(200, []);
    return json(500, { message: `unexpected ${method} ${url}` });
  };
  return { calls, impl: impl as typeof fetch };
}

const KEY = "2026/10/0123456789abcdef01234567.png";

describe("SupabaseStorage", () => {
  it("uploads to the bucket with the secret key and returns the public URL", async () => {
    const f = fakeFetch(true);
    const s = new SupabaseStorage("https://abc.supabase.co", "sb_secret_test", "media", f.impl);
    const { url } = await s.put(KEY, Buffer.from("png-bytes"), "image/png");
    expect(url).toBe(`https://abc.supabase.co/storage/v1/object/public/media/${KEY}`);
    const upload = f.calls.find((c) => c.method === "POST" && c.url.includes("/object/media/"))!;
    expect(upload.url).toBe(`https://abc.supabase.co/storage/v1/object/media/${KEY}`);
    expect(upload.headers.get("apikey")).toBe("sb_secret_test");
    expect(f.calls.some((c) => c.url.endsWith("/storage/v1/bucket") && c.method === "POST")).toBe(false);
  });

  it("creates a public bucket when it does not exist yet", async () => {
    const f = fakeFetch(false);
    const s = new SupabaseStorage("https://abc.supabase.co", "sb_secret_test", "media", f.impl);
    await s.put(KEY, Buffer.from("x"), "image/png");
    const create = f.calls.find((c) => c.url.endsWith("/storage/v1/bucket") && c.method === "POST")!;
    expect(JSON.parse(String(create.body))).toMatchObject({ name: "media", public: true });
  });

  it("refuses unsafe keys and deletes by key", async () => {
    const f = fakeFetch(true);
    const s = new SupabaseStorage("https://abc.supabase.co", "k", "media", f.impl);
    await expect(s.put("../../etc/passwd", Buffer.from("x"), "image/png")).rejects.toThrow("invalid storage key");
    await s.remove(KEY);
    const del = f.calls.find((c) => c.method === "DELETE")!;
    expect(JSON.parse(String(del.body))).toEqual({ prefixes: [KEY] });
  });
});
