import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';
import { IsOptional, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';

export class ListTeamAvailabilityDto extends CommonFindAllQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map(Number);
    }
    if (typeof value === 'string') {
      return value.split(',').map(Number);
    }
    return undefined;
  })
  @IsInt({ each: true })
  project?: number[];
}
