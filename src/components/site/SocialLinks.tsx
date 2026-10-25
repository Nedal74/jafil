import type { SettingValue } from "@/lib/settings";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  x: "X",
  instagram: "Instagram",
  snapchat: "Snapchat",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  youtube: "YouTube",
};

/** Text-badge social links (brand icons intentionally avoided to keep the bundle lean). */
export function SocialLinks({ socials, className }: { socials: SettingValue<"contact">["socials"]; className?: string }) {
  const entries = Object.entries(socials).filter(([, url]) => url);
  if (!entries.length) return null;
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {entries.map(([key, url]) => (
        <li key={key}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center rounded-full border border-white/20 px-3.5 text-xs font-medium text-beige/80 transition-colors hover:border-sand hover:text-white"
          >
            {LABELS[key] ?? key}
          </a>
        </li>
      ))}
    </ul>
  );
}
