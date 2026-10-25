import "server-only";

import { cache } from "react";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { prisma } from "./db";

const str = z.string().trim().max(5000).default("");
const shortStr = z.string().trim().max(300).default("");
const url = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\//.test(v) || v.startsWith("/"), "رابط غير صالح")
  .default("");

export const settingSchemas = {
  company: z.object({
    nameAr: shortStr,
    nameEn: shortStr,
    introAr: str,
    introEn: str,
    aboutAr: str,
    aboutEn: str,
    visionAr: str,
    visionEn: str,
    missionAr: str,
    missionEn: str,
    valuesAr: str,
    valuesEn: str,
  }),
  chairman: z.object({
    nameAr: shortStr,
    nameEn: shortStr,
    titleAr: shortStr,
    titleEn: shortStr,
    messageAr: str,
    messageEn: str,
    photoUrl: url,
    signatureUrl: url,
  }),
  contact: z.object({
    email: z.union([z.literal(""), z.email()]).default(""),
    phones: z.array(z.string().trim().max(30)).max(6).default([]),
    whatsapp: shortStr,
    addressAr: shortStr,
    addressEn: shortStr,
    mapUrl: url,
    workingHoursAr: shortStr,
    workingHoursEn: shortStr,
    socials: z
      .object({ x: url, instagram: url, snapchat: url, tiktok: url, linkedin: url, youtube: url })
      .default({ x: "", instagram: "", snapchat: "", tiktok: "", linkedin: "", youtube: "" }),
  }),
  seo: z.object({
    titleAr: shortStr,
    titleEn: shortStr,
    descriptionAr: shortStr,
    descriptionEn: shortStr,
    ogImageUrl: url,
    searchConsoleVerification: shortStr,
    indexingEnabled: z.boolean().default(true),
  }),
  google: z.object({
    ga4MeasurementId: z
      .string()
      .trim()
      .refine((v) => v === "" || /^G-[A-Z0-9]{4,}$/.test(v), "صيغة المعرف G-XXXXXXX")
      .default(""),
    gtmContainerId: z
      .string()
      .trim()
      .refine((v) => v === "" || /^GTM-[A-Z0-9]{4,}$/.test(v), "صيغة المعرف GTM-XXXXXXX")
      .default(""),
    searchConsoleSiteUrl: shortStr,
    ga4PropertyId: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\d+$/.test(v), "رقم الخاصية أرقام فقط")
      .default(""),
  }),
  assistant: z.object({
    enabled: z.boolean().default(true),
    useLanguageModel: z.boolean().default(true),
    welcomeAr: str,
    welcomeEn: str,
    retentionDays: z.coerce.number().int().min(1).max(730).default(90),
  }),
  financing: z.object({
    banks: z
      .array(z.object({ ar: z.string().trim().min(1).max(100), en: z.string().trim().min(1).max(100) }))
      .max(40)
      .default([]),
    retentionDays: z.coerce.number().int().min(30).max(3650).default(365),
  }),
  privacy: z.object({ contentAr: z.string().max(30000).default(""), contentEn: z.string().max(30000).default("") }),
  inventory: z.object({
    // Count RESERVED units as sold when computing the headline sales percentage.
    countReservedAsSold: z.boolean().default(false),
  }),
} as const;

export type SettingKey = keyof typeof settingSchemas;
export type SettingValue<K extends SettingKey> = z.infer<(typeof settingSchemas)[K]>;

export const SETTING_DEFAULTS: { [K in SettingKey]: z.input<(typeof settingSchemas)[K]> } = {
  company: { nameAr: "مساكن الجافل العقارية", nameEn: "Masaken Aljafil Real Estate" },
  chairman: {},
  contact: {
    email: "info@aljafil.com",
    phones: ["0570800002", "0570900002"],
    whatsapp: "0570800002",
    addressAr: "الرياض، ظهرة لبن، شارع الرمال",
    addressEn: "Al Rimal Street, Dhahrat Laban, Riyadh",
  },
  seo: {
    titleAr: "مساكن الجافل العقارية",
    titleEn: "Masaken Aljafil Real Estate",
    descriptionAr: "مشاريع سكنية في الرياض من مساكن الجافل العقارية — تصفح المشاريع والوحدات المتاحة وتواصل مع المبيعات.",
    descriptionEn:
      "Residential projects in Riyadh by Masaken Aljafil Real Estate — browse projects and available units and contact sales.",
  },
  google: {},
  assistant: {
    welcomeAr: "مرحباً بك في مساكن الجافل. سأساعدك في إيجاد وحدة مناسبة من مشاريعنا المتاحة.",
    welcomeEn: "Welcome to Masaken Aljafil. I'll help you find a suitable unit from our available projects.",
  },
  financing: {
    banks: [
      { ar: "مصرف الراجحي", en: "Al Rajhi Bank" },
      { ar: "البنك الأهلي السعودي", en: "Saudi National Bank" },
      { ar: "بنك الرياض", en: "Riyad Bank" },
      { ar: "البنك السعودي الأول", en: "Saudi Awwal Bank" },
      { ar: "مصرف الإنماء", en: "Alinma Bank" },
      { ar: "البنك السعودي الفرنسي", en: "Banque Saudi Fransi" },
      { ar: "البنك العربي الوطني", en: "Arab National Bank" },
      { ar: "بنك البلاد", en: "Bank Albilad" },
      { ar: "بنك الجزيرة", en: "Bank AlJazira" },
      { ar: "البنك السعودي للاستثمار", en: "Saudi Investment Bank" },
      { ar: "أخرى", en: "Other" },
    ],
  },
  privacy: {},
  inventory: {},
};

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  const row = await prisma.setting.findUnique({ where: { key } });
  const schema = settingSchemas[key];
  if (row) {
    const parsed = schema.safeParse({ ...(SETTING_DEFAULTS[key] as object), ...(row.value as object) });
    if (parsed.success) return parsed.data as SettingValue<K>;
    console.error(`[settings] stored value for "${key}" is invalid; using defaults`);
  }
  return schema.parse(SETTING_DEFAULTS[key]) as SettingValue<K>;
}

/** Request-scoped cached reader for pages. */
export const readSetting = cache(getSetting) as typeof getSetting;

export async function saveSetting<K extends SettingKey>(key: K, value: unknown): Promise<SettingValue<K>> {
  const parsed = settingSchemas[key].parse(value) as SettingValue<K>;
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: parsed as Prisma.InputJsonValue },
    update: { value: parsed as Prisma.InputJsonValue },
  });
  return parsed;
}
