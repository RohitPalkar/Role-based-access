import { IsNotEmpty, IsString } from 'class-validator';

export class CreateUpdateRegionDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}
