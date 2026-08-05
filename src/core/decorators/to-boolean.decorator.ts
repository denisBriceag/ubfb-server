import { Transform } from 'class-transformer';

const TRUE_VALUES = ['true', '1'];
const FALSE_VALUES = ['false', '0'];

/**
 * @description Parses boolean query parameters.
 *
 * `@Type(() => Boolean)` must not be used for this: it applies the `Boolean`
 * constructor, so every non-empty query string — including `'false'` and `'0'`
 * — becomes `true`.
 *
 * Unrecognised values are passed through untouched so that `@IsBoolean()`
 * rejects them instead of silently coercing the request.
 * */
export const ToBoolean = (): PropertyDecorator =>
  Transform(({ value }) => {
    if (typeof value === 'boolean' || value === undefined || value === null) {
      return value;
    }

    const normalized = String(value).trim().toLowerCase();

    if (TRUE_VALUES.includes(normalized)) return true;
    if (FALSE_VALUES.includes(normalized)) return false;

    return value;
  });
