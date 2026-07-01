import { Type } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class RequestCancellationDto {
  @IsNotEmptyTrimmed()
  @IsString()
  @Type(() => String)
  voucherId: string;

  @IsNotEmptyTrimmed()
  @IsString()
  @MinLength(10, {
    message: 'Cancellation reason must be at least 10 characters long.',
  })
  @MaxLength(500, {
    message: 'Cancellation reason must not exceeds 500 characters.',
  })
  @IsNotEmptyTrimmed()
  cancelReason: string;
}
