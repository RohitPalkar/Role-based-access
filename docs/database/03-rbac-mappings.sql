-- ============================================================================
-- RBAC Role-Permission Mapping Seed
-- Phase 3: Department → Role → Module → Action Mappings
-- Run AFTER 01-rbac-migration.sql and 02-rbac-seed.sql
-- ============================================================================
--
-- This file uses a stored procedure to dynamically map roles to permissions
-- using code-based lookups (avoiding hardcoded ID dependencies).
-- ============================================================================

DELIMITER $$

-- ---------------------------------------------------
-- Helper procedure: map a role to all actions of a module
-- Uses INSERT...SELECT (no cursor) for reliability
-- ---------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_map_role_module_actions` $$
CREATE PROCEDURE `sp_map_role_module_actions`(
  IN p_role_code VARCHAR(50),
  IN p_module_code VARCHAR(50),
  IN p_action_codes TEXT,        -- comma-separated, NULL = all actions
  IN p_level_code VARCHAR(10)    -- L1, L2, L3, L4
)
BEGIN
  DECLARE v_role_id INT;
  DECLARE v_dept_id INT;
  DECLARE v_module_id INT;
  DECLARE v_level_id INT;

  SELECT rd.id, rd.department_id INTO v_role_id, v_dept_id
  FROM role_definitions rd WHERE rd.code = p_role_code;
  SELECT m.id INTO v_module_id FROM module_definitions m WHERE m.code = p_module_code;
  SELECT l.id INTO v_level_id FROM levels l WHERE l.code = p_level_code;

  IF v_role_id IS NULL OR v_module_id IS NULL OR v_level_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Invalid role_code, module_code, or level_code';
  END IF;

  -- Map actions at module level (no sub_module)
  INSERT IGNORE INTO `dept_role_module_mappings`
    (`department_id`, `role_definition_id`, `module_id`, `sub_module_id`, `action_id`, `level_id`, `created_by`)
  SELECT v_dept_id, v_role_id, v_module_id, NULL, ad.id, v_level_id, NULL
  FROM action_definitions ad
  WHERE (ad.module_id IS NULL OR ad.module_id = v_module_id)
    AND (p_action_codes IS NULL OR FIND_IN_SET(ad.code COLLATE utf8mb4_0900_ai_ci, p_action_codes));

  -- Map actions per sub-module
  INSERT IGNORE INTO `dept_role_module_mappings`
    (`department_id`, `role_definition_id`, `module_id`, `sub_module_id`, `action_id`, `level_id`, `created_by`)
  SELECT v_dept_id, v_role_id, v_module_id, sm.id, ad.id, v_level_id, NULL
  FROM sub_module_definitions sm
  CROSS JOIN action_definitions ad
  WHERE sm.module_id = v_module_id
    AND (ad.module_id IS NULL OR ad.module_id = v_module_id)
    AND (p_action_codes IS NULL OR FIND_IN_SET(ad.code COLLATE utf8mb4_0900_ai_ci, p_action_codes));
END $$

-- ---------------------------------------------------
-- Helper procedure: map a role to a sub-module with specific actions
-- ---------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_map_role_sub_module_actions` $$
CREATE PROCEDURE `sp_map_role_sub_module_actions`(
  IN p_role_code VARCHAR(50),
  IN p_module_code VARCHAR(50),
  IN p_sub_module_code VARCHAR(50),
  IN p_action_codes TEXT,
  IN p_level_code VARCHAR(10)
)
BEGIN
  DECLARE v_role_id INT;
  DECLARE v_dept_id INT;
  DECLARE v_module_id INT;
  DECLARE v_sub_module_id INT;
  DECLARE v_level_id INT;

  SELECT rd.id, rd.department_id INTO v_role_id, v_dept_id
  FROM role_definitions rd WHERE rd.code = p_role_code;
  SELECT m.id INTO v_module_id FROM module_definitions m WHERE m.code = p_module_code;
  SELECT sm.id INTO v_sub_module_id
  FROM sub_module_definitions sm WHERE sm.code = p_sub_module_code AND sm.module_id = v_module_id;
  SELECT l.id INTO v_level_id FROM levels l WHERE l.code = p_level_code;

  INSERT IGNORE INTO `dept_role_module_mappings`
    (`department_id`, `role_definition_id`, `module_id`, `sub_module_id`, `action_id`, `level_id`, `created_by`)
  SELECT v_dept_id, v_role_id, v_module_id, v_sub_module_id, ad.id, v_level_id, NULL
  FROM action_definitions ad
  WHERE FIND_IN_SET(ad.code COLLATE utf8mb4_0900_ai_ci, p_action_codes);
END $$

DELIMITER ;

-- ============================================================================
-- Now apply the role mappings
-- ============================================================================

