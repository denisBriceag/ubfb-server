# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow rules

- **Never commit, push, or create PRs.** The owner handles all git work. Make changes, verify them, summarize, and stop.
- Deeper background and the running list of known issues live in `docs/claude/project-notes.md`.

## Commands

```bash
docker compose up   # infrastructure only: Postgres, Redis, Mailpit. The app is NOT
                    # started — run it on the host with `pnpm start:dev`.
docker compose --profile app up
                    # adds the containerised app (watch mode) on top of the above.
                    # Host port comes from APP_PORT in the root .env (3001 on this
                    # machine — the owner's proxy occupies 3000); default is 3000

pnpm start:dev                     # app on the host against the compose infrastructure
                                   # (run `pnpm db:init` first on a fresh database)
pnpm build                         # nest build → dist/ (CLI rewrites @core/@features aliases)
pnpm lint                          # eslint with --fix
pnpm lint:check                    # check-only (what CI runs)
pnpm typecheck                     # tsc --noEmit
pnpm test                          # jest; currently no spec files exist (--passWithNoTests)
npx jest path/to/file.spec.ts      # single test file (specs live next to sources in src/)

pnpm db:init                       # bootstrap DB: fresh → schema from entities + fake-apply migrations; else run pending
pnpm migrate                       # run migrations directly from TS (no build needed)
pnpm migrate:dev                   # legacy: runs migrations from dist/ (requires pnpm build first)
npx typeorm migration:create src/migrations/Name
```

CI (`.github/workflows/ci.yml`) runs lint:check → typecheck → test → build on every push/PR.

## Architecture

NestJS 11 + TypeORM (Postgres) + Redis (ioredis) + JWT auth. pnpm, Node 24 (`.nvmrc`).

**Two API surfaces from one app** via `RouterModule`: `src/private.routes.ts` mounts feature
modules under `/admin/*` (JWT-guarded back office), `src/public.routes.ts` mounts store-facing
modules under `/store/*`. Features that serve both surfaces split into per-domain submodules
(e.g. `contacts/modules/contacts-admin.module.ts` vs `contacts-store.module.ts`) sharing one
service/entity layer. Separate Swagger docs: `/api/admin` and `/api/store`.

**Layout:** `src/core/` = cross-cutting infrastructure (exceptions, redis, mail, hashing,
cookies, swagger configs, validators, `ErrorsEnum`/`ERROR_MAP` in `core/types`);
`src/features/<name>/` = business modules (controllers/services/entities/dto);
`src/domains/` = thin aggregators for the two route trees. Path aliases `@core/*`, `@features/*`
(mapped in tsconfig and in the jest `moduleNameMapper`).

**Global behavior** (registered in `app.module.ts` and `main.ts`): ThrottlerGuard,
`TypeOrmExceptionFilter` + `HttpExceptionFilter` (all errors leave as a domain-tagged envelope
`{domain, statusCode, errorCode, message, ...}` — use `ErrorsEnum` + `ERROR_MAP` codes when
throwing), `ClassSerializerInterceptor` (`@Exclude` works), `ValidationPipe` with
`whitelist + forbidNonWhitelisted` (unknown DTO fields are rejected — keep DTOs complete).
`AuthenticationGuard` and `RolesGuard` are registered as `APP_GUARD`s inside
`features/authentication/authentication.module.ts`, so importing that module makes auth global
for its route tree. Auth is JWT access+refresh with Redis-backed token revocation/deny-listing.

## Database — read before touching schema or migrations

- `app.module.ts` sets `synchronize: NODE_ENV !== 'production'` — in dev the schema follows
  entities automatically at boot. Because of this the migration history is **incremental only**:
  the earliest migration ALTERs tables no migration ever created, so a fresh database cannot be
  built from migrations. `pnpm db:init` (`scripts/init-db.ts`) handles this. Nothing runs it
  for you when the app runs on the host — only the `app` compose service does, on every start —
  so run it yourself against a fresh database.
- Consequence: migrations are only genuinely exercised against long-lived databases. When adding
  a migration, remember dev likely already has the change via synchronize.
- Entity files must match `*.entity.ts` (TypeORM CLI globs them); migrations live in `src/migrations/`.

## Environment

Config loads `.env.${NODE_ENV}` from the repo root (`.env.development` for dev — gitignored;
`.env.example` documents every variable). Real environment variables always win over the file —
docker-compose uses this to point DB/Redis/Mail at its services. Gotcha: `AWS_S3_REGION` must be
non-empty or `S3Client` throws during DI and the app won't boot.

## Tooling gotchas

- TypeScript 6: `baseUrl` is a hard error (don't add it); jest globals need the explicit
  `"types": ["node", "jest"]` already present in tsconfig.
- ESLint: the `no-unsafe-*` family is deliberately downgraded to warnings (large `any`-typed
  backlog); don't silence new errors, and don't "fix" the warnings wholesale without being asked.
  `no-floating-promises` is an error — don't drop promises.
- `start:prod` runs `node dist/src/main` (dist nests under `src/` because `rootDir` is `.`).
