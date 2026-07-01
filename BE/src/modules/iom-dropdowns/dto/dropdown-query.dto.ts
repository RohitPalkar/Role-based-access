import { Transform, Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsEnum } from 'class-validator';

import { DropdownTypeEnum } from '../enums/dropdown-type.enum';

/**
 * Body payload for `POST /iom-dropdowns`.
 *
 * `type` accepts one or more dropdown discriminators. The transform
 * normalizes a single string into a one-item array so the controller
 * and service can handle both shapes uniformly while still validating
 * every requested value against `DropdownTypeEnum`.
 */
export class DropdownQueryDto {
  @Transform(({ value }) => {
    if (!value) {
      return value;
    }

    return Array.isArray(value) ? value : [value];
  })
  @Type(() => String)
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(DropdownTypeEnum, {
    each: true,
    message: `type must be one of: ${Object.values(DropdownTypeEnum).join(', ')}`,
  })
  type: DropdownTypeEnum[];
}