-- ---------------------------------------------------
-- SUPER ADMIN (bypass — all permissions implied)
-- Explicitly map all modules for the permission cache
-- ---------------------------------------------------
CALL sp_map_role_module_actions('SUPER_ADMIN', 'USERS', NULL, 'L4');
CALL sp_map_role_module_actions('SUPER_ADMIN', 'MASTERS', NULL, 'L4');
CALL sp_map_role_module_actions('SUPER_ADMIN', 'BOOKINGS', NULL, 'L4');
CALL sp_map_role_module_actions('SUPER_ADMIN', 'ESIGNER', NULL, 'L4');
CALL sp_map_role_module_actions('SUPER_ADMIN', 'INCENTIVES', NULL, 'L4');
CALL sp_map_role_module_actions('SUPER_ADMIN', 'EOI', NULL, 'L4');
CALL sp_map_role_module_actions('SUPER_ADMIN', 'BATCH', NULL, 'L4');
CALL sp_map_role_module_actions('SUPER_ADMIN', 'IOM_MANAGEMENT', NULL, 'L4');
CALL sp_map_role_module_actions('SUPER_ADMIN', 'LOGS', NULL, 'L4');
CALL sp_map_role_module_actions('SUPER_ADMIN', 'EMPLOYEE', NULL, 'L4');
CALL sp_map_role_module_actions('SUPER_ADMIN', 'UPLOADS', NULL, 'L4');
CALL sp_map_role_module_actions('SUPER_ADMIN', 'DASHBOARD', NULL, 'L4');
CALL sp_map_role_module_actions('SUPER_ADMIN', 'SITE_VISIT', NULL, 'L4');
CALL sp_map_role_module_actions('SUPER_ADMIN', 'CHANNEL_PARTNERS', NULL, 'L4');
CALL sp_map_role_module_actions('SUPER_ADMIN', 'UNIT_INVENTORY', NULL, 'L4');
CALL sp_map_role_module_actions('SUPER_ADMIN', 'BANK_DETAILS', NULL, 'L4');
CALL sp_map_role_module_actions('SUPER_ADMIN', 'SFDC_LOGS', NULL, 'L4');
CALL sp_map_role_module_actions('SUPER_ADMIN', 'AGREEMENT_MANAGEMENT', NULL, 'L4');

-- ---------------------------------------------------
-- ADMIN (bypass — all permissions implied)
-- ---------------------------------------------------
CALL sp_map_role_module_actions('ADMIN', 'USERS', NULL, 'L3');
CALL sp_map_role_module_actions('ADMIN', 'MASTERS', NULL, 'L3');
CALL sp_map_role_module_actions('ADMIN', 'BOOKINGS', NULL, 'L3');
CALL sp_map_role_module_actions('ADMIN', 'ESIGNER', NULL, 'L3');
CALL sp_map_role_module_actions('ADMIN', 'INCENTIVES', NULL, 'L3');
CALL sp_map_role_module_actions('ADMIN', 'EOI', NULL, 'L3');
CALL sp_map_role_module_actions('ADMIN', 'BATCH', NULL, 'L3');
CALL sp_map_role_module_actions('ADMIN', 'IOM_MANAGEMENT', NULL, 'L3');
CALL sp_map_role_module_actions('ADMIN', 'CHANNEL_PARTNERS', NULL, 'L3');
CALL sp_map_role_module_actions('ADMIN', 'UNIT_INVENTORY', NULL, 'L3');
CALL sp_map_role_module_actions('ADMIN', 'BANK_DETAILS', NULL, 'L3');
CALL sp_map_role_module_actions('ADMIN', 'SFDC_LOGS', NULL, 'L3');

-- ---------------------------------------------------
-- RM
-- ---------------------------------------------------
CALL sp_map_role_module_actions('RM', 'BOOKINGS', 'create,list,view,edit,export', 'L1');
CALL sp_map_role_module_actions('RM', 'ESIGNER', 'add,edit,listing,signedPdf,viewLink', 'L1');
CALL sp_map_role_module_actions('RM', 'INCENTIVES', 'list,view,export', 'L1');
-- EOI for RM: specific sub-set
CALL sp_map_role_module_actions('RM', 'EOI', 'list,view,create,edit,export,previewForm,mapAndConvertEOI,assignClosingRM,requestCancellation,sendLink,viewCustomer', 'L1');
CALL sp_map_role_module_actions('RM', 'CHANNEL_PARTNERS', 'copyLink,create,list,edit', 'L1');
CALL sp_map_role_module_actions('RM', 'BANK_DETAILS', 'share,list,view', 'L1');
CALL sp_map_role_module_actions('RM', 'AGREEMENT_MANAGEMENT', 'edit,download,viewLink,signNow', 'L1');

