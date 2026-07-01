import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { BatchStage } from 'src/enums/batch-manager.enums';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';

export class ListBatchesDto extends CommonFindAllQueryDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  campaignId?: number;

  @IsOptional()
  @IsString()
  stage?: BatchStage;
}
