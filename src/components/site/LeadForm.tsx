"use client";

import { useId, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";

import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { track } from "@/lib/track-client";

type Props = {
  locale: Locale;
  t: Dictionary["forms"];
  sendLabel: string;
  sendingLabel: string;
  source: "PROJECT_INQUIRY" | "CONTACT_FORM";
  projectId?: string;
  unitId?: string;
  showEmail?: boolean;
  showMessage?: boolean;
  privacyHref: string;
};

export function LeadForm({ locale, t, sendLabel, sendingLabel, source, projectId, unitId, showEmail, showMessage, privacyHref }: Props) {
  const id = useId();
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const msg = (key: string) => (t as Record<string, string>)[key] ?? t.error;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState("sending");
    setErrors({});
    setFormError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          phone: fd.get("phone"),
          email: fd.get("email") ?? "",
          message: fd.get("message") ?? undefined,
          website: fd.get("website") ?? "",
          consent: fd.get("consent") === "on",
          source,
          projectId,
          unitId,
          locale,
          landingPage: window.location.pathname,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setState("done");
        track(source === "PROJECT_INQUIRY" ? "qualified_lead_submit" : "contact_form_submit", { project_id: projectId }, data.id);
        return;
      }
      if (data.fields) setErrors(data.fields);
      else setFormError(msg(data.error === "rateLimited" ? "rateLimited" : "error"));
    } catch {
      setFormError(t.error);
    }
    setState("idle");
  }

  if (state === "done") {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-xl bg-emerald-50 p-6 text-center text-emerald-800">
        <CheckCircle2 className="h-8 w-8" aria-hidden />
        <p className="text-sm leading-7">{t.success}</p>
      </div>
    );
  }

  const err = (f: string) =>
    errors[f] ? (
      <p id={`${id}-${f}-err`} className="field-error">
        {msg(errors[f]!)}
      </p>
    ) : null;
  const aria = (f: string) => ({ "aria-invalid": Boolean(errors[f]), "aria-describedby": errors[f] ? `${id}-${f}-err` : undefined });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div>
        <label htmlFor={`${id}-name`} className="field-label">{t.name}</label>
        <input id={`${id}-name`} name="name" required autoComplete="name" maxLength={120} placeholder={t.namePh} className="field" {...aria("name")} />
        {err("name")}
      </div>
      <div>
        <label htmlFor={`${id}-phone`} className="field-label">{t.phone}</label>
        <input id={`${id}-phone`} name="phone" required type="tel" inputMode="tel" autoComplete="tel" dir="ltr" maxLength={20} placeholder={t.phonePh} className="field text-start" {...aria("phone")} />
        {err("phone")}
      </div>
      {showEmail && (
        <div>
          <label htmlFor={`${id}-email`} className="field-label">{t.email}</label>
          <input id={`${id}-email`} name="email" type="email" autoComplete="email" dir="ltr" maxLength={200} className="field text-start" {...aria("email")} />
          {err("email")}
        </div>
      )}
      {showMessage && (
        <div>
          <label htmlFor={`${id}-message`} className="field-label">{t.message}</label>
          <textarea id={`${id}-message`} name="message" rows={4} maxLength={2000} className="field" />
        </div>
      )}
      <div className="hidden" aria-hidden>
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div>
        <label className="flex items-start gap-2.5 text-xs leading-6 text-muted">
          <input type="checkbox" name="consent" className="mt-1 h-4 w-4 accent-navy" {...aria("consent")} />
          <span>
            {t.consent}{" "}
            <a href={privacyHref} className="font-medium text-navy underline underline-offset-2">↗</a>
          </span>
        </label>
        {err("consent")}
      </div>
      {formError && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
      <button type="submit" disabled={state === "sending"} className="btn-primary w-full py-3">
        <Send className="h-4 w-4 flip-rtl" aria-hidden />
        {state === "sending" ? sendingLabel : sendLabel}
      </button>
    </form>
  );
}
