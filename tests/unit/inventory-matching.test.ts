import { describe, expect, it } from "vitest";

import { parseCriteriaFromText } from "@/lib/assistant/criteria";
import { matchInventory, type MatchProject } from "@/lib/assistant/match";
import { computeInventory, rangeWarnings, rangesFromUnits } from "@/lib/projects/inventory";

const u = (status: "AVAILABLE" | "RESERVED" | "SOLD" | "UNPUBLISHED", price: number | null = null, area: number | null = null, bedrooms: number | null = null) => ({ status, price, area, bedrooms });

describe("computeInventory", () => {
  it("handles zero inventory without NaN", () => {
    const s = computeInventory([], "LISTED_UNITS", null);
    expect(s.denominator).toBe(0);
    expect(s.soldPercent).toBeNull();
  });
  it("excludes UNPUBLISHED units from the listed denominator", () => {
    const s = computeInventory([u("SOLD"), u("AVAILABLE"), u("RESERVED"), u("UNPUBLISHED")], "LISTED_UNITS", null);
    expect(s.denominator).toBe(3);
    expect(s.soldPercent).toBe(33.3);
  });
  it("optionally counts reserved as sold", () => {
    expect(computeInventory([u("SOLD"), u("RESERVED"), u("AVAILABLE"), u("AVAILABLE")], "LISTED_UNITS", null, true).soldPercent).toBe(50);
  });
  it("uses a manual total and flags inconsistency", () => {
    const s = computeInventory([u("SOLD"), u("SOLD")], "MANUAL_TOTAL", 40);
    expect(s.soldPercent).toBe(5);
    expect(computeInventory([u("SOLD"), u("SOLD"), u("SOLD")], "MANUAL_TOTAL", 2).inconsistent).toBe(true);
  });
  it("falls back to listed units when the manual total is missing", () => {
    expect(computeInventory([u("SOLD"), u("AVAILABLE")], "MANUAL_TOTAL", null).denominator).toBe(2);
  });
});

describe("ranges", () => {
  it("derives ranges from listed units; sold prices excluded from price range", () => {
    const r = rangesFromUnits([u("AVAILABLE", 1_000_000, 300, 3), u("SOLD", 500_000, 250, 2), u("UNPUBLISHED", 100, 10, 1), u("RESERVED", 1_500_000, 338, 4)]);
    expect(r).toEqual({ priceMin: 1_000_000, priceMax: 1_500_000, areaMin: 250, areaMax: 338, bedroomsMin: 2, bedroomsMax: 4 });
  });
  it("returns nulls with no data", () => {
    expect(rangesFromUnits([]).priceMin).toBeNull();
  });
  it("warns when manual ranges contradict units", () => {
    const w = rangeWarnings("MANUAL", { priceMin: 1_200_000, priceMax: 1_300_000, areaMin: null, areaMax: null, bedroomsMin: null, bedroomsMax: null }, [u("AVAILABLE", 1_000_000)]);
    expect(w.length).toBe(1);
    expect(rangeWarnings("AUTO_FROM_UNITS", { priceMin: 1, priceMax: 1, areaMin: null, areaMax: null, bedroomsMin: null, bedroomsMax: null }, [u("AVAILABLE", 5)])).toEqual([]);
  });
});

const project = (over: Partial<MatchProject>): MatchProject => ({
  id: "p",
  slugAr: "p",
  slugEn: "p",
  nameAr: "مشروع",
  nameEn: "Project",
  cityAr: "الرياض",
  cityEn: "Riyadh",
  neighborhoodAr: "النرجس",
  neighborhoodEn: "Al Narjis",
  typeKey: "floor",
  salesStatus: "AVAILABLE",
  constructionStatus: "UNDER_CONSTRUCTION",
  featured: false,
  priceMin: null,
  priceMax: null,
  areaMin: null,
  areaMax: null,
  bedroomsMin: null,
  bedroomsMax: null,
  units: [],
  ...over,
});
const unit = (id: string, status: "AVAILABLE" | "RESERVED" | "SOLD" | "UNPUBLISHED", price: number | null, bedrooms = 3, area = 300) => ({ id, reference: id, status, price, area, bedrooms, typeKey: null });

