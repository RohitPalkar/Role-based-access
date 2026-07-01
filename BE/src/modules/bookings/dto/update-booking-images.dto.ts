import { IsArray, IsNotEmpty, IsString } from 'class-validator';
import { OpportunityIdDto } from './opportunity-id.dto';

export class UpdateBookingImagesDto extends OpportunityIdDto {
  @IsNotEmpty()
  @IsString()
  path: string;

  @IsArray()
  images: string[];
}
