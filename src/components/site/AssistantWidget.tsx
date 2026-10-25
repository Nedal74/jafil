"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, MessageSquareText, RotateCcw, Send, X } from "lucide-react";

import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { track } from "@/lib/track-client";

type Criteria = {
  propertyTypeKey?: string | null;
  location?: string | null;
  budgetMax?: number | null;
  bedrooms?: number | null;
  areaMin?: number | null;
  areaMax?: number | null;
};

type Result = {
  projectId: string;
  name: string;
  place: string;
  href: string;
  priceFrom: string | null;
  basis: "units" | "project";
  units: { id: string; reference: string; price: string | null; area: string | null; bedrooms: number | null }[];
};

type Msg =
  | { id: number; role: "assistant" | "user"; text: string }
  | { id: number; role: "results"; results: Result[] };

type Step = "type" | "location" | "budget" | "bedrooms" | "area" | "done" | "lead" | "leadDone";

function visitorKey(): string {
  try {
    let k = localStorage.getItem("aljafil-vk");
    if (!k) {
      k = Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, "0")).join("");
      localStorage.setItem("aljafil-vk", k);
    }
    return k;
  } catch {
    return "anon" + Math.random().toString(36).slice(2).padEnd(20, "0");
  }
}

export function AssistantWidget({
  locale,
  t,
  forms,
  welcome,
  types,
  privacyHref,
}: {
  locale: Locale;
  t: Dictionary["assistant"];
  forms: Dictionary["forms"];
  welcome: string;
  types: { key: string; label: string }[];
  privacyHref: string;
}) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [step, setStep] = useState<Step>("type");
  const [criteria, setCriteria] = useState<Criteria>({});
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [locationDraft, setLocationDraft] = useState("");
  const [leadErr, setLeadErr] = useState<string | null>(null);
  const idRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  type NewMsg = { role: "assistant" | "user"; text: string } | { role: "results"; results: Result[] };
  const push = (m: NewMsg) => setMsgs((prev) => [...prev, { ...m, id: ++idRef.current } as Msg]);

  const start = () => {
    idRef.current = 0;
    setMsgs([
      { id: ++idRef.current, role: "assistant", text: welcome },
      { id: ++idRef.current, role: "assistant", text: t.qType },
    ]);
    setStep("type");
    setCriteria({});
    setConversationId(undefined);
  };

  useEffect(() => {
    if (open && msgs.length === 0) start();
    if (open) track("assistant_open", {}, "session");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs, step]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("button, input")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function search(next: Criteria, userText?: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "message", visitorKey: visitorKey(), conversationId, locale, criteria: next, text: userText }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error);
      setConversationId(data.conversationId);
      setCriteria(data.criteria ?? next);
      push({ role: "assistant", text: data.reply });
      if (data.results?.length) push({ role: "results", results: data.results });
      setStep("done");
    } catch {
      push({ role: "assistant", text: t.error });
    } finally {
      setBusy(false);
    }
  }

  function answer(label: string, patch: Criteria, nextStep: Step, question?: string) {
    push({ role: "user", text: label });
    const next = { ...criteria, ...patch };
    setCriteria(next);
    if (nextStep === "done") {
      void search(next);
    } else {
      if (question) push({ role: "assistant", text: question });
      setStep(nextStep);
    }
  }

  async function sendText(e: React.FormEvent) {
    e.preventDefault();
    const v = text.trim();
    if (!v || busy) return;
    setText("");
    push({ role: "user", text: v });
    await search(criteria, v);
  }

  async function submitLead(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLeadErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "lead",
          visitorKey: visitorKey(),
          conversationId,
          locale,
          name: fd.get("name"),
          phone: fd.get("phone"),
          consent: fd.get("consent") === "on",
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        push({ role: "assistant", text: t.leadDone });
        setStep("leadDone");
        track("qualified_lead_submit", { source: "assistant" }, data.leadId);
      } else {
        const key = data.fields ? Object.values(data.fields)[0] : data.error;
        setLeadErr((forms as Record<string, string>)[key as string] ?? t.error);
      }
    } catch {
      setLeadErr(t.error);
    } finally {
      setBusy(false);
    }
  }

  const chip =
    "rounded-full border border-navy/15 bg-white px-3.5 py-1.5 text-sm text-navy transition-colors hover:border-navy hover:bg-navy hover:text-white disabled:opacity-50";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="assistant-panel"
        className="fixed bottom-5 end-5 z-40 flex items-center gap-2 rounded-full bg-navy px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgb(13_26_42/0.6)] transition-transform hover:-translate-y-0.5"
      >
        {open ? <X className="h-5 w-5" aria-hidden /> : <MessageSquareText className="h-5 w-5" aria-hidden />}
        <span className="hidden sm:inline">{t.open}</span>
        <span className="sr-only sm:hidden">{t.open}</span>
      </button>

      {open && (
        <div
          id="assistant-panel"
          ref={panelRef}
          role="dialog"
          aria-label={t.title}
          className="fixed inset-x-3 bottom-20 z-40 flex max-h-[min(640px,calc(100dvh-7rem))] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_20px_60px_-20px_rgb(13_26_42/0.45)] sm:inset-x-auto sm:end-5 sm:w-[380px]"
        >
          <div className="flex items-start justify-between gap-3 bg-navy px-4 py-3.5 text-white">
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-sand/90 text-navy-950"><Bot className="h-5 w-5" aria-hidden /></span>
              <div>
                <p className="font-semibold">{t.title}</p>
                <p className="text-xs text-beige/75">{t.subtitle}</p>
              </div>
            </div>
            <button type="button" onClick={start} className="rounded-md p-1.5 text-beige/80 hover:bg-white/10 hover:text-white" aria-label={t.restart} title={t.restart}>
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-beige-50 px-4 py-4" aria-live="polite">
            {msgs.map((m) =>
              m.role === "results" ? (
                <ul key={m.id} className="space-y-2">
                  {m.results.map((r) => (
                    <li key={r.projectId} className="rounded-xl border border-line bg-white p-3">
                      <Link href={r.href} className="font-semibold text-navy hover:underline" onClick={() => setOpen(false)}>{r.name}</Link>
                      {r.place && <p className="text-xs text-muted">{r.place}</p>}
                      {r.priceFrom && <p className="mt-1 text-sm text-ink">{locale === "ar" ? "تبدأ من" : "From"} <strong>{r.priceFrom}</strong></p>}
                      {r.units.length > 0 && (
                        <ul className="mt-2 space-y-1 border-t border-line pt-2 text-xs text-muted">
                          {r.units.map((u) => (
                            <li key={u.id} className="flex flex-wrap gap-x-3">
                              <span className="font-medium text-ink">#{u.reference}</span>
                              {u.price && <span>{u.price}</span>}
                              {u.area && <span>{u.area}</span>}
                              {u.bedrooms != null && <span>{u.bedrooms} {locale === "ar" ? "غرف" : "BR"}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p
                  key={m.id}
                  className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm leading-6 ${
                    m.role === "user" ? "ms-auto bg-navy text-white" : "bg-white text-ink shadow-sm"
                  }`}
                >
                  {m.text}
                </p>
              ),
            )}
            {busy && <Loader2 className="h-5 w-5 animate-spin text-sand-600" aria-label="loading" />}

            {!busy && step === "type" && (
              <div className="flex flex-wrap gap-2">
                {types.map((ty) => (
                  <button key={ty.key} type="button" className={chip} onClick={() => answer(ty.label, { propertyTypeKey: ty.key }, "location", t.qLocation)}>
                    {ty.label}
                  </button>
                ))}
                <button type="button" className={chip} onClick={() => answer(t.skip, {}, "location", t.qLocation)}>{t.skip}</button>
              </div>
            )}
            {!busy && step === "location" && (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = locationDraft.trim();
                  setLocationDraft("");
                  answer(v || t.anyLocation, v ? { location: v } : {}, "budget", t.qBudget);
                }}
              >
                <input value={locationDraft} onChange={(e) => setLocationDraft(e.target.value)} maxLength={80} className="field py-1.5" aria-label={t.qLocation} />
                <button type="submit" className={chip}>{locationDraft.trim() ? "✓" : t.anyLocation}</button>
              </form>
            )}
            {!busy && step === "budget" && (
              <div className="flex flex-wrap gap-2">
                {t.budgets.map((b) => (
                  <button key={b.label} type="button" className={chip} onClick={() => answer(b.label, { budgetMax: b.max }, "bedrooms", t.qBedrooms)}>{b.label}</button>
                ))}
              </div>
            )}
            {!busy && step === "bedrooms" && (
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" className={chip} onClick={() => answer(n === 5 ? "5+" : String(n), { bedrooms: n }, "area", t.qArea)}>{n === 5 ? "5+" : n}</button>
                ))}
                <button type="button" className={chip} onClick={() => answer(t.skip, {}, "area", t.qArea)}>{t.skip}</button>
              </div>
            )}
            {!busy && step === "area" && (
              <div className="flex flex-wrap gap-2">
                {t.areas.map((a) => (
                  <button key={a.label} type="button" className={chip} onClick={() => answer(a.label, { areaMin: a.min, areaMax: a.max }, "done")}>{a.label}</button>
                ))}
                <button type="button" className={chip} onClick={() => answer(t.skip, {}, "done")}>{t.skip}</button>
              </div>
            )}
            {!busy && step === "done" && (
              <button type="button" className="btn-sand w-full" onClick={() => { push({ role: "assistant", text: t.leadIntro }); setStep("lead"); }}>
                {t.talkToSales}
              </button>
            )}
            {step === "lead" && (
              <form onSubmit={submitLead} className="space-y-2 rounded-xl border border-line bg-white p-3" noValidate>
                <input name="name" required maxLength={120} placeholder={forms.namePh} aria-label={forms.name} className="field py-2" autoComplete="name" />
                <input name="phone" required type="tel" dir="ltr" maxLength={20} placeholder={forms.phonePh} aria-label={forms.phone} className="field py-2 text-start" autoComplete="tel" />
                <label className="flex items-start gap-2 text-xs leading-5 text-muted">
                  <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 accent-navy" />
                  <span>{t.leadConsent} <a href={privacyHref} className="text-navy underline">↗</a></span>
                </label>
                {leadErr && <p role="alert" className="text-xs text-red-600">{leadErr}</p>}
                <button type="submit" disabled={busy} className="btn-primary w-full">{t.leadSubmit}</button>
              </form>
            )}
          </div>

          <form onSubmit={sendText} className="flex items-center gap-2 border-t border-line bg-white p-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              placeholder={t.placeholder}
              aria-label={t.placeholder}
              className="field flex-1 py-2"
              disabled={busy}
            />
            <button type="submit" disabled={busy || !text.trim()} className="btn-primary h-10 w-10 p-0" aria-label={t.send}>
              <Send className="h-4 w-4 flip-rtl" aria-hidden />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
