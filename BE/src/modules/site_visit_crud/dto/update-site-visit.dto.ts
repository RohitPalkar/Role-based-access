import { IsOptional, IsNumber } from 'class-validator';

export class UpdateSiteVisitFormDto {
  @IsOptional()
  @IsNumber()
  visitCount?: number;
}
