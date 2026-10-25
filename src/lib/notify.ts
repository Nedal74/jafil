import "server-only";

/**
 * Team notification adapter. Configure NOTIFY_WEBHOOK_URL (e.g. a Slack/Teams/
 * Google Chat incoming webhook or an internal endpoint) to receive a short alert.
 * Alerts intentionally carry no customer phone/financial data — staff open the
 * record in the dashboard, which enforces permissions.
 */
export type TeamEvent =
  | { type: "lead.created"; id: string; source: string; projectName?: string | null; duplicate: boolean }
  | { type: "financing.created"; id: string; reference: string };

export async function notifyTeam(event: TeamEvent): Promise<void> {
  const webhook = process.env.NOTIFY_WEBHOOK_URL;
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
  const text =
    event.type === "lead.created"
      ? `عميل محتمل جديد (${event.source})${event.projectName ? ` — ${event.projectName}` : ""}${
          event.duplicate ? " — قد يكون مكرراً" : ""
        }: ${base}/admin/leads/${event.id}`
      : `طلب تمويل جديد ${event.reference}: ${base}/admin/financing/${event.id}`;

  if (!webhook) {
    if (process.env.NODE_ENV !== "test") console.info(`[notify] ${event.type} ${event.id} (NOTIFY_WEBHOOK_URL not set)`);
    return;
  }
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, event: { type: event.type, id: event.id } }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error(`[notify] webhook responded ${res.status}`);
  } catch (err) {
    console.error("[notify] webhook failed", (err as Error).message);
  }
}
