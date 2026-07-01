import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class CreateEmailTemplateDto {
  @IsString()
  @IsNotEmptyTrimmed()
  event: string;

  @IsNotEmptyTrimmed()
  @IsString()
  subject: string;

  @IsNotEmptyTrimmed()
  @IsString()
  body: string;

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
