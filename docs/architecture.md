# Architecture

## Monorepo layout

| Path | Purpose |
|---|---|
| `apps/web` | Next.js 16 marketing app and product UI |
| `apps/api` | Express 5 + TypeScript REST API |
| `packages/shared` | Shared types and constants |
| `docs/` | Product and engineering documentation |

## API layout

The Learn API is organized by feature under `apps/api/src`. Each feature uses the same layering:

`routes → controller → service → repository`

| Path | Purpose |
|---|---|
| `index.ts` | Process boot (`listen`) |
| `app.ts` | Express app, middleware, feature router mounts |
| `config.ts` | Environment config |
| `shared/` | Prisma client, errors, HTTP helpers |
| `features/health/` | `/` and `/health` |
| `features/auth/` | Coddle SSO, sessions, CSRF, `/auth/*` |
| `features/users/` | User repository + public user mapping |
| `features/onboarding/` | `POST /onboarding` |
| `features/roadmaps/` | Catalog, detail, start, step progress (`/roadmaps/*`) |
| `features/courses/` | Catalog, detail, start, lesson progress (`/courses/*`) |

| Layer | Responsibility |
|---|---|
| `*.routes.ts` | Path + middleware wiring |
| `*.controller.ts` | HTTP request/response mapping |
| `*.service.ts` | Business rules and orchestration |
| `*.repository.ts` | Prisma / database access |

HTTP paths stay `/health`, `/auth/*`, `/onboarding`, `/roadmaps/*`, and `/courses/*`. New domains should add a folder under `features/` with these layers, then mount the router in `app.ts`.

## Tooling

- **pnpm workspaces** — dependency linking between apps and packages
- **Turborepo** — parallel `dev`, `build`, `lint`, and `typecheck`
- **Prisma** — PostgreSQL schema and migrations (`apps/api/prisma`)

## Local services

PostgreSQL runs via Docker Compose (`docker compose up -d`). Copy env files, then migrate:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
docker compose up -d
pnpm --filter @coddle/api exec prisma migrate deploy
pnpm --filter @coddle/api exec prisma generate
pnpm --filter @coddle/api exec prisma db seed
```

The web app proxies `/api/*` to the Express API (`API_URL`, default `http://localhost:4000`) so session cookies stay on the Learn origin.

Roadmap catalog rows (`Roadmap`, `RoadmapStep`) are seeded from `@coddle/shared` starter data. Learner progress lives in `UserRoadmap` and `UserStepProgress`.

Course catalog rows (`Course`, `CourseModule`, `CourseLesson`, `CourseSkill`) are seeded the same way. Thumbnails upload to Cloudflare R2 under `coddle-learn/courses/{slug}/thumbnail.svg` and are served from `R2_PUBLIC_URL`. Seeded courses set `createdByUserId` to the Learn user matching `SEED_COURSE_CREATOR_EMAIL`.

## Authentication (Coddle account sync)

Learn does **not** issue its own passwords. Identity lives in the main Coddle product (`quarter1/coddle`).

```
Learn /login
  → GET /api/auth/coddle/start   (single-use signed state stored in DB)
  → Coddle /login?redirect=/sso/learn?state&return=…
  → Coddle /sso/learn
       → POST Coddle /auth/sso/code  (one-time code; access token stays on Coddle)
  → POST Learn /api/auth/coddle/finish  (code + state)
  → Learn exchanges code server-to-server via Coddle /auth/sso/exchange
  → Upsert User, create revocable Session (JWT jti)
  → Set httpOnly session cookie + CSRF cookie
  → Redirect /dashboard
```

| Concern | Owner |
|---|---|
| Signup, password, Google/GitHub login | Coddle |
| Profile name / email / avatar source of truth | Coddle (synced on each Learn sign-in) |
| Learning progress, credentials, Learn session | Learn |

### Env (Learn)

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | `apps/api` | Postgres |
| `JWT_SECRET` | `apps/api` | Learn session signing |
| `LEARN_SSO_CLIENT_ID` / `LEARN_SSO_CLIENT_SECRET` | `apps/api` | Server-to-server SSO exchange with Coddle |
| `CODDLE_APP_URL` | `apps/api` | Coddle web (login + SSO bridge) |
| `CODDLE_API_URL` | `apps/api` | Coddle API including `/api/v1` |
| `WEB_ORIGIN` | `apps/api` | Learn web origin (cookies + redirects) |
| `API_URL` | `apps/web` | Express base for Next rewrites |
| `NEXT_PUBLIC_CODDLE_APP_URL` | `apps/web` | Signup link on login page |
| `R2_*` | `apps/api` | Cloudflare R2 credentials + `cdn.coddle.dev` public URL |
| `SEED_COURSE_CREATOR_EMAIL` | `apps/api` | Learn user email used as course creator in seed |

### Env (Coddle)

| Variable | Purpose |
|---|---|
| `LEARN_SSO_CLIENT_ID` / `LEARN_SSO_CLIENT_SECRET` | Must match Learn |
| `LEARN_SSO_REDIRECT_URIS` | Allowlisted Learn finish URLs |
| `NEXT_PUBLIC_LEARN_SSO_RETURN_URIS` | Frontend allowlist for the SSO bridge |

Locally, Learn web defaults to port `3002` so Coddle can stay on `3000`. Point `CODDLE_APP_URL` / `NEXT_PUBLIC_CODDLE_APP_URL` at Coddle.

## Current scope

- Monorepo scaffolding and landing page
- Feature-based API (`health`, `auth`, `users`, `onboarding`, `roadmaps`)
- Health-check API
- Prisma User / Skill / Session / Roadmap / RoadmapStep / progress models + migrations
- Coddle SSO start/finish/exchange, `/auth/me`, logout
- Onboarding persistence (`POST /onboarding`)
- Roadmap catalog seed + interactive `/roadmaps` and `/roadmaps/[slug]` (in-page step panel)
- Course catalog seed + interactive `/courses` and `/courses/[slug]` (modules, markdown lessons, R2 thumbnails, creator, linked skills)
- Learn `/login`, `/onboarding`, and `/dashboard`
- Coddle `/sso/learn` bridge page
