import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUnitNumberUnique1775555718009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE project_inventory_units
            ADD UNIQUE INDEX IDX_unit_number_unique (unit_number)
          `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE project_inventory_units
        DROP INDEX IDX_unit_number_unique
      `);
  }
}
