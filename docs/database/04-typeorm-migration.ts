// ============================================================================
// TypeORM Migration: Create RBAC Tables
// File naming: 1719000000000-CreateRBACTables.ts
// Place in: BE/src/migrations/
// Run: npm run migration:run
// ============================================================================

import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey, TableColumn } from 'typeorm';

export class CreateRBACTables1719000000000 implements MigrationInterface {
  name = 'CreateRBACTables1719000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---------------------------------------------------
    // 1. ZONES
    // ---------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'zones',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'name', type: 'varchar', length: '100', isNullable: false },
          { name: 'code', type: 'varchar', length: '20', isNullable: false },
          { name: 'description', type: 'varchar', length: '255', isNullable: true },
          { name: 'status', type: 'enum', enum: ['active', 'inactive'], default: "'active'", isNullable: false },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', isNullable: false },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('zones', new TableIndex({ name: 'uq_zones_name', columnNames: ['name'], isUnique: true }));
    await queryRunner.createIndex('zones', new TableIndex({ name: 'uq_zones_code', columnNames: ['code'], isUnique: true }));
    await queryRunner.createIndex('zones', new TableIndex({ name: 'idx_zones_status', columnNames: ['status'] }));

    // ---------------------------------------------------
    // 2. CITIES
    // ---------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'cities',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'name', type: 'varchar', length: '100', isNullable: false },
          { name: 'zone_id', type: 'int', isNullable: false },
          { name: 'status', type: 'enum', enum: ['active', 'inactive'], default: "'active'", isNullable: false },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('cities', new TableIndex({ name: 'uq_cities_name_zone', columnNames: ['name', 'zone_id'], isUnique: true }));
    await queryRunner.createIndex('cities', new TableIndex({ name: 'idx_cities_zone_id', columnNames: ['zone_id'] }));
    await queryRunner.createIndex('cities', new TableIndex({ name: 'idx_cities_status', columnNames: ['status'] }));
    await queryRunner.createForeignKey('cities', new TableForeignKey({
      name: 'fk_cities_zone',
      columnNames: ['zone_id'],
      referencedTableName: 'zones',
      referencedColumnNames: ['id'],
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    }));

    // ---------------------------------------------------
    // 3. LEVELS
    // ---------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'levels',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'code', type: 'varchar', length: '10', isNullable: false },
          { name: 'name', type: 'varchar', length: '100', isNullable: false },
          { name: 'description', type: 'varchar', length: '255', isNullable: true },
          { name: 'sort_order', type: 'int', default: 0, isNullable: false },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('levels', new TableIndex({ name: 'uq_levels_code', columnNames: ['code'], isUnique: true }));
    await queryRunner.createIndex('levels', new TableIndex({ name: 'idx_levels_sort_order', columnNames: ['sort_order'] }));

