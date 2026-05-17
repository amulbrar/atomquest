# AtomQuest — In-House Goal Setting & Tracking Portal

A full-featured OKR / goal-tracking platform built for the AtomQuest Hackathon.

---

## Live demo

> Hosted on Vercel + Supabase (free tiers — $0/month up to 50K MAU)

**One-click role switcher** available in the top-right corner (demo mode) — no login required to switch between roles.

| Role     | Email                               | Password      |
|----------|-------------------------------------|---------------|
| Admin    | admin@atomquest.demo                | Admin@1234    |
| Manager  | priya.sharma@atomquest.demo         | Manager@1234  |
| Manager  | arjun.mehta@atomquest.demo          | Manager@1234  |
| Employee | ananya.iyer@atomquest.demo          | Employee@1234 |
| Employee | rohan.gupta@atomquest.demo          | Employee@1234 |
| Employee | divya.nair@atomquest.demo           | Employee@1234 |

---

## Features

### Phase 1 — Goal Setting

- Employee creates 1–8 goals per cycle (weightage 10–100%, sum must equal 100%)
- UoM types: **Numeric**, **Percent**, **Timeline** (target date), **Zero-based** (incident count)
- Direction: **Min** (higher = better) or **Max** (lower = better)
- Submit for manager approval; receive return-with-comment feedback
- Manager can inline-edit target/weightage before approving
- Admin can unlock approved sheets with a mandatory audit-logged reason

### Phase 2 — Quarterly Check-ins

- Employees log actuals during Q1/Q2/Q3/Q4 windows (server-enforced date ranges)
- Computed score snapshot stored per quarter (formula: `actual ÷ target`, clamped to [0, 1.5])
- Manager adds per-goal comments and marks check-in complete per quarter
- Shared goals: manager pushes a goal to multiple employees; primary owner's actuals propagate

### Reporting & Analytics

| Feature | Path |
|---------|------|
| Achievement report (TanStack Table, CSV + XLSX export) | `/reports/achievement` |
| Completion dashboard (live via Supabase Realtime) | `/reports/completion` |
| Audit log (paginated, before/after JSON diff) | `/admin/audit` |
| Analytics: QoQ trend, thrust-area donut, UoM bar, manager effectiveness | `/analytics` |

### Good-to-Have Features

| Feature | Status |
|---------|--------|
| Email notifications (Resend) | ✅ goal-submitted, approved, returned, reminders |
| Teams Adaptive Cards (Workflows webhook) | ✅ per-event cards with deep links |
| Microsoft Entra ID SSO | ✅ credentials fallback + Entra provider |
| Graph sync (users, managers, departments, roles) | ✅ `/admin/sso` |
| Rule-based escalation engine | ✅ no-submit / no-approve / no-checkin rules |
| Vercel Cron (daily at 06:00 UTC) | ✅ `vercel.json` |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Vercel (hobby)                  │
│                                                  │
│   Next.js 15 App Router                          │
│   ┌─────────────┐  ┌──────────────────────────┐ │
│   │ Server      │  │ Client Components         │ │
│   │ Components  │  │ (TanStack Table, Recharts,│ │
│   │ + Actions   │  │  React Hook Form)         │ │
│   └──────┬──────┘  └──────────────────────────┘ │
│          │                                        │
│   ┌──────▼──────┐                                │
│   │ Drizzle ORM │                                │
│   └──────┬──────┘                                │
└──────────┼──────────────────────────────────────┘
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

**Cost at scale:** $0/month up to 50K MAU (Supabase free) + Vercel hobby plan.

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

# 3. Run migrations
pnpm db:push        # or: pnpm drizzle-kit migrate

# 4. Seed demo data
pnpm db:seed

# 5. Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with any demo credential above.

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm test` | Run Vitest unit tests (scoring formulas) |
| `pnpm db:seed` | Seed demo users, cycles, goals, check-ins |
| `pnpm db:push` | Push schema to database |
| `pnpm lint` | ESLint |

---

## Deployment (Vercel + Supabase)

1. Create a Supabase project → copy `DATABASE_URL` (pooler) and `DATABASE_URL_DIRECT`
2. Run `pnpm db:push` and `pnpm db:seed` against the production database
3. Push to GitHub; import in Vercel
4. Set all env vars from `.env.example` in Vercel dashboard
5. Add `CRON_SECRET` — Vercel will pass it as `Authorization: Bearer <secret>` to the cron route

### Optional: Entra ID SSO

See setup instructions at `/admin/sso` after deploying.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router, Server Components, Server Actions) |
| Language | TypeScript strict |
| UI | shadcn/ui + Tailwind v4 + Radix + Lucide |
| Database | Supabase Postgres |
| ORM | Drizzle ORM |
| Auth | Auth.js v5 (Credentials + Microsoft Entra ID) |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table v8 |
| Charts | Recharts |
| Email | Resend + React Email |
| Teams | Adaptive Cards via Workflows webhook |
| Realtime | Supabase Realtime |
| Cron | Vercel Cron |
| Export | SheetJS (xlsx) |
| Testing | Vitest (21 unit tests for scoring formulas) |
