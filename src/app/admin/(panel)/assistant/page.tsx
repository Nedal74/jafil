import Link from "next/link";

import { ActionForm, Checkbox, ConfirmAction, SubmitButton, TextArea, TextField } from "@/components/admin/forms";
import { AdminPagination, Badge, PageHeader, Panel, StatCard, Table, Td } from "@/components/admin/ui";
import { assistantModelStatus } from "@/lib/assistant/provider";
import { can } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { getSetting } from "@/lib/settings";
import { clampPage, PAGE_SIZE } from "@/lib/utils";
import { saveSettingAction } from "../content-actions";
import { purgeConversations } from "./actions";

export const metadata = { title: "المساعد العقاري" };

export default async function AssistantAdmin({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("assistant.conversations.view");
  const page = clampPage((await searchParams).page);
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [settings, total, convos, last30, handoffs, modelMsgs] = await Promise.all([
    getSetting("assistant"),
    prisma.chatConversation.count(),
    prisma.chatConversation.findMany({
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { messages: true } }, lead: { select: { id: true, name: true } } },
    }),
    prisma.chatConversation.count({ where: { createdAt: { gte: since } } }),
    prisma.chatConversation.count({ where: { createdAt: { gte: since }, handoffRequested: true } }),
    prisma.chatMessage.count({ where: { createdAt: { gte: since }, usedModel: true } }),
  ]);
  const model = assistantModelStatus();
  const manage = can(user.role, "assistant.manage");

  return (
    <>
      <PageHeader title="المساعد العقاري" description="يطابق المساعد الطلبات مع المشاريع والوحدات المنشورة فقط عبر استعلامات قاعدة بيانات محددة؛ لا يصل لبيانات العملاء أو التمويل." />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard label="محادثات آخر 30 يوماً" value={last30} />
        <StatCard label="طلبات تحويل للمبيعات" value={handoffs} />
        <StatCard label="ردود استخدمت النموذج اللغوي" value={modelMsgs} />
        <StatCard label="النموذج اللغوي" value={<Badge tone={model.configured ? "green" : "gray"}>{model.configured ? "مفعّل" : "غير مُعد"}</Badge>} hint={model.model ?? "يعمل بالأسئلة الموجهة والمطابقة الحتمية"} />
      </div>
      {manage && (
        <Panel title="الإعدادات" className="mb-6">
          <ActionForm action={saveSettingAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="__key" value="assistant" />
            <Checkbox name="enabled" label="إظهار المساعد في الموقع" defaultChecked={settings.enabled} />
            <Checkbox name="useLanguageModel" label="استخدام النموذج اللغوي عند توفر مفتاح API" defaultChecked={settings.useLanguageModel} hint="عند التعطيل أو غياب المفتاح يستمر المساعد بالأسئلة الموجهة والمطابقة الحتمية." />
            <TextArea name="welcomeAr" label="رسالة الترحيب (عربي)" defaultValue={settings.welcomeAr} rows={2} />
            <TextArea name="welcomeEn" label="رسالة الترحيب (إنجليزي)" defaultValue={settings.welcomeEn} rows={2} dir="ltr" />
            <TextField name="retentionDays" label="مدة الاحتفاظ بالمحادثات (يوم)" defaultValue={settings.retentionDays} inputMode="numeric" />
            <div className="md:col-span-2 flex flex-wrap items-center gap-3">
              <SubmitButton>حفظ</SubmitButton>
              <ConfirmAction action={purgeConversations} label="حذف المحادثات المنتهية الآن" variant="outline" confirm={`حذف المحادثات التي مر عليها أكثر من ${settings.retentionDays} يوماً؟`} />
            </div>
          </ActionForm>
        </Panel>
      )}
      <Table head={["المحادثة", "اللغة", "الرسائل", "عميل", "آخر نشاط"]} empty={convos.length ? false : "لا توجد محادثات"}>
        {convos.map((c) => (
          <tr key={c.id}>
            <Td><Link href={`/admin/assistant/conversations/${c.id}`} className="font-mono text-xs text-navy hover:underline">{c.id.slice(-8)}</Link>{c.handoffRequested && <Badge tone="amber">طلب تواصل</Badge>}</Td>
            <Td>{c.locale}</Td>
            <Td>{c._count.messages}</Td>
            <Td>{c.lead ? <Link href={`/admin/leads/${c.lead.id}`} className="text-navy underline">{c.lead.name}</Link> : "—"}</Td>
            <Td className="text-xs text-muted">{formatDateTime(c.updatedAt)}</Td>
          </tr>
        ))}
      </Table>
      <AdminPagination page={page} pages={Math.ceil(total / PAGE_SIZE)} total={total} hrefFor={(p) => `/admin/assistant?page=${p}`} />
    </>
  );
}
