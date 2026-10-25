import { z } from "zod";
import { toLatinDigits } from "../phone";

export const criteriaSchema = z.object({
  propertyTypeKey: z.string().max(60).nullish(),
  location: z.string().max(80).nullish(),
  budgetMin: z.number().int().min(0).max(1_000_000_000).nullish(),
  budgetMax: z.number().int().min(0).max(1_000_000_000).nullish(),
  bedrooms: z.number().int().min(0).max(20).nullish(),
  areaMin: z.number().min(0).max(100_000).nullish(),
  areaMax: z.number().min(0).max(100_000).nullish(),
});
export type Criteria = z.infer<typeof criteriaSchema>;

export function mergeCriteria(base: Criteria, patch: Criteria): Criteria {
  const out: Criteria = { ...base };
  for (const [k, v] of Object.entries(patch)) if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  return out;
}

/** Arabic-aware normalization for fuzzy location matching. */
export function normalizeText(s: string): string {
  return toLatinDigits(s)
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\bال/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type TypeHint = { key: string; nameAr: string; nameEn: string };

const TYPE_SYNONYMS: Record<string, string[]> = {
  apartment: ["شقة", "شقق", "شقه", "apartment", "apartments", "flat"],
  floor: ["دور", "ادوار", "أدوار", "floor", "floors"],
  villa: ["فيلا", "فلل", "فله", "villa", "villas"],
  townhouse: ["تاون هاوس", "تاونهاوس", "townhouse", "town house"],
};

function parseAmount(raw: string, unit?: string): number {
  const n = Number(raw.replace(/,/g, ""));
  if (!unit) return n;
  if (/مليون|million|m\b/i.test(unit)) return Math.round(n * 1_000_000);
  if (/الف|ألف|k\b|thousand/i.test(unit)) return Math.round(n * 1000);
  return n;
}

/**
 * Deterministic criteria extraction used when no language model is configured
 * (and as a safety net when it is). Conservative: only extracts what it is sure of.
 */
export function parseCriteriaFromText(text: string, types: TypeHint[]): Criteria {
  const t = toLatinDigits(text).toLowerCase();
  const out: Criteria = {};

  for (const type of types) {
    const words = [type.nameAr, type.nameEn, ...(TYPE_SYNONYMS[type.key] ?? [])].map((w) => w.toLowerCase());
    if (words.some((w) => w && t.includes(w))) {
      out.propertyTypeKey = type.key;
      break;
    }
  }

  const bed = t.match(/(\d{1,2})\s*(?:غرف|غرفة|غرفه|bed|bedroom|bedrooms|br)/);
  if (bed) out.bedrooms = Number(bed[1]);

  const area = t.match(/(\d{2,5})\s*(?:م2|م²|متر|m2|m²|sqm|square)/);
  if (area) out.areaMin = Number(area[1]);

  const money = [...t.matchAll(/(\d+(?:[.,]\d+)?)\s*(مليون|million|m\b|الف|ألف|k\b|thousand)?/g)]
    .map((m) => ({ value: parseAmount(m[1]!.replace(",", "."), m[2]), hasUnit: Boolean(m[2]) }))
    .filter((m) => m.hasUnit || m.value >= 50_000);
  if (money.length) {
    const max = Math.max(...money.map((m) => m.value));
    if (max >= 50_000) out.budgetMax = max;
  }
  return out;
}
