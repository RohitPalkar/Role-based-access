import { CommonFindAllQueryDto } from '../../../helpers/dto/commonFindAll.dto';
import { IsOptional, IsString } from 'class-validator';

export class GetAllUserDTO extends CommonFindAllQueryDto {
  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  role?: string;
}
