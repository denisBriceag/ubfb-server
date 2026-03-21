# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm run start:dev       # Watch mode
pnpm run start:debug     # Debug mode with inspector

# Build & Production
pnpm run build
pnpm run start:prod

# Testing
pnpm run test                        # All unit tests
pnpm run test:watch                  # Unit tests in watch mode
pnpm run test:cov                    # With coverage
pnpm run test:e2e                    # End-to-end tests
npx jest path/to/file.spec.ts        # Single test file

# Linting & Formatting
pnpm run lint
pnpm run format

# Database Migrations (TypeORM)
npx typeorm migration:generate -d typeorm-cli.config.ts src/migrations/<MigrationName>
npx typeorm migration:run -d typeorm-cli.config.ts
npx typeorm migration:revert -d typeorm-cli.config.ts
```

## Architecture

This is a **NestJS** backend with a domain-driven structure split into two domains:

- **Admin domain** (`/admin`) — private/authenticated routes
- **Store domain** (`/store`) — public-facing routes

### Directory Layout

```
src/
├── core/           # Shared infrastructure: base entity, decorators, filters, guards, utils
├── domains/        # AdminModule and StoreModule — each aggregates relevant features
├── features/       # Feature modules (auth, users, contacts, maps, s3)
├── migrations/     # TypeORM migration files
├── app.module.ts   # Root module — registers RouterModule for both domains
├── private.routes.ts
└── public.routes.ts
```

### Routing

Routes are registered via NestJS `RouterModule` in `app.module.ts` using `private.routes.ts` and `public.routes.ts`. Features that serve both domains are split into `*AdminModule` and `*PublicModule` (e.g., `MapsAdminModule`, `MapsPublicModule`, `ContactsAdminModule`, `ContactsPublicModule`).

### Core Infrastructure (`src/core/`)

- **`BaseEntity`** — all entities extend this; provides UUID PK, soft deletes, timestamps, versioning, and `updatedBy`
- **Decorators** — `@Auth()`, `@ActiveUser()`, `@Role()`, `@ActiveLanguage()`
- **Guards** — access token guard, authentication guard, roles guard (in `features/authentication/guards/`)
- **Exception filters** — TypeORM and HTTP exception handling
- **Path aliases** — `@core/*` → `src/core/*`, `@features/*` → `src/features/*`

### Key Integrations

- **Database**: PostgreSQL via TypeORM (migrations-only, `synchronize: false`)
- **Auth**: JWT with Redis-backed sessions and `bcrypt` password hashing
- **Storage**: AWS S3 with CloudFront CDN; image processing via `sharp`
- **Cache**: Redis via `ioredis`
- **Email**: Nodemailer via `@nestjs-modules/mailer` (global module)
- **API Docs**: Swagger at `/api/admin` and `/api/store`

### Environment

Copy `.env.development` as a reference. Required variable groups: `JWT_*`, `COOKIE_*`, `REDIS_*`, `DB_*`, `MAIL_*`, `AWS_*`, `CORS_*`.

Node version: 24.12.0 (see `.nvmrc`). Package manager: `pnpm`.

## Catalog System

The catalog system lives in `src/catalog/`, `src/brands/`, `src/categories/`, `src/products/`, `src/uploads/`, and `src/common/`.

Each feature has a base module (`*.module.ts` — service + entities) and two thin wrappers:
- `modules/*-admin.module.ts` → registered under `/admin/*`
- `modules/*-public.module.ts` → registered under `/store/*`

**Routes:**
| Public (`/store/`) | Admin (`/admin/`) |
|---|---|
| `catalog/volume-units`, `catalog/countries` | same + full CRUD |
| `brands` | same + logo upload, reorder |
| `categories` | same + image upload, attribute definitions |
| `products`, `products/:slug` | same + images, attributes, toggle, reorder |

**Common helpers** (`src/common/`):
- `dto/lang.dto.ts` — `?lang=ru|ro|en` (default `ru`)
- `dto/pagination.dto.ts` — `?page=&limit=` (max 50)
- `dto/reorder.dto.ts` — `{ items: [{ id, sortOrder }] }`
- `helpers/flatten-translation.helper.ts` — merges translation row into entity for public responses
- `helpers/delta-to-text.helper.ts` — extracts plain text from Quill Delta JSON

**Uploads** (`src/uploads/`): local filesystem at `./public/uploads/:entity/:id/`, served at `/uploads/...`. Methods: `saveFiles`, `deleteFile`, `deleteFolder`.

**Seeder:** `pnpm run seed` — idempotent, seeds languages, volume units, countries, brands, categories (with attribute definitions for coffee/tea), and 15 products.