-- ---------------------------------------------------
-- SALES TL
-- ---------------------------------------------------
CALL sp_map_role_module_actions('SALES_TL', 'BOOKINGS', 'create,list,view,edit,export', 'L2');
CALL sp_map_role_module_actions('SALES_TL', 'ESIGNER', 'add,edit,listing,signedPdf,viewLink', 'L2');
CALL sp_map_role_module_actions('SALES_TL', 'EOI', 'list,view,edit,export,assignClosingRM,previewForm,mapAndConvertEOI', 'L2');
CALL sp_map_role_module_actions('SALES_TL', 'CHANNEL_PARTNERS', 'copyLink,list,view', 'L2');
CALL sp_map_role_module_actions('SALES_TL', 'UNIT_INVENTORY', 'list,view,updateStatus', 'L2');
CALL sp_map_role_module_actions('SALES_TL', 'BANK_DETAILS', 'share,list,view', 'L2');
CALL sp_map_role_module_actions('SALES_TL', 'AGREEMENT_MANAGEMENT', 'edit,download,viewLink,signNow', 'L2');

-- ---------------------------------------------------
-- SALES RSH
-- ---------------------------------------------------
CALL sp_map_role_module_actions('SALES_RSH', 'BOOKINGS', 'list,view,export', 'L2');
CALL sp_map_role_module_actions('SALES_RSH', 'ESIGNER', 'add,edit,listing,signedPdf,viewLink', 'L2');
CALL sp_map_role_module_actions('SALES_RSH', 'EOI', 'list,view,edit,export,assignClosingRM,previewForm', 'L2');
CALL sp_map_role_module_actions('SALES_RSH', 'BATCH', 'list,view,export', 'L2');
CALL sp_map_role_module_actions('SALES_RSH', 'CHANNEL_PARTNERS', 'copyLink,list,view', 'L2');
CALL sp_map_role_module_actions('SALES_RSH', 'BANK_DETAILS', 'share,list,view', 'L2');
CALL sp_map_role_module_actions('SALES_RSH', 'UNIT_INVENTORY', 'list,view', 'L2');
CALL sp_map_role_module_actions('SALES_RSH', 'AGREEMENT_MANAGEMENT', 'edit,download,viewLink,signNow', 'L2');

-- ---------------------------------------------------
-- SALES BH (view-only, minimal)
-- ---------------------------------------------------
CALL sp_map_role_module_actions('SALES_BH', 'EOI', 'list,view', 'L2');

-- ---------------------------------------------------
-- CRM
-- ---------------------------------------------------
CALL sp_map_role_module_actions('CRM', 'ESIGNER', 'add,edit,listing,signedPdf,viewLink', 'L1');
CALL sp_map_role_module_actions('CRM', 'EOI', 'list,view,edit,export,approveCancellation,crmCancellationAction,previewForm,manageSfdcOpportunity', 'L1');
CALL sp_map_role_module_actions('CRM', 'BATCH', 'list,view,mapEois,notifyCx', 'L1');
CALL sp_map_role_module_actions('CRM', 'IOM_MANAGEMENT', 'list,view,create,edit,addLoyaltyPoints,draft,cancel', 'L1');
CALL sp_map_role_module_actions('CRM', 'AGREEMENT_MANAGEMENT', 'edit,download,viewLink,signNow', 'L1');

-- ---------------------------------------------------
-- CRM TL
-- ---------------------------------------------------
CALL sp_map_role_module_actions('CRM_TL', 'IOM_MANAGEMENT', 'list,view,create,edit,addLoyaltyPoints,approveIOM,draft,cancel,requestInvoice', 'L2');
CALL sp_map_role_module_actions('CRM_TL', 'ESIGNER', 'add,edit,listing,signedPdf,viewLink', 'L2');

-- ---------------------------------------------------
-- CRM HEAD
-- ---------------------------------------------------
CALL sp_map_role_module_actions('CRM_HEAD', 'IOM_MANAGEMENT', 'list,view,create,edit,addLoyaltyPoints,approveIOM,draft,cancel,requestInvoice,submitInvoice,closeIOM,rejectIOM', 'L3');
CALL sp_map_role_module_actions('CRM_HEAD', 'ESIGNER', 'add,edit,listing,signedPdf,viewLink', 'L3');

-- ---------------------------------------------------
-- FINANCE ADMIN
-- ---------------------------------------------------
CALL sp_map_role_module_actions('FINANCE_ADMIN', 'EMPLOYEE', 'list,view,create,edit,export', 'L3');
CALL sp_map_role_module_actions('FINANCE_ADMIN', 'UPLOADS', 'create,list,view,export', 'L3');
CALL sp_map_role_module_actions('FINANCE_ADMIN', 'LOGS', 'list,view,export', 'L3');
CALL sp_map_role_module_actions('FINANCE_ADMIN', 'EOI', 'list,view,export,verify,financeRecordDetails', 'L3');

