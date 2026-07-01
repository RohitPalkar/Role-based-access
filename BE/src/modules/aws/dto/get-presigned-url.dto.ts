// src/aws/dto/get-presigned-url.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';
import UploadFoldersEnum from 'src/enums/upload-folders.enum';

export class GetPreSignedURLDto {
  @IsNotEmpty()
  @IsString()
  key: string;

  @IsNotEmpty()
  folder: UploadFoldersEnum;
}
