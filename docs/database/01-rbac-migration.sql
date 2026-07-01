-- ============================================================================
-- RBAC Database Migration
-- Phase 1: Core RBAC Tables
-- Target: MySQL 8.x
-- ============================================================================

-- ---------------------------------------------------
-- 1. ZONES
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS `zones` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(20) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_zones_name` (`name`),
  UNIQUE INDEX `uq_zones_code` (`code`),
  INDEX `idx_zones_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- 2. CITIES
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS `cities` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `zone_id` INT NOT NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_cities_zone_id` (`zone_id`),
  INDEX `idx_cities_status` (`status`),
  UNIQUE INDEX `uq_cities_name_zone` (`name`, `zone_id`),
  CONSTRAINT `fk_cities_zone` FOREIGN KEY (`zone_id`) REFERENCES `zones` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- 3. LEVELS (L1–L4 Hierarchy)
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS `levels` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(10) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_levels_code` (`code`),
  INDEX `idx_levels_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- 4. DEPARTMENTS (alter existing)
-- ---------------------------------------------------
-- WARNING: Run this ALTER only if the `departments` table already exists.
-- If table does not exist, use the CREATE statement below instead.

-- ALTER TABLE `departments`
--   ADD COLUMN `code` VARCHAR(20) DEFAULT NULL AFTER `name`,
--   ADD COLUMN `level` VARCHAR(10) NOT NULL DEFAULT 'L5' AFTER `code`,
--   ADD COLUMN `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active' AFTER `level`,
--   ADD UNIQUE INDEX `uq_departments_code` (`code`),
--   ADD INDEX `idx_departments_status` (`status`);

-- Use this CREATE if departments table does not exist:
CREATE TABLE IF NOT EXISTS `departments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(20) DEFAULT NULL,
  `level` VARCHAR(10) NOT NULL DEFAULT 'L5',
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_departments_name` (`name`),
  UNIQUE INDEX `uq_departments_code` (`code`),
  INDEX `idx_departments_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- 5. ROLE_DEFINITIONS (replaces existing `roles` table)
-- ---------------------------------------------------
-- Creates a NEW table alongside the existing `roles` table.
-- Migrate existing roles after creation (see seed file).
CREATE TABLE IF NOT EXISTS `role_definitions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `department_id` INT NOT NULL,
  `level_id` INT NOT NULL,
  `description` TEXT DEFAULT NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_role_definitions_name` (`name`),
  UNIQUE INDEX `uq_role_definitions_code` (`code`),
  INDEX `idx_role_definitions_department_id` (`department_id`),
  INDEX `idx_role_definitions_level_id` (`level_id`),
  INDEX `idx_role_definitions_status` (`status`),
  CONSTRAINT `fk_role_definitions_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_role_definitions_level` FOREIGN KEY (`level_id`) REFERENCES `levels` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- 6. MODULE_DEFINITIONS
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS `module_definitions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `parent_id` INT DEFAULT NULL,
  `icon` VARCHAR(100) DEFAULT NULL,
  `route_path` VARCHAR(255) DEFAULT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_module_definitions_code` (`code`),
  INDEX `idx_module_definitions_parent_id` (`parent_id`),
  INDEX `idx_module_definitions_sort_order` (`sort_order`),
  INDEX `idx_module_definitions_status` (`status`),
  CONSTRAINT `fk_module_definitions_parent` FOREIGN KEY (`parent_id`) REFERENCES `module_definitions` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- 7. SUB_MODULE_DEFINITIONS
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS `sub_module_definitions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `module_id` INT NOT NULL,
  `route_path` VARCHAR(255) DEFAULT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_sub_module_code_per_module` (`code`, `module_id`),
  INDEX `idx_sub_module_definitions_module_id` (`module_id`),
  INDEX `idx_sub_module_definitions_sort_order` (`sort_order`),
  INDEX `idx_sub_module_definitions_status` (`status`),
  CONSTRAINT `fk_sub_module_definitions_module` FOREIGN KEY (`module_id`) REFERENCES `module_definitions` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- 8. ACTION_DEFINITIONS
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS `action_definitions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `module_id` INT DEFAULT NULL,
  `sub_module_id` INT DEFAULT NULL,
  `is_custom` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_action_definitions_code_module` (`code`, `module_id`),
  INDEX `idx_action_definitions_module_id` (`module_id`),
  INDEX `idx_action_definitions_sub_module_id` (`sub_module_id`),
  CONSTRAINT `fk_action_definitions_module` FOREIGN KEY (`module_id`) REFERENCES `module_definitions` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_action_definitions_sub_module` FOREIGN KEY (`sub_module_id`) REFERENCES `sub_module_definitions` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- 9. DEPT_ROLE_MODULE_MAPPINGS
