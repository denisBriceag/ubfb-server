import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSurnameToUsers1780617600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "surname" character varying(100) NOT NULL DEFAULT ''
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "surname" DROP DEFAULT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "surname"`,
    );
  }
}
