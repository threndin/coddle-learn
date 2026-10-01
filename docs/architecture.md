# Architecture

## Monorepo layout

| Path | Purpose |
|---|---|
| `apps/web` | Next.js 15 marketing app and future product UI |
| `apps/api` | Express 5 + TypeScript REST API |
| `packages/shared` | Shared types and constants |
| `docs/` | Product and engineering documentation |

## Tooling

- **pnpm workspaces** — dependency linking between apps and packages
- **Turborepo** — parallel `dev`, `build`, `lint`, and `typecheck`

## Local services

PostgreSQL runs via Docker Compose (`docker compose up -d`). The API reads `DATABASE_URL` from environment (see `apps/api/.env.example`).

## Day 1 scope

- Monorepo scaffolding
- Health-check API
- Public landing page
- Contributor guide (`CONTRIBUTING.md`)

Authentication, ORM, and database migrations follow in subsequent milestones.