-- ---------------------------------------------------
-- FINANCE USER
-- ---------------------------------------------------
CALL sp_map_role_module_actions('FINANCE_USER', 'IOM_MANAGEMENT', 'list,view,create,edit,draft,cancel,requestInvoice', 'L1');
CALL sp_map_role_module_actions('FINANCE_USER', 'ESIGNER', 'add,edit,listing,signedPdf,viewLink', 'L1');

-- ---------------------------------------------------
-- FINANCE HEAD
-- ---------------------------------------------------
CALL sp_map_role_module_actions('FINANCE_HEAD', 'IOM_MANAGEMENT', 'list,view,create,edit,approveIOM,draft,cancel,requestInvoice,submitInvoice,closeIOM,rejectIOM', 'L3');
CALL sp_map_role_module_actions('FINANCE_HEAD', 'ESIGNER', 'add,edit,listing,signedPdf,viewLink', 'L3');

-- ---------------------------------------------------
-- MIS
-- ---------------------------------------------------
CALL sp_map_role_module_actions('MIS', 'EOI', 'list,view,export', 'L1');
CALL sp_map_role_module_actions('MIS', 'BATCH', 'list,view,export', 'L1');
CALL sp_map_role_module_actions('MIS', 'UNIT_INVENTORY', 'list,view', 'L1');

-- ---------------------------------------------------
-- GRE
-- ---------------------------------------------------
CALL sp_map_role_module_actions('GRE', 'DASHBOARD', 'list,view,export', 'L1');
CALL sp_map_role_module_actions('GRE', 'BATCH', 'list,view,edit,create,export,viewRecords', 'L1');
CALL sp_map_role_module_actions('GRE', 'SITE_VISIT', 'list,view,create,edit', 'L1');

-- ---------------------------------------------------
-- BIS (admin-shaped access)
-- ---------------------------------------------------
CALL sp_map_role_module_actions('BIS', 'USERS', 'list,view,create,edit,export', 'L2');
CALL sp_map_role_module_actions('BIS', 'MASTERS', NULL, 'L2');
CALL sp_map_role_module_actions('BIS', 'BOOKINGS', 'list,view,export', 'L2');
CALL sp_map_role_module_actions('BIS', 'INCENTIVES', NULL, 'L2');
CALL sp_map_role_module_actions('BIS', 'EOI', 'list,view,edit,export,previewForm,manageSfdcOpportunity', 'L2');
CALL sp_map_role_module_actions('BIS', 'BATCH', 'list,view,export', 'L2');
CALL sp_map_role_module_actions('BIS', 'UNIT_INVENTORY', 'list,view', 'L2');

-- ---------------------------------------------------
-- PROJECT HEAD
-- ---------------------------------------------------
CALL sp_map_role_module_actions('PROJECT_HEAD', 'ESIGNER', 'add,edit,listing,signedPdf,viewLink', 'L3');
CALL sp_map_role_module_actions('PROJECT_HEAD', 'EOI', 'list,view,edit,export', 'L3');
CALL sp_map_role_module_actions('PROJECT_HEAD', 'BANK_DETAILS', 'share,list,view', 'L3');
CALL sp_map_role_module_actions('PROJECT_HEAD', 'UNIT_INVENTORY', 'list,view', 'L3');
CALL sp_map_role_module_actions('PROJECT_HEAD', 'AGREEMENT_MANAGEMENT', 'edit,download,viewLink,signNow', 'L3');

-- ---------------------------------------------------
-- LOYALTY
-- ---------------------------------------------------
CALL sp_map_role_module_actions('LOYALTY', 'IOM_MANAGEMENT', 'list,view,create,edit,addLoyaltyPoints,draft,cancel', 'L1');
CALL sp_map_role_module_actions('LOYALTY', 'ESIGNER', 'add,edit,listing,signedPdf,viewLink', 'L1');

-- ---------------------------------------------------
-- Cleanup: drop helper procedures
-- ---------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_map_role_module_actions`;
DROP PROCEDURE IF EXISTS `sp_map_role_sub_module_actions`;

-- ============================================================================
-- Verify mappings
-- ============================================================================
-- SELECT rd.code AS role, m.code AS module, COUNT(*) AS mapping_count
-- FROM dept_role_module_mappings drm
-- JOIN role_definitions rd ON rd.id = drm.role_definition_id
-- JOIN module_definitions m ON m.id = drm.module_id
-- GROUP BY rd.code, m.code
-- ORDER BY rd.code, m.code;
