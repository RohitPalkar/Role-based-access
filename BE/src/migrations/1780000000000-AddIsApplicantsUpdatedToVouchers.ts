import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsApplicantsUpdatedToVouchers1780000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasIsApplicantsUpdated = await queryRunner.hasColumn(
      'vouchers',
      'is_applicants_updated',
    );
    if (!hasIsApplicantsUpdated) {
      await queryRunner.query(
        `ALTER TABLE vouchers ADD COLUMN is_applicants_updated BOOLEAN NOT NULL DEFAULT FALSE`,
      );
    }

    const hasApplicantsUpdatedAt = await queryRunner.hasColumn(
      'vouchers',
      'applicants_updated_at',
    );
    if (!hasApplicantsUpdatedAt) {
      await queryRunner.query(
        `ALTER TABLE vouchers ADD COLUMN applicants_updated_at TIMESTAMP NULL DEFAULT NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasApplicantsUpdatedAt = await queryRunner.hasColumn(
      'vouchers',
      'applicants_updated_at',
    );
    if (hasApplicantsUpdatedAt) {
      await queryRunner.query(
        `ALTER TABLE vouchers DROP COLUMN applicants_updated_at`,
      );
    }

    const hasIsApplicantsUpdated = await queryRunner.hasColumn(
      'vouchers',
      'is_applicants_updated',
    );
    if (hasIsApplicantsUpdated) {
      await queryRunner.query(
        `ALTER TABLE vouchers DROP COLUMN is_applicants_updated`,
      );
    }
  }
}
