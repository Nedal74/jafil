"use client";

import { MessageCircle } from "lucide-react";

import { recordCtaClick, track } from "@/lib/track-client";
import { cn } from "@/lib/utils";

export function WhatsAppButton({
  href,
  label,
  projectId,
  className,
}: {
  href: string;
  label: string;
  projectId?: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("btn bg-[#1f8f4e] text-white hover:bg-[#187a41]", className)}
      onClick={() => {
        recordCtaClick("whatsapp", projectId);
        track("whatsapp_click", { project_id: projectId });
      }}
    >
      <MessageCircle className="h-4 w-4" aria-hidden />
      {label}
    </a>
  );
}
