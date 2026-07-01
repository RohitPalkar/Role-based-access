import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckerColumnInVoucher1757414510815 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    ALTER TABLE \`vouchers\`
    ADD COLUMN \`checker_remarks\` varchar(500) NULL AFTER \`cancel_reason\`,
    ADD COLUMN \`checked_by\` int NULL AFTER \`cancelled_at\`,
    ADD COLUMN \`checked_at\` timestamp NULL AFTER \`checked_by\`,
    ADD CONSTRAINT \`FK_vouchers_checked_by_users\`
        FOREIGN KEY (\`checked_by\`) REFERENCES \`users\`(\`id\`)
        ON DELETE SET NULL
        ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`vouchers\`
      DROP COLUMN \`checker_remarks\`,
      DROP COLUMN \`checked_by\`,
      DROP COLUMN \`checked_at\`
    `);
  }
}
