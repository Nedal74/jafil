import { audit } from "@/lib/audit";
import { AuthError, assertPermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS } from "@/lib/admin/labels";
import { leadWhere, toCsv } from "@/lib/leads/scope";
import { displaySaudiMobile } from "@/lib/phone";

export async function GET(req: Request) {
  let user;
  try {
    user = await assertPermission("leads.export");
  } catch (e) {
    return new Response("Forbidden", { status: e instanceof AuthError ? e.status : 403 });
  }
  const sp = new URL(req.url).searchParams;
  const get = (k: string) => sp.get(k) ?? undefined;
  const where = leadWhere(user, { q: get("q"), status: get("status"), source: get("source"), project: get("project"), assignee: get("assignee"), from: get("from"), to: get("to") });
  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10000,
    include: { project: { select: { nameAr: true } }, assignedTo: { select: { name: true } } },
  });
  const rows: unknown[][] = [
    ["المعرف", "الاسم", "الجوال", "البريد", "المصدر", "المشروع", "الحالة", "المسؤول", "الميزانية القصوى", "الموقع المفضل", "الغرف", "الموافقة", "تاريخ الإنشاء"],
    ...leads.map((l) => [
      l.id, l.name, displaySaudiMobile(l.phoneNormalized), l.email, LEAD_SOURCE_LABELS[l.source], l.project?.nameAr, LEAD_STATUS_LABELS[l.status],
      l.assignedTo?.name, l.budgetMax, l.preferredLocation, l.bedrooms, l.consent ? "نعم" : "لا", l.createdAt,
    ]),
  ];
  await audit({ userId: user.id, action: "export", entity: "lead", summary: `تصدير ${leads.length} عميل`, metadata: Object.fromEntries(sp) });
  return new Response(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
