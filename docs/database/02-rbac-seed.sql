-- ============================================================================
-- RBAC Seed Data
-- Phase 2: Seed Levels, Modules, Sub-Modules, Actions, and Default Mappings
-- Run AFTER 01-rbac-migration.sql
-- ============================================================================

-- ---------------------------------------------------
-- 1. SEED: LEVELS (L1–L4)
-- ---------------------------------------------------
INSERT INTO `levels` (`code`, `name`, `description`, `sort_order`) VALUES
('L1', 'Individual Contributor', 'Executes tasks within assigned modules', 1),
('L2', 'Manager', 'Manages L1 users; reports to L3', 2),
('L3', 'Reporting Manager / Team Admin', 'Oversees L2; reports to L4', 3),
('L4', 'Department Admin / Reporting Head', 'Top-level department authority', 4);

-- ---------------------------------------------------
-- 2. SEED: DEPARTMENTS
-- ---------------------------------------------------
INSERT INTO `departments` (`name`, `code`, `level`, `status`) VALUES
('Administration', 'ADMIN', 'L5', 'active'),
('Sales', 'SALES', 'L5', 'active'),
('CRM', 'CRM', 'L5', 'active'),
('Finance', 'FINANCE', 'L5', 'active'),
('MIS', 'MIS', 'L5', 'active'),
('GRE', 'GRE', 'L5', 'active'),
('BIS', 'BIS', 'L5', 'active'),
('Operations', 'OPS', 'L5', 'active'),
('Loyalty', 'LOYALTY', 'L5', 'active');

-- ---------------------------------------------------
-- 3. SEED: ROLE_DEFINITIONS
-- Depends on departments and levels being seeded first.
-- Adjust `department_id` and `level_id` based on actual IDs.
-- ---------------------------------------------------
-- Assumes:
--   dept IDs: Admin=1, Sales=2, CRM=3, Finance=4, MIS=5, GRE=6, BIS=7, Ops=8, Loyalty=9
--   level IDs: L1=1, L2=2, L3=3, L4=4
INSERT INTO `role_definitions` (`name`, `code`, `department_id`, `level_id`, `description`, `status`) VALUES
-- Administration (id=1)
('Super Admin', 'SUPER_ADMIN', 1, 4, 'Full system access — bypasses all permission checks', 'active'),
('Admin', 'ADMIN', 1, 3, 'System administrator with full access', 'active'),

-- Sales (id=2)
('RM (Relationship Manager)', 'RM', 2, 1, 'Front-line sales — bookings, EOI, incentives', 'active'),
('Sales TL', 'SALES_TL', 2, 2, 'Sales Team Lead — manages RMs', 'active'),
('Sales RSH', 'SALES_RSH', 2, 2, 'Regional Sales Head', 'active'),
('Sales BH', 'SALES_BH', 2, 2, 'Business Head — EOI view only', 'active'),

-- CRM (id=3)
('CRM User', 'CRM', 3, 1, 'Customer relationship management', 'active'),
('CRM TL', 'CRM_TL', 3, 2, 'CRM Team Lead', 'active'),
('CRM Head', 'CRM_HEAD', 3, 3, 'CRM Department Head', 'active'),

-- Finance (id=4)
('Finance Admin', 'FINANCE_ADMIN', 4, 3, 'Finance administration — employee/salary management', 'active'),
('Finance User', 'FINANCE_USER', 4, 1, 'Finance team member — IOM processing', 'active'),
('Finance Head', 'FINANCE_HEAD', 4, 3, 'Finance department head', 'active'),

-- MIS (id=5)
('MIS User', 'MIS', 5, 1, 'Management Information System — EOI and batch reports', 'active'),

-- GRE (id=6)
('GRE User', 'GRE', 6, 1, 'Guest Relation Executive — site visits, batch', 'active'),

-- BIS (id=7)
('BIS User', 'BIS', 7, 2, 'Business Intelligence — admin-shaped access', 'active'),

-- Operations (id=8)
('Project Head', 'PROJECT_HEAD', 8, 3, 'Project oversight — E-Signer, EOI, agreement', 'active'),

-- Loyalty (id=9)
('Loyalty User', 'LOYALTY', 9, 1, 'Loyalty program — IOM management', 'active');

