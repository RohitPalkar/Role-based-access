import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsMappedColumnToInventoryTable1773383394772 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE project_inventory_units
            ADD COLUMN is_mapped TINYINT(1) NOT NULL DEFAULT 0
        `);

    await queryRunner.query(`
          UPDATE project_inventory_units
          SET is_mapped = 1
          WHERE id IN (
            SELECT DISTINCT inventory_unit_id COLLATE utf8mb4_unicode_ci
            FROM voucher_unit_mappings
            WHERE inventory_unit_id IS NOT NULL
          )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE project_inventory_units
        DROP COLUMN is_mapped
    `);
  }
}
