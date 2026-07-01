import { IsString } from 'class-validator';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class UnitSwappingDto {
  @IsNotEmptyTrimmed()
  @IsString()
  sourceOppId: string;

  @IsNotEmptyTrimmed()
  @IsString()
  targetOppId: string;
}
