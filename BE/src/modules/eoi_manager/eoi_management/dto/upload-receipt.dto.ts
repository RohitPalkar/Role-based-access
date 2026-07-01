import { IsOptional, IsString } from 'class-validator';

export class UploadReceiptDto {
  @IsOptional()
  @IsString()
  receiptImage: string | null;
}
