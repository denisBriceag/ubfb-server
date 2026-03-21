export function flattenTranslation<T>(entity: any, lang: string): T {
  const tr = entity.translations?.find((t: any) => t.languageCode === lang) ?? {};
  const { translations, ...rest } = entity;
  return { ...rest, ...tr } as T;
}
