import { IsArray, IsEmail, IsNotEmpty, IsNumber } from 'class-validator';

export class SendEOIBankDetailEmailDto {
  @IsNotEmpty()
  @IsNumber()
  campaignId: number;

  @IsNotEmpty()
  @IsArray()
  @IsEmail({}, { each: true })
  emailIds: string[];
}
