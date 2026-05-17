import { Language } from '@core/types/language';

export function resolveLocalized(
  record: Record<Language, string>,
  language: Language,
): string {
  return record[language] ?? record.en;
}

export function resolveLocalizedNullable(
  record: Record<Language, string> | null,
  language: Language,
): string | null {
  if (!record) return null;

  return record[language] ?? record.en;
}
