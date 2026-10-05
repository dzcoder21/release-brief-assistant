# Release Communication and Readiness Brief Assistant

A MERN application that helps developers turn a release package into an **evidence-backed, human-reviewed release brief**: deterministic readiness checks, AI analysis with citations, unsupported-claim detection, immutable versioning, version comparison and stale-statement detection.

> **Business rule:** the AI only analyzes and drafts. It can never deploy, roll back, approve a release, mark anything approved, or publish a changelog. Every statement starts as `PENDING` and only a person can approve, edit, reject or finalize.

## Features

- Structured release packages (features, bug fixes, changed behaviour, QA summary, limitations, migration notes, affected users) with add / edit / delete / reorder, plus structured **QA evidence**
- **Deterministic validation** (`releaseValidationService`) separate from AI findings. An empty section is an error unless explicitly marked "None"
- **AI analysis** (`aiAnalysisService`): impact classification, missing information, unsupported claims, risks, technical + stakeholder summaries, as validated JSON
- **Citations**: every statement links to release items, QA evidence, validation results or AI findings. Invented ids are discarded server-side
- **Review workspace**: edit / approve / reject / undo, reviewer notes, status counts, finalization checklist (ERROR blocks, WARNING/INFO inform)
- **Immutable versions**: new versions are created instead of overwriting; analyzed versions are locked, finalized versions are fully read-only
- **Version comparison**: added / removed / changed per section, QA changes, user-impact changes
- **Stale statement detection**: reviewed statements from the previous version are carried into the new one and re-checked (changed/deleted sources, QA result changes, "no migration"/"unchanged"/"no limitations"/"fully tested" claims). Nothing is silently updated
- **Final release brief** with Reviewed / AI-generated / Human-edited / Evidence-backed badges and print-to-PDF
- Dashboard, analytics, audit trail, light/dark/system theme, responsive layout (drawer sidebar, card tables on mobile)

## Tech stack

React 18 + Vite, Tailwind CSS (design tokens as CSS variables), React Router, Axios, React Hook Form, Lucide, Context API · Node.js, Express, Mongoose, MongoDB, JWT, bcryptjs, zod, helmet, express-rate-limit.

## Folder structure

```
.
├── client/                 React app (Vite)
│   └── src/{components,pages,context,hooks,services,utils,routes}
├── server/
│   ├── src/
│   │   ├── config/ controllers/ middleware/ models/ routes/ validators/ utils/ seed/
│   │   └── services/
│   │       ├── ai/               provider, prompts, analysis + output validation
│   │       ├── validation/       deterministic release validation
│   │       ├── versioning/       create/update versions, status, finalization, brief
│   │       ├── comparison/       version diff
│   │       └── staleDetection/   carry-forward + stale rules
│   └── tests/                    node:test unit tests
└── package.json            root scripts (concurrently)
```

## Prerequisites

Node.js 18.17+ (22 recommended) and MongoDB (local install or a free MongoDB Atlas cluster).

## Installation

```bash
npm run install:all          # root + server + client
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Or manually: `cd server && npm install`, `cd client && npm install`.

## Environment variables

`server/.env`

| Variable | Purpose |
| --- | --- |
| `PORT` | API port (default 5000) |
| `MONGODB_URI` | e.g. `mongodb://127.0.0.1:27017/release-brief-assistant` or an Atlas URI |
| `JWT_SECRET` | **required**, long random string |
| `CLIENT_URL` | allowed browser origin(s), comma-separated |
| `AI_PROVIDER` | `openai` (any OpenAI-compatible API) or `anthropic` |
| `AI_API_KEY` | provider key (server only, never sent to the browser) |
| `AI_MODEL` | model name for your provider |
| `AI_BASE_URL` | optional, for compatible providers |

`client/.env`: `VITE_API_URL=http://localhost:5000/api`

## MongoDB setup

Local: start `mongod` and keep the default `MONGODB_URI`. Atlas: create a free cluster, add a database user, allow your IP, paste the connection string into `MONGODB_URI`.

## AI API setup

The provider is swappable through env vars only; no code changes.

