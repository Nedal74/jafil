"use server";

import { revalidatePath } from "next/cache";

import { guarded, ok } from "@/lib/admin/action";
import { purgeOldConversations } from "@/lib/assistant/service";
import { audit } from "@/lib/audit";

export const purgeConversations = guarded("assistant.manage", async (user) => {
  const n = await purgeOldConversations();
  await audit({ userId: user.id, action: "purge", entity: "chat", summary: `حذف ${n} محادثة منتهية المدة` });
  revalidatePath("/admin/assistant");
  return ok(`تم حذف ${n} محادثة`);
});
