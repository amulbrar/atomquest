# AtomQuest Goal Portal — CLAUDE.md

## Project

In-House Goal Setting & Tracking Portal built for AtomQuest Hackathon 1.0.
Brief: `docs/brief.md`. Plan: `~/.claude/plans/ethereal-singing-hamster.md`.

## Stack

- **Framework**: Next.js 16 (App Router, Server Components, Server Actions)
- **Language**: TypeScript strict
- **UI**: shadcn/ui + Tailwind v4 + Radix + Lucide
- **DB**: Supabase Postgres via Drizzle ORM (`lib/db/schema.ts`)
- **Auth**: Auth.js v5 — credentials + Microsoft Entra ID (`lib/auth/config.ts`)
- **Email**: Resend + React Email (`lib/notify/email.ts`)
- **Teams**: Adaptive Cards webhook (`lib/notify/teams.ts`)
- **Charts**: Recharts

## Commands

```bash
pnpm dev          # start dev server (port 3000)
pnpm build        # production build
pnpm seed         # seed demo data (needs DATABASE_URL in .env.local)
pnpm db:generate  # generate drizzle migrations
pnpm db:migrate   # apply migrations
pnpm db:push      # push schema directly (dev only)
pnpm test         # run vitest
```

## File structure

```
app/
  (auth)/login/          sign-in page
  (employee)/goals/      employee goal creation + check-in
  (manager)/team/        manager approval + team check-in
  (admin)/               admin: cycles, audit, escalations, users
  analytics/             charts (role-scoped)
  reports/               achievement + completion exports
  api/auth/              nextauth handlers
  api/cron/              vercel cron for escalations
lib/
  db/schema.ts           Drizzle schema (source of truth)
  db/index.ts            DB client
  auth/config.ts         Auth.js config
  auth/guards.ts         requireRole / requireAuth helpers
  scoring/index.ts       Pure UoM scoring functions (unit tested)
  validation/            Zod schemas shared client+server
  notify/                email.ts + teams.ts + index.ts
  escalation/            rule evaluator for cron
  audit/index.ts         audit log helper
components/
  ui/                    shadcn primitives
  layout/                sidebar, header, role-switcher
  goals/                 goal form, goal card, weightage indicator
  checkin/               quarterly check-in form
scripts/seed.ts          idempotent demo seed
drizzle/0001_init.sql    schema + triggers migration
```

## Demo credentials

| Role     | Email                               | Password      |
|----------|-------------------------------------|---------------|
| Admin    | admin@atomquest.demo                | Admin@1234    |
| Manager  | priya.sharma@atomquest.demo         | Manager@1234  |
| Manager  | arjun.mehta@atomquest.demo          | Manager@1234  |
| Employee | ananya.iyer@atomquest.demo          | Employee@1234 |
| Employee | rohan.gupta@atomquest.demo          | Employee@1234 |
| Employee | karan.singh@atomquest.demo          | Employee@1234 |

Role switcher: set `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local` — a dropdown
appears in the header to instantly switch between seeded users.

## Key design decisions

- Weightage check (sum=100) enforced in **server action** at submit time (cross-row constraint)
- Max 8 goals enforced by **Postgres trigger** + server action redundancy
- Per-goal weightage min=10 enforced by **DB CHECK constraint** + Zod schema
- Goals lock on manager approval; unlock requires Admin + reason (audit-logged)
- Scoring is **snapshot** — stored at check-in time so historic scores don't drift
- Audit trigger fires on `goal_sheets` + `goals` for locked/approved sheets only
- Role switcher (demo mode) sets a special query param `?switchTo=<email>` which
  the middleware catches and issues a new credentials session

## Commit style

`type: Subject (≤50 chars)` — imperative, no period
Body lines ≤75 chars
Types: feat / fix / chore / docs / refactor / test

## BRD requirement → code mapping

| BRD section | Code |
|---|---|
| 2.1 Goal creation | `app/(employee)/goals/` |
| 2.1 Validation rules | `lib/validation/goal.ts` + `drizzle/0001_init.sql` |
| 2.1 Manager approval | `app/(manager)/team/[empId]/` |
| 2.1 Shared goals | `app/(manager)/team/shared-goals/` |
| 2.2 Quarterly check-in | `app/(employee)/checkin/` |
| 2.2 Manager check-in | `app/(manager)/team/checkin/` |
| 2.2 Scoring formulas | `lib/scoring/index.ts` |
| 2.3 Check-in schedule | `lib/db/schema.ts` cycles table |
| 4 Achievement report | `app/reports/achievement/` |
| 4 Completion dashboard | `app/reports/completion/` |
| 4 Audit trail | `app/(admin)/audit/` |
| 5.1 Entra ID SSO | `lib/auth/config.ts` (AZURE_AD_* env vars) |
| 5.2 Email | `lib/notify/email.ts` |
| 5.2 Teams | `lib/notify/teams.ts` |
| 5.3 Escalation | `lib/escalation/` + `app/api/cron/escalations/` |
| 5.4 Analytics | `app/analytics/` |
