import { IsNumber } from 'class-validator';

export class MarkAvailableDto {
  @IsNumber()
  userId: number;
}
