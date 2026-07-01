import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCarpetAreaSqFtAndAgreementValueToInventoryUnits1773748361026 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE project_inventory_units
            ADD COLUMN carpet_area DECIMAL(10,2) DEFAULT NULL,
            ADD COLUMN agreement_value DECIMAL(15,2) DEFAULT NULL;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE project_inventory_units
        DROP COLUMN carpet_area,
        DROP COLUMN agreement_value;
    `);
  }
}
