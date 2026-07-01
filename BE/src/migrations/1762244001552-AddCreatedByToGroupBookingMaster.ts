import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreatedByToGroupBookingMaster1762244001552 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE group_booking_master
      ADD COLUMN created_by INT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE group_booking_master
      ADD CONSTRAINT fk_group_booking_master_created_by
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX idx_group_booking_master_created_by ON group_booking_master (created_by)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX idx_group_booking_master_created_by ON group_booking_master
    `);

    await queryRunner.query(`
      ALTER TABLE group_booking_master
      DROP FOREIGN KEY fk_group_booking_master_created_by
    `);

    await queryRunner.query(`
      ALTER TABLE group_booking_master
      DROP COLUMN created_by
    `);
  }
}
