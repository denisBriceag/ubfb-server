import { Language } from '@core/types/language';

export interface CountrySuggestion {
  code: string;
  name: Record<Language, string | null>;
  emoji: string | null;
  exists: boolean;
}
