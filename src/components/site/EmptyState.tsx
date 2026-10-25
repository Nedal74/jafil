import { Building2 } from "lucide-react";

export function EmptyState({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-sand/60 bg-beige-50 px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-beige text-sand-700">
        <Building2 className="h-6 w-6" aria-hidden />
      </span>
      <p className="mt-4 max-w-md text-sm leading-7 text-muted">{text}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
