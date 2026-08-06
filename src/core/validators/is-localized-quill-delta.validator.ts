import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Language } from '../types/language';

function isValidDelta(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Array.isArray((value as any).ops)
  );
}

export function IsLocalizedQuillDelta(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isLocalizedQuillDelta',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any): boolean {
          if (
            typeof value !== 'object' ||
            value === null ||
            Array.isArray(value)
          ) {
            return false;
          }
          const expectedKeys: Language[] = ['en', 'ro', 'ru'];
          return expectedKeys.every((key) => isValidDelta(value[key]));
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be an object with 'en', 'ro', and 'ru' keys, each containing a valid Quill Delta ({ ops: [...] }).`;
        },
      },
    });
  };
}
