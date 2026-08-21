import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Brings `packaging_types` up to the shape every other reference table already
 * has: BaseEntity columns, an auditable `updatedBy`, and a stable public key.
 *
 * `name` (free-text, admin-editable, and yet the key the storefront filtered
 * on) is replaced by `code`, and `label` becomes mandatory so the store always
 * has something to render.
 *
 * Written to be safe on three kinds of database:
 *   - a dev DB where `synchronize` already applied part or all of this,
 *   - a long-lived DB that still has the original three-column table,
 *   - a database that never had the table at all (it was never created by any
 *     migration — only by `synchronize`).
 * Hence the IF [NOT] EXISTS guards and the constraint probes by column rather
 * than by name: `synchronize` names its constraints with a hash we cannot
 * predict here.
 * */
export class ReworkPackagingTypes1786233600000 implements MigrationInterface {
  name = 'ReworkPackagingTypes1786233600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Original shape, so the ALTERs below have a single code path to follow.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "packaging_types" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(100) NOT NULL,
        "label" jsonb,
        CONSTRAINT "PK_packaging_types" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_packaging_types_name" UNIQUE ("name")
      )
    `);

    // --- BaseEntity columns -------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE "packaging_types"
        ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS "updatedBy" uuid,
        ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint c
          JOIN pg_attribute a
            ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
          WHERE c.conrelid = 'packaging_types'::regclass
            AND c.contype = 'f'
            AND a.attname = 'updatedBy'
        ) THEN
          ALTER TABLE "packaging_types"
            ADD CONSTRAINT "FK_packaging_types_updatedBy"
            FOREIGN KEY ("updatedBy") REFERENCES "users"("id");
        END IF;
      END $$;
    `);

    // In development `synchronize` may already have dropped `name` before this
    // ever runs, so every statement derived from it has to be conditional.
    const hasName = await this._hasNameColumn(queryRunner);

    // --- code ---------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE "packaging_types"
        ADD COLUMN IF NOT EXISTS "code" character varying(50)
    `);

    if (hasName) {
      // Backfill from `name`: slugify, with a fallback for names that slugify
      // to nothing at all (pure punctuation, or a script the `[^a-z0-9]`
      // class strips entirely). Collisions are expected here — "Bag in box"
      // and "bag-in-box" reduce to the same slug — and are resolved below
      // rather than in this statement.
      await queryRunner.query(`
        UPDATE "packaging_types"
        SET "code" = left(
          COALESCE(
            NULLIF(
              trim(both '-' from lower(regexp_replace("name", '[^a-z0-9]+', '-', 'gi'))),
              ''
            ),
            'packaging-type'
          ),
          50
        )
        WHERE "code" IS NULL
      `);
    }

    // Nothing left to derive a code from: keep the column fillable so the
    // NOT NULL below cannot fail, and leave an obviously-placeholder value.
    await queryRunner.query(`
      UPDATE "packaging_types"
      SET "code" = 'packaging-type-' || left("id"::text, 8)
      WHERE "code" IS NULL
    `);

    // De-duplicate before the unique constraint goes on, in one pass and
    // against every code in the table rather than only the ones this
    // migration just generated. A numeric suffix is not enough: three rows
    // named "Bag in box", "bag-in-box" and "Bag in box 2" produce
    // `bag-in-box`, `bag-in-box-2` and `bag-in-box-2` — the suffix collides
    // with a slug that was already legitimately that. The row id cannot
    // collide with anything, so it is what the losers get.
    await queryRunner.query(`
      WITH numbered AS (
        SELECT
          "id",
          row_number() OVER (PARTITION BY "code" ORDER BY "id") AS rn
        FROM "packaging_types"
      )
      UPDATE "packaging_types" pt
      SET "code" = left(pt."code", 13) || '-' || pt."id"::text
      FROM numbered n
      WHERE pt."id" = n."id" AND n.rn > 1
    `);

    await queryRunner.query(`
      ALTER TABLE "packaging_types" ALTER COLUMN "code" SET NOT NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint c
          JOIN pg_attribute a
            ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
          WHERE c.conrelid = 'packaging_types'::regclass
            AND c.contype IN ('u', 'p')
            AND a.attname = 'code'
        ) THEN
          ALTER TABLE "packaging_types"
            ADD CONSTRAINT "UQ_packaging_types_code" UNIQUE ("code");
        END IF;
      END $$;
    `);

    // --- label becomes mandatory -------------------------------------------
    // Rows created before `label` was required fall back to the old name in
    // all three languages; an admin can translate them afterwards.
    if (hasName) {
      await queryRunner.query(`
        UPDATE "packaging_types"
        SET "label" = jsonb_build_object('en', "name", 'ro', "name", 'ru', "name")
        WHERE "label" IS NULL
      `);
    }

    await queryRunner.query(`
      UPDATE "packaging_types"
      SET "label" = jsonb_build_object('en', "code", 'ro', "code", 'ru', "code")
      WHERE "label" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "packaging_types" ALTER COLUMN "label" SET NOT NULL
    `);

    // --- name is gone -------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE "packaging_types" DROP COLUMN IF EXISTS "name"
    `);

    // The referencing column on `products` was likewise only ever created by
    // `synchronize`; add it where it is missing so the relation survives a
    // migration-only build.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.products') IS NOT NULL THEN
          ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "packagingTypeId" uuid;

          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint c
            JOIN pg_attribute a
              ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
            WHERE c.conrelid = 'products'::regclass
              AND c.contype = 'f'
              AND a.attname = 'packagingTypeId'
          ) THEN
            ALTER TABLE "products"
              ADD CONSTRAINT "FK_products_packagingTypeId"
              FOREIGN KEY ("packagingTypeId") REFERENCES "packaging_types"("id");
          END IF;
        END IF;
      END $$;
    `);
  }

  private async _hasColumn(
    queryRunner: QueryRunner,
    column: string,
  ): Promise<boolean> {
    const rows = (await queryRunner.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'packaging_types'
        AND column_name = '${column}'
    `)) as unknown[];

    return rows.length > 0;
  }

  private async _hasNameColumn(queryRunner: QueryRunner): Promise<boolean> {
    return this._hasColumn(queryRunner, 'name');
  }

  private async _hasCodeColumn(queryRunner: QueryRunner): Promise<boolean> {
    return this._hasColumn(queryRunner, 'code');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasCode = await this._hasCodeColumn(queryRunner);

    await queryRunner.query(`
      ALTER TABLE "packaging_types"
        ADD COLUMN IF NOT EXISTS "name" character varying(100)
    `);

    // Best effort: the pre-migration names are not recoverable, so the code
    // stands in for them. Truncated to the old column width.
    if (hasCode) {
      await queryRunner.query(`
        UPDATE "packaging_types" SET "name" = left("code", 100) WHERE "name" IS NULL
      `);
    }

    await queryRunner.query(`
      UPDATE "packaging_types"
      SET "name" = left("id"::text, 100)
      WHERE "name" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "packaging_types" ALTER COLUMN "name" SET NOT NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint c
          JOIN pg_attribute a
            ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
          WHERE c.conrelid = 'packaging_types'::regclass
            AND c.contype IN ('u', 'p')
            AND a.attname = 'name'
        ) THEN
          ALTER TABLE "packaging_types"
            ADD CONSTRAINT "UQ_packaging_types_name" UNIQUE ("name");
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "packaging_types" ALTER COLUMN "label" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "packaging_types"
        DROP CONSTRAINT IF EXISTS "UQ_packaging_types_code"
    `);

    await queryRunner.query(`
      ALTER TABLE "packaging_types" DROP COLUMN IF EXISTS "code"
    `);

    await queryRunner.query(`
      ALTER TABLE "packaging_types"
        DROP CONSTRAINT IF EXISTS "FK_packaging_types_updatedBy"
    `);

    await queryRunner.query(`
      ALTER TABLE "packaging_types"
        DROP COLUMN IF EXISTS "version",
        DROP COLUMN IF EXISTS "updatedBy",
        DROP COLUMN IF EXISTS "createdAt",
        DROP COLUMN IF EXISTS "updatedAt",
        DROP COLUMN IF EXISTS "deletedAt"
    `);
  }
}
