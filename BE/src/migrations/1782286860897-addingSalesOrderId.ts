import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSalesOrderIdToIoms1750850000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ioms
      ADD COLUMN sales_order_id VARCHAR(50) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ioms
      DROP COLUMN sales_order_id
    `);
  }
}
