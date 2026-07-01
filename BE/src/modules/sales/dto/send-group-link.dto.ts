import { IsOptional, IsString } from 'class-validator';
import { IsEmailList } from 'src/validations/common-validator/isEmailList.validator';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class SendGroupLinkDto {
  @IsString()
  @IsNotEmptyTrimmed()
  id: string;

  @IsOptional()
  @IsString()
  @IsEmailList({
    message:
      'Email IDs must be a comma-separated list of valid email addresses.',
  })
  emailIds: string;
}
