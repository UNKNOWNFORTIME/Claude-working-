# Mindspace

> A place to think freely, evaluate honestly, and act intentionally.

Mindspace is a private, single-user web app for capturing thoughts, developing ideas, **deciding which ideas are actually worth doing**, and turning the good ones into projects. Capture, organize, explore, evaluate, decide, act, then reflect.

It is built to help you choose, not to collect: every idea can be put through a structured evaluation with a transparent weighted score, and every decision (and why you made it) is kept so you can see how your thinking changes.

---

## Features

| Area | What you get |
| --- | --- |
| **Quick capture & Inbox** | Distraction-free capture from anywhere (press `C`). Optional type (Idea, Task, Question, Goal, Observation, Random) and tags. Pin, search, filter, archive, inline edit. Convert a thought into an idea or goal; the original text is always kept. |
| **Idea Vault** | Card, list and Kanban views (drag between stages). Title, summary, Markdown description, motivation, category, tags, priority, stage, links and references, dated notes. Everything autosaves. |
| **Idea evaluation** | Seven guided sections (problem & value, motivation, feasibility, cost & time, potential, risks, opportunity cost), 1–10 scores on seven criteria, and a **weighted /100 score with a full breakdown**. Rule-based notes flag trade-offs (e.g. "high score, but feasibility is 2/10"). Space for uncertainties. Evaluations are snapshots: each keeps its own weights, and older ones are never overwritten. |
| **Decisions** | Pursue / Research further / Revisit later / Not worth pursuing, with a reason, date and optional revisit date. Recording a decision moves the idea to the matching stage. |
| **AI thinking partner** (optional) | Explore, Challenge, Find weaknesses, Improve, MVP plan, Critique my evaluation, Compare ideas, Summarize. It is told to separate what you wrote from assumptions, and never to invent facts or numbers. It only runs when you click. Conversations are saved per idea, and replies are only added to your notes if you click "Save as note". Works with any OpenAI-compatible API. |
| **Projects** | Convert an idea with one click (it stays linked to its evaluations). Objective, expected outcome, milestones, tasks with due dates, notes, progress, status, reflections. |
| **Goals** | Seven goal types, why it matters, target date, progress, milestones, notes. Link ideas and projects to a goal to see whether your work supports it. |
| **Connections** | Two-way links between any ideas, projects, goals and thoughts, with an optional note on how they relate. |
| **Dashboard** | Quick capture, recent thoughts, ideas being explored, ideas awaiting evaluation, active projects, upcoming tasks, goals, recently updated. **Things worth thinking about** shows ideas marked worth pursuing that have no project yet, revisit dates that have passed, research-further items, and ideas left untouched. |
| **Search** | `⌘K` palette and a full search page across thoughts, ideas, projects, goals, evaluation answers, notes and reflections. Ideas filter by category, tag, stage, priority, score and creation date, and sort by updated, newest, oldest, priority, score or title. |
| **Reflections** | Weekly reflection with optional prompts (no streaks), full decision history ("why did I say no?"), recurring themes, neglected goals, completed work, and a journal. |
| **Your data** | JSON (full) and Markdown export, merge-import from a JSON export, a `pg_dump` backup script, and a recoverable Trash. |
| **Polish** | Light and dark mode, responsive layout with a mobile menu and capture button, keyboard shortcuts, loading, empty and error states, subtle motion (respects reduced-motion). |

### Keyboard shortcuts

| Keys | Action |
| --- | --- |
| `C` | Capture a thought |
| `⌘K` / `Ctrl K` or `/` | Search and command palette |
| `⌘↵` / `Ctrl ↵` | Save the thought or note you're writing |
| `G` then `D I E P G R A S` | Go to Dashboard, Inbox, Ideas, Projects, Goals, Reflections, Archive, Settings |

---

## Tech stack

- **Next.js 15** (App Router, Server Components, Server Actions), **React 19**, **TypeScript**
- **Tailwind CSS v4**, shadcn-style components on **Radix UI**, **lucide** icons, **Motion** for animation, `cmdk`, `sonner`
- **PostgreSQL** + **Prisma 6** (migrations included)
- Auth: bcrypt password hash + signed, httpOnly JWT session cookie (`jose`), checked in middleware and again on the server for every page and action
- **Zod** validation shared by client and server
- **Vitest** tests against a real Postgres database

## Architecture

```
src/
  app/
    (auth)/login, setup          Public pages
    (app)/...                    Every signed-in page (the layout enforces auth)
    api/export                   JSON / Markdown download
  server/
    services/                    Data layer. Every function takes userId and scopes every query by it.
    actions/                     "use server" wrappers: authenticate, then call a service, then revalidate
    auth.ts                      Session handling (version-checked cookies)
  components/ui                  Design-system primitives
  components/shared              Quick capture, autosave indicator, Markdown, related items, …
  lib/
    scoring.ts                   Pure, tested evaluation maths
    evaluation-questions.ts      The structured evaluation framework
    validation.ts                Zod schemas
prisma/schema.prisma             Data model
tests/                           Scoring, persistence and authorization tests
```

**Design decisions**

