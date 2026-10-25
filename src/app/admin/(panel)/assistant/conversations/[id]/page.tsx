import { notFound } from "next/navigation";

import { PageHeader, Panel } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "محادثة" };

export default async function Conversation({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("assistant.conversations.view");
  const { id } = await params;
  const c = await prisma.chatConversation.findUnique({ where: { id }, include: { messages: { orderBy: { createdAt: "asc" } } } });
  if (!c) notFound();
  return (
    <>
      <PageHeader title={`محادثة ${c.id.slice(-8)}`} description={`بدأت ${formatDateTime(c.createdAt)} — اللغة ${c.locale}`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Panel>
          <ol className="space-y-3">
            {c.messages.map((m) => (
              <li key={m.id} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.role === "user" ? "ms-auto bg-navy text-white" : "bg-beige-50"}`}>
                <p className="whitespace-pre-line">{m.content}</p>
                <p className="mt-1 text-[10px] opacity-60">{formatDateTime(m.createdAt)}{m.usedModel ? " · نموذج لغوي" : ""}</p>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel title="المعايير المستخلصة">
          <pre className="whitespace-pre-wrap text-xs" dir="ltr">{JSON.stringify(c.criteria ?? {}, null, 2)}</pre>
        </Panel>
      </div>
    </>
  );
}
