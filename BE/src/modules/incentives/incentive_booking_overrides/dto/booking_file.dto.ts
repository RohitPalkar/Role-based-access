import { IsNotEmpty, IsString } from 'class-validator';

export class BookingFileDto {
  @IsNotEmpty()
  @IsString()
  fileName: string;

  @IsNotEmpty()
  @IsString()
  key: string;
}
