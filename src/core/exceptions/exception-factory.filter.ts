import { BadRequestException, ValidationError } from '@nestjs/common';
import { ERROR_MAP } from '@core/constants';

export function exceptionFactory(
  validationErrors: ValidationError[],
): BadRequestException {
  const errors = validationErrors.reduce(
    (
      prev: Record<string, string[]>,
      { property, constraints }: ValidationError,
    ) => ({
      ...prev,
      [property]: Object.values(constraints as Record<string, string>),
    }),
    {},
  );

  return new BadRequestException({
    errors,
    errorCode: ERROR_MAP.VALIDATION_ERROR,
  });
}
