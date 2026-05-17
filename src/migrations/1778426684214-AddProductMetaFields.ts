import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProductMetaFields1778426684214 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "metaTitle" jsonb NULL`);
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "metaDescription" jsonb NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "metaDescription"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "metaTitle"`);
    }

}