-- Core permission mapping table.
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS `dept_role_module_mappings` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `department_id` INT NOT NULL,
  `role_definition_id` INT NOT NULL,
  `module_id` INT NOT NULL,
  `sub_module_id` INT DEFAULT NULL,
  `action_id` INT DEFAULT NULL,
  `level_id` INT NOT NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_dept_role_module_action` (`department_id`, `role_definition_id`, `module_id`, `sub_module_id`, `action_id`),
  INDEX `idx_drm_department_id` (`department_id`),
  INDEX `idx_drm_role_definition_id` (`role_definition_id`),
  INDEX `idx_drm_module_id` (`module_id`),
  INDEX `idx_drm_sub_module_id` (`sub_module_id`),
  INDEX `idx_drm_action_id` (`action_id`),
  INDEX `idx_drm_level_id` (`level_id`),
  INDEX `idx_drm_status` (`status`),
  CONSTRAINT `fk_drm_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_drm_role_definition` FOREIGN KEY (`role_definition_id`) REFERENCES `role_definitions` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_drm_module` FOREIGN KEY (`module_id`) REFERENCES `module_definitions` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_drm_sub_module` FOREIGN KEY (`sub_module_id`) REFERENCES `sub_module_definitions` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_drm_action` FOREIGN KEY (`action_id`) REFERENCES `action_definitions` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_drm_level` FOREIGN KEY (`level_id`) REFERENCES `levels` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_drm_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- 10. USER_ROLE_ASSIGNMENTS
-- Supports primary + secondary roles with project scope.
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_role_assignments` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `role_definition_id` INT NOT NULL,
  `is_primary` TINYINT(1) NOT NULL DEFAULT 0,
  `project_access` JSON DEFAULT NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `assigned_by` INT DEFAULT NULL,
  `assigned_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `revoked_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_user_role_assignment` (`user_id`, `role_definition_id`),
  INDEX `idx_ura_user_id` (`user_id`),
  INDEX `idx_ura_role_definition_id` (`role_definition_id`),
  INDEX `idx_ura_is_primary` (`user_id`, `is_primary`),
  INDEX `idx_ura_status` (`status`),
  INDEX `idx_ura_assigned_by` (`assigned_by`),
  CONSTRAINT `fk_ura_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ura_role_definition` FOREIGN KEY (`role_definition_id`) REFERENCES `role_definitions` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_ura_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_ura_single_primary` CHECK (
    NOT (is_primary = 1 AND (
      SELECT COUNT(*) FROM user_role_assignments ura2
      WHERE ura2.user_id = user_id AND ura2.is_primary = 1 AND ura2.status = 'active'
    ) > 1)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- 11. USER_HIERARCHIES
-- L2 (Manager), L3 (Team Admin), L4 (Department Admin)
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_hierarchies` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `manager_id` INT DEFAULT NULL,
  `team_admin_id` INT DEFAULT NULL,
  `dept_admin_id` INT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_user_hierarchies_user_id` (`user_id`),
  INDEX `idx_uh_manager_id` (`manager_id`),
  INDEX `idx_uh_team_admin_id` (`team_admin_id`),
  INDEX `idx_uh_dept_admin_id` (`dept_admin_id`),
  CONSTRAINT `fk_uh_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_uh_manager` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_uh_team_admin` FOREIGN KEY (`team_admin_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_uh_dept_admin` FOREIGN KEY (`dept_admin_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- 12. USER_PROJECT_MODULE_ACCESS
-- Per-project module toggle for each user.
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_project_module_access` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `project_id` INT NOT NULL,
  `module_id` INT NOT NULL,
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_user_project_module` (`user_id`, `project_id`, `module_id`),
  INDEX `idx_upma_user_id` (`user_id`),
  INDEX `idx_upma_project_id` (`project_id`),
  INDEX `idx_upma_module_id` (`module_id`),
  INDEX `idx_upma_is_enabled` (`is_enabled`),
  CONSTRAINT `fk_upma_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_upma_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_upma_module` FOREIGN KEY (`module_id`) REFERENCES `module_definitions` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- 13. PERMISSION_AUDIT_LOG
-- Tracks all RBAC configuration changes.
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS `permission_audit_log` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `action` ENUM('CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'REVOKE', 'ENABLE', 'DISABLE') NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` INT NOT NULL,
  `old_value` JSON DEFAULT NULL,
  `new_value` JSON DEFAULT NULL,
  `performed_by` INT NOT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` VARCHAR(500) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_pal_entity` (`entity_type`, `entity_id`),
  INDEX `idx_pal_performed_by` (`performed_by`),
  INDEX `idx_pal_action` (`action`),
  INDEX `idx_pal_created_at` (`created_at`),
  CONSTRAINT `fk_pal_performed_by` FOREIGN KEY (`performed_by`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- 14. EXISTING TABLES: ADD MISSING COLUMNS
-- ---------------------------------------------------

-- ALTER users table (safe — existing columns preserved)
ALTER TABLE `users`
  ADD COLUMN `zone_id` INT DEFAULT NULL AFTER `regionIds`,
  ADD COLUMN `employment_status` ENUM('active', 'notice_period', 'resigned', 'suspended') DEFAULT 'active' AFTER `employeeStatus`,
  ADD COLUMN `user_group` VARCHAR(100) DEFAULT NULL AFTER `employment_status`,
  ADD COLUMN `group_start_date` DATE DEFAULT NULL AFTER `user_group`,
  ADD COLUMN `group_end_date` DATE DEFAULT NULL AFTER `group_start_date`,
  ADD INDEX `idx_users_zone_id` (`zone_id`),
  ADD INDEX `idx_users_employment_status` (`employment_status`),
  ADD CONSTRAINT `fk_users_zone` FOREIGN KEY (`zone_id`) REFERENCES `zones` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ALTER projects table
ALTER TABLE `projects`
  ADD COLUMN `billing_entity` VARCHAR(255) DEFAULT NULL AFTER `projectName`,
  ADD COLUMN `company` VARCHAR(255) DEFAULT NULL AFTER `billing_entity`,
  ADD COLUMN `address` TEXT DEFAULT NULL AFTER `company`,
  ADD COLUMN `gstin` VARCHAR(20) DEFAULT NULL AFTER `address`,
  ADD COLUMN `pin_code` VARCHAR(10) DEFAULT NULL AFTER `gstin`,
  ADD COLUMN `payment_gateway` VARCHAR(50) DEFAULT NULL AFTER `pin_code`,
  ADD COLUMN `incentive_criteria` ENUM('RERA', 'NON_RERA', 'BOTH') DEFAULT NULL AFTER `payment_gateway`;

-- ALTER brands table
ALTER TABLE `brands`
  ADD COLUMN `address` TEXT DEFAULT NULL AFTER `brandName`,
  ADD COLUMN `gstin` VARCHAR(20) DEFAULT NULL AFTER `address`,
  ADD COLUMN `pan` VARCHAR(20) DEFAULT NULL AFTER `gstin`,
  ADD COLUMN `billing_entity` VARCHAR(255) DEFAULT NULL AFTER `pan`;
