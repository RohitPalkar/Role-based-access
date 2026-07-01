import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBuddyRMsToProjects1774001000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE projects 
      ADD COLUMN buddy_rms JSON NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE projects 
      DROP COLUMN buddy_rms
    `);
  }
}
