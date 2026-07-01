import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRazorpayKeyAndSecretInProjectPhase1776233362399 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE project_phases
            ADD COLUMN razorpay_booking_mid VARCHAR(255) NULL AFTER easebuzz_milestone_mid,
            ADD COLUMN razorpay_milestone_mid VARCHAR(255) NULL AFTER razorpay_booking_mid;
          `);

    await queryRunner.query(`
            ALTER TABLE projects
            ADD COLUMN razorpay_booking_mid VARCHAR(255) NULL AFTER easebuzz_milestone_mid,
            ADD COLUMN razorpay_milestone_mid VARCHAR(255) NULL AFTER razorpay_booking_mid;
          `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE project_phases
        DROP COLUMN razorpay_booking_mid,
        DROP COLUMN razorpay_milestone_mid;
      `);

    await queryRunner.query(`
        ALTER TABLE projects
        DROP COLUMN razorpay_booking_mid,
        DROP COLUMN razorpay_milestone_mid;
      `);
  }
}