```env
# OpenAI
AI_PROVIDER=openai
AI_API_KEY=sk-...
AI_MODEL=<model name>

# Gemini (OpenAI-compatible endpoint)
AI_PROVIDER=openai
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
AI_API_KEY=<gemini key>
AI_MODEL=<gemini model name>

# Anthropic
AI_PROVIDER=anthropic
AI_API_KEY=<key>
AI_MODEL=<model name>
```

Use a model that follows JSON instructions reliably. Without a key the app still works: you can create releases, run deterministic validation, and the analysis page shows "AI analysis is temporarily unavailable" with a retry button. Release data is never lost when AI fails.

## Running

```bash
npm run dev                  # API on :5000 and client on :5173
# or separately
cd server && npm run dev
cd client && npm run dev
```

## Seed / demo data

```bash
npm run seed
```

Login: `demo@example.com` / `Demo@12345`. The seed (which **wipes the database**) creates:

- **Payment Platform**: v1.0.0 finalized with the approved statement *"Payment behaviour remains unchanged."*; v1.1.0 changes retry behaviour and requires migration, so that statement is flagged **STALE** with the reasons. v1.1.0 also contains an unsupported claim ("Payment processing is fully stable.", retry test not executed), a high-severity missing-information finding and partially reviewed statements
- **Mobile App**: incomplete draft that fails deterministic validation
- **Reporting Service**: analyzed, high risk, a failing QA test

Seed AI output is canned and passes through the same normalization and citation checks as live AI output.

## Tests

```bash
npm test
```

Covers deterministic validation, stale detection, comparison and AI-output normalization (invented citations dropped, nothing auto-approved).

## API overview

All routes are under `/api`; everything except register/login/health needs `Authorization: Bearer <jwt>`.

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PUT /auth/me`, `POST /auth/logout` |
| Releases | `GET/POST /releases`, `GET/PUT/DELETE /releases/:id` |
| Versions | `GET/POST /releases/:id/versions`, `GET /versions`, `GET/PUT /versions/:id` (PUT only while DRAFT), `GET /versions/compare?left=&right=` |
| Analysis | `POST /versions/:id/validate`, `POST /versions/:id/analyze` (202, poll), `GET /versions/:id/analysis` |
| Statements | `GET /versions/:id/statements`, `PUT /statements/:id`, `POST /statements/:id/approve`, `/reject`, `/reset` |
| Finalization | `GET /versions/:id/finalization`, `POST /versions/:id/finalize` (`{confirm:true}`), `GET /versions/:id/brief` |
| Dashboard | `GET /dashboard`, `/dashboard/analytics`, `/dashboard/attention`, `GET /activity`, `GET /settings/ai` |

## How versioning and staleness work

1. A version is editable only while `DRAFT`. After analysis completes it is locked; to change the package, create a new version (the editor pre-fills from the latest one).
2. Items keep stable ids (`feature-03`) across versions, so comparison and staleness know "the same item".
3. On creating a version, approved/edited statements from the previous version are copied in and re-checked. Affected ones become `STALE` with reasons and before/after values. The previous version stays untouched. A person must choose *Still valid*, *Edit* or *Reject*.

## Security notes

bcrypt password hashing (12 rounds), JWT auth on all private routes, per-user ownership checks (other users' ids return 404), zod validation on all bodies, 1 MB body limit, NoSQL-operator stripping, helmet, CORS allow-list, rate limits (global, auth, analysis), centralized error handler with no stack traces, AI keys server-side only, release text sent to the model is treated as data (prompt-injection instruction in the system prompt). The JWT lives in `localStorage` for simplicity; for stricter setups switch to an httpOnly cookie.

## Deployment notes

- Build the client with `npm run build` (static files in `client/dist`) and host on any static host; set `VITE_API_URL` at build time
- Run the API with `NODE_ENV=production npm start --prefix server`, set `CLIENT_URL` to the deployed origin, use MongoDB Atlas and a strong `JWT_SECRET`
- Analysis runs in-process in the API (progress stored in MongoDB). For multi-instance scale, move it to a job queue
- Interrupted analyses are marked failed on restart and can be retried

## Known limitations

Stale detection is rule-based (citations plus common "no migration / unchanged / no limitations / fully tested" claims); it flags *potential* staleness for a human, it does not prove it. Statements that only paraphrase changed facts without citing them may be missed.
