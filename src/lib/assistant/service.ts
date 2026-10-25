import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "../db";
import type { Locale } from "../i18n/config";
import { getDictionary } from "../i18n/dictionaries";
import { formatArea, formatPrice } from "../format";
import { getSetting } from "../settings";
import { criteriaSchema, mergeCriteria, parseCriteriaFromText, type Criteria } from "./criteria";
import { loadPublishedInventory } from "./inventory-source";
import { matchInventory, type MatchResult } from "./match";
import { getAssistantModel } from "./provider";

export type PublicResult = {
  projectId: string;
  name: string;
  place: string;
  href: string;
  priceFrom: string | null;
  basis: "units" | "project";
  units: { id: string; reference: string; price: string | null; area: string | null; bedrooms: number | null }[];
};

export function toPublicResults(results: MatchResult[], locale: Locale): PublicResult[] {
  return results.map(({ project: p, units, basis }) => {
    const name = locale === "ar" ? p.nameAr : p.nameEn || p.nameAr;
    const place = [locale === "ar" ? p.neighborhoodAr : p.neighborhoodEn, locale === "ar" ? p.cityAr : p.cityEn]
      .filter(Boolean)
      .join("، ");
    const minPrice = units.length ? units[0]!.price : p.priceMin;
    return {
      projectId: p.id,
      name,
      place,
      href: `/${locale}/projects/${encodeURIComponent(locale === "ar" ? p.slugAr : p.slugEn)}`,
      priceFrom: minPrice != null ? formatPrice(minPrice, locale) : null,
      basis,
      units: units.map((u) => ({
        id: u.id,
        reference: u.reference,
        price: u.price != null ? formatPrice(u.price, locale) : null,
        area: u.area != null ? formatArea(u.area, locale) : null,
        bedrooms: u.bedrooms,
      })),
    };
  });
}

function templateReply(locale: Locale, results: PublicResult[]): string {
  const t = getDictionary(locale).assistant;
  return results.length ? t.results : t.noResults;
}

export async function handleAssistantMessage(input: {
  conversationId?: string;
  visitorKey: string;
  locale: Locale;
  criteria?: Criteria;
  text?: string;
}) {
  const settings = await getSetting("assistant");
  let conversation = input.conversationId
    ? await prisma.chatConversation.findFirst({ where: { id: input.conversationId, visitorKey: input.visitorKey } })
    : null;
  if (!conversation) {
    conversation = await prisma.chatConversation.create({ data: { visitorKey: input.visitorKey, locale: input.locale } });
  }

  const stored = criteriaSchema.safeParse(conversation.criteria ?? {});
  let criteria = mergeCriteria(stored.success ? stored.data : {}, input.criteria ?? {});

  const types = await prisma.propertyType.findMany({ where: { active: true }, select: { key: true, nameAr: true, nameEn: true } });
  const model = settings.useLanguageModel ? getAssistantModel() : null;
  let usedModel = false;

  const text = input.text?.trim().slice(0, 1000);
  if (text) {
    criteria = mergeCriteria(criteria, parseCriteriaFromText(text, types));
    if (model) {
      try {
        const extracted = await model.extractCriteria(text, types.map((t) => t.key), input.locale);
        if (extracted) {
          criteria = mergeCriteria(criteria, criteriaSchema.parse(extracted));
          usedModel = true;
        }
      } catch (err) {
        console.warn("[assistant] criteria extraction unavailable:", (err as Error).message);
      }
    }
  }

  const inventory = await loadPublishedInventory();
  const results = toPublicResults(matchInventory(inventory, criteria), input.locale);

  let reply = templateReply(input.locale, results);
  if (model && text) {
    try {
      const composed = await model.composeReply({
        locale: input.locale,
        userMessage: text,
        noMatches: results.length === 0,
        records: results.map((r) => ({ name: r.name, location: r.place, priceFrom: r.priceFrom, availableUnits: r.units })),
      });
      if (composed) {
        reply = composed;
        usedModel = true;
      }
    } catch (err) {
      console.warn("[assistant] reply generation unavailable:", (err as Error).message);
    }
  }

  await prisma.$transaction([
    prisma.chatConversation.update({
      where: { id: conversation.id },
      data: { criteria: criteria as Prisma.InputJsonValue },
    }),
    prisma.chatMessage.createMany({
      data: [
        ...(text ? [{ conversationId: conversation.id, role: "user", content: text }] : []),
        {
          conversationId: conversation.id,
          role: "assistant",
          content: reply,
          usedModel,
          references: results.map((r) => r.projectId) as Prisma.InputJsonValue,
        },
      ],
    }),
  ]);

  return { conversationId: conversation.id, reply, results, criteria, usedModel };
}

/** Deletes conversations older than the configured retention window. */
export async function purgeOldConversations(): Promise<number> {
  const { retentionDays } = await getSetting("assistant");
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
  const res = await prisma.chatConversation.deleteMany({ where: { updatedAt: { lt: cutoff } } });
  return res.count;
}
