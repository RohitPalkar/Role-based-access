import { Type } from 'class-transformer';
import { IsNumber, IsString, MaxLength, MinLength } from 'class-validator';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class MarkEoiConvertedDto {
  @IsNotEmptyTrimmed()
  @IsNumber()
  @Type(() => Number)
  voucherId: number;

  @IsNotEmptyTrimmed()
  @IsString()
  @MinLength(2, {
    message: 'Remarks must be at least 2 characters long.',
  })
  @MaxLength(500, {
    message: 'Remarks must not exceeds 500 characters.',
  })
  @IsNotEmptyTrimmed()
  remarks: string;
}
