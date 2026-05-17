import { MigrationInterface, QueryRunner } from 'typeorm';

export class LocalizeNameColumns1746384000000 implements MigrationInterface {
  name = 'LocalizeNameColumns1746384000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "countries" DROP COLUMN "name"`);
    await queryRunner.query(
      `ALTER TABLE "countries" ADD "name" jsonb NOT NULL DEFAULT '{"en":"","ro":"","ru":""}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "countries" ALTER COLUMN "name" DROP DEFAULT`,
    );

    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "name"`);
    await queryRunner.query(
      `ALTER TABLE "categories" ADD "name" jsonb NOT NULL DEFAULT '{"en":"","ro":"","ru":""}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ALTER COLUMN "name" DROP DEFAULT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "countries" DROP COLUMN "name"`);
    await queryRunner.query(
      `ALTER TABLE "countries" ADD "name" character varying(100) NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "countries" ALTER COLUMN "name" DROP DEFAULT`,
    );

    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "name"`);
    await queryRunner.query(
      `ALTER TABLE "categories" ADD "name" character varying(150) NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ALTER COLUMN "name" DROP DEFAULT`,
    );
  }
}
