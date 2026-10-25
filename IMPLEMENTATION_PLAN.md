# Implementation plan — Masaken Aljafil Real Estate Platform

## 0. Repository inspection (findings)

- The repository root (`/`) already contains a **different, live application**: the
  "NEDAL ELABID" personal portfolio + CMS (Next.js 15, Supabase/JSON storage), with
  deployment docs in `docs/`. It is unrelated to Aljafil.
- To avoid overwriting or breaking that project, the Aljafil platform is built as a
  **self-contained app in `aljafil/`** with its own `package.json`, lockfile,
  Prisma schema and docs. Nothing at the repository root was modified.
  If Aljafil should replace the portfolio (or move to its own repository), that is
  a deliberate follow-up decision.
- No `references/` directory existed. The three references were supplied as chat
  attachments and are stored in `aljafil/references/`
  (`rakez-project-reference.webp`, `vision-mission-reference.png`,
  `finance-form-reference.webp`). The supplied Aljafil logo (navy + white
  versions) is in `aljafil/public/brand/` and is used instead of a temporary
  typographic logo.
- Environment: Node 22, npm, PostgreSQL 16 available locally; no hosting
  configuration, credentials or Google/AI keys present.

## 1. Architecture

| Concern | Choice |
| --- | --- |
| Framework | Next.js 15.5 App Router, React 19, TypeScript strict |
| Styling | Tailwind CSS v4, design tokens in `src/app/globals.css` |
| Font | IBM Plex Sans Arabic, self-hosted via `@fontsource` (no build-time network) |
| Database | PostgreSQL + Prisma 6 (schema + SQL migrations in `prisma/`) |
| Validation | Zod 4 on every server boundary |
| Auth | DB-backed sessions (random token, SHA-256 hash stored, httpOnly cookie), scrypt passwords |
| RBAC | `src/lib/auth/permissions.ts`; enforced in every page (`requireUser`), server action (`guarded`) and admin API (`assertPermission`) |
| Storage | `StorageAdapter` interface; local-disk adapter with magic-byte validation |
| i18n | `/ar/...` (RTL, default) and `/en/...` (LTR); localized slugs per content item |
| AI | Provider interface; Anthropic implementation via the official SDK; deterministic matcher always runs first |
| Notifications | Webhook adapter (`NOTIFY_WEBHOOK_URL`), no PII in payload |

Layering: `src/lib/*` holds services (leads, financing, assistant, inventory,
settings, SEO); `src/app/**/actions.ts` are thin, permission-guarded server
actions; pages are server components; client components only where interaction
needs them (forms, carousels, chat, media picker).

## 2. Phases and status

| # | Phase | Status |
| --- | --- | --- |
| 1 | Inspect repo, plan, scaffold Next.js/TS/Tailwind | ✅ Done |
| 2 | Design system, layout, header/footer, RTL/LTR | ✅ Done |
| 3 | Prisma schema + initial migration | ✅ Done |
| 4 | Authentication, sessions, RBAC, audit log | ✅ Done |
| 5 | Projects, gallery, features/guarantees, nearby, units, property types | ✅ Done |
| 6 | Public site on real data (all pages, empty states, 404) | ✅ Done |
| 7 | Leads CRM + financing applications (+ CSV export, notes, assignment) | ✅ Done |
| 8 | AI assistant (guided + deterministic matching + optional LLM) | ✅ Done |
| 9 | SEO (metadata, hreflang, sitemap, robots, JSON-LD, redirects) + Google integrations | ✅ Done |
| 10 | Tests (unit, integration, browser E2E) + production build | ✅ Done |

## 3. Next steps (not done yet)

1. Decide hosting (see README → Deployment). On serverless hosting, implement
   an S3-compatible `StorageAdapter` (local disk is not persistent there).
2. Enter real business content in the dashboard (projects, units, photos,
   company profile, chairman's message, statistics, vision/mission).
3. Legal review of the privacy policy text against the Saudi PDPL.
4. Optional English admin UI (dashboard is Arabic-only today).
5. Email notification adapter (only webhook is implemented).
6. Scheduled job for retention clean-up of financing data (assistant
   conversations are purged automatically).
7. Rich-text editor for articles (currently safe plain text with `##` headings / `-` lists).
