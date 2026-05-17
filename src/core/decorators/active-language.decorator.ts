import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Language } from '@core/types/language';

const VALID_LANGUAGES: Language[] = ['en', 'ro', 'ru'];
const DEFAULT_LANGUAGE: Language = 'ro';

export const ActiveLanguage = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Language => {
    const request = ctx.switchToHttp().getRequest();
    const lang = request.headers['x-language'] as string;

    return VALID_LANGUAGES.includes(lang as Language)
      ? (lang as Language)
      : DEFAULT_LANGUAGE;
  },
);
