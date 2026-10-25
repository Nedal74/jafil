"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { createFirstAdmin } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full py-3">
      {pending && <Loader2 className="h-4 w-4 animate-spin" />} إنشاء الحساب والدخول
    </button>
  );
}

export function SetupForm({ needsKey }: { needsKey: boolean }) {
  const [state, action] = useActionState(createFirstAdmin, null);
  return (
    <form action={action} className="space-y-4">
      {needsKey && (
        <div>
          <label htmlFor="setupKey" className="field-label">مفتاح الإعداد (SETUP_KEY)</label>
          <input id="setupKey" name="setupKey" type="password" required dir="ltr" autoComplete="off" className="field text-start" />
        </div>
      )}
      <div>
        <label htmlFor="name" className="field-label">الاسم</label>
        <input id="name" name="name" required className="field" autoComplete="name" />
      </div>
      <div>
        <label htmlFor="email" className="field-label">البريد الإلكتروني</label>
        <input id="email" name="email" type="email" required dir="ltr" className="field text-start" autoComplete="username" />
      </div>
      <div>
        <label htmlFor="password" className="field-label">كلمة المرور</label>
        <input id="password" name="password" type="password" required dir="ltr" className="field text-start" autoComplete="new-password" />
        <p className="mt-1 text-xs text-muted">10 أحرف على الأقل، حروف وأرقام.</p>
      </div>
      {state?.error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <Submit />
    </form>
  );
}
