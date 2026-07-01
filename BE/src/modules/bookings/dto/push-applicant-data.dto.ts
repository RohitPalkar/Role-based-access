import { IsString, IsNotEmpty } from 'class-validator';
export class PushApplicantDataDto {
  @IsString()
  @IsNotEmpty()
  oppId: string;
}
