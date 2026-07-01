import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNewCpNameToChannelPartner1756809000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: rename old `name` → `cp_name`
    await queryRunner.query(`
      ALTER TABLE channel_partners
      CHANGE COLUMN name cp_name VARCHAR(255) NOT NULL;
    `);

    // Step 2: add new `name` column before `email`
    await queryRunner.query(`
      ALTER TABLE channel_partners
      ADD COLUMN name VARCHAR(255) NULL AFTER cp_name;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: drop the new `name` column
    await queryRunner.query(`
      ALTER TABLE channel_partners
      DROP COLUMN name;
    `);

    // Step 2: rename `cp_name` back → `name`
    await queryRunner.query(`
      ALTER TABLE channel_partners
      CHANGE COLUMN cp_name name VARCHAR(255) NULL;
    `);
  }
}
