import { IsOptional, IsString } from 'class-validator';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';

export class LogFindAllQueryDto extends CommonFindAllQueryDto {
  @IsOptional()
  @IsString()
  logStatus?: string;

  @IsOptional()
  @IsString()
  logEvent?: string;
}
