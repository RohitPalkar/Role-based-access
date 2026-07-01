import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateRoleDto {
  @IsString({ message: 'Role must be a valid string.' })
  @Matches(/^[a-zA-Z\s]+$/, {
    message: 'Role can only contain letters and spaces.',
  })
  role: string;

  @IsOptional()
  @IsString({ message: 'Description must be a valid string.' })
  @Length(0, 500, {
    message: 'Description must be between 0 and 500 characters long.',
  })
  description?: string;

  @IsOptional()
  @IsString({ message: 'CreatedBy must be a valid string.' })
  createdBy?: string;

  @IsOptional()
  @IsString({ message: 'UpdatedBy must be a valid string.' })
  updatedBy?: string;
}
