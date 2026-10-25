"use client";

import { useState } from "react";
import { ImagePlus } from "lucide-react";

import { MediaPickerDialog } from "./MediaField";
import { useFieldError } from "./forms";

/** Like MediaField but stores the media URL (used inside JSON settings). */
export function MediaUrlField({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const error = useFieldError(name);
  return (
    <div>
      <p className="field-label">{label}</p>
      <input type="hidden" name={name} value={url} />
      <div className="flex items-center gap-3">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border border-line bg-beige-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-6 w-6 text-sand" />}
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" className="btn-outline px-3 py-1.5 text-xs" onClick={() => setOpen(true)}>{url ? "تغيير" : "اختيار / رفع"}</button>
          {url && <button type="button" className="text-xs text-red-600" onClick={() => setUrl("")}>إزالة</button>}
        </div>
      </div>
      {error && <p className="field-error">{error}</p>}
      <MediaPickerDialog open={open} onClose={() => setOpen(false)} onSelect={(items) => items[0] && setUrl(items[0].url)} />
    </div>
  );
}
