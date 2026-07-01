import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFieldsToProjectPhases1772631751135 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE project_phases
            ADD COLUMN easebuzz_booking_mid VARCHAR(255) NULL,
            ADD COLUMN easebuzz_milestone_mid VARCHAR(255) NULL,
            ADD COLUMN region JSON NULL,
            ADD COLUMN sap_phase_name VARCHAR(255) NULL,
            ADD COLUMN sfdc_phase_name VARCHAR(100) NULL,
            ADD COLUMN block_names JSON NULL;
          `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE project_phases
        DROP COLUMN easebuzz_booking_mid,
        DROP COLUMN easebuzz_milestone_mid,
        DROP COLUMN region,
        DROP COLUMN sap_phase_name,
        DROP COLUMN sfdc_phase_name,
        DROP COLUMN block_names;
      `);
  }
}