-- ---------------------------------------------------
-- 4. SEED: MODULE_DEFINITIONS
-- Top-level modules (parent_id = NULL)
-- ---------------------------------------------------
INSERT INTO `module_definitions` (`name`, `code`, `parent_id`, `icon`, `route_path`, `sort_order`, `status`) VALUES
('Users', 'USERS', NULL, 'user-icon', '/admin/user', 1, 'active'),
('Masters', 'MASTERS', NULL, 'brand-icon', '/admin/brand', 2, 'active'),
('Bookings', 'BOOKINGS', NULL, 'rm_bookings', '/rm-panel/bookings', 3, 'active'),
('E-Signer', 'ESIGNER', NULL, 'Signature', '/rm-panel/dashboard', 4, 'active'),
('Incentives', 'INCENTIVES', NULL, 'dashboard-icon', '/admin/reports/users', 5, 'active'),
('EOI', 'EOI', NULL, 'EOI', '/eoi-dashboard', 6, 'active'),
('Batch', 'BATCH', NULL, 'batch-manager', '/batch/listing', 7, 'active'),
('IOM Management', 'IOM_MANAGEMENT', NULL, 'eoi', '/iom-management', 8, 'active'),
('Logs', 'LOGS', NULL, 'logs', '/logs', 9, 'active'),
('Employee', 'EMPLOYEE', NULL, 'employee', '/finance-admin/employee-list', 10, 'active'),
('Uploads', 'UPLOADS', NULL, 'file', '/finance-admin/salary', 11, 'active'),
('Dashboard', 'DASHBOARD', NULL, 'dashboard-icon', '/gre/dashboard', 12, 'active'),
('Site Visit', 'SITE_VISIT', NULL, 'ic-tour', '/gre/site-visit', 13, 'active'),
('Channel Partners', 'CHANNEL_PARTNERS', NULL, 'eoi', '/cp-list', 14, 'active'),
('Unit Inventory', 'UNIT_INVENTORY', NULL, 'inventory', '/inventory', 15, 'active'),
('Bank Details', 'BANK_DETAILS', NULL, 'bank-details', '/bank-details', 16, 'active'),
('SFDC Logs', 'SFDC_LOGS', NULL, 'logs', '/super-admin/sfdc-logs', 17, 'active'),
('Agreement Management', 'AGREEMENT_MANAGEMENT', NULL, 'ic-file', '/agreement', 18, 'active');

-- ---------------------------------------------------
-- 5. SEED: SUB-MODULE_DEFINITIONS
-- Depends on module_definitions.
-- Module ID mapping (approximate — adjust based on actual IDs):
--   USERS=1, MASTERS=2, BOOKINGS=3, ESIGNER=4, INCENTIVES=5, EOI=6, BATCH=7,
--   IOM_MANAGEMENT=8, LOGS=9, EMPLOYEE=10, UPLOADS=11, DASHBOARD=12,
--   SITE_VISIT=13, CHANNEL_PARTNERS=14, UNIT_INVENTORY=15, BANK_DETAILS=16,
--   SFDC_LOGS=17, AGREEMENT_MANAGEMENT=18
-- ---------------------------------------------------
INSERT INTO `sub_module_definitions` (`name`, `code`, `module_id`, `route_path`, `sort_order`, `status`) VALUES
-- Masters (id=2)
('Brands', 'BRANDS', 2, '/admin/brand', 1, 'active'),
('Projects', 'PROJECTS', 2, '/admin/project', 2, 'active'),
('Project Phases', 'PROJECT_PHASES', 2, '/admin/phase', 3, 'active'),

-- Bookings (id=3)
('Add Admin Bookings', 'ADD_ADMIN_BOOKINGS', 3, '/admin/bookings', 1, 'active'),

-- Incentives (id=5)
('Records', 'INCENTIVE_RECORDS', 5, '/admin/reports/users', 1, 'active'),
('Leaderboard', 'INCENTIVE_LEADERBOARD', 5, '/leader-board/rmSummary', 2, 'active'),
('Incentive Policy', 'INCENTIVE_POLICY', 5, '/admin/incentive-structure', 3, 'active'),
('Booster Policy', 'BOOSTER_POLICY', 5, '/admin/booster', 4, 'active'),
('Modify Booking Dates', 'MODIFY_BOOKING_DATES', 5, '/admin/uploads/booking-date-modification', 5, 'active'),
('Incentive Slabs', 'INCENTIVE_SLABS', 5, '/rm-panel/incentive-slabs', 6, 'active'),
('Reports', 'INCENTIVE_REPORTS', 5, '/admin/reports/incentives', 7, 'active'),
('Dashboard', 'INCENTIVE_DASHBOARD', 5, '/rm-panel/incentive-dashboard', 8, 'active'),

