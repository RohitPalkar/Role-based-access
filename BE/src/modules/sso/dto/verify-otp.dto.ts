import { IsEmail, IsString, Length, Matches } from 'class-validator';
import { OTP_REGEX } from 'src/config/constants';

export class VerifyOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  @Matches(OTP_REGEX, { message: 'OTP must be a 6-digit number' })
  otp: string;
}