- **Services and actions are separate.** Services hold all the logic and take `userId` explicitly, so authorization is easy to test. Actions only authenticate and translate errors.
- **The original capture is never changed.** Converting a thought copies its text and marks the thought *processed*, so the original stays readable on the idea.
- **Evaluations are append-only snapshots.** Each score row stores the weight in effect, so a completed evaluation stays explainable after you change your weights. `Idea.latestScore` is denormalized from the latest completed evaluation for sorting and filtering.
- **Soft delete** (`deletedAt`) on thoughts, ideas, projects and goals powers the Trash. Permanent deletion is only allowed from Trash.
- **Links are polymorphic but canonical.** `EntityLink` stores each pair in a fixed order, so a connection exists only once and shows up on both sides. Ownership of both ends is checked on write.
- **AI is strictly opt-in.** It is off by default and nothing is sent without a click. The API key is AES-256-GCM encrypted at rest (key derived from `AUTH_SECRET`) and never sent to the browser.

### Data model (summary)

`User`, `Settings` (weights, AI config) · `Thought` and `ThoughtTag` · `Idea`, `IdeaTag`, `IdeaNote` · `Category`, `Tag` · `Evaluation`, `EvaluationScore` (score + weight snapshot), `Decision` · `Project`, `Milestone` (project or goal), `Task` · `Goal` · `Reflection` (weekly, project, goal, general) · `EntityLink` · `AIConversation`, `AIMessage`. All IDs are UUIDs, every table has timestamps, and foreign keys cascade or set null as appropriate.

---

## Getting started

### Requirements

- Node.js 20+ (22 recommended)
- PostgreSQL 14+

### 1. Install

```bash
cd mindspace
npm install
```

### 2. Configure

```bash
cp .env.example .env
```

Set `DATABASE_URL` and a long random `AUTH_SECRET` (for example `openssl rand -base64 48`). AI variables are optional.

### 3. Create the database

```bash
createdb mindspace          # or create it in your Postgres host
npm run db:deploy           # applies migrations
```

### 4. Run

```bash
npm run dev                 # http://localhost:3000
```

On first visit you'll be taken to **/setup** to create your account. Setup closes as soon as one account exists. You can also create or reset the account from the CLI:

```bash
npm run user:create -- you@example.com "a long password" "Your Name"
```

Optional sample data, which creates `demo@mindspace.local` / `mindspace-demo` if no account exists:

```bash
npm run db:seed
```

### Production

```bash
npm run build && npm start
```

Serve it behind HTTPS. Session cookies are `Secure` in production. If you deliberately run over plain HTTP on a private network, set `COOKIE_SECURE=false`.

---

## Testing

The tests run against a separate database. **It is wiped on every run.**

```bash
createdb mindspace_test
# set TEST_DATABASE_URL in .env
npm test
```

They cover:

- **Scoring:** weighted maths, partial scoring, zero weights, clamping, breakdowns that add up, bands and trade-off notes
- **Persistence:** capture to idea with the original preserved, evaluation history, weight snapshots, decisions changing stages, idea to project, trash and restore, export/import round trip and idempotency
- **Authorization:** one user can't read, search, edit, evaluate, decide on, link to, convert or trash another user's data

```bash
npm run typecheck
```

## Backups and data ownership

- **In the app:** Settings → Your data → *Export JSON* (complete and re-importable) or *Export Markdown* (readable anywhere).
- **Import:** Settings → *Import from JSON export*. This merges: existing records are never overwritten, so re-importing is safe.
- **Database backups:**

  ```bash
  npm run backup                          # ./backups/mindspace-YYYYmmdd-HHMMSS.sql.gz, keeps the latest 14
  BACKUP_DIR=/mnt/backups KEEP=30 npm run backup
  ```

  To schedule a nightly backup, add this cron entry:

  ```
  0 3 * * * cd /path/to/mindspace && npm run backup
  ```

  To restore:

  ```bash
  gunzip -c backups/<file>.sql.gz | psql "$DATABASE_URL"
  ```

## AI configuration

Settings → *AI thinking partner*: enable it, set the base URL, model and API key, then use *Test connection*. You can also set defaults with `AI_BASE_URL`, `AI_MODEL` and `AI_API_KEY`. Any OpenAI-compatible `/chat/completions` endpoint works, including OpenAI, OpenRouter, Groq, Together, or a local Ollama (`http://localhost:11434/v1`).

Before each request, the panel says exactly what will be sent. Each conversation has a "What was sent" disclosure.

## Security notes

- Single account, no public registration. Setup is disabled once an account exists.
- bcrypt (cost 12) password hashing, a per-IP login attempt limit, and constant-ish timing for unknown emails.
- Sessions are httpOnly and SameSite=Lax. Changing your password or using "Sign out everywhere" invalidates every other session.
- Every query is scoped by the signed-in user, and every input is validated with Zod on the server.
- Security headers: no framing, nosniff, same-origin referrer. Pages are marked `noindex`.

## Roadmap ideas

Phases 1–3 of the original brief are complete. From Phase 4, keyboard shortcuts, import/export and the mobile layout are done. Possible next steps:

- Visual graph view of connections (Phase 4, optional)
- Automatic suggestions for related ideas (Phase 4)
- Streaming AI responses
- Full-text search ranking (Postgres `tsvector`)
- PWA / offline capture
- Attachments on ideas
