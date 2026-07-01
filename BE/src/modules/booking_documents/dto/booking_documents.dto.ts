import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { IsNotEmptyTrimmed } from '../../../validations/common-validator/isNotEmptyTrimmed.validator';
import { BookingStageEnum } from 'src/enums/booking-documents.enum';
export class BookingDocumentsDto {
  @IsOptional()
  @IsNotEmptyTrimmed()
  @IsString()
  opportunityId: string;

  @IsNotEmptyTrimmed()
  @IsString()
  name: string;

  @IsNotEmptyTrimmed()
  @IsString()
  path: string;

  @IsNotEmptyTrimmed()
  @IsString()
  type: string;

  @IsBoolean()
  isOtherDoc: boolean;

  @IsEnum(BookingStageEnum)
  stage: BookingStageEnum;

  @IsOptional()
  @IsNumber()
  voucherId: number;
}