-- EOI (id=6)
('EOI Dashboard', 'EOI_DASHBOARD', 6, '/eoi-dashboard', 1, 'active'),
('EOI Leaderboard', 'EOI_LEADERBOARD', 6, '/eoi-leaderboard', 2, 'active'),
('EOI Records', 'EOI_RECORDS', 6, '/eoi-records', 3, 'active'),
('EOI Manager', 'EOI_MANAGER', 6, '/eoi-manager', 4, 'active'),
('CP List', 'CP_LIST', 6, '/cp-list', 5, 'active'),
('Inventory', 'EOI_INVENTORY', 6, '/inventory', 6, 'active'),
('Bank Details', 'EOI_BANK_DETAILS', 6, '/bank-details', 7, 'active'),

-- Batch (id=7)
('Listing', 'BATCH_LISTING', 7, '/batch/listing', 1, 'active'),
('Tracker', 'BATCH_TRACKER', 7, '/batch/tracker', 2, 'active'),
('View Records', 'BATCH_VIEW_RECORDS', 7, '/batch/records', 3, 'active'),
('Dashboard', 'BATCH_DASHBOARD', 7, '/batch/dashboard', 4, 'active'),
('Slot Listing', 'BATCH_SLOT_LISTING', 7, '/batch/slots', 5, 'active'),
('Voucher Listing', 'BATCH_VOUCHER_LISTING', 7, '/batch/vouchers', 6, 'active'),
('Batch Manager', 'BATCH_MANAGER', 7, '/batch/manage', 7, 'active'),

-- IOM Management (id=8)
('IOM Listing', 'IOM_LISTING', 8, '/iom/list', 1, 'active'),
('Invoice Listing', 'INVOICE_LISTING', 8, '/iom/invoices', 2, 'active'),
('IOM My Team', 'IOM_MY_TEAM', 8, '/iom/my-team', 3, 'active'),

-- Logs (id=9)
('Logs', 'LOGS_LIST', 9, '/logs', 1, 'active'),
('Logs History', 'LOGS_HISTORY', 9, '/logs/history', 2, 'active'),

-- Employee (id=10)
('List', 'EMPLOYEE_LIST', 10, '/finance-admin/employee-list', 1, 'active'),

-- Uploads (id=11)
('Salary', 'SALARY_UPLOAD', 11, '/finance-admin/salary', 1, 'active'),

-- Others (common sub-modules)
('Unit Inventory', 'UNIT_INVENTORY_SUB', 15, '/inventory', 1, 'active'),
('Bank Details Sub', 'BANK_DETAILS_SUB', 16, '/bank-details', 1, 'active');

-- ---------------------------------------------------
-- 6. SEED: ACTION_DEFINITIONS
-- Base CRUD + custom actions per module
-- ---------------------------------------------------

-- Base CRUD actions (no module association — global)
INSERT INTO `action_definitions` (`name`, `code`, `module_id`, `sub_module_id`, `is_custom`) VALUES
('Create', 'create', NULL, NULL, 0),
('List', 'list', NULL, NULL, 0),
('View', 'view', NULL, NULL, 0),
('Edit', 'edit', NULL, NULL, 0),
('Delete', 'delete', NULL, NULL, 0),
('Export', 'export', NULL, NULL, 0),
('Refresh', 'refresh', NULL, NULL, 0);

-- EOI-specific custom actions (module_id = 6)
INSERT INTO `action_definitions` (`name`, `code`, `module_id`, `is_custom`) VALUES
('View Customer', 'viewCustomer', 6, 1),
('Preview Form', 'previewForm', 6, 1),
('Approve Cancellation', 'approveCancellation', 6, 1),
('Export Booking Form', 'exportBookingForm', 6, 1),
('Manage SFDC Opportunity', 'manageSfdcOpportunity', 6, 1),
('Delete EOI', 'deleteEoi', 6, 1),
('Restore EOI', 'restoreEoi', 6, 1),
('Create Leads on SFDC', 'createLeadsOnSFDC', 6, 1),
('Convert Leads on SFDC', 'convertLeadsOnSFDC', 6, 1),
('Approve Unit', 'approveUnit', 6, 1),
('Edit EOI', 'editEOI', 6, 1),
('Assign Closing RM', 'assignClosingRM', 6, 1),
('Map and Convert EOI', 'mapAndConvertEOI', 6, 1),
('Request Cancellation', 'requestCancellation', 6, 1),
('Change Source', 'changeSource', 6, 1),
('Verify', 'verify', 6, 1),
('Request Changes', 'requestChanges', 6, 1),
('Send Link', 'sendLink', 6, 1),
('CRM Cancellation Action', 'crmCancellationAction', 6, 1);

