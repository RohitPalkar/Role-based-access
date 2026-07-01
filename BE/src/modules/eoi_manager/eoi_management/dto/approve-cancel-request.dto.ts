import { Type } from 'class-transformer';
import {
  IsNumber,
  IsString,
  MaxLength,
  MinLength,
  IsNotEmpty,
  IsEnum,
  IsArray,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CancellationActionEnum } from 'src/enums/eoi-form.enums';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class RefundDocuments {
  @IsNotEmptyTrimmed()
  @IsString({ each: true })
  @IsArray()
  refundChequeCopy: string[];

  @IsNotEmptyTrimmed()
  @IsString({ each: true })
  @IsArray()
  depositSlip: string[];

  @IsNotEmptyTrimmed()
  @IsString({ each: true })
  @IsArray()
  acknowledgementForm: string[];
}
export class ApproveCancelRequestDTO {
  @IsNotEmpty()
  @IsNumber()
  voucherId: number;

  @IsNotEmptyTrimmed()
  @IsString()
  @IsEnum(CancellationActionEnum)
  action: CancellationActionEnum;

  @IsNotEmpty()
  @IsString()
  @MinLength(2, {
    message: 'remarks must be at least 2 characters long.',
  })
  @MaxLength(500, {
    message: 'remarks must not exceeds 500 characters.',
  })
  @IsNotEmpty()
  remarks: string;

  @ValidateIf((o) => o.action === CancellationActionEnum.CANCEL)
  @IsNotEmpty({
    message: 'refundDocuments is required',
  })
  @ValidateNested()
  @Type(() => RefundDocuments)
  refundDocuments?: RefundDocuments;
}
