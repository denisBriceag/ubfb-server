import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixAlcoholPercentagePrecision1746902000000 implements MigrationInterface {
  name = 'FixAlcoholPercentagePrecision1746902000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "alcoholPercentage" TYPE NUMERIC(5,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "alcoholPercentage" TYPE NUMERIC(4,1)`,
    );
  }
}
