import Link from "next/link";

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
  light,
  id,
}: {
  eyebrow?: string | null;
  title: string;
  subtitle?: string | null;
  action?: { href: string; label: string };
  light?: boolean;
  id?: string;
}) {
  return (
    <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className={`eyebrow ${light ? "text-sand" : ""}`}>{eyebrow}</p>}
        <h2 id={id} className={`mt-2 text-2xl font-bold sm:text-3xl ${light ? "text-white" : "text-navy"}`}>{title}</h2>
        {subtitle && <p className={`mt-3 leading-7 ${light ? "text-beige/80" : "text-muted"}`}>{subtitle}</p>}
      </div>
      {action && (
        <Link href={action.href} className={light ? "btn-ghost-light" : "btn-outline"}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
