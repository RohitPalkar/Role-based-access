import { IsString, IsOptional, Length } from 'class-validator';

export class UpdateRoleDto {
  @IsOptional()
  @IsString({ message: 'Description must be a valid string.' })
  @Length(0, 500, {
    message: 'Description must be between 0 and 500 characters long.',
  })
  description?: string;

  @IsOptional()
  @IsString({ message: 'UpdatedBy must be a valid string.' })
  updatedBy?: string;
}
