import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateInventoryStatusBasedOnMapping1774958024376 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Blocked + mapped = Blocked by RM
    await queryRunner.query(`
        UPDATE project_inventory_units
        SET status = 'Blocked by RM'
        WHERE status = 'Blocked'
        AND is_mapped = true;
      `);

    // Blocked + not mapped = Blocked by Management
    await queryRunner.query(`
        UPDATE project_inventory_units
        SET status = 'Blocked by Management'
        WHERE status = 'Blocked'
        AND is_mapped = false;
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE project_inventory_units
            SET status = 'Blocked'
            WHERE status IN ('Blocked by RM', 'Blocked by Management');
          `);
  }
}
