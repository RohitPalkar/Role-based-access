import { IsString, IsNotEmpty, IsOptional, Length } from 'class-validator';

export class CreateRoleDefinitionDto {
  @IsString()
  @IsNotEmpty({ message: 'Role name is required' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Role code is required' })
  code: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}
