# Masaken Aljafil Real Estate — website & admin dashboard

**مساكن الجافل العقارية** · info@aljafil.com · 0570800002 / 0570900002 · Riyadh, Dhahrat Laban, Al Rimal Street

Bilingual (Arabic RTL / English LTR) real estate website with a protected admin
dashboard, sales CRM, financing applications and a grounded AI property assistant.
All projects, units, prices, images, articles and company content are managed
from `/admin` — no code changes needed, and no demo listings are shipped.

> This app lives in the `aljafil/` subdirectory. The repository root contains a
> separate, unrelated portfolio application that was intentionally left untouched.
> See `IMPLEMENTATION_PLAN.md`.

---

## Contents

1. [Features](#features)
2. [Local development](#local-development)
3. [Creating the admin account](#creating-the-admin-account)
4. [Environment variables](#environment-variables)
5. [Production deployment](#production-deployment)
6. [Google integration setup](#google-integration-setup)
7. [AI provider setup](#ai-provider-setup)
8. [Backup and recovery](#backup-and-recovery)
9. [Security notes](#security-notes)
10. [Testing](#testing)
11. [Test results](#test-results)
12. [Known limitations](#known-limitations)

---

## Features

**Public site** (`/ar/...`, `/en/...`): home (hero carousel of featured projects,
search panel, intro, chairman's message, featured/current/completed projects,
statistics, advantages, latest news, sales CTA), about (vision/mission layout
inspired by the reference), projects with filters and pagination, project detail
(gallery + lightbox, units table with status filter, info table, nearby places,
amenities/facilities/guarantees, sticky inquiry bar, project inquiry form,
WhatsApp/call CTAs, related projects, JSON-LD), financing request form (modelled
on the reference) with confirmation page and reference number, news list and
article pages, contact page, privacy policy, localized 404. Every section has a
polished empty state; nothing is fabricated.

**Dashboard** (`/admin`, Arabic RTL): overview analytics, homepage section editor
(enable/disable, reorder, titles), projects (full CRUD, draft/publish/archive,
gallery, features, nearby, SEO fields), unit inventory (per project + global
search, bulk status updates, floor plans), property types, leads CRM (pipeline,
filters, assignment, notes, activity history, duplicate flagging, CSV export),
financing applications (status, assignment, notes, export, deletion), articles,
company profile & chairman's message, contact & social links, media library,
SEO (defaults, verification tag, indexing switch, redirects), Google
integrations, AI assistant configuration & conversations, users & roles, audit
log, site settings.

**Roles**: Super Admin, Content Editor, Sales Agent, Financing Manager — the full
matrix is shown on `/admin/users` and defined in `src/lib/auth/permissions.ts`.

### Inventory & sales percentage

Each project chooses a denominator (`Project.inventoryBasis`):

- **Listed units** (default): all units except `UNPUBLISHED`.
- **Manual total**: `manualInventoryTotal`, for phases whose full inventory is not
  entered unit-by-unit. If missing, it falls back to listed units; if more units
  are recorded than the manual total, the dashboard warns.

Sold % = `SOLD` (+ `RESERVED` when *Settings → count reserved as sold* is on) ÷
denominator. A zero denominator shows "—" (no division by zero).

Public price/area/bedroom **ranges** are either derived automatically from listed
units (`AUTO_FROM_UNITS`, recalculated on every unit change; sold units don't
affect the price range) or entered manually (`MANUAL`, with warnings when units
fall outside them). This keeps project-level and unit-level data consistent.

### AI property assistant

1. Guided questions (type → location → budget → bedrooms → area) and free text.
2. Criteria are extracted deterministically (Arabic/English, Arabic-Indic digits);
   if an API key is configured, Claude also extracts criteria using a strict JSON
   schema restricted to the configured property-type keys.
3. **Matching is a deterministic database filter** over published projects and
   `AVAILABLE` units only (`src/lib/assistant/match.ts`). Every stated criterion is
   a hard filter; when nothing matches the assistant says so and offers a sales
   follow-up.
4. With a key, Claude phrases a short reply using only the retrieved records.
   Result cards always come from the database, not from model text.
5. The model has no database access, no tools and never sees customer or
   financing data. Without a key (or on provider errors) everything still works.
6. Lead hand-off requires explicit consent; the conversation is linked to the lead.
   Conversations are purged after the configured retention period.

---

## Local development

### Quickest: one command, no database to install

```bash
cd aljafil
npm install
npm run local      # or: npm run dev
```

With no `DATABASE_URL` configured, `npm run dev` does the same as
`npm run local` (use `npm run dev:next` to run plain `next dev`).
`npm run local` runs PGlite (PostgreSQL compiled to WebAssembly, executed inside
Node — no native binaries, so it behaves the same on Windows, macOS and Linux,
including folder paths with spaces), keeps its data in `storage/pglite`, applies
migrations, seeds structural config, creates a local admin on the first run and
starts the site at http://localhost:3000. Ctrl+C stops everything.

Local admin: `admin@aljafil.local` / `Aljafil12345` — change it in /admin/users.
For local preview only; production uses a normal PostgreSQL server.

### Using your own PostgreSQL

Requirements: Node.js 20+ (tested on 22), PostgreSQL 14+ (tested on 16).

```bash
cd aljafil
cp .env.example .env            # set DATABASE_URL
npm install                     # also runs `prisma generate`
npx prisma migrate deploy       # or `npm run db:migrate` while developing the schema
npm run db:seed                 # property types + homepage section slots only
npm run admin:create -- --email you@aljafil.com --name "Your Name"
npm run dev                     # http://localhost:3000 → redirects to /ar
```

Useful scripts:

| Script | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev server / production build / production server |
| `npm run typecheck` / `lint` | TypeScript / ESLint |
| `npm test` | Unit + integration tests (needs the test DB, see Testing) |
| `npm run test:e2e` | Playwright browser tests (run `npm run build` first) |
| `npm run db:migrate` / `db:deploy` | Create / apply migrations |
| `npm run db:seed` | Seed structural config (idempotent) |
| `npm run admin:create` | Create or reset a Super Admin |

## Creating the admin account

```bash
npm run admin:create -- --email admin@aljafil.com --name "مدير النظام"
```

The password is prompted for (hidden) or read from `ADMIN_PASSWORD`. Policy:
10+ characters with letters and digits. Running it again for the same email
resets the password, re-enables the account and signs out its sessions. Further
users are created from **/admin/users** with a role.

## Environment variables

See `.env.example` (all documented there). Summary:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `NEXT_PUBLIC_SITE_URL` | prod | Canonical origin, no trailing slash |
| `STORAGE_DIR` | no | Upload directory (default `./storage/uploads`) — must be persistent |
| `NOTIFY_WEBHOOK_URL` | no | New lead / financing alerts |
| `ANTHROPIC_API_KEY`, `ASSISTANT_MODEL` | no | AI assistant language model |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | no | Search Console / GA4 reports in the dashboard |

`.env` is git-ignored; never commit real credentials. Set `TZ=Asia/Riyadh` on the
server so scheduled article dates are interpreted in Riyadh time.

## Production deployment

No hosting provider was configured in this repository, so nothing was deployed.
The app is portable; recommended options:

**A. VPS / container (simplest, fully supported today)**

```bash
cd aljafil
npm ci
npx prisma migrate deploy
npm run build
NODE_ENV=production npm start -- -p 3000   # behind Nginx/Caddy with HTTPS
```

- Mount `STORAGE_DIR` on a persistent, backed-up volume.
- Terminate TLS at the reverse proxy; forward `X-Forwarded-For` and `Host`.
- Production cookies are `Secure`, `HttpOnly`, `SameSite=Lax`, `__Host-` prefixed.
- Run `npm run db:seed` once; create the first admin with `npm run admin:create`.

**B. Vercel + Supabase (recommended, step-by-step Arabic guide in `DEPLOY-VERCEL-AR.md`)**
Set `DATABASE_URL` (transaction pooler + `?pgbouncer=true&connection_limit=1`),
`DIRECT_URL` (session pooler — `npm run build` applies migrations and seeds through
it), `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (media goes to a public
Supabase Storage bucket, created on first upload), `NEXT_PUBLIC_SITE_URL` and
`SETUP_KEY`. Then open `/admin` to create the first Super Admin at `/admin/setup`
(works only while no account exists). Upload size is capped at 4MB on Vercel.

Set the build root to `aljafil/`. After deploying: submit `/sitemap.xml` in Search
Console, keep **SEO → indexing** disabled on staging environments.

## Google integration setup

Dashboard → **تكاملات Google** shows status for each item.

1. **Search Console**: verify the domain (DNS TXT record, or paste the meta
   `content` value into Dashboard → SEO). Submit `https://<domain>/sitemap.xml`.
2. **GA4**: create a property, copy the Measurement ID (`G-…`) into the dashboard.
   **or GTM**: paste the container ID (`GTM-…`); GTM then owns the GA4 tags.
3. Mark these events as conversions in GA4: `qualified_lead_submit`,
   `contact_form_submit`, `financing_submit`, `whatsapp_click`. Also sent:
   `project_view`, `assistant_open`. Events are de-duplicated per browser session.
4. Consent: Google Consent Mode v2 defaults to *denied*; analytics storage is
   granted only after the visitor accepts the cookie banner.
5. **Reports inside the dashboard (optional)**: create a Google Cloud service
   account, enable *Search Console API* and *Google Analytics Data API*, add the
   service-account email as a user on the Search Console property and as a
   *Viewer* on the GA4 property, set `GOOGLE_SERVICE_ACCOUNT_*` env vars, then enter
   the Search Console property and GA4 property ID in the dashboard.

No Google credential is ever sent to the browser. Indexing speed and rankings
cannot be guaranteed.

## AI provider setup

1. Create an API key in the Anthropic Console and set `ANTHROPIC_API_KEY` on the
   server (never in `NEXT_PUBLIC_*`).
2. Optional: `ASSISTANT_MODEL` (default `claude-opus-5-5`). For this
   high-volume, simple workload `claude-haiku-5-5` is far cheaper.
3. Toggle *use language model* and edit welcome messages / retention on
   **/admin/assistant**.

**Cost considerations**: each free-text visitor message makes up to two short
requests (criteria extraction + reply, low effort, ≤1k output tokens). Guided
button answers use no model calls at all. Per-IP rate limits (40 messages / 10
minutes) cap abuse. Monitor usage in the Anthropic Console and set a spend limit.
Adding another provider means implementing the `AssistantModel` interface in
`src/lib/assistant/provider.ts`.

## Backup and recovery

- **Database**: nightly `pg_dump -Fc "$DATABASE_URL" > aljafil-$(date +%F).dump`,
  keep ≥30 days off-server, encrypted (it contains personal and financial data).
  Restore: `pg_restore --clean --if-exists -d "$DATABASE_URL" file.dump`. Managed
  Postgres: enable point-in-time recovery.
- **Media**: back up `STORAGE_DIR` (e.g. `rsync`/object-storage sync) on the same
  schedule; file names are immutable, so incremental backups work well.
- **Test restores** quarterly into a separate database.
- Schema changes go through Prisma migrations (`prisma migrate deploy`); take a
  backup before every deployment that includes a migration.

## Security notes

- Sessions: 256-bit random tokens, only SHA-256 hashes stored, 12h expiry,
  revoked on logout/role change/password change/deactivation. The middleware only
  checks cookie presence; **every** page, server action and admin API validates the
  session in the database and checks the permission.
- Login: scrypt hashes, constant-time compare, generic errors, rate-limited per IP
  and per email, all attempts audited.
- CSRF: server actions use Next's origin check; public JSON APIs reject
  cross-origin `Origin`; cookies are `SameSite=Lax`.
- Input: Zod validation everywhere; Prisma parameterised queries only; JSON-LD is
  escaped; admin content is rendered as text (no HTML injection); CSV exports
  neutralise spreadsheet formulas.
- Uploads: type detected from magic bytes (JPG/PNG/WEBP/PDF only, size-limited),
  random file names, strict path validation, served with `nosniff` and a sandbox CSP.
- Abuse: DB-backed rate limits on lead, financing, assistant, CTA and login
  endpoints; honeypot fields on public forms.
- Privacy: financing data is stored separately from leads, visible only to
  Financing Manager/Super Admin, never exposed to the assistant or public APIs;
  notification webhooks carry no customer data; IPs are hashed in rate-limit keys.
- Headers: HSTS (prod), `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy,
  Permissions-Policy, `noindex` on `/admin` and `/api`.

## Testing

Tests use a **separate database** (refuses to run against a non-`test` DB):

```bash
createdb aljafil_test
DATABASE_URL=postgresql://…/aljafil_test npx prisma migrate deploy
export TEST_DATABASE_URL=postgresql://…/aljafil_test
npm test                       # unit + integration (Vitest)
npm run build && npm run test:e2e   # Playwright; set PW_CHROMIUM_PATH to use a preinstalled Chromium
```

## Test results

Executed on 2026-10-14 in the development container (Node 22, PostgreSQL 16):

| Check | Result |
| --- | --- |
| `prisma migrate deploy` (dev + test DB) | ✅ applied |
| `tsc --noEmit` | ✅ no errors |
| `next lint` | ✅ no warnings or errors |
| `next build` | ✅ succeeded, 0 warnings |
| Vitest unit (53) + integration (15) | ✅ 68/68 passed |
| Playwright E2E | ✅ 6/6 passed |

Covered: phone normalisation, password hashing/policy, permission matrix, upload
sniffing and path safety, CSV injection, metadata/hreflang, JSON-LD escaping,
Google JWT signing, inventory percentages (zero/manual/reserved), range
derivation and warnings, assistant matching and criteria parsing, lead and
financing validation; via real route handlers on the test DB: lead creation,
CSRF rejection, duplicate flagging, unpublished-project linking, rate limiting,
financing storage, assistant grounding/consent/visitor isolation, range sync,
redirect chains, sitemap filtering. Browser: localized routing and RTL/LTR,
empty states, 404, protected admin APIs/pages and forged cookies, wrong-password
rejection, Sales Agent and Content Editor restrictions, end-to-end
create-project → add-unit → publish → public page → inquiry (consent enforced) →
financing application → CRM status update → sitemap, and the guided assistant
finding the published unit without an AI key.

**Not tested** (credentials unavailable): live Anthropic calls, live Google
Search Console/GA4 API calls, webhook delivery, production HTTPS cookie behaviour.

## Known limitations

- Dashboard UI is Arabic only (public site is fully bilingual).
- No image resizing on upload (Next.js image optimisation resizes on delivery).
- Article body is safe plain text with simple `##` / `-` formatting, not WYSIWYG.
- Notification adapter supports webhooks only (no email/SMS yet).
- Financing data retention is a documented setting with manual deletion; there is
  no scheduled purge job yet.
- Unit photo galleries exist in the schema (`UnitImage`) but are not yet editable
  in the UI (floor plans are).
- WhatsApp clicks are counted anonymously; they can't become leads because no
  identity is captured.
