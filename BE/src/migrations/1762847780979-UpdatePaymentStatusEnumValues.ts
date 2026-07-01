import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePaymentStatusEnumValues1762847780979 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Modify enum to include both old and new values
    await queryRunner.query(`
      ALTER TABLE \`voucher_payments\`
      MODIFY COLUMN \`status\` ENUM(
        'Unverified',
        'Verified',
        'Realized',
        'Rejected',
        'Refunded',
        'Reversed',
        'Not Realized'
      ) NOT NULL
    `);

    // Step 2: Update existing records - change 'Verified' to 'Realized'
    await queryRunner.query(`
      UPDATE \`voucher_payments\`
      SET \`status\` = 'Realized'
      WHERE \`status\` = 'Verified'
    `);

    // Step 3: Update existing records - change 'Reversed' to 'Not Realized'
    await queryRunner.query(`
      UPDATE \`voucher_payments\`
      SET \`status\` = 'Not Realized'
      WHERE \`status\` = 'Reversed'
    `);

    // Step 4: Modify enum to remove old values, keeping only new ones
    await queryRunner.query(`
      ALTER TABLE \`voucher_payments\`
      MODIFY COLUMN \`status\` ENUM(
        'Unverified',
        'Realized',
        'Rejected',
        'Refunded',
        'Not Realized'
      ) NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Modify enum to include both old and new values
    await queryRunner.query(`
      ALTER TABLE \`voucher_payments\`
      MODIFY COLUMN \`status\` ENUM(
        'Unverified',
        'Verified',
        'Realized',
        'Rejected',
        'Refunded',
        'Reversed',
        'Not Realized'
      ) NOT NULL
    `);

    // Step 2: Update existing records - change 'Realized' back to 'Verified'
    await queryRunner.query(`
      UPDATE \`voucher_payments\`
      SET \`status\` = 'Verified'
      WHERE \`status\` = 'Realized'
    `);

    // Step 3: Update existing records - change 'Not Realized' back to 'Reversed'
    await queryRunner.query(`
      UPDATE \`voucher_payments\`
      SET \`status\` = 'Reversed'
      WHERE \`status\` = 'Not Realized'
    `);

    // Step 4: Modify enum to remove new values, keeping only old ones
    await queryRunner.query(`
      ALTER TABLE \`voucher_payments\`
      MODIFY COLUMN \`status\` ENUM(
        'Unverified',
        'Verified',
        'Rejected',
        'Refunded',
        'Reversed'
      ) NOT NULL
    `);
  }
}
