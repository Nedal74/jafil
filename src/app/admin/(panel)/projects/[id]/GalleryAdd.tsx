"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { MediaPickerDialog } from "@/components/admin/MediaField";
import type { ActionResult } from "@/components/admin/forms";

export function GalleryAdd({ projectId, action }: { projectId: string; action: (fd: FormData) => Promise<ActionResult> }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  return (
    <>
      <button type="button" className="btn-outline px-3 py-1.5 text-xs" onClick={() => setOpen(true)}>+ إضافة صور</button>
      {msg && <span role="status" className="ms-2 text-xs text-muted">{msg}</span>}
      <MediaPickerDialog
        open={open}
        multiple
        onClose={() => setOpen(false)}
        onSelect={async (items) => {
          const fd = new FormData();
          fd.set("projectId", projectId);
          fd.set("mediaIds", items.map((i) => i.id).join(","));
          const res = await action(fd);
          setMsg(res.message ?? null);
          router.refresh();
        }}
      />
    </>
  );
}
