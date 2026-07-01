import { IsArray, IsOptional, IsString } from 'class-validator';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';

export class AssignedOpportunitiesDto extends CommonFindAllQueryDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  oppIds?: string[];

  @IsOptional()
  @IsString()
  groupId?: string;
}
