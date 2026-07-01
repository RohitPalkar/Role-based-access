import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameCheckedByToMisCheckerAndAddCrmChecker1762842659073 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the existing foreign key constraint for checked_by
    await queryRunner.query(`
      ALTER TABLE \`vouchers\`
      DROP FOREIGN KEY \`FK_vouchers_checked_by_users\`
    `);

    // Rename checked_by column to mis_checker
    await queryRunner.query(`
      ALTER TABLE \`vouchers\`
      CHANGE COLUMN \`checked_by\` \`mis_checker\` int NULL
    `);

    // Add foreign key constraint for mis_checker
    await queryRunner.query(`
      ALTER TABLE \`vouchers\`
      ADD CONSTRAINT \`FK_vouchers_mis_checker_users\`
        FOREIGN KEY (\`mis_checker\`) REFERENCES \`users\`(\`id\`)
        ON DELETE SET NULL
        ON UPDATE CASCADE
    `);

    // Add new crm_checker column with foreign key
    await queryRunner.query(`
      ALTER TABLE \`vouchers\`
      ADD COLUMN \`crm_checker\` int NULL AFTER \`mis_checker\`,
      ADD CONSTRAINT \`FK_vouchers_crm_checker_users\`
        FOREIGN KEY (\`crm_checker\`) REFERENCES \`users\`(\`id\`)
        ON DELETE SET NULL
        ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint for crm_checker
    await queryRunner.query(`
      ALTER TABLE \`vouchers\`
      DROP FOREIGN KEY \`FK_vouchers_crm_checker_users\`
    `);

    // Drop crm_checker column
    await queryRunner.query(`
      ALTER TABLE \`vouchers\`
      DROP COLUMN \`crm_checker\`
    `);

    // Drop foreign key constraint for mis_checker
    await queryRunner.query(`
      ALTER TABLE \`vouchers\`
      DROP FOREIGN KEY \`FK_vouchers_mis_checker_users\`
    `);

    // Rename mis_checker column back to checked_by
    await queryRunner.query(`
      ALTER TABLE \`vouchers\`
      CHANGE COLUMN \`mis_checker\` \`checked_by\` int NULL
    `);

    // Add back the original foreign key constraint for checked_by
    await queryRunner.query(`
      ALTER TABLE \`vouchers\`
      ADD CONSTRAINT \`FK_vouchers_checked_by_users\`
        FOREIGN KEY (\`checked_by\`) REFERENCES \`users\`(\`id\`)
        ON DELETE SET NULL
        ON UPDATE CASCADE
    `);
  }
}
