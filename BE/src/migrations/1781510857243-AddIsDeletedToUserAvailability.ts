import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsDeletedToUserAvailability1781510857243 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_availability
        ADD COLUMN is_deleted TINYINT NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_availability
        DROP COLUMN is_deleted
    `);
  }
}
