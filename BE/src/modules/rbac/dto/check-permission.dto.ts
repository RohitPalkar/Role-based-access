import { IsString, IsOptional } from 'class-validator';

export class CheckPermissionDto {
  @IsString()
  module: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  subModule?: string;

  @IsOptional()
  @IsString()
  userId?: number;
}
