import { IsEnum, IsObject, IsString } from 'class-validator';
import { BookingAsEnum } from 'src/enums/booking-as.enum';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class MapVoucherApplicantsDto {
  @IsString()
  @IsNotEmptyTrimmed()
  voucherId: string;

  @IsString()
  @IsNotEmptyTrimmed()
  opportunityId: string;

  @IsObject()
  @IsNotEmptyTrimmed()
  mapping: Record<string, string>;

  @IsNotEmptyTrimmed()
  @IsEnum(BookingAsEnum)
  bookingAs: BookingAsEnum;
}
