"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Briefcase, Building, CalendarDays, Landmark, Phone, Send, User } from "lucide-react";

import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { track } from "@/lib/track-client";

type Props = {
  locale: Locale;
  t: Dictionary["financing"];
  forms: Dictionary["forms"];
  banks: { value: string; label: string }[];
  sar: string;
  sendingLabel: string;
  privacyHref: string;
};

export function FinancingForm({ locale, t, forms, banks, sar, sendingLabel, privacyHref }: Props) {
  const id = useId();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const message = (key: string) =>
    (t.errors as Record<string, string>)[key] ?? (forms as Record<string, string>)[key] ?? forms.error;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setErrors({});
    setFormError(null);
    try {
      const res = await fetch("/api/financing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operation: fd.get("operation"),
          fullName: fd.get("fullName"),
          phone: fd.get("phone"),
          monthlySalary: fd.get("monthlySalary"),
          employerSector: fd.get("employerSector") || undefined,
          bank: fd.get("bank") ?? "",
          monthlyObligations: fd.get("monthlyObligations"),
          hasRealEstateLoan: fd.get("hasRealEstateLoan") ?? undefined,
          age: fd.get("age"),
          consent: fd.get("consent") === "on",
          website: fd.get("website") ?? "",
          locale,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        track("financing_submit", {}, data.reference);
        router.push(`/${locale}/financing/thank-you?ref=${encodeURIComponent(data.reference)}`);
        return;
      }
      if (data.fields) {
        setErrors(data.fields);
        const first = Object.keys(data.fields)[0];
        document.getElementById(`${id}-${first}`)?.focus();
      } else setFormError(message(data.error === "rateLimited" ? "rateLimited" : "error"));
    } catch {
      setFormError(forms.error);
    }
    setBusy(false);
  }

  const err = (f: string) => (errors[f] ? <p id={`${id}-${f}-err`} className="field-error">{message(errors[f]!)}</p> : null);
  const aria = (f: string) => ({ id: `${id}-${f}`, "aria-invalid": Boolean(errors[f]), "aria-describedby": errors[f] ? `${id}-${f}-err` : undefined });
  const iconCls = "pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted";

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-x-8 gap-y-5 md:grid-cols-2">
      <div className="md:col-span-2 md:max-w-[calc(50%-1rem)]">
        <label htmlFor={`${id}-operation`} className="field-label">{t.operation}</label>
        <select name="operation" className="field" defaultValue="PURCHASE" {...aria("operation")}>
          {(Object.keys(t.operations) as (keyof typeof t.operations)[]).map((k) => <option key={k} value={k}>{t.operations[k]}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor={`${id}-fullName`} className="field-label">{t.fullName}</label>
        <div className="relative">
          <User className={iconCls} aria-hidden />
          <input name="fullName" autoComplete="name" maxLength={150} placeholder={t.fullNamePh} className="field ps-10" {...aria("fullName")} />
        </div>
        {err("fullName")}
      </div>
      <div>
        <label htmlFor={`${id}-phone`} className="field-label">{forms.phone}</label>
        <div className="relative">
          <Phone className={iconCls} aria-hidden />
          <input name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" maxLength={20} placeholder="05XXXXXXXX" className="field px-10 text-start" {...aria("phone")} />
        </div>
        {err("phone")}
      </div>

      <div>
        <label htmlFor={`${id}-employerSector`} className="field-label">{t.employer}</label>
        <div className="relative">
          <Briefcase className={iconCls} aria-hidden />
          <select name="employerSector" defaultValue="" className="field ps-10" {...aria("employerSector")}>
            <option value="" disabled>{t.employerPh}</option>
            {(Object.keys(t.employers) as (keyof typeof t.employers)[]).map((k) => <option key={k} value={k}>{t.employers[k]}</option>)}
          </select>
        </div>
        {err("employerSector")}
      </div>
      <div>
        <label htmlFor={`${id}-monthlySalary`} className="field-label">{t.salary}</label>
        <div className="relative">
          <Banknote className={iconCls} aria-hidden />
          <input name="monthlySalary" inputMode="numeric" placeholder={t.salaryPh} className="field pe-14 ps-10" {...aria("monthlySalary")} />
          <span className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">{sar}</span>
        </div>
        {err("monthlySalary")}
      </div>

      <div>
        <label htmlFor={`${id}-bank`} className="field-label">{t.bank}</label>
        <div className="relative">
          <Landmark className={iconCls} aria-hidden />
          <select name="bank" defaultValue="" className="field ps-10" {...aria("bank")}>
            <option value="" disabled>{t.bankPh}</option>
            {banks.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </div>
        {err("bank")}
      </div>
      <div>
        <label htmlFor={`${id}-monthlyObligations`} className="field-label">{t.obligations}</label>
        <div className="relative">
          <Building className={iconCls} aria-hidden />
          <input name="monthlyObligations" inputMode="numeric" placeholder={t.obligationsPh} className="field pe-14 ps-10" {...aria("monthlyObligations")} />
          <span className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">{sar}</span>
        </div>
        {err("monthlyObligations")}
      </div>

      <div>
        <label htmlFor={`${id}-age`} className="field-label">{t.age}</label>
        <div className="relative">
          <CalendarDays className={iconCls} aria-hidden />
          <input name="age" inputMode="numeric" maxLength={2} placeholder={t.agePh} className="field ps-10" {...aria("age")} />
        </div>
        {err("age")}
      </div>
      <fieldset aria-describedby={errors.hasRealEstateLoan ? `${id}-hasRealEstateLoan-err` : undefined}>
        <legend className="field-label">{t.existingLoan}</legend>
        <div className="flex gap-8 pt-2" id={`${id}-hasRealEstateLoan`} tabIndex={-1}>
          <label className="flex items-center gap-2 text-sm"><input type="radio" name="hasRealEstateLoan" value="yes" className="h-5 w-5 accent-navy" />{t.yes}</label>
          <label className="flex items-center gap-2 text-sm"><input type="radio" name="hasRealEstateLoan" value="no" className="h-5 w-5 accent-navy" />{t.no}</label>
        </div>
        {err("hasRealEstateLoan")}
      </fieldset>

      <div className="hidden" aria-hidden><input name="website" tabIndex={-1} autoComplete="off" /></div>

      <div className="md:col-span-2">
        <label className="flex items-start gap-2.5 text-sm leading-6 text-muted">
          <input type="checkbox" name="consent" className="mt-1 h-4 w-4 accent-navy" {...aria("consent")} />
          <span>{t.consent} <a href={privacyHref} className="font-medium text-navy underline">↗</a></span>
        </label>
        {err("consent")}
      </div>

      {formError && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">{formError}</p>}
      <button type="submit" disabled={busy} className="btn-primary py-3.5 text-base md:col-span-2">
        <Send className="h-4 w-4 flip-rtl" aria-hidden /> {busy ? sendingLabel : t.submit}
      </button>
    </form>
  );
}
