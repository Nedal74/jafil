"use client";

import { useMemo, useState } from "react";
import { BedDouble, Bath, FileText, Layers, Maximize2 } from "lucide-react";

export type PublicUnit = {
  id: string;
  reference: string;
  status: "AVAILABLE" | "RESERVED" | "SOLD";
  price: string | null;
  area: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: string | null;
  type: string | null;
  features: string | null;
  floorPlanUrl: string | null;
};

const TONE = {
  AVAILABLE: "bg-emerald-50 text-emerald-700",
  RESERVED: "bg-amber-50 text-amber-700",
  SOLD: "bg-gray-100 text-muted",
};

export function UnitsTable({
  units,
  labels,
}: {
  units: PublicUnit[];
  labels: {
    all: string;
    status: Record<"AVAILABLE" | "RESERVED" | "SOLD", string>;
    priceOnRequest: string;
    inquire: string;
    floorPlan: string;
    unit: string;
    bedrooms: string;
    bathrooms: string;
    area: string;
    floor: string;
  };
}) {
  const [filter, setFilter] = useState<"ALL" | PublicUnit["status"]>("ALL");
  const counts = useMemo(() => {
    const c = { AVAILABLE: 0, RESERVED: 0, SOLD: 0 };
    units.forEach((u) => c[u.status]++);
    return c;
  }, [units]);
  const shown = filter === "ALL" ? units : units.filter((u) => u.status === filter);

  return (
    <div>
      <div role="group" className="mb-5 flex flex-wrap gap-2">
        {(["ALL", "AVAILABLE", "RESERVED", "SOLD"] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className="rounded-md border border-line px-3 py-1.5 text-sm text-ink aria-pressed:border-navy aria-pressed:bg-navy aria-pressed:text-white"
          >
            {f === "ALL" ? labels.all : labels.status[f]} <span className="opacity-60">({f === "ALL" ? units.length : counts[f]})</span>
          </button>
        ))}
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((u) => (
          <li key={u.id} className={`card flex flex-col p-4 ${u.status === "SOLD" ? "opacity-70" : ""}`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-navy">{labels.unit} #{u.reference}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[u.status]}`}>{labels.status[u.status]}</span>
            </div>
            {u.type && <p className="mt-1 text-xs text-muted">{u.type}</p>}
            <p className="mt-3 text-xl font-bold text-navy">{u.status === "SOLD" ? "—" : u.price ?? labels.priceOnRequest}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 text-xs text-ink/80">
              {u.floor && <div className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-sand-600" aria-hidden /><dt className="sr-only">{labels.floor}</dt><dd>{u.floor}</dd></div>}
              {u.area && <div className="flex items-center gap-1.5"><Maximize2 className="h-3.5 w-3.5 text-sand-600" aria-hidden /><dt className="sr-only">{labels.area}</dt><dd>{u.area}</dd></div>}
              {u.bedrooms != null && <div className="flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5 text-sand-600" aria-hidden /><dt className="sr-only">{labels.bedrooms}</dt><dd>{u.bedrooms} {labels.bedrooms}</dd></div>}
              {u.bathrooms != null && <div className="flex items-center gap-1.5"><Bath className="h-3.5 w-3.5 text-sand-600" aria-hidden /><dt className="sr-only">{labels.bathrooms}</dt><dd>{u.bathrooms} {labels.bathrooms}</dd></div>}
            </dl>
            {u.features && <p className="mt-3 text-xs leading-6 text-muted">{u.features}</p>}
            <div className="mt-auto flex gap-2 pt-4">
              {u.status !== "SOLD" && (
                <a href={`?unit=${encodeURIComponent(u.id)}#inquiry`} className="btn-outline flex-1 py-2 text-xs">{labels.inquire}</a>
              )}
              {u.floorPlanUrl && (
                <a href={u.floorPlanUrl} target="_blank" rel="noopener" className="btn-outline py-2 text-xs"><FileText className="h-3.5 w-3.5" aria-hidden />{labels.floorPlan}</a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
