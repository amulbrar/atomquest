# AtomQuest — Goal Setting & Tracking Portal

A full-featured goal-management platform built for the AtomQuest Hackathon
1.0 brief. Implements every Phase-1 and Phase-2 requirement plus every
bonus integration end-to-end on a $0/month stack.

---

## Live demo

**→ [atomquest-okr.vercel.app](https://atomquest-okr.vercel.app)**

Hosted on **Vercel + Supabase** (free tiers — $0/month up to ~50K MAU).

When `NEXT_PUBLIC_DEMO_MODE=true` (enabled on the live deployment), a
role-switcher dropdown appears in the top-right corner — pick any seeded
user and the portal signs you in automatically. No password juggling
required to walk all three journeys.

| Role     | Email                          | Password        |
|----------|--------------------------------|-----------------|
| Admin    | admin@atomquest.demo           | `Admin@1234`    |
| Manager  | priya.sharma@atomquest.demo    | `Manager@1234`  |
| Manager  | arjun.mehta@atomquest.demo     | `Manager@1234`  |
| Employee | ananya.iyer@atomquest.demo     | `Employee@1234` |
| Employee | rohan.gupta@atomquest.demo     | `Employee@1234` |
| Employee | karan.singh@atomquest.demo     | `Employee@1234` |

---

## Features

- **Goal lifecycle** — draft → submit → manager approval → lock → admin
  unlock with mandatory reason (audit-logged).
- **Four UoM types** (Numeric, Percent, Timeline, Zero-based) × two
  directions (Min — higher is better, Max — lower is better).
- **Cross-row weightage enforcement**: per-goal min 10%, sum must equal
  100%, max 8 goals per employee — checked at the DB (trigger + CHECK)
  and re-validated in the server action at submit time.
- **Quarterly check-ins** (Q1 July, Q2 October, Q3 January, Q4 March/April)
  with server-enforced date windows configured per cycle.
- **Snapshot scoring**: `actual ÷ target` (min), `target ÷ actual` (max),
  linear decay for late timeline goals, `0 = 100%` for zero-based metrics.
  Scores are stored at check-in time so historic numbers never drift.
- **Shared goals** — manager pushes a KPI to multiple employees; secondary
  recipients can only adjust weightage; primary owner's actuals propagate
  through `sourceGoalId`.
- **Inline manager edits during approval** — adjust targets and weightages
  before locking; every edit is audit-logged.
- **Admin cycle management** — create, edit, and activate cycles; unlock
  any locked sheet with a reason for revision.
- **Microsoft Entra ID SSO** + Microsoft Graph sync — pulls users,
  managers, departments, and maps group membership to roles
  (admin/manager/employee).
- **Email notifications** via Resend with five React Email templates
  (submitted, approved, returned, check-in reminder, escalation).
- **Microsoft Teams notifications** via Workflows webhook — Adaptive
  Cards with deep links straight into the relevant goal sheet.
- **Rule-based escalation engine** — no-submit, no-approve, and no-checkin
  triggers with configurable thresholds and escalation chains, driven
  by a Vercel cron job at 06:00 UTC daily.
- **Achievement report** with CSV + XLSX export (TanStack Table v8 +
  SheetJS) and per-cycle / per-quarter filters.
- **Completion dashboard** with live Supabase Realtime updates per
  employee per quarter.
- **Audit trail** — paginated, before/after JSON diffs of every
  post-lock change, every approval, every admin unlock.
- **Analytics**: weighted QoQ trend, thrust-area distribution donut, UoM
  breakdown bar, manager-effectiveness stacked bars and detail table —
  scoped per role (manager sees own team, admin sees org).
- **Loading skeletons + error boundaries** on every major route so the
  app never shows a blank screen or a raw Next.js crash page.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                Vercel (hobby plan)                │
│                                                   │
│   Next.js 16 App Router · React 19                │
│   ┌─────────────┐  ┌──────────────────────────┐  │
│   │ Server      │  │ Client Components         │  │
│   │ Components  │  │ (TanStack Table v8,       │  │
│   │ + Actions   │  │  Recharts, RHF + Zod)     │  │
│   └──────┬──────┘  └──────────────────────────┘  │
│          │                                         │
│   ┌──────▼──────┐                                 │
│   │ Drizzle ORM │                                 │
│   └──────┬──────┘                                 │
└──────────┼───────────────────────────────────────┘
           │
    ┌──────▼──────────────────────────────────────┐
    │           Supabase (free tier)              │
    │  Postgres + Realtime + pgbouncer pooler     │
    │  Triggers: audit, max-goals, updated_at     │
    └─────────────────────────────────────────────┘

External services (all free tiers):
  Resend          → transactional email (100/day)
  Microsoft Graph → user/manager/group sync
  Teams Workflows → Adaptive Card webhooks
  Vercel Cron     → daily escalation scanner
```

**Cost at scale:** $0/month up to ~50K MAU on Supabase free + Vercel hobby.

---

## Tech stack

| Layer       | Choice                                                        |
|-------------|---------------------------------------------------------------|
| Framework   | Next.js 16 (App Router, Server Components, Server Actions)    |
| Runtime     | React 19.2, TypeScript strict                                 |
| UI          | shadcn/ui + Tailwind v4 + Radix + Lucide                      |
| Database    | Supabase Postgres                                             |
| ORM         | Drizzle ORM                                                   |
| Auth        | Auth.js v5 (Credentials + Microsoft Entra ID)                 |
| Forms       | React Hook Form + Zod                                         |
| Tables      | TanStack Table v8                                             |
| Charts      | Recharts                                                      |
| Email       | Resend + React Email                                          |
| Teams       | Adaptive Cards via Workflows webhook                          |
| Realtime    | Supabase Realtime                                             |
| Cron        | Vercel Cron                                                   |
| Export      | SheetJS (xlsx)                                                |
| Testing     | Vitest (49 unit tests — scoring, validation, escalation)      |

---

## Local setup

```bash
# 1. Clone and install
git clone <repo-url>
cd atomquest
pnpm install

# 2. Configure environment
cp .env.example .env.local
# Fill in DATABASE_URL, DATABASE_URL_DIRECT, AUTH_SECRET

# 3. Apply schema
pnpm db:push        # dev — push schema directly
# or: pnpm db:migrate for prod-style migrations

# 4. Seed demo data (idempotent — safe to re-run)
pnpm seed

# 5. Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with any
demo credential above.

### Scripts

| Command            | Description                                |
|--------------------|--------------------------------------------|
| `pnpm dev`         | Start development server                   |
| `pnpm build`       | Production build                           |
| `pnpm test`        | Run Vitest unit tests                      |
| `pnpm seed`        | Seed demo users, cycles, goals, check-ins  |
| `pnpm db:push`     | Push schema to database (dev)              |
| `pnpm db:generate` | Generate Drizzle migrations                |
| `pnpm db:migrate`  | Apply migrations                           |
| `pnpm lint`        | ESLint                                     |

---

## Deployment (Vercel + Supabase)

1. Create a Supabase project → copy `DATABASE_URL` (pooler) and
   `DATABASE_URL_DIRECT` (direct).
2. Run `pnpm db:push` and `pnpm seed` against the production database.
3. Push to GitHub and import the repo in Vercel.
4. Set every env var from `.env.example` in the Vercel dashboard.
5. Add a `CRON_SECRET` — Vercel passes it as `Authorization: Bearer <secret>`
   to `/api/cron/escalations`. The cron schedule (`0 6 * * *`) is already
   wired in `vercel.json`.
6. Optional: configure Microsoft Entra ID at `/admin/sso` after the first
   deploy — see the in-app setup instructions on that page.

---

## Project map

```
app/
  (auth)/login/              sign-in page
  goals/                     employee goal creation + check-in
  team/                      manager approval + team check-in
  team/shared-goals/         push a KPI to multiple reports
  checkin/                   employee quarterly check-in
  admin/                     cycles · users · audit · escalations · SSO · unlock
  analytics/                 charts (role-scoped)
  reports/achievement/       Planned vs Actual export
  reports/completion/        live completion dashboard
  api/auth/                  NextAuth handlers
  api/cron/escalations/      Vercel cron route
lib/
  db/schema.ts               Drizzle schema (source of truth)
  auth/config.ts             Auth.js config
  auth/guards.ts             requireRole / requireAuth helpers
  scoring/                   pure UoM scoring (unit tested)
  validation/                Zod schemas shared client + server (unit tested)
  notify/                    email + Teams dispatch
  escalation/                rule evaluator (rules.ts is pure & tested)
  audit/                     audit-log helper
  graph/                     Microsoft Graph client
components/
  ui/                        shadcn primitives
  layout/                    sidebar, header, role-switcher, error fallback
scripts/seed.ts              idempotent demo seed
drizzle/0001_init.sql        schema + triggers migration
```
