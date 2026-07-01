import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsIn,
  IsNumber,
} from 'class-validator';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class UpdateEmailTemplateDto {
  @IsNotEmptyTrimmed()
  @IsNumber()
  @Type(() => Number)
  id: number;

  @IsNotEmptyTrimmed()
  @IsString()
  @IsOptional()
  subject?: string;

  @IsNotEmptyTrimmed()
  @IsString()
  @IsOptional()
  body?: string;

  @IsNotEmptyTrimmed()
  @IsString()
  @IsIn(['transactional', 'marketing', 'default'])
  @IsOptional()
  layout?: string;

  @IsNotEmptyTrimmed()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
