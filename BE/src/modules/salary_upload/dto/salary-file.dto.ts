import { IsNotEmpty, IsString } from 'class-validator';

export class SalaryFileDto {
  @IsNotEmpty()
  @IsString()
  fileName: string;

  @IsNotEmpty()
  @IsString()
  key: string;
}
