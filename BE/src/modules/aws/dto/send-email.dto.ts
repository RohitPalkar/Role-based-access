// dto/send-email.dto.ts
import { IsEmail, IsString, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class SendEmailDto {
  @IsEmail({}, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  to: string | string[];

  @IsString()
  subject: string;

  @IsOptional()
  @IsString()
  textBody?: string;

  @IsOptional()
  @IsString()
  htmlBody?: string;

  @IsOptional()
  @IsEmail({}, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  cc?: string | string[];

  @IsOptional()
  @IsEmail({}, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  bcc?: string | string[];
}
