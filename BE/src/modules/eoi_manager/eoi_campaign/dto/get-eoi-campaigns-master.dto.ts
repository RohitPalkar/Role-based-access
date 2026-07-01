import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class GetEoiCampaignsMasterDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) {
      return false;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return false; // default to false
  })
  @IsBoolean()
  showAll?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) {
      return false;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return false; // default to false
  })
  @IsBoolean()
  showBuddyCampaigns?: boolean;
}
