import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates all RBAC database tables for the Role-Based Access Control module.
 *
 * Tables created:
 * - levels:            Organizational hierarchy levels
 * - zones:             Operational zones
 * - module_definitions:   System modules (e.g. users, eoi, brands)
 * - sub_module_definitions: Sub-modules under modules
 * - action_definitions:   Actions within modules/sub-modules (e.g. view, create, edit, delete, export)
 * - role_definitions:     Role definitions linked to departments & levels
 * - dept_role_module_mappings:  Core mapping: which role has what permission on which module/sub-module/action
 * - user_role_assignments:      Which users are assigned to which roles
 * - user_project_module_access: Per-user per-project module overrides
 * - user_hierarchies:           Reporting structure
 * - permission_audit_logs:      Audit trail for permission changes
 */
export class CreateRBACTables1783000000000 implements MigrationInterface {
  name = 'CreateRBACTables1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. levels
    await queryRunner.query(`
      CREATE TABLE levels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. zones
    await queryRunner.query(`
      CREATE TABLE zones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        code VARCHAR(100) NOT NULL UNIQUE,
        description TEXT NULL,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. module_definitions
    await queryRunner.query(`
      CREATE TABLE module_definitions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) NOT NULL UNIQUE,
        parent_id INT NULL,
        icon VARCHAR(255) NULL,
        route_path VARCHAR(255) NULL,
        sort_order INT DEFAULT 0,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_module_parent FOREIGN KEY (parent_id) REFERENCES module_definitions(id) ON DELETE RESTRICT ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. sub_module_definitions
    await queryRunner.query(`
      CREATE TABLE sub_module_definitions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) NOT NULL,
        module_id INT NOT NULL,
        route_path VARCHAR(255) NULL,
        sort_order INT DEFAULT 0,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_sub_module_module FOREIGN KEY (module_id) REFERENCES module_definitions(id) ON DELETE RESTRICT ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. action_definitions
    await queryRunner.query(`
      CREATE TABLE action_definitions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) NOT NULL,
        module_id INT NULL,
        sub_module_id INT NULL,
        is_custom TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_action_module FOREIGN KEY (module_id) REFERENCES module_definitions(id) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT fk_action_sub_module FOREIGN KEY (sub_module_id) REFERENCES sub_module_definitions(id) ON DELETE RESTRICT ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. role_definitions
    await queryRunner.query(`
      CREATE TABLE role_definitions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        code VARCHAR(100) NOT NULL UNIQUE,
        department_id INT NULL,
        level_id INT NULL,
        description TEXT NULL,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. dept_role_module_mappings
    await queryRunner.query(`
      CREATE TABLE dept_role_module_mappings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        department_id INT NOT NULL,
        role_definition_id INT NOT NULL,
        module_id INT NOT NULL,
        sub_module_id INT NULL,
        action_id INT NULL,
        level_id INT NULL,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_drm_role FOREIGN KEY (role_definition_id) REFERENCES role_definitions(id) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT fk_drm_module FOREIGN KEY (module_id) REFERENCES module_definitions(id) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT fk_drm_sub_module FOREIGN KEY (sub_module_id) REFERENCES sub_module_definitions(id) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT fk_drm_action FOREIGN KEY (action_id) REFERENCES action_definitions(id) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT fk_drm_level FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE RESTRICT ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. user_role_assignments
    await queryRunner.query(`
      CREATE TABLE user_role_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        role_definition_id INT NOT NULL,
        is_primary TINYINT(1) DEFAULT 0,
        project_access JSON NULL,
        status ENUM('active', 'inactive', 'revoked') DEFAULT 'active',
        assigned_by INT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revoked_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_ura_role FOREIGN KEY (role_definition_id) REFERENCES role_definitions(id) ON DELETE RESTRICT ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 9. user_project_module_access
    await queryRunner.query(`
      CREATE TABLE user_project_module_access (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        project_id INT NOT NULL,
        module_id INT NOT NULL,
        is_enabled TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_upma_module FOREIGN KEY (module_id) REFERENCES module_definitions(id) ON DELETE RESTRICT ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 10. user_hierarchies
    await queryRunner.query(`
      CREATE TABLE user_hierarchies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        manager_id INT NULL,
        team_admin_id INT NULL,
        dept_admin_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 11. permission_audit_logs
    await queryRunner.query(`
      CREATE TABLE permission_audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        action ENUM('CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'REVOKE', 'ENABLE', 'DISABLE') NOT NULL,
        entity_type VARCHAR(255) NOT NULL,
        entity_id INT NOT NULL,
        old_value JSON NULL,
        new_value JSON NULL,
        performed_by INT NOT NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS permission_audit_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_hierarchies`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_project_module_access`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_role_assignments`);
    await queryRunner.query(`DROP TABLE IF EXISTS dept_role_module_mappings`);
    await queryRunner.query(`DROP TABLE IF EXISTS role_definitions`);
    await queryRunner.query(`DROP TABLE IF EXISTS action_definitions`);
    await queryRunner.query(`DROP TABLE IF EXISTS sub_module_definitions`);
    await queryRunner.query(`DROP TABLE IF EXISTS module_definitions`);
    await queryRunner.query(`DROP TABLE IF EXISTS zones`);
    await queryRunner.query(`DROP TABLE IF EXISTS levels`);
  }
}
