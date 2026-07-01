import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIncentiveBookingSplitColumnsMigration1776729600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`incentive_bookings\`
        ADD COLUMN \`split_factor\` INT NOT NULL DEFAULT 1 AFTER \`incentive_delta\`,
        ADD COLUMN \`base_incentive_amount\` DECIMAL(15, 3) NULL DEFAULT 0 AFTER \`split_factor\`,
        ADD COLUMN \`shared_group_metadata\` JSON NULL AFTER \`base_incentive_amount\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`incentive_bookings\`
        DROP COLUMN \`shared_group_metadata\`,
        DROP COLUMN \`base_incentive_amount\`,
        DROP COLUMN \`split_factor\`
    `);
  }
}
