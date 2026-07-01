import { IsNotEmpty, IsString } from 'class-validator';

export class PayoutFileDto {
  @IsNotEmpty()
  @IsString()
  fileName: string;

  @IsNotEmpty()
  @IsString()
  key: string;
}
