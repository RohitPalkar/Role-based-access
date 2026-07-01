import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { GST_NUMBER_REGEX } from 'src/config/constants';
import { BookingAsEnum } from 'src/enums/booking-as.enum';

export class GetGstDetailsDto {
  @IsNotEmpty()
  @IsString()
  @Matches(GST_NUMBER_REGEX, {
    message: 'Please enter a valid GST number.',
  })
  gstNumber: string;

  @IsString()
  @IsNotEmpty()
  opportunityId: string;

  @IsOptional()
  @IsEnum(BookingAsEnum, {
    message: `bookingAs must be one of the following values: ${Object.values(
      BookingAsEnum,
    ).join(', ')}`,
  })
  bookingAs?: BookingAsEnum;
}
