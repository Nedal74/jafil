import { beforeEach, describe, expect, it } from "vitest";

import { POST as assistantPOST } from "@/app/api/assistant/route";
import { POST as financingPOST } from "@/app/api/financing/route";
import { POST as leadsPOST } from "@/app/api/leads/route";
import sitemap from "@/app/sitemap";
import { prisma } from "@/lib/db";
import { syncProjectRanges } from "@/lib/projects/sync";
import { rateLimit } from "@/lib/rate-limit";
import { recordSlugRedirects } from "@/lib/redirects";
import { resetDb } from "../helpers/db";

let ipCounter = 0;
function req(path: string, body: unknown, opts: { origin?: string | null; ip?: string } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json", host: "localhost:3000", "x-forwarded-for": opts.ip ?? `10.0.0.${++ipCounter}` };
  if (opts.origin !== null) headers.origin = opts.origin ?? "http://localhost:3000";
  return new Request(`http://localhost:3000${path}`, { method: "POST", headers, body: JSON.stringify(body) });
}

async function seedProject(status: "PUBLISHED" | "DRAFT" = "PUBLISHED", over: Record<string, unknown> = {}) {
  const type = await prisma.propertyType.upsert({ where: { key: "floor" }, create: { key: "floor", nameAr: "أدوار", nameEn: "Floors" }, update: {} });
  return prisma.project.create({
    data: {
      status,
      slugAr: `p-${Math.random().toString(36).slice(2, 8)}`,
      slugEn: `p-${Math.random().toString(36).slice(2, 8)}`,
      nameAr: "أدوار الاختبار",
      nameEn: "Test Floors",
      cityAr: "الرياض",
      neighborhoodAr: "النرجس",
      neighborhoodEn: "Al Narjis",
      salesStatus: "AVAILABLE",
      propertyTypeId: type.id,
      ...over,
    },
  });
}

beforeEach(resetDb);

describe("POST /api/leads", () => {
  const body = { name: "سارة", phone: "0570800002", source: "CONTACT_FORM", consent: true, locale: "ar" };

  it("stores a valid lead with consent timestamp", async () => {
    const res = await leadsPOST(req("/api/leads", body));
    expect(res.status).toBe(200);
    const lead = await prisma.lead.findFirstOrThrow();
    expect(lead.phoneNormalized).toBe("966570800002");
    expect(lead.consentAt).toBeInstanceOf(Date);
    expect(lead.status).toBe("NEW");
  });

  it("rejects cross-origin requests (CSRF)", async () => {
    const res = await leadsPOST(req("/api/leads", body, { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
    expect(await prisma.lead.count()).toBe(0);
  });

  it("returns field errors and stores nothing on invalid input", async () => {
    const res = await leadsPOST(req("/api/leads", { ...body, phone: "123", consent: false }));
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.fields).toMatchObject({ phone: "invalidPhone", consent: "consentRequired" });
    expect(await prisma.lead.count()).toBe(0);
  });

  it("flags but never merges duplicates", async () => {
    await leadsPOST(req("/api/leads", body));
    await leadsPOST(req("/api/leads", { ...body, name: "سارة م", phone: "+966570800002" }));
    const leads = await prisma.lead.findMany({ orderBy: { createdAt: "asc" } });
    expect(leads).toHaveLength(2);
    expect(leads[1]!.possibleDuplicateOfId).toBe(leads[0]!.id);
  });

  it("does not link leads to unpublished projects", async () => {
    const draft = await seedProject("DRAFT");
    await leadsPOST(req("/api/leads", { ...body, source: "PROJECT_INQUIRY", projectId: draft.id }));
    expect((await prisma.lead.findFirstOrThrow()).projectId).toBeNull();
  });

  it("rate-limits repeated submissions from one IP", async () => {
    const statuses = [];
    for (let i = 0; i < 7; i++) statuses.push((await leadsPOST(req("/api/leads", { ...body, phone: `05708000${10 + i}` }, { ip: "1.2.3.4" }))).status);
    expect(statuses.slice(0, 5).every((s) => s === 200)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });
});

describe("POST /api/financing", () => {
  const app = {
    operation: "PURCHASE", fullName: "خالد العتيبي", phone: "0570900002", monthlySalary: "18000", employerSector: "PRIVATE",
    bank: "مصرف الراجحي", monthlyObligations: "1500", hasRealEstateLoan: "no", age: "33", consent: true, locale: "ar",
  };
  it("stores the application separately from leads and returns only a reference", async () => {
    const res = await financingPOST(req("/api/financing", app));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Object.keys(data).sort()).toEqual(["ok", "reference"]);
    expect(data.reference).toMatch(/^FIN-\d{8}-\d{6}$/);
    expect(await prisma.financingApplication.count()).toBe(1);
    expect(await prisma.lead.count()).toBe(0);
  });
  it("rejects a bank that is not in the configured list", async () => {
    const res = await financingPOST(req("/api/financing", { ...app, bank: "Fake Bank" }));
    expect(res.status).toBe(422);
  });
});

describe("POST /api/assistant (no AI key → deterministic)", () => {
  const visitorKey = "visitor_key_0123456789abcd";
  it("returns only genuinely matching published inventory", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const pub = await seedProject("PUBLISHED");
    const draft = await seedProject("DRAFT");
    await prisma.unit.createMany({
      data: [
        { projectId: pub.id, reference: "A1", price: 1_350_000, area: 318, bedrooms: 3, status: "AVAILABLE" },
        { projectId: pub.id, reference: "A2", price: 900_000, area: 250, bedrooms: 3, status: "SOLD" },
        { projectId: draft.id, reference: "D1", price: 800_000, area: 250, bedrooms: 3, status: "AVAILABLE" },
      ],
    });
    const res = await assistantPOST(req("/api/assistant", { action: "message", visitorKey, locale: "ar", criteria: { propertyTypeKey: "floor", budgetMax: 1_500_000 } }));
    const data = await res.json();
    expect(data.usedModel).toBe(false);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].units.map((u: { reference: string }) => u.reference)).toEqual(["A1"]);

    const none = await (await assistantPOST(req("/api/assistant", { action: "message", visitorKey, locale: "ar", criteria: { budgetMax: 100_000 } }))).json();
    expect(none.results).toEqual([]);
    expect(none.reply).toContain("لا توجد");
  });

  it("requires consent before creating a sales lead and links the conversation", async () => {
    const start = await (await assistantPOST(req("/api/assistant", { action: "message", visitorKey, locale: "en", text: "villa 4 bedrooms under 2 million" }))).json();
    expect(start.criteria).toMatchObject({ bedrooms: 4, budgetMax: 2_000_000 });
    const noConsent = await assistantPOST(req("/api/assistant", { action: "lead", visitorKey, conversationId: start.conversationId, locale: "en", name: "Ali", phone: "0570800002", consent: false }));
    expect(noConsent.status).toBe(422);
    const ok = await assistantPOST(req("/api/assistant", { action: "lead", visitorKey, conversationId: start.conversationId, locale: "en", name: "Ali", phone: "0570800002", consent: true }));
    expect(ok.status).toBe(200);
    const lead = await prisma.lead.findFirstOrThrow({ include: { chats: true } });
    expect(lead.source).toBe("AI_ASSISTANT");
    expect(lead.bedrooms).toBe(4);
    expect(lead.chats[0]!.handoffRequested).toBe(true);
  });

  it("does not let one visitor read another visitor's conversation", async () => {
    const a = await (await assistantPOST(req("/api/assistant", { action: "message", visitorKey, locale: "ar", criteria: { bedrooms: 2 } }))).json();
    const b = await (await assistantPOST(req("/api/assistant", { action: "message", visitorKey: "another_visitor_key_000000", conversationId: a.conversationId, locale: "ar" }))).json();
    expect(b.conversationId).not.toBe(a.conversationId);
    expect(b.criteria).toEqual({});
  });
});

