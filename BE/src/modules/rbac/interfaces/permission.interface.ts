export interface UserPermission {
  moduleCode: string;
  subModuleCode?: string;
  actionCode: string;
}

export interface PermissionCheck {
  module: string;
  action?: string;
  subModule?: string;
}

export interface RoleDefinitionDto {
  id: number;
  name: string;
  code: string;
  departmentId: number;
  levelId: number;
  description?: string;
  status: string;
}

export interface ModuleWithActions {
  id: number;
  name: string;
  code: string;
  icon?: string;
  routePath?: string;
  sortOrder: number;
  subModules?: any[];
  actions?: any[];
}
