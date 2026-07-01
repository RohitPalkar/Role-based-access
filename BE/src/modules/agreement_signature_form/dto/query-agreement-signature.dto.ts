import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';
import { IsOptional, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryAgreementSignatureDto extends CommonFindAllQueryDto {
  @IsOptional()
  @IsString()
  documentStatus?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  createdBy?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  internalSignatory?: number;

  @IsOptional()
  @IsString()
  documentType?: string;
}
