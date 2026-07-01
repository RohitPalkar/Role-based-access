import { Type } from 'class-transformer';
import { IsNumber, IsString, MaxLength, MinLength } from 'class-validator';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class CancelEoiDto {
  @IsNotEmptyTrimmed()
  @IsNumber()
  @Type(() => Number)
  voucherId: number;

  @IsNotEmptyTrimmed()
  @IsString()
  @MinLength(2, {
    message: 'remarks must be at least 2 characters long.',
  })
  @MaxLength(500, {
    message: 'remarks must not exceeds 500 characters.',
  })
  @IsNotEmptyTrimmed()
  remarks: string;
}
