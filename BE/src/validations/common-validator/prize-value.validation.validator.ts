import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { PrizeType } from '../../modules/incentives/booster_master/dto/create-booster.dto';

@ValidatorConstraint({ name: 'IsValidPrizeValue', async: false })
export class IsValidPrizeValueConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const { rewardType } = args.object as any; //  Fix: Using correct field name (rewardType)

    if (!rewardType) return false; // Ensure rewardType exists

    switch (rewardType) {
      case PrizeType.PERCENTAGE:
        return typeof value === 'number' && value >= 0 && value <= 100;
      case PrizeType.CASH_PRIZE:
        return typeof value === 'number' && value > 0;
      case PrizeType.PERKS:
        return typeof value === 'string' && value.trim().length > 0;
      default:
        return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    const { rewardType } = args.object as any; //  Fix: Using correct field name (rewardType)

    switch (rewardType) {
      case PrizeType.PERCENTAGE:
        return 'Percentage prize must be a number between 0 and 100.';
      case PrizeType.CASH_PRIZE:
        return 'Cash Prize must be a positive decimal value.';
      case PrizeType.PERKS:
        return 'Perks prize must be a valid non-empty string.';
      default:
        return 'Invalid prize value.';
    }
  }
}

/**
 *  Custom Decorator for Reward Value Validation
 */
export function IsValidPrizeValue(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsValidPrizeValueConstraint,
    });
  };
}
