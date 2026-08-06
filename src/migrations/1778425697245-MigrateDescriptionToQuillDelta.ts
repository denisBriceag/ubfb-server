import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateDescriptionToQuillDelta1778425697245 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE products
            SET description = jsonb_build_object(
                'en', jsonb_build_object('ops', jsonb_build_array(jsonb_build_object('insert', description->>'en'))),
                'ro', jsonb_build_object('ops', jsonb_build_array(jsonb_build_object('insert', description->>'ro'))),
                'ru', jsonb_build_object('ops', jsonb_build_array(jsonb_build_object('insert', description->>'ru')))
            )
            WHERE description IS NOT NULL
              AND jsonb_typeof(description->'en') = 'string'
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE products
            SET description = jsonb_build_object(
                'en', description->'en'->'ops'->0->>'insert',
                'ro', description->'ro'->'ops'->0->>'insert',
                'ru', description->'ru'->'ops'->0->>'insert'
            )
            WHERE description IS NOT NULL
              AND jsonb_typeof(description->'en') = 'object'
        `);
  }
}
