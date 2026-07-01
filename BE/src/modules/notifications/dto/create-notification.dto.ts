import {
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

class SingleNotificationDto {
  @IsString()
  type: string;

  @IsString()
  title: string;

  @IsString()
  message: string;

  // Optional: if provided, use these userIds for personalized notifications.
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  userIds?: number[];

  // Flag to indicate that this notification is for all admins.
  @IsOptional()
  @IsBoolean()
  isForAllAdmin?: boolean;

  // Flag to indicate that this notification is for all finance admins.
  @IsOptional()
  @IsBoolean()
  isForAllFinanceAdmin?: boolean;

  // Flag to indicate that this notification is for all RM users.
  @IsOptional()
  @IsBoolean()
  isForAllRm?: boolean;

  @IsOptional()
  @IsBoolean()
  isForAllBackendCheckers?: boolean;

  @IsOptional()
  @IsBoolean()
  isForAllSalesBH?: boolean;

  @IsOptional()
  @IsBoolean()
  isForAllCRM?: boolean;
}

export class CreateNotificationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SingleNotificationDto)
  notifications: SingleNotificationDto[];
}
