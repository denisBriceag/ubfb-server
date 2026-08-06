import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsIntegerInRange(
  min = 0,
  max = 100,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isIntegerInRange',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [min, max],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [min, max] = args.constraints;

          return (
            typeof value === 'number' &&
            Number.isInteger(value) &&
            value >= min &&
            value <= max
          );
        },

        defaultMessage(args: ValidationArguments) {
          const [min, max] = args.constraints;

          return `${args.property} must be an integer between ${min} and ${max}`;
        },
      },
    });
  };
}
