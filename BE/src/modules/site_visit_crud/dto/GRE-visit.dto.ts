import { IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';

export class GRESiteVisitFormDto {
  @IsEnum(['male', 'female', 'non-binary', 'not listed'])
  gender: string;

  @IsOptional()
  @IsNumber()
  headCount: number;

  @IsOptional()
  @IsString()
  exitTime: string;

  @IsOptional()
  @IsNumber()
  sourcingRm: string;

  @IsOptional()
  @IsNumber()
  sourcingRmName: string;

  @IsOptional()
  @IsNumber()
  closingRm?: number;

  @IsOptional()
  @IsString()
  closingRmName?: string;
}
