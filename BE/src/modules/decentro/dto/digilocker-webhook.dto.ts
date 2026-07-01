import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class DigiLockerWebhookDto {
  @IsNotEmpty()
  @IsString()
  aadhaar_number: string;

  @IsNotEmpty()
  @IsString()
  pan_number: string;

  @IsNotEmpty()
  @IsString()
  name_as_per_aadhaar: string;

  @IsNotEmpty()
  @IsString()
  name_as_per_pan: string;

  @IsOptional()
  @IsString()
  reference_id?: string;

  @IsOptional()
  @IsString()
  callback_transaction_id?: string;

  @IsOptional()
  @IsNumber()
  applicant_number?: number;

  @IsOptional()
  status?: string;

  @IsOptional()
  message?: string;
}
