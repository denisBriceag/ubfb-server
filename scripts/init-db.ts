/**
 * Bootstraps the database for local development.
 *
 * The migration history in src/migrations is incremental only — the base
 * schema was never captured in a migration. On a fresh database we therefore
 * create the schema from the current entities and record all existing
 * migrations as applied; on an existing database we just run what's pending.
 */
import dataSource from '../typeorm-cli.config';

async function main(): Promise<void> {
  await dataSource.initialize();

  const [{ present }]: [{ present: boolean }] = await dataSource.query(
    `SELECT to_regclass('public.countries') IS NOT NULL AS present`,
  );

  if (present) {
    console.log('Existing schema detected — running pending migrations.');
    await dataSource.runMigrations({ transaction: 'each' });
  } else {
    console.log('Fresh database — creating schema from entities.');

    await dataSource.synchronize();
    await dataSource.runMigrations({ fake: true });

    console.log('Schema created; existing migrations marked as applied.');
  }

  await dataSource.destroy();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
