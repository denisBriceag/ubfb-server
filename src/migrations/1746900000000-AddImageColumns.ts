import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImageColumns1746900000000 implements MigrationInterface {
  name = 'AddImageColumns1746900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'categories' AND column_name = 'imageS3Key'
        ) THEN
          ALTER TABLE "categories" RENAME COLUMN "imageS3Key" TO "imageUrl";
        END IF;
      END $$
    `);

    await queryRunner.query(
      `ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "logoUrl" character varying`,
    );

    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "images" jsonb NOT NULL DEFAULT '[]'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "images"`);
    await queryRunner.query(`ALTER TABLE "brands" DROP COLUMN IF EXISTS "logoUrl"`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'categories' AND column_name = 'imageUrl'
        ) THEN
          ALTER TABLE "categories" RENAME COLUMN "imageUrl" TO "imageS3Key";
        END IF;
      END $$
    `);
  }
}
