import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { GST_NUMBER_REGEX } from 'src/config/constants';
import { BookingAsEnum } from 'src/enums/booking-as.enum';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class UpdateCompanyDetailsDto {
  @IsNotEmptyTrimmed()
  @IsString()
  opportunityId: string;

  @IsNotEmptyTrimmed()
  @IsEnum(BookingAsEnum)
  bookingAs?: BookingAsEnum;

  @ValidateIf((o) => o.saveForLater !== true)
  @IsNotEmptyTrimmed()
  @IsString()
  @Matches(GST_NUMBER_REGEX, {
    message: 'Please enter a valid GST number.',
  })
  gstNumber?: string;

  @ValidateIf((o) => o.saveForLater !== true)
  @IsNotEmptyTrimmed()
  @IsString()
  companyName?: string;

  @ValidateIf((o) => o.saveForLater !== true)
  @IsNotEmptyTrimmed()
  @IsString()
  companyPan?: string;

  @ValidateIf((o) => o.saveForLater !== true)
  @IsNotEmptyTrimmed()
  @IsString()
  companyAddress?: string;

  @IsNotEmpty()
  @IsInt()
  @Min(0)
  @Max(10)
  lastStep: number;

  @IsOptional()
  @IsBoolean()
  saveForLater?: boolean;
}
