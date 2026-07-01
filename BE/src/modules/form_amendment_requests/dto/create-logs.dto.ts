import {
  IsString,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsInt,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  FormType,
  BookingFormStatusEnum,
  AmendmentStatus,
} from '../../../enums/booking-form-status.enum';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class CreateFormAmendmentRequestDto {
  @IsNotEmptyTrimmed()
  @IsString()
  opportunityId: string;

  @IsNotEmptyTrimmed()
  @IsEnum(FormType)
  formType: FormType;

  @IsNotEmptyTrimmed()
  @IsString()
  @MaxLength(500, { message: 'Provided reason is too long.' })
  reason: string;

  @IsInt()
  @IsNumber()
  @Type(() => Number)
  requestedBy: number;

  @IsNotEmptyTrimmed()
  @IsEnum(BookingFormStatusEnum)
  formStatusAtRequest: BookingFormStatusEnum;

  @IsNotEmptyTrimmed({ message: 'Request status at request cannot be empty.' })
  @IsEnum(AmendmentStatus, {
    message: 'Invalid form status at request provided.',
  })
  status: AmendmentStatus;

  @IsOptional()
  @IsBoolean({ message: 'Needs approval must be a boolean value.' })
  @Type(() => Boolean)
  needsApproval?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  approvedBy?: number;

  @IsOptional()
  approvedAt?: string;
}
