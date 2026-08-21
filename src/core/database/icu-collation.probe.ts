import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  registerAvailableCollations,
  requiredCollations,
} from '@core/utils/localized-collator.util';

/**
 * Asks the server once, at boot, which of the ICU collations `collated()`
 * emits actually exist.
 *
 * Naming a collation the server does not have is a hard `42704` error, and
 * `TypeOrmExceptionFilter` has no case for it — it would surface as a 500 on
 * every name-sorted list, admin and store alike, the first time the app ran
 * against a Postgres built without ICU. Probing turns that into a bad sort
 * order plus one loud line in the boot log.
 * */
@Injectable()
export class IcuCollationProbe implements OnApplicationBootstrap {
  private readonly _logger = new Logger(IcuCollationProbe.name);

  constructor(@InjectDataSource() private readonly _dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    const required = requiredCollations();

    let rows: { collname: string }[];

    try {
      rows = await this._dataSource.query<{ collname: string }[]>(
        'SELECT collname FROM pg_collation WHERE collname = ANY($1)',
        [required],
      );
    } catch (error) {
      // The probe itself failed, which says nothing about the collations.
      // Leave them unregistered so `collated()` keeps its normal behaviour
      // rather than silently degrading every sort on a transient error.
      this._logger.warn(
        `Could not probe ICU collations, assuming they exist: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      return;
    }

    const found = rows.map((row) => row.collname);

    registerAvailableCollations(found);

    const missing = required.filter((collation) => !found.includes(collation));

    if (missing.length) {
      this._logger.error(
        `Missing ICU collations: ${missing.join(', ')}. Name and label sorting falls back to the database collation, which orders by byte — diacritics, Cyrillic and mixed case will sort wrongly. Install a PostgreSQL built with ICU support to fix it.`,
      );
    }
  }
}