describe("matchInventory", () => {
  const p1 = project({ id: "p1", units: [unit("A1", "AVAILABLE", 1_580_000), unit("A2", "AVAILABLE", 1_350_000, 4), unit("B1", "SOLD", 900_000)] });
  const p2 = project({ id: "p2", neighborhoodAr: "الملقا", neighborhoodEn: "Al Malqa", typeKey: "villa", units: [unit("V1", "AVAILABLE", 3_000_000, 5, 450)] });

  it("only returns available units within budget (never sold ones)", () => {
    const r = matchInventory([p1, p2], { budgetMax: 1_400_000 });
    expect(r.map((x) => x.project.id)).toEqual(["p1"]);
    expect(r[0]!.units.map((x) => x.id)).toEqual(["A2"]);
  });
  it("returns nothing rather than inventing a match", () => {
    expect(matchInventory([p1, p2], { budgetMax: 500_000 })).toEqual([]);
    expect(matchInventory([], { propertyTypeKey: "villa" })).toEqual([]);
  });
  it("matches Arabic locations with normalization (with/without ال)", () => {
    expect(matchInventory([p1, p2], { location: "نرجس" }).map((x) => x.project.id)).toEqual(["p1"]);
    expect(matchInventory([p1, p2], { location: "malqa" }).map((x) => x.project.id)).toEqual(["p2"]);
  });
  it("filters by type, bedrooms and area", () => {
    expect(matchInventory([p1, p2], { propertyTypeKey: "villa" }).map((x) => x.project.id)).toEqual(["p2"]);
    expect(matchInventory([p1, p2], { bedrooms: 4, propertyTypeKey: "floor" })[0]!.units.map((x) => x.id)).toEqual(["A2"]);
    expect(matchInventory([p1, p2], { areaMin: 400 }).map((x) => x.project.id)).toEqual(["p2"]);
  });
  it("excludes sold-out projects and handles price-less units under a budget", () => {
    const sold = project({ id: "s", salesStatus: "SOLD_OUT", units: [unit("X", "AVAILABLE", 100)] });
    const noPrice = project({ id: "np", units: [unit("N", "AVAILABLE", null)] });
    expect(matchInventory([sold, noPrice], { budgetMax: 2_000_000 })).toEqual([]);
    expect(matchInventory([noPrice], {}).length).toBe(1);
  });
  it("falls back to project ranges only when no units are listed and the project is on sale", () => {
    const ranged = project({ id: "r", priceMin: 900_000, priceMax: 1_200_000, bedroomsMax: 4 });
    const unknown = project({ id: "u" });
    expect(matchInventory([ranged, unknown], { budgetMax: 1_000_000 }).map((x) => [x.project.id, x.basis])).toEqual([["r", "project"]]);
    expect(matchInventory([project({ id: "c", salesStatus: "COMING_SOON", priceMin: 1 })], {})).toEqual([]);
  });
});

describe("parseCriteriaFromText", () => {
  const types = [
    { key: "villa", nameAr: "فلل", nameEn: "Villas" },
    { key: "floor", nameAr: "أدوار", nameEn: "Floors" },
  ];
  it("extracts type, budget, bedrooms in Arabic", () => {
    expect(parseCriteriaFromText("أبحث عن فيلا 4 غرف بميزانية 2 مليون", types)).toMatchObject({ propertyTypeKey: "villa", bedrooms: 4, budgetMax: 2_000_000 });
  });
  it("extracts from English and Arabic-Indic digits", () => {
    expect(parseCriteriaFromText("floor with 3 bedrooms under 1.5 million", types)).toMatchObject({ propertyTypeKey: "floor", bedrooms: 3, budgetMax: 1_500_000 });
    expect(parseCriteriaFromText("دور ٣ غرف", types)).toMatchObject({ propertyTypeKey: "floor", bedrooms: 3 });
  });
  it("does not guess when nothing is stated", () => {
    expect(parseCriteriaFromText("مرحبا", types)).toEqual({});
  });
});
