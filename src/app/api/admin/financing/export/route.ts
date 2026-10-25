import { audit } from "@/lib/audit";
import { AuthError, assertPermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { EMPLOYER_LABELS, FIN_OP_LABELS, FIN_STATUS_LABELS } from "@/lib/admin/labels";
import { financingWhere } from "@/lib/financing/filters";
import { toCsv } from "@/lib/leads/scope";
import { displaySaudiMobile } from "@/lib/phone";

export async function GET(req: Request) {
  let user;
  try {
    user = await assertPermission("financing.export");
  } catch (e) {
    return new Response("Forbidden", { status: e instanceof AuthError ? e.status : 403 });
  }
  const sp = new URL(req.url).searchParams;
  const get = (k: string) => sp.get(k) ?? undefined;
  const apps = await prisma.financingApplication.findMany({
    where: financingWhere({ q: get("q"), status: get("status"), assignee: get("assignee"), from: get("from"), to: get("to") }),
    orderBy: { createdAt: "desc" },
    take: 10000,
    include: { assignedTo: { select: { name: true } } },
  });
  const rows: unknown[][] = [
    ["المرجع", "الاسم", "الجوال", "العملية", "جهة العمل", "الراتب", "الالتزامات", "البنك", "قرض قائم", "العمر", "الحالة", "المسؤول", "التاريخ"],
    ...apps.map((a) => [
      a.reference, a.fullName, displaySaudiMobile(a.phoneNormalized), FIN_OP_LABELS[a.operation], EMPLOYER_LABELS[a.employerSector], a.monthlySalary,
      a.monthlyObligations, a.bank, a.hasRealEstateLoan ? "نعم" : "لا", a.age, FIN_STATUS_LABELS[a.status], a.assignedTo?.name, a.createdAt,
    ]),
  ];
  await audit({ userId: user.id, action: "export", entity: "financing", summary: `تصدير ${apps.length} طلب تمويل`, metadata: Object.fromEntries(sp) });
  return new Response(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="financing-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
