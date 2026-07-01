import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';

import { Users } from '../../entities';

import { Level } from './entities/level.entity';
import { Zone } from './entities/zone.entity';
import { RoleDefinition } from './entities/role-definition.entity';
import { ModuleDefinition } from './entities/module-definition.entity';
import { SubModuleDefinition } from './entities/sub-module-definition.entity';
import { ActionDefinition } from './entities/action-definition.entity';
import { DeptRoleModuleMapping } from './entities/dept-role-module-mapping.entity';
import { UserRoleAssignment } from './entities/user-role-assignment.entity';
import { UserHierarchy } from './entities/user-hierarchy.entity';
import { UserProjectModuleAccess } from './entities/user-project-module-access.entity';
import { PermissionAuditLog } from './entities/permission-audit-log.entity';

import { RbacRoleService } from './services/rbac-role.service';
import { RbacPermissionService } from './services/rbac-permission.service';
import { RbacAssignmentService } from './services/rbac-assignment.service';

import { RbacRoleController } from './controllers/rbac-role.controller';
import { RbacPermissionController } from './controllers/rbac-permission.controller';
import { RbacAssignmentController } from './controllers/rbac-assignment.controller';

import { PermissionGuard } from './guards/permission.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Level,
      Zone,
      RoleDefinition,
      ModuleDefinition,
      SubModuleDefinition,
      ActionDefinition,
      DeptRoleModuleMapping,
      UserRoleAssignment,
      UserHierarchy,
      UserProjectModuleAccess,
      PermissionAuditLog,
      Users,
    ]),
  ],
  controllers: [
    RbacRoleController,
    RbacPermissionController,
    RbacAssignmentController,
  ],
  providers: [
    RbacRoleService,
    RbacPermissionService,
    RbacAssignmentService,
    PermissionGuard,
  ],
  exports: [
    RbacPermissionService,
    RbacRoleService,
    RbacAssignmentService,
    PermissionGuard,
    TypeOrmModule,
  ],
})
export class RbacModule {}
