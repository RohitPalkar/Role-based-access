import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';
import { ToNumberArray } from 'src/utils/transformers';

export class ApprovalRequestListDto extends CommonFindAllQueryDto {
  @IsOptional()
  @IsString()
  cpName?: string;

  @IsOptional()
  @IsString()
  approvalStatus?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  campaignId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  cpLinkIds?: number;

  @ToNumberArray()
  @IsArray()
  @IsOptional()
  @ArrayNotEmpty()
  rmUsers?: number[];
}

export class ApproveBlockingDto {
  @IsOptional()
  @IsString()
  remark?: string;
}

export class RejectBlockingDto {
  @IsNotEmpty()
  @IsString()
  rejectedReason: string;

  @IsOptional()
  @IsString()
  remark?: string;
}
