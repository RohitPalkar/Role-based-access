import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCPTypeColumn1767167231365 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE channel_partners ADD COLUMN cp_type VARCHAR(30) DEFAULT NULL AFTER cp_name;',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE channel_partners DROP COLUMN cp_type;',
    );
  }
}
