# Project notes for Claude sessions

Deeper context than CLAUDE.md. Update this file when the facts change; keep CLAUDE.md lean.
Last updated: 2026-08-06.

## State of the repo (as of last session)

- **PR #6** (`chore/fix-tooling-harness`, https://github.com/denisBriceag/ubfb-server/pull/6)
  repaired the tooling: ESLint previously matched no `.ts` files at all (missing
  `recommendedTypeChecked` entry), `tsc` failed on jest globals, and all 15 unit specs were
  broken `nest g` stubs (now deleted). CI added. Owner merges PRs himself — check whether it
  landed on `main` before assuming the fixes are present.
- Docker setup (Dockerfile, docker-compose.yml, `.env.example`, `scripts/init-db.ts`, README
  sections) was added in the working tree after PR #6 — may or may not be committed yet.
- The owner's real `.env.development` lives on another machine; the local one was generated
  from `.env.example` with placeholder secrets and a dummy `AWS_S3_REGION=us-east-1`.

## Design docs

- `docs/superpowers/specs/2026-08-06-docker-setup-design.md` — Docker/compose design and the
  discoveries made during implementation.

## Known issues / improvement backlog (agreed but not yet done)

1. **`RedisService.onApplicationShutdown` calls `flushdb()`** — wipes the entire Redis DB on
   every shutdown. Now properly awaited, but the behavior itself looks dangerous for any shared
   environment; flagged to the owner, not yet changed.
2. **No config validation** — `@nestjs/config` `validationSchema` would fail fast on
   misconfigured env instead of at first request. On the backlog from the tooling review.
3. **`no-unsafe-*` ESLint warnings backlog** (~190) — natural next step is enabling TS
   `strict` and ratcheting these back to errors. Do not attempt wholesale without being asked.
4. **TS strictness** — `strict` is off; `noImplicitAny: false`, `strictPropertyInitialization:
   false`, `useUnknownInCatchVariables: false`.
5. **Unused devDeps** — `supertest`/`@types/supertest` remain though e2e tests were removed.
6. **TypeScript 6.0.3 is ahead of ts-jest 29's supported range** — source of odd behavior;
   pinning back to 5.x is a sanctioned option if jest/tsc issues appear.
7. **`git history note`** — `docs/`, `CLAUDE.md`, `.claude/` are gitignored by owner's choice;
   these Claude docs are local-only.

## Hard-won facts (do not re-derive)

- **Nest CLI rewrites path aliases at build time** — compiled `dist/` has no `@core` requires.
  `tsc-alias` was tried and proven unnecessary. Plain `node dist/src/main.js` boots.
- **`baseUrl` breaks the build** under TS 6 (TS5101 hard error). `tsconfig-paths` v4 works
  without it (used by `typeorm-ts-node-commonjs` via the tsconfig `ts-node.require` entry).
- **Fresh-DB migration failure mode**: first migration is `LocalizeNameColumns1746384000000`
  which ALTERs `countries` — table never created by any migration (schema originally from
  `synchronize`). `scripts/init-db.ts` probes `to_regclass('public.countries')` to decide
  fresh-vs-existing.
- **bcrypt 6 needs no build script** (node-gyp-build + bundled prebuilds incl. musl); sharp
  ships prebuilds via optional deps. Alpine images work without a compiler toolchain. The
  pnpm `onlyBuiltDependencies` allowlist (only `@nestjs/core`) is therefore fine.
- **Port 3000 on the owner's Mac is usually taken** by their `node src/proxy/proxy.js`
  (unrelated project — never kill it). Compose maps `${APP_PORT:-3000}:3000`; the root
  `.env` (compose-interpolation only, gitignored) pins `APP_PORT=3001` on this machine.
- **Mailpit** accepts any SMTP auth via `MP_SMTP_AUTH_ACCEPT_ANY=1` +
  `MP_SMTP_AUTH_ALLOW_INSECURE=1`; mail config has `secure: false`, so the app's existing
  MAIL_USER/MAIL_PASS work unchanged. UI at :8025.
- **Error envelope convention**: throw `HttpException` subclasses with
  `{message: ErrorsEnum.X, errorCode: ERROR_MAP.X}` payloads; the global filters format the
  response and log with request metadata. `ErrorsEnum` intentionally has duplicate values
  (`VERSION_NOT_FOUND`/`VERSION_MISMATCH`) — eslint-disabled inline, don't "fix".
- **Auth flow specifics**: sign-in compares against `DUMMY_HASH` when the user doesn't exist
  (timing-attack/enumeration defense — see commit cec49ea); refresh-token reuse detection and
  access-token deny-listing go through Redis. Be careful not to break the constant-time
  properties when touching `authentication.service.ts`.

## Verification recipes

- Full local check (what CI runs): `pnpm lint:check && pnpm typecheck && pnpm test && pnpm build`
- Prod image smoke test: `docker build --target prod -t ubfb-server:prod .`
- Stack smoke test: `APP_PORT=3001 docker compose up -d`, then
  `curl localhost:3001/store/contacts` → expect the JSON error envelope (proves routing → DB),
  Mailpit at `localhost:8025`, `docker compose exec postgres psql -U ubfb -d ubfb -tAc
  "SELECT count(*) FROM migrations"` → 8.
