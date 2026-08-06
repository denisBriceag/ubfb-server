import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsGiftBoxAndRelatedProducts1779031320000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "isGiftBox" BOOLEAN NOT NULL DEFAULT FALSE
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_related_products" (
        "product_id"         UUID NOT NULL,
        "related_product_id" UUID NOT NULL,
        CONSTRAINT "PK_product_related_products"
          PRIMARY KEY ("product_id", "related_product_id"),
        CONSTRAINT "FK_prp_product"
          FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_prp_related_product"
          FOREIGN KEY ("related_product_id") REFERENCES "products"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "product_related_products"`);
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "isGiftBox"`,
    );
  }
}