describe("inventory sync, redirects, sitemap, rate limiter", () => {
  it("recomputes AUTO ranges from listed units", async () => {
    const p = await seedProject();
    await prisma.unit.createMany({
      data: [
        { projectId: p.id, reference: "1", price: 1_000_000, area: 300, bedrooms: 3, status: "AVAILABLE" },
        { projectId: p.id, reference: "2", price: 1_500_000, area: 338, bedrooms: 4, status: "RESERVED" },
        { projectId: p.id, reference: "3", price: 50, area: 10, bedrooms: 1, status: "UNPUBLISHED" },
      ],
    });
    await syncProjectRanges(p.id);
    const r = await prisma.project.findUniqueOrThrow({ where: { id: p.id } });
    expect([r.priceMin, r.priceMax, r.areaMin, r.areaMax, r.bedroomsMin, r.bedroomsMax]).toEqual([1_000_000, 1_500_000, 300, 338, 3, 4]);
  });

  it("creates chain-free redirects when slugs change", async () => {
    await recordSlugRedirects({ slugAr: "a", slugEn: "a" }, { slugAr: "b", slugEn: "a" }, "projects");
    await recordSlugRedirects({ slugAr: "b", slugEn: "a" }, { slugAr: "c", slugEn: "a" }, "projects");
    const rs = await prisma.redirect.findMany({ orderBy: { fromPath: "asc" } });
    expect(rs.map((r) => [r.fromPath, r.toPath])).toEqual([["/ar/projects/a", "/ar/projects/c"], ["/ar/projects/b", "/ar/projects/c"]]);
  });

  it("lists only published content in the sitemap", async () => {
    const pub = await seedProject("PUBLISHED");
    const draft = await seedProject("DRAFT");
    const urls = (await sitemap()).map((e) => e.url).join("\n");
    expect(urls).toContain(pub.slugAr);
    expect(urls).not.toContain(draft.slugAr);
    expect(urls).not.toContain("/admin");
  });

  it("rate limiter resets after its window", async () => {
    expect((await rateLimit("t", "x", 1, 60)).ok).toBe(true);
    expect((await rateLimit("t", "x", 1, 60)).ok).toBe(false);
    await prisma.rateLimit.updateMany({ data: { windowStart: new Date(Date.now() - 120_000) } });
    expect((await rateLimit("t", "x", 1, 60)).ok).toBe(true);
  });
});
