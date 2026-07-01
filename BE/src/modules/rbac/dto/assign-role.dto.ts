import { IsNumber, IsOptional, IsString, IsArray, IsBoolean } from 'class-validator';

export class AssignRoleDto {
  @IsNumber()
  userId: number;

  @IsNumber()
  roleDefinitionId: number;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsArray()
  projectAccess?: number[];
}

export class RevokeRoleDto {
  @IsNumber()
  userId: number;

  @IsNumber()
  roleDefinitionId: number;
}

export class UpdateProjectAccessDto {
  @IsNumber()
  userId: number;

  @IsNumber()
  projectId: number;

  @IsNumber()
  moduleId: number;

  @IsBoolean()
  isEnabled: boolean;
}

export class UpdateMappingDto {
  @IsNumber()
  roleDefinitionId: number;

  @IsNumber()
  moduleId: number;

  @IsOptional()
  @IsNumber()
  subModuleId?: number;

  @IsArray()
  @IsNumber({}, { each: true })
  actionIds: number[];
}
