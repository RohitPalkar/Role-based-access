import { IsOptional, IsString, IsEnum, IsDate } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  BookingStatusEnum,
  PaymentStatusEnum,
  ReraStatusEnum,
  UnitStatusEnum,
} from 'src/enums/booking-list.enums';

import { transformInputDate } from 'src/utils/dateFormat';

export class CreateIncentiveBookingDto {
  @IsOptional()
  @IsString()
  fy?: string;

  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Transform(transformInputDate, { toClassOnly: true })
  bookingDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Transform(transformInputDate, { toClassOnly: true })
  sapBookingDate?: Date;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  stmName?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() || null : value,
  )
  stm?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() || null : value,
  )
  stm2?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() || null : value,
  )
  stm3?: string;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsString()
  customerCode?: string;

  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  propertyNumber?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' && value === '' ? null : value,
  )
  externalBPNumber?: string;

  @IsOptional()
  @IsString()
  projectName?: string;

  @IsOptional()
  @IsString()
  projectType?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  saleType?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Transform(transformInputDate, { toClassOnly: true })
  agreementReceivedDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Transform(transformInputDate, { toClassOnly: true })
  cancellationDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Transform(transformInputDate, { toClassOnly: true })
  receivedDate?: Date;

  @IsOptional()
  @IsString()
  grossTotalValue?: string;

  @IsOptional()
  @IsString()
  totalReceived?: string;

  @IsOptional()
  @IsEnum(PaymentStatusEnum)
  paymentStatus?: PaymentStatusEnum;

  @IsOptional()
  @IsString()
  entityName?: string;

  @IsOptional()
  @IsEnum(ReraStatusEnum)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      // Check if the incoming string contains 'not'
      // (e.g., "OC not Received" should map to NO)
      if (value.toLowerCase().includes('not')) {
        return ReraStatusEnum.NO;
      } else {
        // Otherwise, assume it's a valid "OC" scenario.
        return ReraStatusEnum.OC;
      }
    }
    return value;
  })
  ReraNonReraEligibility?: ReraStatusEnum; //to Be Changed

  @IsOptional()
  @IsString()
  sbaSold?: string;

  @IsOptional()
  @IsString()
  carpetAreaSold?: string;

  @IsOptional()
  @IsString()
  salesOffice?: string;

  @IsOptional()
  @IsString()
  cityOfTheProject?: string;

  @IsOptional()
  @IsString()
  receivedPercent: string;

  @IsOptional()
  @IsEnum(BookingStatusEnum, {
    message: 'Status must be a either Active/Cancelled value',
  })
  status?: BookingStatusEnum;

  @IsEnum(UnitStatusEnum, {
    message: 'unitStatus must be a valid UnitStatusEnum value',
  })
  @IsOptional() // Optional if it can be omitted in requests
  unitStatus?: UnitStatusEnum;
}
