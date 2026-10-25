# النشر على Vercel + Supabase (خطوة بخطوة)

النتيجة: موقع على الإنترنت، قاعدة بيانات وصور على Supabase، والجداول تُنشأ تلقائياً مع كل نشر.

---

## 1) Supabase — أنشئ المشروع وانسخ 4 قيم

1. ادخل https://supabase.com → **New project**. احفظ **Database Password** التي تختارها (ستحتاجها).
   اختر منطقة قريبة (مثلاً Frankfurt أو Bahrain إن توفرت).
2. اضغط زر **Connect** أعلى الصفحة → تبويب **Connection String** (نوع URI):
   - **Transaction pooler** (المنفذ `6543`) → هذه قيمة `DATABASE_URL`،
     **وأضف في آخرها:** `?pgbouncer=true&connection_limit=1`
   - **Session pooler** (المنفذ `5432`) → هذه قيمة `DIRECT_URL` (تُستخدم لإنشاء الجداول).
   - في الرابطين استبدل `[YOUR-PASSWORD]` بكلمة سر قاعدة البيانات.
     إن كانت فيها رموز مثل `@` `#` `/` اكتبها مرمّزة (`@` = `%40`، `#` = `%23`، `/` = `%2F`) أو غيّر كلمة السر لحروف وأرقام فقط.
3. **Project Settings → API Keys**:
   - **Secret key** (يبدأ بـ `sb_secret_`) → قيمة `SUPABASE_SERVICE_ROLE_KEY`
     (وليس `sb_publishable`).
4. **Project Settings → General / Data API**: انسخ **Project URL** (شكله `https://xxxx.supabase.co`) → قيمة `NEXT_PUBLIC_SUPABASE_URL`.

> لا تحتاج إنشاء Bucket للصور يدوياً؛ الموقع ينشئ bucket عاماً اسمه `media` عند أول رفع.

مثال شكل الرابطين:
```
DATABASE_URL=postgresql://postgres.abcd:PASS@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.abcd:PASS@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

---

## 2) Vercel — اربط المستودع وأضف المتغيرات

1. https://vercel.com/new → استورد مستودع GitHub.
2. **Root Directory**: إن كان المستودع يحتوي مجلد `aljafil` بداخله، اختر `aljafil`.
   إن رفعت محتوى المجلد مباشرة في جذر المستودع اتركه كما هو.
3. Framework: **Next.js** (يُكتشف تلقائياً). لا تغيّر أوامر Build.
4. **Environment Variables** — أضف التالي (لـ Production و Preview):

| Key | Value |
|---|---|
| `DATABASE_URL` | رابط Transaction pooler + `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | رابط Session pooler (5432) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` |
| `NEXT_PUBLIC_SITE_URL` | رابط موقعك، مثل `https://aljafil.vercel.app` (بدون `/` في الآخر) |
| `SETUP_KEY` | أي كلمة سرية تختارها (لإنشاء أول حساب مدير) |
| `TZ` | `Asia/Riyadh` |

5. **Deploy**. أثناء البناء ستظهر في السجل: `Applying database migrations` ثم `Seeded …` = الجداول أُنشئت.

> لو كان المشروع منشوراً قبل إضافة المتغيرات: **Deployments → آخر نشر → ⋯ → Redeploy**.
> المتغيرات التي تبدأ بـ `NEXT_PUBLIC_` تُقرأ وقت البناء، فأي تعديل عليها يحتاج Redeploy.

---

## 3) أنشئ حساب المدير من المتصفح

افتح `https://موقعك/admin` → ستُحوَّل لصفحة **إعداد حساب مدير النظام**:
أدخل `SETUP_KEY` الذي وضعته في Vercel + اسمك وبريدك وكلمة مرور (10 أحرف، حروف وأرقام).
الصفحة تعمل مرة واحدة فقط ثم تُغلق تلقائياً.

بعدها أضف المشاريع والوحدات والصور من لوحة التحكم.

---

## مشاكل شائعة

| المشكلة | الحل |
|---|---|
| `Environment variable not found: DATABASE_URL` | المتغير غير مضاف أو مضاف لبيئة أخرى (Preview فقط مثلاً) → أضفه ثم Redeploy |
| `DIRECT_URL is not set: database migrations were skipped` في سجل البناء | أضف `DIRECT_URL` ثم Redeploy |
| `prepared statement "s0" already exists` | نسيت `?pgbouncer=true&connection_limit=1` في آخر `DATABASE_URL` |
| `Can't reach database server` | كلمة السر خطأ أو تحتوي رموزاً غير مرمّزة، أو استخدمت رابط Direct connection بدل Pooler |
| الصور لا تُرفع | تأكد من `NEXT_PUBLIC_SUPABASE_URL` و`SUPABASE_SERVICE_ROLE_KEY` (Secret key)، ثم Redeploy. الحد الأقصى للملف على Vercel ‏4MB |
| صفحة الإعداد تطلب إضافة SETUP_KEY | أضف `SETUP_KEY` في Vercel ثم Redeploy |

**الأمان:** لا تضع هذه القيم في الكود ولا في GitHub — فقط في إعدادات Vercel.
للتجربة على جهازك لا تحتاج أياً من هذا: `npm run dev` يكفي (راجع START-HERE.md).
