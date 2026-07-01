import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';

export class RmDashboardFilterDto extends CommonFindAllQueryDto {
  // add filters here
  @IsNotEmpty()
  @IsString()
  @IsIn(['default', 'source'])
  view: string;

  @IsOptional()
  @IsArray()
  @IsIn(['unit', 'percentage', 'EOI value', 'EOI Amount Collected'], {
    each: true,
  })
  viewBy?: string[];

  @IsOptional()
  @IsString()
  campaign?: string;

  @IsOptional()
  @IsString()
  unitType?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsBoolean()
  isExcel?: boolean;

  @IsOptional()
  @IsBoolean()
  isReport?: boolean;
}
