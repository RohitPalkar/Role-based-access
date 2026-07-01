import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class MarkUnavailableDto {
  @IsNumber()
  userId: number;

  @IsDateString()
  unavailableFrom: string;

  @IsDateString()
  unavailableTo: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
