import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { isSameOrigin } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  channel: z.enum(["whatsapp", "phone"]),
  projectId: z.string().max(40).optional(),
  page: z.string().max(300).optional(),
});

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return new NextResponse(null, { status: 204 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 204 });
  const limit = await rateLimit("cta", clientIp(req.headers), 30, 600);
  if (limit.ok) {
    const projectId = parsed.data.projectId
      ? (await prisma.project.findUnique({ where: { id: parsed.data.projectId }, select: { id: true } }))?.id
      : undefined;
    await prisma.ctaClick.create({ data: { channel: parsed.data.channel, projectId, page: parsed.data.page } });
  }
  return new NextResponse(null, { status: 204 });
}
