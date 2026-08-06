import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSlugToCategoriesiAndBrands1746901000000 implements MigrationInterface {
  name = 'AddSlugToCategoriesiAndBrands1746901000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "categories" ADD "slug" character varying(150) NOT NULL DEFAULT gen_random_uuid()::text`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ADD CONSTRAINT "UQ_categories_slug" UNIQUE ("slug")`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ALTER COLUMN "slug" DROP DEFAULT`,
    );

    await queryRunner.query(
      `ALTER TABLE "brands" ADD "slug" character varying(150) NOT NULL DEFAULT gen_random_uuid()::text`,
    );
    await queryRunner.query(
      `ALTER TABLE "brands" ADD CONSTRAINT "UQ_brands_slug" UNIQUE ("slug")`,
    );
    await queryRunner.query(
      `ALTER TABLE "brands" ALTER COLUMN "slug" DROP DEFAULT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "brands" DROP CONSTRAINT "UQ_brands_slug"`,
    );
    await queryRunner.query(`ALTER TABLE "brands" DROP COLUMN "slug"`);

    await queryRunner.query(
      `ALTER TABLE "categories" DROP CONSTRAINT "UQ_categories_slug"`,
    );
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "slug"`);
  }
}
