import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEasebuzzFieldsInBrand1772524107405 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
             ALTER TABLE brands
      ADD COLUMN easebuzz_booking_salt VARCHAR(255) NULL AFTER max_qualification_days,
      ADD COLUMN easebuzz_booking_key VARCHAR(255) NULL AFTER easebuzz_booking_salt,
      ADD COLUMN easebuzz_milestone_salt VARCHAR(255) NULL AFTER easebuzz_booking_key,
      ADD COLUMN easebuzz_milestone_key VARCHAR(255) NULL AFTER easebuzz_milestone_salt,
      ADD COLUMN easebuzz_booking_mid VARCHAR(255) NULL AFTER easebuzz_milestone_key,
      ADD COLUMN easebuzz_milestone_mid VARCHAR(255) NULL AFTER easebuzz_booking_mid;
          `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    ALTER TABLE brands
      DROP COLUMN easebuzz_booking_salt,
      DROP COLUMN easebuzz_booking_key,
      DROP COLUMN easebuzz_milestone_salt,
      DROP COLUMN easebuzz_milestone_key,
      DROP COLUMN easebuzz_booking_mid,
      DROP COLUMN easebuzz_milestone_mid;
  `);
  }
}
