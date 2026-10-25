"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, fdObject, guarded, ok, zf } from "@/lib/admin/action";
import { audit } from "@/lib/audit";
import type { Permission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { HOME_SECTION_KEYS } from "@/lib/home-sections";
import { saveSetting, type SettingKey } from "@/lib/settings";

// ----- Home sections ----------------------------------------------------------

export const saveHomeSection = guarded("content.manage", async (user, _prev: unknown, fd: FormData) => {
  const d = z
    .object({
      key: z.enum(HOME_SECTION_KEYS),
      enabled: zf.bool(),
      order: zf.int(0, 100),
      titleAr: zf.optText(150),
      titleEn: zf.optText(150),
      subtitleAr: zf.optText(400),
      subtitleEn: zf.optText(400),
    })
    .parse(fdObject(fd));
  await prisma.homeSection.upsert({ where: { key: d.key }, create: d, update: d });
  await audit({ userId: user.id, action: "update", entity: "home_section", entityId: d.key, summary: `تحديث قسم ${d.key}` });
  revalidatePath("/", "layout");
  return ok();
});

export const moveHomeSection = guarded("content.manage", async (_user, fd: FormData) => {
  const key = z.enum(HOME_SECTION_KEYS).parse(fd.get("key"));
  const dir = z.enum(["up", "down"]).parse(fd.get("dir"));
  const all = await prisma.homeSection.findMany({ orderBy: { order: "asc" } });
  const i = all.findIndex((s) => s.key === key);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= all.length) return ok();
  [all[i], all[j]] = [all[j]!, all[i]!];
  await prisma.$transaction(all.map((s, idx) => prisma.homeSection.update({ where: { id: s.id }, data: { order: idx } })));
  revalidatePath("/", "layout");
  return ok();
});

export const toggleHomeSection = guarded("content.manage", async (_user, fd: FormData) => {
  const key = z.enum(HOME_SECTION_KEYS).parse(fd.get("key"));
  const s = await prisma.homeSection.findUnique({ where: { key } });
  if (!s) return fail("القسم غير موجود");
  await prisma.homeSection.update({ where: { key }, data: { enabled: !s.enabled } });
  revalidatePath("/", "layout");
  return ok();
});

// ----- Stats & advantages -------------------------------------------------------

export const saveStat = guarded("content.manage", async (user, _prev: unknown, fd: FormData) => {
  const id = (fd.get("id") as string) || null;
  const d = z
    .object({
      labelAr: zf.required(80),
      labelEn: zf.required(80),
      value: z.preprocess((v) => Number(v), z.number({ error: "أدخل رقماً" }).int().min(0).max(1_000_000_000)),
      prefix: zf.optText(5),
      suffix: zf.optText(10),
      order: zf.int(0, 100),
      enabled: zf.bool(),
    })
    .parse(fdObject(fd));
  if (id) await prisma.companyStat.update({ where: { id }, data: d });
  else await prisma.companyStat.create({ data: d });
  await audit({ userId: user.id, action: id ? "update" : "create", entity: "stat", entityId: id, summary: d.labelAr });
  revalidatePath("/", "layout");
  return ok();
});

export const deleteStat = guarded("content.manage", async (_user, fd: FormData) => {
  await prisma.companyStat.delete({ where: { id: z.string().parse(fd.get("id")) } });
  revalidatePath("/", "layout");
  return ok();
});

export const saveAdvantage = guarded("content.manage", async (user, _prev: unknown, fd: FormData) => {
  const id = (fd.get("id") as string) || null;
  const d = z
    .object({
      titleAr: zf.required(100),
      titleEn: zf.required(100),
      descriptionAr: zf.optText(400),
      descriptionEn: zf.optText(400),
      icon: z.enum(["check", "shield", "award", "gem", "key", "home", "clock", "handshake", "sparkles", "building"]),
      order: zf.int(0, 100),
      enabled: zf.bool(),
    })
    .parse(fdObject(fd));
  if (id) await prisma.advantage.update({ where: { id }, data: d });
  else await prisma.advantage.create({ data: d });
  await audit({ userId: user.id, action: id ? "update" : "create", entity: "advantage", entityId: id, summary: d.titleAr });
  revalidatePath("/", "layout");
  return ok();
});

export const deleteAdvantage = guarded("content.manage", async (_user, fd: FormData) => {
  await prisma.advantage.delete({ where: { id: z.string().parse(fd.get("id")) } });
  revalidatePath("/", "layout");
  return ok();
});

// ----- Typed settings -----------------------------------------------------------

const SETTING_PERMISSION: Record<SettingKey, Permission> = {
  company: "content.manage",
  chairman: "content.manage",
  contact: "content.manage",
  privacy: "content.manage",
  seo: "seo.manage",
  google: "integrations.manage",
  assistant: "assistant.manage",
  financing: "settings.manage",
  inventory: "settings.manage",
};

const BOOL_FIELDS: Partial<Record<SettingKey, string[]>> = {
  seo: ["indexingEnabled"],
  assistant: ["enabled", "useLanguageModel"],
  inventory: ["countReservedAsSold"],
};

/** Converts flat form fields into the setting's shape (lists, nested socials, booleans). */
function formToSetting(key: SettingKey, fd: FormData): Record<string, unknown> {
  const raw = fdObject(fd);
  delete raw.__key;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith("socials.")) {
      out.socials = { ...(out.socials as object), [k.slice(8)]: v.trim() };
    } else out[k] = v;
  }
  for (const b of BOOL_FIELDS[key] ?? []) out[b] = raw[b] === "on";
  if (key === "contact") out.phones = String(raw.phones ?? "").split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
  if (key === "financing") {
    out.banks = String(raw.banks ?? "")
      .split("\n")
      .map((l) => l.split("|").map((s) => s.trim()))
      .filter(([ar]) => ar)
      .map(([ar, en]) => ({ ar, en: en || ar }));
  }
  return out;
}

export async function saveSettingAction(_prev: unknown, fd: FormData) {
  const key = z.enum(Object.keys(SETTING_PERMISSION) as [SettingKey, ...SettingKey[]]).parse(fd.get("__key"));
  return guarded(SETTING_PERMISSION[key], async (user) => {
    const value = formToSetting(key, fd);
    await saveSetting(key, value);
    await audit({ userId: user.id, action: "update", entity: "setting", entityId: key, summary: `تحديث إعدادات ${key}` });
    revalidatePath("/", "layout");
    return ok();
  })();
}
