import type { ConstructionStatus, SalesStatus, UnitStatus } from "@prisma/client";
import { normalizeText, type Criteria } from "./criteria";

export type MatchUnit = {
  id: string;
  reference: string;
  status: UnitStatus;
  price: number | null;
  area: number | null;
  bedrooms: number | null;
  typeKey: string | null;
};

export type MatchProject = {
  id: string;
  slugAr: string;
  slugEn: string;
  nameAr: string;
  nameEn: string;
  cityAr: string | null;
  cityEn: string | null;
  neighborhoodAr: string | null;
  neighborhoodEn: string | null;
  typeKey: string | null;
  salesStatus: SalesStatus;
  constructionStatus: ConstructionStatus;
  featured: boolean;
  priceMin: number | null;
  priceMax: number | null;
  areaMin: number | null;
  areaMax: number | null;
  bedroomsMin: number | null;
  bedroomsMax: number | null;
  units: MatchUnit[];
};

export type MatchResult = {
  project: MatchProject;
  units: MatchUnit[];
  /** "units" when individual units matched; "project" when matched on project-level ranges (no units listed). */
  basis: "units" | "project";
  score: number;
};

function locationMatches(p: MatchProject, location: string): boolean {
  const needle = normalizeText(location);
  if (!needle) return true;
  const hay = [p.cityAr, p.cityEn, p.neighborhoodAr, p.neighborhoodEn]
    .filter(Boolean)
    .map((s) => normalizeText(s!));
  return hay.some((h) => h.includes(needle) || needle.includes(h));
}

function unitMatches(u: MatchUnit, c: Criteria, projectType: string | null): boolean {
  if (u.status !== "AVAILABLE") return false;
  if (c.propertyTypeKey && (u.typeKey ?? projectType) !== c.propertyTypeKey) return false;
  if (c.budgetMax != null && (u.price == null || u.price > c.budgetMax)) return false;
  if (c.budgetMin != null && (u.price == null || u.price < c.budgetMin)) return false;
  if (c.bedrooms != null && (u.bedrooms == null || u.bedrooms < c.bedrooms)) return false;
  if (c.areaMin != null && (u.area == null || u.area < c.areaMin)) return false;
  if (c.areaMax != null && (u.area == null || u.area > c.areaMax)) return false;
  return true;
}

function rangeOverlaps(min: number | null, max: number | null, wantMin: number | null | undefined, wantMax: number | null | undefined) {
  if (wantMin == null && wantMax == null) return true;
  if (min == null && max == null) return false; // unknown → cannot claim a match
  const lo = min ?? max!;
  const hi = max ?? min!;
  if (wantMax != null && lo > wantMax) return false;
  if (wantMin != null && hi < wantMin) return false;
  return true;
}

/**
 * Deterministic matcher. Only AVAILABLE units of published projects qualify.
 * Every criterion the visitor gave is a hard filter; ranking only orders genuine matches.
 */
export function matchInventory(projects: MatchProject[], c: Criteria, limit = 5): MatchResult[] {
  const results: MatchResult[] = [];
  for (const p of projects) {
    if (p.salesStatus === "SOLD_OUT") continue;
    if (c.location && !locationMatches(p, c.location)) continue;

    const listed = p.units.filter((u) => u.status !== "UNPUBLISHED");
    if (listed.length > 0) {
      const units = listed.filter((u) => unitMatches(u, c, p.typeKey));
      if (!units.length) continue;
      units.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
      let score = 10 + Math.min(units.length, 10);
      if (c.budgetMax != null && units[0]!.price != null) score += 10 * (units[0]!.price / c.budgetMax); // closer to budget = better fit
      if (p.featured) score += 2;
      results.push({ project: p, units: units.slice(0, 3), basis: "units", score });
    } else {
      // No unit inventory listed: fall back to project-level ranges, only for projects on sale.
      if (p.salesStatus !== "AVAILABLE") continue;
      if (c.propertyTypeKey && p.typeKey !== c.propertyTypeKey) continue;
      if (!rangeOverlaps(p.priceMin, p.priceMax, c.budgetMin, c.budgetMax)) continue;
      if (!rangeOverlaps(p.areaMin, p.areaMax, c.areaMin, c.areaMax)) continue;
      if (c.bedrooms != null && (p.bedroomsMax == null || p.bedroomsMax < c.bedrooms)) continue;
      results.push({ project: p, units: [], basis: "project", score: 5 + (p.featured ? 2 : 0) });
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
