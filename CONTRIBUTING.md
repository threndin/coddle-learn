# Contributing to Coddle Learn

Thanks for helping build Coddle Learn. The project is early: the monorepo, health-check API, and landing page are in place. Product scope lives in [`AGENTS.md`](./AGENTS.md). Setup lives in [`README.md`](./README.md).

## Prerequisites

- Node.js 20 or newer (see `.nvmrc`)
- pnpm 10 (`packageManager` in the root `package.json`)
- Docker, only if you want local Postgres

## Setup

From the repository root:

```bash
pnpm install
pnpm dev
```

| Service | URL |
|---|---|
| Web | http://localhost:3002 |
| API | http://localhost:4000 |
| Health | http://localhost:4000/health |

Postgres is optional until the API starts using the database:

```bash
docker compose up -d
cp apps/api/.env.example apps/api/.env
```

Do not commit `.env` files or credentials.

## Repository layout

| Path | What belongs here |
|---|---|
| `apps/web` | Next.js UI. Landing page components live in `src/components/landing`. |
| `apps/api` | Express API. Keep route handlers thin. |
| `packages/shared` | Types and constants used by more than one app. |
| `docs/` | Architecture and engineering notes. |

Run one app when you do not need both:

```bash
pnpm --filter @coddle/web dev
pnpm --filter @coddle/api dev
```

## What to work on

Pick a small slice of the build plan in [`AGENTS.md`](./AGENTS.md). Day 1–3 foundation is in place: landing page, Prisma `User`, and Coddle account SSO. Profiles and core learning models come next.

Open an issue before a large change. One concern per pull request.

## Before you open a pull request

```bash
pnpm typecheck
pnpm lint
pnpm build
```

- Use a branch name like `feat/short-name` or `fix/short-name`.
- Explain why the change exists, and how you tested it.
- Include screenshots for visible UI changes.
- Put shared types in `packages/shared` instead of duplicating them.
- Keep brand colors and fonts in `apps/web/src/app/globals.css` (Figtree, `#004CC8`).

## Issues

Include what you expected, what happened, and the command you ran. For UI bugs, name the viewport and the route.

## Public repository

Landing-page GitHub links stay hidden until `GITHUB_URL` in `packages/shared/src/index.ts` is set to the real repository URL.

## License

A license has not been chosen yet. There is no `LICENSE` file. Treat contributions as offered for the open-source project, and wait for the maintainers to add a license before publishing the repo.

A code of conduct, security policy, and issue/PR templates are still to come.
