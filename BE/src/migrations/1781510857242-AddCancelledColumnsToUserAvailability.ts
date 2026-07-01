import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCancelledColumnsToUserAvailability1781510857242 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_availability
        ADD COLUMN cancelled_at DATETIME NULL COMMENT 'When a future window was soft-cancelled',
        ADD COLUMN cancelled_by INT NULL COMMENT 'TL who soft-cancelled the window',
        ADD CONSTRAINT fk_user_availability_cancelled_by
          FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_availability
        DROP FOREIGN KEY fk_user_availability_cancelled_by,
        DROP COLUMN cancelled_by,
        DROP COLUMN cancelled_at
    `);
  }
}
