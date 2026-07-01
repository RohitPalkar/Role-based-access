import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateBookingOfficeUsetable1760020976474 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename existing column office_use -> office_info
    await queryRunner.query(`
      ALTER TABLE \`booking_office_use\`
      CHANGE \`office_use\` \`office_info\` JSON NULL;
    `);

    // Add new columns
    await queryRunner.query(`
      ALTER TABLE \`booking_office_use\`
      ADD COLUMN \`documents\` JSON NULL,
      ADD COLUMN \`enq_ref_no\` varchar(50) NULL,
      ADD COLUMN \`remarks\` text NULL,
      ADD COLUMN \`nri_country\` varchar(100) NULL,
      ADD COLUMN \`booking_region_as_per_rm\` varchar(50) NULL,
      ADD COLUMN \`primary_source\` varchar(150) NULL,
      ADD COLUMN \`booking_scheme_name\` varchar(50) NULL,
      ADD COLUMN \`cp_name\` varchar(150) NULL,
      ADD COLUMN \`is_sold_under_scheme\` varchar(50) NULL,
      ADD COLUMN \`is_unit_sold_mtp\` varchar(50) NULL,
      ADD COLUMN \`is_payment_plan\` varchar(50) NULL,
      ADD COLUMN \`is_pdc_collected\` varchar(50) NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the added columns first
    await queryRunner.query(`
      ALTER TABLE \`booking_office_use\`
      DROP COLUMN \`is_pdc_collected\`,
      DROP COLUMN \`is_payment_plan\`,
      DROP COLUMN \`is_unit_sold_mtp\`,
      DROP COLUMN \`is_sold_under_scheme\`,
      DROP COLUMN \`cp_name\`,
      DROP COLUMN \`booking_scheme_name\`,
      DROP COLUMN \`primary_source\`,
      DROP COLUMN \`booking_region_as_per_rm\`,
      DROP COLUMN \`nri_country\`,
      DROP COLUMN \`remarks\`,
      DROP COLUMN \`enq_ref_no\`,
      DROP COLUMN \`documents\`;
    `);

    // Rename office_info back to office_use
    await queryRunner.query(`
      ALTER TABLE \`booking_office_use\`
      CHANGE \`office_info\` \`office_use\` JSON NULL;
    `);
  }
}
