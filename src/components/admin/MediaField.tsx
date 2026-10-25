"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, ImagePlus, Loader2, Upload, X } from "lucide-react";

import { useFieldError } from "./forms";

type MediaItem = { id: string; url: string; mimeType: string; originalName: string };

export async function uploadFiles(files: FileList | File[]): Promise<{ items: MediaItem[]; error?: string }> {
  const fd = new FormData();
  Array.from(files).forEach((f) => fd.append("file", f));
  const res = await fetch("/api/admin/media", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  return { items: data.items ?? data.created ?? [], error: res.ok ? undefined : data.error ?? "تعذر الرفع" };
}

/** Media library dialog: browse uploaded files or upload new ones. */
export function MediaPickerDialog({
  open,
  onClose,
  onSelect,
  multiple,
  accept = "image",
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (items: MediaItem[]) => void;
  multiple?: boolean;
  accept?: "image" | "all";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/admin/media?page=${page}&type=${accept === "all" ? "all" : "image"}`)
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items ?? []);
        setPages(d.pages ?? 1);
      })
      .finally(() => setLoading(false));
  }, [open, page, accept]);

  const onUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setLoading(true);
    setError(null);
    const { items: up, error: err } = await uploadFiles(files);
    setLoading(false);
    if (err) setError(err);
    if (up.length) {
      setItems((prev) => [...up, ...prev]);
      setSelected((s) => (multiple ? [...s, ...up.map((u) => u.id)] : [up[0]!.id]));
    }
  };

  const toggle = (id: string) => setSelected((s) => (multiple ? (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]) : [id]));

  return (
    <dialog ref={ref} onClose={onClose} className="m-auto w-[min(96vw,900px)] rounded-xl border border-line p-0 backdrop:bg-navy-950/40">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <p className="font-semibold text-navy">مكتبة الوسائط</p>
        <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded p-1 hover:bg-beige-50"><X className="h-5 w-5" /></button>
      </div>
      <div className="max-h-[65vh] overflow-y-auto p-5">
        <label className="mb-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-sand p-4 text-sm text-sand-700 hover:bg-beige-50">
          <Upload className="h-4 w-4" /> رفع ملفات جديدة (JPG, PNG, WEBP{accept === "all" ? ", PDF" : ""})
          <input type="file" className="sr-only" multiple accept={accept === "all" ? "image/jpeg,image/png,image/webp,application/pdf" : "image/jpeg,image/png,image/webp"} onChange={(e) => onUpload(e.target.files)} />
        </label>
        {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
        {loading && <Loader2 className="mx-auto h-6 w-6 animate-spin text-sand-600" />}
        {!loading && !items.length && <p className="py-8 text-center text-sm text-muted">لا توجد ملفات بعد</p>}
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {items.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => toggle(m.id)} aria-pressed={selected.includes(m.id)} className="relative block aspect-square w-full overflow-hidden rounded-lg border-2 border-transparent bg-beige-50 aria-pressed:border-navy">
                {m.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={m.originalName} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <span className="flex h-full flex-col items-center justify-center gap-1 p-2 text-xs text-muted"><FileText className="h-6 w-6" />{m.originalName}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
        {pages > 1 && (
          <div className="mt-4 flex justify-center gap-2 text-sm">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-outline px-3 py-1">السابق</button>
            <span className="self-center">{page} / {pages}</span>
            <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="btn-outline px-3 py-1">التالي</button>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <button type="button" className="btn-outline" onClick={onClose}>إلغاء</button>
        <button
          type="button"
          className="btn-primary"
          disabled={!selected.length}
          onClick={() => {
            onSelect(items.filter((i) => selected.includes(i.id)));
            setSelected([]);
            onClose();
          }}
        >
          اختيار ({selected.length})
        </button>
      </div>
    </dialog>
  );
}

/** Form field holding a single media id (hidden input) with preview + picker. */
export function MediaField({
  name,
  label,
  defaultValue,
  accept = "image",
  hint,
}: {
  name: string;
  label: string;
  defaultValue?: { id: string; url: string; mimeType?: string } | null;
  accept?: "image" | "all";
  hint?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? null);
  const [open, setOpen] = useState(false);
  const error = useFieldError(name);
  const isImage = !value?.mimeType || value.mimeType.startsWith("image/");
  return (
    <div>
      <p className="field-label">{label}</p>
      <input type="hidden" name={name} value={value?.id ?? ""} />
      <div className="flex items-center gap-3">
        <div className="relative flex h-24 w-32 items-center justify-center overflow-hidden rounded-lg border border-line bg-beige-50">
          {value ? (
            isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value.url} alt="" className="h-full w-full object-cover" />
            ) : (
              <FileText className="h-8 w-8 text-muted" />
            )
          ) : (
            <ImagePlus className="h-7 w-7 text-sand" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" className="btn-outline px-3 py-1.5 text-xs" onClick={() => setOpen(true)}>{value ? "تغيير" : "اختيار / رفع"}</button>
          {value && <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => setValue(null)}>إزالة</button>}
        </div>
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="field-error">{error}</p>}
      <MediaPickerDialog open={open} onClose={() => setOpen(false)} accept={accept} onSelect={(items) => items[0] && setValue(items[0])} />
    </div>
  );
}
