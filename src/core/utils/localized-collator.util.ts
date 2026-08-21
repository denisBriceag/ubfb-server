import { Language } from '@core/types/language';

/**
 * Locale-aware string comparison for user-facing lists.
 *
 * Postgres sorts text with the database collation, which is `C` here — raw
 * byte order. That is only alphabetical for uniform-case ASCII: it puts
 * `Canistră` before `Cană` (a multi-byte `ă` sorts after `i`), `Ёмкость`
 * ahead of `Банка`, and every lower-case label after every upper-case one.
 * ICU collations in Postgres would fix it, but their availability differs
 * between a local install and the Alpine container, so the ordering is done
 * here instead — Node ships full ICU.
 *
 * Only valid for lists loaded in full. Anything paginated or limited in SQL
 * must be ordered by the database, since sorting one page cannot order the
 * whole set — use {@link collated} there.
 * */
const collators = new Map<Language, Intl.Collator>();

export function getCollator(language: Language): Intl.Collator {
  let collator = collators.get(language);

  if (!collator) {
    /**
     * Deliberately *not* `{ numeric: true }`. The Postgres counterpart
     * ({@link collated}) uses the stock `*-x-icu` collations, which have no
     * numeric handling, and there is no way to ask for one inline without
     * defining a custom collation. With numeric ordering here the same list
     * would sort differently depending on whether it came back from SQL or
     * was ordered in Node — `Vin 10` before `Vin 2` on one path and after it
     * on the other. Matching the database is worth more than smarter
     * ordering of the handful of names that carry numbers.
     * */
    collator = new Intl.Collator(language);
    collators.set(language, collator);
  }

  return collator;
}

/** Sorts in place, ascending, by the localized key of each item. */
export function sortByLocalized<T>(
  items: T[],
  language: Language,
  key: (item: T) => string,
): T[] {
  const collator = getCollator(language);

  return items.sort((a, b) => collator.compare(key(a), key(b)));
}

const ICU_COLLATIONS: Record<Language, string> = {
  en: 'en-x-icu',
  ro: 'ro-x-icu',
  ru: 'ru-x-icu',
};

/**
 * Which of the collations above the connected server actually has, as probed
 * once at boot by `IcuCollationProbe`. `null` means the probe has not run
 * (unit tests, scripts) — assume the collations exist and behave exactly as
 * before, so nothing has to know about the probe to work.
 * */
let availableCollations: Set<string> | null = null;

export function registerAvailableCollations(names: Iterable<string>): void {
  availableCollations = new Set(names);
}

/** The collations {@link collated} needs, for the boot probe to look up. */
export function requiredCollations(): string[] {
  return Object.values(ICU_COLLATIONS);
}

/**
 * Postgres-side counterpart of {@link sortByLocalized}, for lists that are
 * paginated in SQL and therefore cannot be ordered in Node — sorting a single
 * page cannot order the whole set.
 *
 * Without it both environments sort text by byte: the local cluster is `C`,
 * and the Alpine container reports `en_US.utf8` but runs on musl, which does
 * not implement locale collation and falls back to byte order regardless. ICU
 * is present in both (verified on PostgreSQL 14 locally and 17 in the
 * container) — but a server built without ICU has no `*-x-icu` collations at
 * all, and naming a missing one is a hard `42704` error that would surface as
 * a 500 on every sorted list endpoint. So a server that lacks them sorts
 * badly instead of failing: `IcuCollationProbe` logs the degradation once at
 * boot and this returns the bare expression.
 *
 * Only valid on text expressions. Applying a collation to a numeric or
 * timestamp column is a hard SQL error, so callers must use this solely for
 * the name/label sort and never for `price`, `createdAt` and friends.
 *
 * The collation name comes from this fixed map, never from request input.
 * */
export function collated(
  expression: string,
  language: Language = 'en',
): string {
  const collation = ICU_COLLATIONS[language] ?? ICU_COLLATIONS.en;

  if (availableCollations && !availableCollations.has(collation)) {
    return expression;
  }

  return `${expression} COLLATE "${collation}"`;
}
