"use client";

import { createContext, useActionState, useContext, useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

export type ActionResult = { ok: boolean; message?: string; fieldErrors?: Record<string, string>; at?: number };
type FormAction = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

const ErrorsCtx = createContext<Record<string, string>>({});

/**
 * Server-action form with inline field errors and a status banner.
 * Children render server-side markup; fields read their error from context.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
  refresh = true,
}: {
  action: FormAction;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  refresh?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (!state?.ok) return;
    if (resetOnSuccess) ref.current?.reset();
    if (refresh) router.refresh();
  }, [state, resetOnSuccess, refresh, router]);

  return (
    <form ref={ref} action={formAction} className={className} noValidate>
      <ErrorsCtx.Provider value={state?.fieldErrors ?? {}}>
        {children}
        <FormStatusBanner state={state} />
      </ErrorsCtx.Provider>
    </form>
  );
}

function FormStatusBanner({ state }: { state: ActionResult | null }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!state?.message) return;
    setVisible(true);
    if (state.ok) {
      const t = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(t);
    }
  }, [state]);
  if (!state?.message || !visible) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={cn(
        "mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
        state.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700",
      )}
    >
      {state.ok ? <CheckCircle2 className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}
      {state.message}
    </p>
  );
}

export function useFieldError(name: string) {
  return useContext(ErrorsCtx)[name];
}

type BaseProps = { name: string; label: string; hint?: string; className?: string; required?: boolean };

function Wrapper({ name, label, hint, className, required, children, id }: BaseProps & { children: React.ReactNode; id: string }) {
  const error = useFieldError(name);
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label} {required && <span className="text-red-600" aria-hidden>*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p id={`${id}-err`} className="field-error">{error}</p>}
    </div>
  );
}

export function TextField(
  props: BaseProps & { defaultValue?: string | number | null; type?: string; dir?: "ltr" | "rtl"; placeholder?: string; maxLength?: number; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]; autoComplete?: string },
) {
  const id = useId();
  const error = useFieldError(props.name);
  return (
    <Wrapper {...props} id={id}>
      <input
        id={id}
        name={props.name}
        type={props.type ?? "text"}
        defaultValue={props.defaultValue ?? ""}
        dir={props.dir}
        placeholder={props.placeholder}
        maxLength={props.maxLength}
        inputMode={props.inputMode}
        autoComplete={props.autoComplete}
        required={props.required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-err` : undefined}
        className="field"
      />
    </Wrapper>
  );
}

export function TextArea(props: BaseProps & { defaultValue?: string | null; rows?: number; dir?: "ltr" | "rtl"; maxLength?: number }) {
  const id = useId();
  const error = useFieldError(props.name);
  return (
    <Wrapper {...props} id={id}>
      <textarea
        id={id}
        name={props.name}
        rows={props.rows ?? 4}
        defaultValue={props.defaultValue ?? ""}
        dir={props.dir}
        maxLength={props.maxLength}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-err` : undefined}
        className="field leading-7"
      />
    </Wrapper>
  );
}

export function SelectField(
  props: BaseProps & { defaultValue?: string | null; options: { value: string; label: string }[]; placeholder?: string },
) {
  const id = useId();
  const error = useFieldError(props.name);
  return (
    <Wrapper {...props} id={id}>
      <select id={id} name={props.name} defaultValue={props.defaultValue ?? ""} aria-invalid={Boolean(error)} className="field">
        {props.placeholder !== undefined && <option value="">{props.placeholder}</option>}
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Wrapper>
  );
}

export function Checkbox({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex items-start gap-2.5 text-sm text-ink">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 accent-navy" />
      <span>
        {label}
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function SubmitButton({ children, className, variant = "primary" }: { children: React.ReactNode; className?: string; variant?: "primary" | "outline" | "danger" }) {
  const { pending } = useFormStatus();
  const v = variant === "danger" ? "btn bg-red-600 text-white hover:bg-red-700" : variant === "outline" ? "btn-outline" : "btn-primary";
  return (
    <button type="submit" disabled={pending} className={cn(v, className)}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/** Small inline action (delete/archive/toggle) guarded by a confirmation dialog. */
export function ConfirmAction({
  action,
  label,
  confirm,
  fields,
  variant = "danger",
  className,
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  label: string;
  confirm?: string;
  fields?: Record<string, string>;
  variant?: "danger" | "outline" | "link";
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const run = async () => {
    dialogRef.current?.close();
    setPending(true);
    setError(null);
    const fd = new FormData();
    Object.entries(fields ?? {}).forEach(([k, v]) => fd.set(k, v));
    const res = await action(fd);
    setPending(false);
    if (!res.ok) setError(res.message ?? "تعذر تنفيذ الإجراء");
    else router.refresh();
  };

  const cls =
    variant === "link"
      ? "text-sm font-medium text-navy hover:underline disabled:opacity-50"
      : variant === "outline"
        ? "btn-outline px-3 py-1.5 text-xs"
        : "btn px-3 py-1.5 text-xs text-red-700 border border-red-200 hover:bg-red-600 hover:text-white";

  return (
    <span className="inline-flex flex-col">
      <button type="button" disabled={pending} className={cn(cls, className)} onClick={() => (confirm ? dialogRef.current?.showModal() : run())}>
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
        {label}
      </button>
      {error && <span role="alert" className="mt-1 text-xs text-red-600">{error}</span>}
      {confirm && (
        <dialog ref={dialogRef} className="m-auto w-[min(92vw,420px)] rounded-xl border border-line p-0 backdrop:bg-navy-950/40">
          <div className="p-5">
            <p className="font-semibold text-navy">تأكيد الإجراء</p>
            <p className="mt-2 text-sm leading-6 text-muted">{confirm}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-outline px-4 py-2" onClick={() => dialogRef.current?.close()} autoFocus>إلغاء</button>
              <button type="button" className="btn bg-red-600 px-4 py-2 text-white hover:bg-red-700" onClick={run}>{label}</button>
            </div>
          </div>
        </dialog>
      )}
    </span>
  );
}