-- Batch-specific custom actions (module_id = 7)
INSERT INTO `action_definitions` (`name`, `code`, `module_id`, `is_custom`) VALUES
('Map EOIs', 'mapEois', 7, 1),
('Notify Customer', 'notifyCx', 7, 1),
('Edit Batch', 'editBatch', 7, 1),
('Delete Batch', 'deleteBatch', 7, 1),
('Move To', 'moveTo', 7, 1),
('Generate Batches', 'generateBatches', 7, 1),
('Share Preview', 'sharePreview', 7, 1),
('Open Batch', 'openBatch', 7, 1),
('Lock Batch', 'lockBatch', 7, 1);

-- IOM-specific custom actions (module_id = 8)
INSERT INTO `action_definitions` (`name`, `code`, `module_id`, `is_custom`) VALUES
('Add Loyalty Points', 'addLoyaltyPoints', 8, 1),
('Approve IOM', 'approveIOM', 8, 1),
('Draft', 'draft', 8, 1),
('Cancel', 'cancel', 8, 1),
('Request Invoice', 'requestInvoice', 8, 1),
('Submit Invoice', 'submitInvoice', 8, 1),
('Close IOM', 'closeIOM', 8, 1),
('Reject IOM', 'rejectIOM', 8, 1);

-- E-Signer-specific actions (module_id = 4)
INSERT INTO `action_definitions` (`name`, `code`, `module_id`, `is_custom`) VALUES
('Add', 'add', 4, 1),
('Signed PDF', 'signedPdf', 4, 1),
('View Link', 'viewLink', 4, 1);

-- Channel Partner actions (module_id = 14)
INSERT INTO `action_definitions` (`name`, `code`, `module_id`, `is_custom`) VALUES
('Copy Link', 'copyLink', 14, 1);

-- Unit Inventory actions (module_id = 15)
INSERT INTO `action_definitions` (`name`, `code`, `module_id`, `is_custom`) VALUES
('Update Status', 'updateStatus', 15, 1),
('Map Unit to Voucher', 'mapUnitToVoucher', 15, 1);

-- Bank Details actions (module_id = 16)
INSERT INTO `action_definitions` (`name`, `code`, `module_id`, `is_custom`) VALUES
('Share', 'share', 16, 1);

-- Agreement Management actions (module_id = 18)
INSERT INTO `action_definitions` (`name`, `code`, `module_id`, `is_custom`) VALUES
('Download', 'download', 18, 1),
('Sign Now', 'signNow', 18, 1);

-- ---------------------------------------------------
-- 7. SEED: DEPT-ROLE-MODULE MAPPINGS
-- Maps roles to their permitted modules/sub-modules/actions.
-- NOTE: Adjust role_definition_id and action_id values based on actual IDs.
-- This is a representative sample for common roles.
-- ---------------------------------------------------

-- WARNING: The following INSERT uses variable-based ID lookups for portability.
-- Execute these SET statements with actual IDs from your database.

-- Example mapping: Admin → EOI → All CRUD + custom actions
-- INSERT INTO `dept_role_module_mappings` (department_id, role_definition_id, module_id, sub_module_id, action_id, level_id)
-- SELECT d.id, rd.id, m.id, sm.id, a.id, l.id
-- FROM departments d, role_definitions rd, module_definitions m
-- LEFT JOIN sub_module_definitions sm ON sm.module_id = m.id
-- CROSS JOIN action_definitions a
-- CROSS JOIN levels l
-- WHERE rd.code = 'ADMIN' AND d.code = 'ADMIN' AND m.code = 'EOI' AND l.code = 'L3'
--   AND a.code IN ('create', 'list', 'view', 'edit', 'delete', 'export', 'refresh',
--                   'viewCustomer', 'previewForm', 'approveCancellation', 'exportBookingForm',
--                   'manageSfdcOpportunity', 'deleteEoi', 'restoreEoi', 'createLeadsOnSFDC',
--                   'convertLeadsOnSFDC', 'approveUnit', 'editEOI', 'assignClosingRM',
--                   'mapAndConvertEOI', 'requestCancellation', 'changeSource',
--                   'verify', 'requestChanges', 'sendLink', 'crmCancellationAction');

-- See the separate mapping seed file (03-rbac-mappings.sql) for full role mapping data.
