import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seeds baseline RBAC master data:
 * - Levels (hierarchy positions)
 * - Zones (operational areas)
 * - Module definitions (system modules that map to frontend nav items)
 * - Action definitions (CRUD + export actions)
 * - Sub-module definitions (for parent-child module structures)
 *
 * After this seed runs, the frontend RBAC system will have
 * permission definitions to check against. Role-to-permission
 * mappings must be configured separately via the RBAC admin UI
 * or through direct DB inserts.
 */
export class SeedRBACData1783000000001 implements MigrationInterface {
  name = 'SeedRBACData1783000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // =====================
    // 1. Levels
    // =====================
    await queryRunner.query(`
      INSERT INTO levels (code, name, description, sort_order) VALUES
        ('level-1', 'Level 1', 'Entry level', 1),
        ('level-2', 'Level 2', 'Mid level', 2),
        ('level-3', 'Level 3', 'Senior level', 3),
        ('level-4', 'Level 4', 'Management level', 4),
        ('level-5', 'Level 5', 'Executive level', 5);
    `);

    // =====================
    // 2. Zones
    // =====================
    await queryRunner.query(`
      INSERT INTO zones (name, code, description, status) VALUES
        ('Corporate', 'corporate', 'Corporate headquarters', 'active'),
        ('North', 'north', 'Northern region', 'active'),
        ('South', 'south', 'Southern region', 'active'),
        ('East', 'east', 'Eastern region', 'active'),
        ('West', 'west', 'Western region', 'active');
    `);

    // =====================
    // 3. Module Definitions
    //    Each code matches frontend nav `permission.moduleCode`
    // =====================
    await queryRunner.query(`
      INSERT INTO module_definitions (code, name, sort_order, status) VALUES
        ('users',                'User Management',              1,  'active'),
        ('masters',              'Masters',                      2,  'active'),
        ('brands',               'Brands',                       3,  'active'),
        ('projects',             'Projects',                     4,  'active'),
        ('phases',               'Project Phases',               5,  'active'),
        ('incentives',           'Incentives',                   6,  'active'),
        ('incentives-records',   'Incentive Records',            7,  'active'),
        ('reports-users',        'Reports - Users',              8,  'active'),
        ('reports-bookings',     'Reports - Bookings',           9,  'active'),
        ('reports-incentives',   'Reports - Incentive Reports', 10,  'active'),
        ('leaderboard',          'Leaderboard',                 11,  'active'),
        ('incentive-policy',     'Incentive Policy',            12,  'active'),
        ('booster-policy',       'Booster Policy',              13,  'active'),
        ('booking-date-modification', 'Modify Booking Dates',   14,  'active'),
        ('eoi',                  'EOI',                          15,  'active'),
        ('eoi-dashboard',        'EOI Dashboard',               16,  'active'),
        ('eoi-leaderboard',      'EOI Leaderboard',             17,  'active'),
        ('eoi-records',          'EOI Records',                 18,  'active'),
        ('eoi-manager',          'EOI Manager',                 19,  'active'),
        ('cp-list',              'CP List',                     20,  'active'),
        ('unit-inventory',       'Unit Inventory',              21,  'active'),
        ('bank-details',         'Bank Details',                22,  'active'),
        ('sfdc-logs',            'SFDC Logs',                   23,  'active'),
        ('batch',                'Batch',                       24,  'active'),
        ('batch-listing',        'Batch Listing',               25,  'active'),
        ('batch-tracker',        'Batch Tracker',               26,  'active'),
        ('rm-bookings',          'RM Bookings',                 27,  'active'),
        ('rm-esigner',           'RM E-Signer',                 28,  'active'),
        ('rm-incentive',         'RM Incentive Dashboard',      29,  'active'),
        ('rm-reports',           'RM Reports',                  30,  'active'),
        ('rm-incentive-slabs',   'RM Incentive Slabs',          31,  'active');
    `);

    // =====================
    // 4. Action Definitions
    //    Common CRUD + export across all modules
    // =====================
    await queryRunner.query(`
      INSERT INTO action_definitions (code, name, is_custom) VALUES
        ('view',   'View',   0),
        ('create', 'Create', 0),
        ('edit',   'Edit',   0),
        ('delete', 'Delete', 0),
        ('export', 'Export', 0);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM action_definitions`);
    await queryRunner.query(`DELETE FROM module_definitions`);
    await queryRunner.query(`DELETE FROM zones`);
    await queryRunner.query(`DELETE FROM levels`);
  }
}
