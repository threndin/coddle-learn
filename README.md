# Coddle Learn

**Learn, Build, Share, Grow.**

Open-source interactive learning platform for developers — roadmaps, courses, projects, credentials, and community in one place.

## Stack

| Layer | Tech |
|---|---|
| Web | Next.js · TypeScript · Tailwind CSS |
| API | Node.js · Express · TypeScript |
| Database | PostgreSQL |
| Monorepo | pnpm workspaces · Turborepo |

## Structure

```
coddle-learn/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Express API
├── packages/
│   └── shared/       # Shared types & constants
├── docs/
└── docker-compose.yml
```

## Getting started

**Prerequisites:** Node.js 20+, pnpm 10+, Docker (optional, for Postgres)

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
docker compose up -d
pnpm --filter @coddle/api exec prisma migrate deploy
pnpm --filter @coddle/api exec prisma generate
pnpm dev
```

| Service | URL |
|---|---|
| Web | http://localhost:3002 |
| API | http://localhost:4000 |
| Health | http://localhost:4000/health |
| Login | http://localhost:3002/login |

Sign-in uses a **Coddle account**. Run the Coddle app (see `docs/architecture.md`) and set `CODDLE_APP_URL` / `CODDLE_API_URL` in `apps/api/.env`.
## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Run web + api |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | Typecheck all packages |
| `pnpm --filter @coddle/web dev` | Web only |
| `pnpm --filter @coddle/api dev` | API only |

## Docs

- Product requirements & build plan → [`AGENTS.md`](./AGENTS.md)
- Architecture → [`docs/architecture.md`](./docs/architecture.md)
- Contributing → [`CONTRIBUTING.md`](./CONTRIBUTING.md)

## License

TBD — open source (license to be chosen during project foundation).
