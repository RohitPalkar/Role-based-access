import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChangeSourceToSourceChangeRequests1771605000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE source_change_requests
      ADD COLUMN change_source ENUM('SFDC', 'PRID', 'NONE') NOT NULL DEFAULT 'NONE' AFTER target_enquiry_id;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE source_change_requests
      DROP COLUMN change_source;
    `);
  }
}
