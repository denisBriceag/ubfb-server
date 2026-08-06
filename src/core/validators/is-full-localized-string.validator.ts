import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Language } from '../types/language';

export function IsFullLocalizedString(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isFullLocalizedString',
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

          return expectedKeys.every(
            (key) =>
              typeof value[key] === 'string' && value[key].trim().length > 0,
          );
        },

        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be an object with non-empty 'en', 'ro', and 'ru' string values.`;
        },
      },
    });
  };
}