    // ---------------------------------------------------
    // 4. DEPARTMENTS (alter existing — skip if already done)
    // ---------------------------------------------------
    const deptTable = await queryRunner.getTable('departments');
    if (deptTable) {
      if (!deptTable.columns.find(c => c.name === 'code')) {
        await queryRunner.addColumn('departments', new TableColumn({ name: 'code', type: 'varchar', length: '20', isNullable: true }));
      }
      if (!deptTable.columns.find(c => c.name === 'level')) {
        await queryRunner.addColumn('departments', new TableColumn({ name: 'level', type: 'varchar', length: '10', default: "'L5'", isNullable: false }));
      }
      if (!deptTable.columns.find(c => c.name === 'status')) {
        await queryRunner.addColumn('departments', new TableColumn({ name: 'status', type: 'enum', enum: ['active', 'inactive'], default: "'active'", isNullable: false }));
      }
    } else {
      // Create from scratch if table doesn't exist
      await queryRunner.createTable(
        new Table({
          name: 'departments',
          columns: [
            { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'name', type: 'varchar', length: '100', isNullable: false },
            { name: 'code', type: 'varchar', length: '20', isNullable: true },
            { name: 'level', type: 'varchar', length: '10', default: "'L5'", isNullable: false },
            { name: 'status', type: 'enum', enum: ['active', 'inactive'], default: "'active'", isNullable: false },
            { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
            { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
          ],
        }),
        true,
      );
    }

    // ---------------------------------------------------
    // 5. ROLE_DEFINITIONS
    // ---------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'role_definitions',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'name', type: 'varchar', length: '100', isNullable: false },
          { name: 'code', type: 'varchar', length: '50', isNullable: false },
          { name: 'department_id', type: 'int', isNullable: false },
          { name: 'level_id', type: 'int', isNullable: false },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'status', type: 'enum', enum: ['active', 'inactive'], default: "'active'", isNullable: false },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('role_definitions', new TableIndex({ name: 'uq_role_definitions_name', columnNames: ['name'], isUnique: true }));
    await queryRunner.createIndex('role_definitions', new TableIndex({ name: 'uq_role_definitions_code', columnNames: ['code'], isUnique: true }));
    await queryRunner.createIndex('role_definitions', new TableIndex({ name: 'idx_role_definitions_department_id', columnNames: ['department_id'] }));
    await queryRunner.createIndex('role_definitions', new TableIndex({ name: 'idx_role_definitions_level_id', columnNames: ['level_id'] }));
    await queryRunner.createIndex('role_definitions', new TableIndex({ name: 'idx_role_definitions_status', columnNames: ['status'] }));

    await queryRunner.createForeignKey('role_definitions', new TableForeignKey({
      name: 'fk_role_definitions_department',
      columnNames: ['department_id'],
      referencedTableName: 'departments',
      referencedColumnNames: ['id'],
      onDelete: 'RESTRICT', onUpdate: 'CASCADE',
    }));
    await queryRunner.createForeignKey('role_definitions', new TableForeignKey({
      name: 'fk_role_definitions_level',
      columnNames: ['level_id'],
      referencedTableName: 'levels',
      referencedColumnNames: ['id'],
      onDelete: 'RESTRICT', onUpdate: 'CASCADE',
    }));

    // ---------------------------------------------------
    // 6. MODULE_DEFINITIONS
    // ---------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'module_definitions',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'name', type: 'varchar', length: '100' },
          { name: 'code', type: 'varchar', length: '50' },
          { name: 'parent_id', type: 'int', isNullable: true },
          { name: 'icon', type: 'varchar', length: '100', isNullable: true },
          { name: 'route_path', type: 'varchar', length: '255', isNullable: true },
          { name: 'sort_order', type: 'int', default: 0 },
          { name: 'status', type: 'enum', enum: ['active', 'inactive'], default: "'active'" },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('module_definitions', new TableIndex({ name: 'uq_module_definitions_code', columnNames: ['code'], isUnique: true }));
    await queryRunner.createIndex('module_definitions', new TableIndex({ name: 'idx_module_definitions_parent_id', columnNames: ['parent_id'] }));
    await queryRunner.createIndex('module_definitions', new TableIndex({ name: 'idx_module_definitions_sort_order', columnNames: ['sort_order'] }));
    await queryRunner.createIndex('module_definitions', new TableIndex({ name: 'idx_module_definitions_status', columnNames: ['status'] }));

    await queryRunner.createForeignKey('module_definitions', new TableForeignKey({
      name: 'fk_module_definitions_parent',
      columnNames: ['parent_id'],
      referencedTableName: 'module_definitions',
      referencedColumnNames: ['id'],
      onDelete: 'RESTRICT', onUpdate: 'CASCADE',
    }));

    // ---------------------------------------------------
    // 7. SUB_MODULE_DEFINITIONS
    // ---------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'sub_module_definitions',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'name', type: 'varchar', length: '100' },
          { name: 'code', type: 'varchar', length: '50' },
          { name: 'module_id', type: 'int' },
          { name: 'route_path', type: 'varchar', length: '255', isNullable: true },
          { name: 'sort_order', type: 'int', default: 0 },
          { name: 'status', type: 'enum', enum: ['active', 'inactive'], default: "'active'" },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('sub_module_definitions', new TableIndex({ name: 'uq_sub_module_code_per_module', columnNames: ['code', 'module_id'], isUnique: true }));
    await queryRunner.createIndex('sub_module_definitions', new TableIndex({ name: 'idx_sub_module_definitions_module_id', columnNames: ['module_id'] }));
    await queryRunner.createIndex('sub_module_definitions', new TableIndex({ name: 'idx_sub_module_definitions_sort_order', columnNames: ['sort_order'] }));
    await queryRunner.createIndex('sub_module_definitions', new TableIndex({ name: 'idx_sub_module_definitions_status', columnNames: ['status'] }));

    await queryRunner.createForeignKey('sub_module_definitions', new TableForeignKey({
      name: 'fk_sub_module_definitions_module',
      columnNames: ['module_id'],
      referencedTableName: 'module_definitions',
      referencedColumnNames: ['id'],
      onDelete: 'RESTRICT', onUpdate: 'CASCADE',
    }));

    // ---------------------------------------------------
    // 8. ACTION_DEFINITIONS
    // ---------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'action_definitions',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'name', type: 'varchar', length: '100' },
          { name: 'code', type: 'varchar', length: '50' },
          { name: 'module_id', type: 'int', isNullable: true },
          { name: 'sub_module_id', type: 'int', isNullable: true },
          { name: 'is_custom', type: 'tinyint', default: 0 },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('action_definitions', new TableIndex({ name: 'uq_action_definitions_code_module', columnNames: ['code', 'module_id'], isUnique: true }));
    await queryRunner.createIndex('action_definitions', new TableIndex({ name: 'idx_action_definitions_module_id', columnNames: ['module_id'] }));
    await queryRunner.createIndex('action_definitions', new TableIndex({ name: 'idx_action_definitions_sub_module_id', columnNames: ['sub_module_id'] }));

    await queryRunner.createForeignKey('action_definitions', new TableForeignKey({
      name: 'fk_action_definitions_module',
      columnNames: ['module_id'],
      referencedTableName: 'module_definitions',
      referencedColumnNames: ['id'],
      onDelete: 'RESTRICT', onUpdate: 'CASCADE',
    }));
    await queryRunner.createForeignKey('action_definitions', new TableForeignKey({
      name: 'fk_action_definitions_sub_module',
      columnNames: ['sub_module_id'],
      referencedTableName: 'sub_module_definitions',
      referencedColumnNames: ['id'],
      onDelete: 'RESTRICT', onUpdate: 'CASCADE',
    }));

    // ---------------------------------------------------
    // 9. DEPT_ROLE_MODULE_MAPPINGS
    // ---------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'dept_role_module_mappings',
        columns: [
          { name: 'id', type: 'bigint', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'department_id', type: 'int' },
          { name: 'role_definition_id', type: 'int' },
          { name: 'module_id', type: 'int' },
          { name: 'sub_module_id', type: 'int', isNullable: true },
          { name: 'action_id', type: 'int', isNullable: true },
          { name: 'level_id', type: 'int' },
          { name: 'status', type: 'enum', enum: ['active', 'inactive'], default: "'active'" },
          { name: 'created_by', type: 'int', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('dept_role_module_mappings', new TableIndex({
      name: 'uq_dept_role_module_action',
      columnNames: ['department_id', 'role_definition_id', 'module_id', 'sub_module_id', 'action_id'],
      isUnique: true,
    }));
    await queryRunner.createIndex('dept_role_module_mappings', new TableIndex({ name: 'idx_drm_department_id', columnNames: ['department_id'] }));
    await queryRunner.createIndex('dept_role_module_mappings', new TableIndex({ name: 'idx_drm_role_definition_id', columnNames: ['role_definition_id'] }));
    await queryRunner.createIndex('dept_role_module_mappings', new TableIndex({ name: 'idx_drm_module_id', columnNames: ['module_id'] }));
    await queryRunner.createIndex('dept_role_module_mappings', new TableIndex({ name: 'idx_drm_sub_module_id', columnNames: ['sub_module_id'] }));
    await queryRunner.createIndex('dept_role_module_mappings', new TableIndex({ name: 'idx_drm_action_id', columnNames: ['action_id'] }));
    await queryRunner.createIndex('dept_role_module_mappings', new TableIndex({ name: 'idx_drm_level_id', columnNames: ['level_id'] }));
    await queryRunner.createIndex('dept_role_module_mappings', new TableIndex({ name: 'idx_drm_status', columnNames: ['status'] }));

    // Foreign keys for dept_role_module_mappings
    const drmFks = [
      { name: 'fk_drm_department', cols: ['department_id'], ref: 'departments' },
      { name: 'fk_drm_role_definition', cols: ['role_definition_id'], ref: 'role_definitions' },
      { name: 'fk_drm_module', cols: ['module_id'], ref: 'module_definitions' },
      { name: 'fk_drm_sub_module', cols: ['sub_module_id'], ref: 'sub_module_definitions' },
      { name: 'fk_drm_action', cols: ['action_id'], ref: 'action_definitions' },
      { name: 'fk_drm_level', cols: ['level_id'], ref: 'levels' },
    ];
    for (const fk of drmFks) {
      await queryRunner.createForeignKey('dept_role_module_mappings', new TableForeignKey({
        name: fk.name,
        columnNames: fk.cols,
        referencedTableName: fk.ref,
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT', onUpdate: 'CASCADE',
      }));
    }

    // ---------------------------------------------------
    // 10. USER_ROLE_ASSIGNMENTS
    // ---------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'user_role_assignments',
        columns: [
          { name: 'id', type: 'bigint', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'user_id', type: 'int' },
          { name: 'role_definition_id', type: 'int' },
          { name: 'is_primary', type: 'tinyint', default: 0 },
          { name: 'project_access', type: 'json', isNullable: true },
          { name: 'status', type: 'enum', enum: ['active', 'inactive'], default: "'active'" },
          { name: 'assigned_by', type: 'int', isNullable: true },
          { name: 'assigned_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'revoked_at', type: 'timestamp', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('user_role_assignments', new TableIndex({
      name: 'uq_user_role_assignment', columnNames: ['user_id', 'role_definition_id'], isUnique: true,
    }));
    await queryRunner.createIndex('user_role_assignments', new TableIndex({ name: 'idx_ura_user_id', columnNames: ['user_id'] }));
    await queryRunner.createIndex('user_role_assignments', new TableIndex({ name: 'idx_ura_role_definition_id', columnNames: ['role_definition_id'] }));
    await queryRunner.createIndex('user_role_assignments', new TableIndex({ name: 'idx_ura_is_primary', columnNames: ['user_id', 'is_primary'] }));
    await queryRunner.createIndex('user_role_assignments', new TableIndex({ name: 'idx_ura_status', columnNames: ['status'] }));
    await queryRunner.createIndex('user_role_assignments', new TableIndex({ name: 'idx_ura_assigned_by', columnNames: ['assigned_by'] }));

    await queryRunner.createForeignKey('user_role_assignments', new TableForeignKey({
      name: 'fk_ura_user', columnNames: ['user_id'], referencedTableName: 'users',
      referencedColumnNames: ['id'], onDelete: 'CASCADE', onUpdate: 'CASCADE',
    }));
    await queryRunner.createForeignKey('user_role_assignments', new TableForeignKey({
      name: 'fk_ura_role_definition', columnNames: ['role_definition_id'], referencedTableName: 'role_definitions',
      referencedColumnNames: ['id'], onDelete: 'RESTRICT', onUpdate: 'CASCADE',
    }));
    await queryRunner.createForeignKey('user_role_assignments', new TableForeignKey({
      name: 'fk_ura_assigned_by', columnNames: ['assigned_by'], referencedTableName: 'users',
      referencedColumnNames: ['id'], onDelete: 'SET NULL', onUpdate: 'CASCADE',
    }));

    // ---------------------------------------------------
    // 11. USER_HIERARCHIES
    // ---------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'user_hierarchies',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'user_id', type: 'int' },
          { name: 'manager_id', type: 'int', isNullable: true },
          { name: 'team_admin_id', type: 'int', isNullable: true },
          { name: 'dept_admin_id', type: 'int', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('user_hierarchies', new TableIndex({ name: 'uq_user_hierarchies_user_id', columnNames: ['user_id'], isUnique: true }));
    await queryRunner.createIndex('user_hierarchies', new TableIndex({ name: 'idx_uh_manager_id', columnNames: ['manager_id'] }));
    await queryRunner.createIndex('user_hierarchies', new TableIndex({ name: 'idx_uh_team_admin_id', columnNames: ['team_admin_id'] }));
    await queryRunner.createIndex('user_hierarchies', new TableIndex({ name: 'idx_uh_dept_admin_id', columnNames: ['dept_admin_id'] }));

    const hierarchyFks = [
      { name: 'fk_uh_user', cols: ['user_id'], ref: 'users', del: 'CASCADE' },
      { name: 'fk_uh_manager', cols: ['manager_id'], ref: 'users', del: 'SET NULL' },
      { name: 'fk_uh_team_admin', cols: ['team_admin_id'], ref: 'users', del: 'SET NULL' },
      { name: 'fk_uh_dept_admin', cols: ['dept_admin_id'], ref: 'users', del: 'SET NULL' },
    ];
    for (const fk of hierarchyFks) {
      await queryRunner.createForeignKey('user_hierarchies', new TableForeignKey({
        name: fk.name, columnNames: fk.cols, referencedTableName: fk.ref,
        referencedColumnNames: ['id'], onDelete: fk.del, onUpdate: 'CASCADE',
      }));
    }

    // ---------------------------------------------------
    // 12. USER_PROJECT_MODULE_ACCESS
    // ---------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'user_project_module_access',
        columns: [
          { name: 'id', type: 'bigint', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'user_id', type: 'int' },
          { name: 'project_id', type: 'int' },
          { name: 'module_id', type: 'int' },
          { name: 'is_enabled', type: 'tinyint', default: 1 },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('user_project_module_access', new TableIndex({
      name: 'uq_user_project_module', columnNames: ['user_id', 'project_id', 'module_id'], isUnique: true,
    }));
    await queryRunner.createIndex('user_project_module_access', new TableIndex({ name: 'idx_upma_user_id', columnNames: ['user_id'] }));
    await queryRunner.createIndex('user_project_module_access', new TableIndex({ name: 'idx_upma_project_id', columnNames: ['project_id'] }));
    await queryRunner.createIndex('user_project_module_access', new TableIndex({ name: 'idx_upma_module_id', columnNames: ['module_id'] }));
    await queryRunner.createIndex('user_project_module_access', new TableIndex({ name: 'idx_upma_is_enabled', columnNames: ['is_enabled'] }));

    await queryRunner.createForeignKey('user_project_module_access', new TableForeignKey({
      name: 'fk_upma_user', columnNames: ['user_id'], referencedTableName: 'users',
      referencedColumnNames: ['id'], onDelete: 'CASCADE', onUpdate: 'CASCADE',
    }));
    await queryRunner.createForeignKey('user_project_module_access', new TableForeignKey({
      name: 'fk_upma_project', columnNames: ['project_id'], referencedTableName: 'projects',
      referencedColumnNames: ['id'], onDelete: 'CASCADE', onUpdate: 'CASCADE',
    }));
    await queryRunner.createForeignKey('user_project_module_access', new TableForeignKey({
      name: 'fk_upma_module', columnNames: ['module_id'], referencedTableName: 'module_definitions',
      referencedColumnNames: ['id'], onDelete: 'RESTRICT', onUpdate: 'CASCADE',
    }));

    // ---------------------------------------------------
    // 13. PERMISSION_AUDIT_LOG
    // ---------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'permission_audit_log',
        columns: [
          { name: 'id', type: 'bigint', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'action', type: 'enum', enum: ['CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'REVOKE', 'ENABLE', 'DISABLE'] },
          { name: 'entity_type', type: 'varchar', length: '50' },
          { name: 'entity_id', type: 'int' },
          { name: 'old_value', type: 'json', isNullable: true },
          { name: 'new_value', type: 'json', isNullable: true },
          { name: 'performed_by', type: 'int' },
          { name: 'ip_address', type: 'varchar', length: '45', isNullable: true },
          { name: 'user_agent', type: 'varchar', length: '500', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('permission_audit_log', new TableIndex({ name: 'idx_pal_entity', columnNames: ['entity_type', 'entity_id'] }));
    await queryRunner.createIndex('permission_audit_log', new TableIndex({ name: 'idx_pal_performed_by', columnNames: ['performed_by'] }));
    await queryRunner.createIndex('permission_audit_log', new TableIndex({ name: 'idx_pal_action', columnNames: ['action'] }));
    await queryRunner.createIndex('permission_audit_log', new TableIndex({ name: 'idx_pal_created_at', columnNames: ['created_at'] }));

    await queryRunner.createForeignKey('permission_audit_log', new TableForeignKey({
      name: 'fk_pal_performed_by', columnNames: ['performed_by'], referencedTableName: 'users',
      referencedColumnNames: ['id'], onDelete: 'RESTRICT', onUpdate: 'CASCADE',
    }));

    // ---------------------------------------------------
    // 14. ALTER EXISTING TABLES
    // ---------------------------------------------------

    // Users: add zone_id, employment_status, user_group, group dates
    const usersTable = await queryRunner.getTable('users');
    if (usersTable) {
      if (!usersTable.columns.find(c => c.name === 'zone_id')) {
        await queryRunner.addColumn('users', new TableColumn({ name: 'zone_id', type: 'int', isNullable: true }));
        await queryRunner.createIndex('users', new TableIndex({ name: 'idx_users_zone_id', columnNames: ['zone_id'] }));
        await queryRunner.createForeignKey('users', new TableForeignKey({
          name: 'fk_users_zone', columnNames: ['zone_id'], referencedTableName: 'zones',
          referencedColumnNames: ['id'], onDelete: 'SET NULL', onUpdate: 'CASCADE',
        }));
      }
      if (!usersTable.columns.find(c => c.name === 'employment_status')) {
        await queryRunner.addColumn('users', new TableColumn({
          name: 'employment_status', type: 'enum',
          enum: ['active', 'notice_period', 'resigned', 'suspended'],
          default: "'active'", isNullable: true,
        }));
      }
      if (!usersTable.columns.find(c => c.name === 'user_group')) {
        await queryRunner.addColumn('users', new TableColumn({ name: 'user_group', type: 'varchar', length: '100', isNullable: true }));
      }
      if (!usersTable.columns.find(c => c.name === 'group_start_date')) {
        await queryRunner.addColumn('users', new TableColumn({ name: 'group_start_date', type: 'date', isNullable: true }));
      }
      if (!usersTable.columns.find(c => c.name === 'group_end_date')) {
        await queryRunner.addColumn('users', new TableColumn({ name: 'group_end_date', type: 'date', isNullable: true }));
      }
    }

    // Projects: add billing_entity, company, address, gstin, etc.
    const projectsTable = await queryRunner.getTable('projects');
    if (projectsTable) {
      const projCols = projectsTable.columns.map(c => c.name);
      if (!projCols.includes('billing_entity')) {
        await queryRunner.addColumn('projects', new TableColumn({ name: 'billing_entity', type: 'varchar', length: '255', isNullable: true }));
      }
      if (!projCols.includes('company')) {
        await queryRunner.addColumn('projects', new TableColumn({ name: 'company', type: 'varchar', length: '255', isNullable: true }));
      }
      if (!projCols.includes('address')) {
        await queryRunner.addColumn('projects', new TableColumn({ name: 'address', type: 'text', isNullable: true }));
      }
      if (!projCols.includes('gstin')) {
        await queryRunner.addColumn('projects', new TableColumn({ name: 'gstin', type: 'varchar', length: '20', isNullable: true }));
      }
      if (!projCols.includes('pin_code')) {
        await queryRunner.addColumn('projects', new TableColumn({ name: 'pin_code', type: 'varchar', length: '10', isNullable: true }));
      }
      if (!projCols.includes('payment_gateway')) {
        await queryRunner.addColumn('projects', new TableColumn({ name: 'payment_gateway', type: 'varchar', length: '50', isNullable: true }));
      }
      if (!projCols.includes('incentive_criteria')) {
        await queryRunner.addColumn('projects', new TableColumn({
          name: 'incentive_criteria', type: 'enum', enum: ['RERA', 'NON_RERA', 'BOTH'], isNullable: true,
        }));
      }
    }

    // Brands: add address, gstin, pan, billing_entity
    const brandsTable = await queryRunner.getTable('brands');
    if (brandsTable) {
      const brandCols = brandsTable.columns.map(c => c.name);
      if (!brandCols.includes('address')) {
        await queryRunner.addColumn('brands', new TableColumn({ name: 'address', type: 'text', isNullable: true }));
      }
      if (!brandCols.includes('gstin')) {
        await queryRunner.addColumn('brands', new TableColumn({ name: 'gstin', type: 'varchar', length: '20', isNullable: true }));
      }
      if (!brandCols.includes('pan')) {
        await queryRunner.addColumn('brands', new TableColumn({ name: 'pan', type: 'varchar', length: '20', isNullable: true }));
      }
      if (!brandCols.includes('billing_entity')) {
        await queryRunner.addColumn('brands', new TableColumn({ name: 'billing_entity', type: 'varchar', length: '255', isNullable: true }));
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse order of creation (respect FK constraints)
    await queryRunner.dropTable('permission_audit_log');
    await queryRunner.dropTable('user_project_module_access');
    await queryRunner.dropTable('user_hierarchies');
    await queryRunner.dropTable('user_role_assignments');
    await queryRunner.dropTable('dept_role_module_mappings');
    await queryRunner.dropTable('action_definitions');
    await queryRunner.dropTable('sub_module_definitions');
    await queryRunner.dropTable('module_definitions');
    await queryRunner.dropTable('role_definitions');
    await queryRunner.dropTable('cities');
    await queryRunner.dropTable('zones');
    await queryRunner.dropTable('levels');

    // Revert column additions on users, projects, brands
    // Note: Manual revert may be needed depending on existing columns
    const usersTable = await queryRunner.getTable('users');
    if (usersTable?.columns.find(c => c.name === 'zone_id')) {
      await queryRunner.dropForeignKey('users', 'fk_users_zone');
      await queryRunner.dropColumn('users', 'zone_id');
    }
    // Drop other added columns as needed
  }
}
