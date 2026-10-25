"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";

import { uploadFiles } from "@/components/admin/MediaField";

export function Uploader() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-sand bg-white p-6 text-sm text-sand-700 hover:bg-beige-50">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
        رفع صور (JPG/PNG/WEBP حتى 8MB) أو ملفات PDF (حتى 15MB)
        <input
          type="file"
          multiple
          className="sr-only"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={async (e) => {
            if (!e.target.files?.length) return;
            setBusy(true);
            const { items, error } = await uploadFiles(e.target.files);
            setBusy(false);
            setMsg(error ?? `تم رفع ${items.length} ملف`);
            e.target.value = "";
            router.refresh();
          }}
        />
      </label>
      {msg && <p role="status" className="mt-2 text-sm text-muted">{msg}</p>}
    </div>
  );
}
