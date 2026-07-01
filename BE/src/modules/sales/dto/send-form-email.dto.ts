import { IsEnum, IsOptional, IsString } from 'class-validator';
import { FormType } from 'src/enums/booking-form-status.enum';
import { IsEmailList } from 'src/validations/common-validator/isEmailList.validator';

export class SendFormEmailDto {
  @IsString()
  oppId: string;

  @IsOptional()
  @IsEnum(FormType)
  formType: FormType = FormType.BOOKING; // Default is set to Booking

  @IsOptional()
  @IsString()
  @IsEmailList({
    message:
      'Email IDs must be a comma-separated list of valid email addresses.',
  })
  emailIds: string;
}
