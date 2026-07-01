import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameEnquiryIdTouniqueReferenceId1756808317143 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vouchers
      CHANGE enquiry_id unique_reference_id VARCHAR(255) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vouchers
      CHANGE unique_reference_id enquiry_id VARCHAR(255) NULL
    `);
  }
}
