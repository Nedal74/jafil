import { NextResponse } from "next/server";
import { z } from "zod";

import { criteriaSchema } from "@/lib/assistant/criteria";
import { handleAssistantMessage, purgeOldConversations } from "@/lib/assistant/service";
import { prisma } from "@/lib/db";
import { isSameOrigin, jsonError, readJson, fieldErrors } from "@/lib/http";
import { createLead } from "@/lib/leads/service";
import { normalizeSaudiMobile } from "@/lib/phone";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getSetting } from "@/lib/settings";

const base = z.object({
  visitorKey: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
  conversationId: z.string().max(40).optional(),
  locale: z.enum(["ar", "en"]),
});

const messageSchema = base.extend({
  action: z.literal("message"),
  text: z.string().max(1000).optional(),
  criteria: criteriaSchema.optional(),
});

const leadSchema = base.extend({
  action: z.literal("lead"),
  name: z.string().trim().min(2, "invalidName").max(120, "invalidName"),
  phone: z.string().trim().max(30).refine((v) => normalizeSaudiMobile(v) !== null, "invalidPhone"),
  consent: z.literal(true, { error: "consentRequired" }),
});

const bodySchema = z.discriminatedUnion("action", [messageSchema, leadSchema]);

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError(403, "forbidden");
  const settings = await getSetting("assistant");
  if (!settings.enabled) return jsonError(404, "disabled");

  let raw: unknown;
  try {
    raw = await readJson(req, 8000);
  } catch {
    return jsonError(400, "error");
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return jsonError(422, "validation", { fields: fieldErrors(parsed.error.issues) });
  const body = parsed.data;

  const ip = clientIp(req.headers);
  const limit = await rateLimit(`assistant-${body.action}`, ip, body.action === "lead" ? 3 : 40, 600);
  if (!limit.ok) return jsonError(429, "rateLimited");

  if (Math.random() < 0.02) void purgeOldConversations().catch(() => {});

  try {
    if (body.action === "lead") {
      const convo = body.conversationId
        ? await prisma.chatConversation.findFirst({ where: { id: body.conversationId, visitorKey: body.visitorKey } })
        : null;
      const c = criteriaSchema.safeParse(convo?.criteria ?? {});
      const crit = c.success ? c.data : {};
      const lead = await createLead(
        {
          name: body.name,
          phone: body.phone,
          locale: body.locale,
          consent: true,
          source: "AI_ASSISTANT",
          propertyTypeKey: crit.propertyTypeKey ?? undefined,
          preferredLocation: crit.location ?? undefined,
          budgetMin: crit.budgetMin ?? undefined,
          budgetMax: crit.budgetMax ?? undefined,
          bedrooms: crit.bedrooms ?? undefined,
          message: "طلب تواصل عبر المساعد العقاري",
          landingPage: req.headers.get("referer")?.slice(0, 300) ?? undefined,
        },
        { chatConversationId: convo?.id },
      );
      return NextResponse.json({ ok: true, leadId: lead.id });
    }

    const result = await handleAssistantMessage({
      conversationId: body.conversationId,
      visitorKey: body.visitorKey,
      locale: body.locale,
      criteria: body.criteria,
      text: body.text,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[api/assistant] failed", (err as Error).message);
    return jsonError(500, "error");
  }
}
