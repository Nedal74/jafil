import { NextResponse } from "next/server";

import { financingSchema } from "@/lib/financing/schema";
import { createFinancingApplication } from "@/lib/financing/service";
import { fieldErrors, isSameOrigin, jsonError, readJson } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getSetting } from "@/lib/settings";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError(403, "forbidden");
  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return jsonError(400, "error");
  }
  const parsed = financingSchema.safeParse(body);
  if (!parsed.success) return jsonError(422, "validation", { fields: fieldErrors(parsed.error.issues) });
  if (parsed.data.website) return NextResponse.json({ ok: true, reference: "—" });

  const { banks } = await getSetting("financing");
  if (banks.length && !banks.some((b) => b.ar === parsed.data.bank || b.en === parsed.data.bank)) {
    return jsonError(422, "validation", { fields: { bank: "bank" } });
  }

  const limit = await rateLimit("financing", clientIp(req.headers), 3, 60 * 30);
  if (!limit.ok) return jsonError(429, "rateLimited");

  try {
    const app = await createFinancingApplication(parsed.data);
    // Only the reference is returned; nothing financial is echoed back.
    return NextResponse.json({ ok: true, reference: app.reference });
  } catch (err) {
    console.error("[api/financing] failed", (err as Error).message);
    return jsonError(500, "error");
  }
}
