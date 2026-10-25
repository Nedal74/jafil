import { NextResponse } from "next/server";

import { fieldErrors, isSameOrigin, jsonError, readJson } from "@/lib/http";
import { publicLeadSchema } from "@/lib/leads/schema";
import { createLead } from "@/lib/leads/service";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError(403, "forbidden");
  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return jsonError(400, "error");
  }
  const parsed = publicLeadSchema.safeParse(body);
  if (!parsed.success) return jsonError(422, "validation", { fields: fieldErrors(parsed.error.issues) });

  // Honeypot filled → pretend success, store nothing.
  if (parsed.data.website) return NextResponse.json({ ok: true, id: "ok" });

  const ip = clientIp(req.headers);
  const limit = await rateLimit("lead", ip, 5, 60 * 10);
  if (!limit.ok) return jsonError(429, "rateLimited");

  try {
    const lead = await createLead({ ...parsed.data, consent: true });
    return NextResponse.json({ ok: true, id: lead.id });
  } catch (err) {
    console.error("[api/leads] failed", (err as Error).message);
    return jsonError(500, "error");
  }
}
