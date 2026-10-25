import type { InventoryBasis, RangeMode, UnitStatus } from "@prisma/client";

export type UnitLike = {
  status: UnitStatus;
  price: number | null;
  area: number | null;
  bedrooms: number | null;
};

export type InventoryStats = {
  denominator: number;
  available: number;
  reserved: number;
  sold: number;
  unpublished: number;
  /** null when the denominator is zero (nothing to compute against). */
  soldPercent: number | null;
  reservedPercent: number | null;
  availablePercent: number | null;
  /** Units recorded exceed a manual total — the configuration needs attention. */
  inconsistent: boolean;
};

/**
 * Sales percentages.
 *
 * Denominator:
 *  - LISTED_UNITS: all units except UNPUBLISHED (drafts/withheld stock never count).
 *  - MANUAL_TOTAL: Project.manualInventoryTotal, for phases whose full inventory is not
 *    entered unit-by-unit. Falls back to LISTED_UNITS when the manual total is missing.
 * Numerator: SOLD units (+ RESERVED when countReservedAsSold is enabled).
 * A zero denominator yields null percentages instead of NaN/Infinity.
 */
export function computeInventory(
  units: Pick<UnitLike, "status">[],
  basis: InventoryBasis,
  manualTotal: number | null,
  countReservedAsSold = false,
): InventoryStats {
  const count = (s: UnitStatus) => units.filter((u) => u.status === s).length;
  const available = count("AVAILABLE");
  const reserved = count("RESERVED");
  const sold = count("SOLD");
  const unpublished = count("UNPUBLISHED");
  const listed = available + reserved + sold;

  const useManual = basis === "MANUAL_TOTAL" && manualTotal != null && manualTotal > 0;
  const denominator = useManual ? manualTotal! : listed;
  const soldNumerator = sold + (countReservedAsSold ? reserved : 0);
  const pct = (n: number) => (denominator > 0 ? Math.round((n / denominator) * 1000) / 10 : null);

  return {
    denominator,
    available,
    reserved,
    sold,
    unpublished,
    soldPercent: pct(soldNumerator),
    reservedPercent: pct(reserved),
    availablePercent: pct(available),
    inconsistent: useManual && listed > manualTotal!,
  };
}

export type Ranges = {
  priceMin: number | null;
  priceMax: number | null;
  areaMin: number | null;
  areaMax: number | null;
  bedroomsMin: number | null;
  bedroomsMax: number | null;
};

function minMax(values: (number | null)[]): [number | null, number | null] {
  const v = values.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  return v.length ? [Math.min(...v), Math.max(...v)] : [null, null];
}

/** Ranges derived from publicly listed units (UNPUBLISHED excluded). Sold units still describe the project. */
export function rangesFromUnits(units: UnitLike[]): Ranges {
  const listed = units.filter((u) => u.status !== "UNPUBLISHED");
  const [priceMin, priceMax] = minMax(listed.filter((u) => u.status !== "SOLD").map((u) => u.price));
  const [areaMin, areaMax] = minMax(listed.map((u) => u.area));
  const [bedroomsMin, bedroomsMax] = minMax(listed.map((u) => u.bedrooms));
  return { priceMin, priceMax, areaMin, areaMax, bedroomsMin, bedroomsMax };
}

/** Warnings when manual ranges disagree with listed units. */
export function rangeWarnings(mode: RangeMode, manual: Ranges, units: UnitLike[]): string[] {
  if (mode !== "MANUAL") return [];
  const derived = rangesFromUnits(units);
  const out: string[] = [];
  const check = (label: string, min: number | null, max: number | null, dMin: number | null, dMax: number | null) => {
    if (dMin != null && min != null && dMin < min) out.push(`${label}: توجد وحدة أقل من الحد الأدنى المُدخل (${dMin})`);
    if (dMax != null && max != null && dMax > max) out.push(`${label}: توجد وحدة أعلى من الحد الأعلى المُدخل (${dMax})`);
  };
  check("السعر", manual.priceMin, manual.priceMax, derived.priceMin, derived.priceMax);
  check("المساحة", manual.areaMin, manual.areaMax, derived.areaMin, derived.areaMax);
  check("الغرف", manual.bedroomsMin, manual.bedroomsMax, derived.bedroomsMin, derived.bedroomsMax);
  return out;
}

export function validateRange(min: number | null, max: number | null): boolean {
  return min == null || max == null || min <= max;
}
