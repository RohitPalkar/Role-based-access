import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSeriesColumnToProjectInventoryUnits1773734649321 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE project_inventory_units
      ADD COLUMN series VARCHAR(100) NULL AFTER unit_number
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE project_inventory_units
      DROP COLUMN series
    `);
  }
}
