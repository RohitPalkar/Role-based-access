import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationRoleFlags1781264600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE notifications
      ADD COLUMN isForAllCrmTL TINYINT(1) NOT NULL DEFAULT 0 AFTER isForAllCRM,
      ADD COLUMN isForAllCrmHead TINYINT(1) NOT NULL DEFAULT 0 AFTER isForAllCrmTL,
      ADD COLUMN isForAllFinanceHead TINYINT(1) NOT NULL DEFAULT 0 AFTER isForAllCrmHead,
      ADD COLUMN isForAllFinanceUser TINYINT(1) NOT NULL DEFAULT 0 AFTER isForAllFinanceHead,
      ADD COLUMN isForAllLoyalty TINYINT(1) NOT NULL DEFAULT 0 AFTER isForAllFinanceUser,

      ADD COLUMN crmTlReadIds JSON NULL AFTER crmReadIds,
      ADD COLUMN crmHeadReadIds JSON NULL AFTER crmTlReadIds,
      ADD COLUMN financeHeadReadIds JSON NULL AFTER crmHeadReadIds,
      ADD COLUMN financeUserReadIds JSON NULL AFTER financeHeadReadIds,
      ADD COLUMN loyaltyReadIds JSON NULL AFTER financeUserReadIds
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE notifications
      DROP COLUMN loyaltyReadIds,
      DROP COLUMN financeUserReadIds,
      DROP COLUMN financeHeadReadIds,
      DROP COLUMN crmHeadReadIds,
      DROP COLUMN crmTlReadIds,

      DROP COLUMN isForAllLoyalty,
      DROP COLUMN isForAllFinanceUser,
      DROP COLUMN isForAllFinanceHead,
      DROP COLUMN isForAllCrmHead,
      DROP COLUMN isForAllCrmTL
    `);
  }
}
