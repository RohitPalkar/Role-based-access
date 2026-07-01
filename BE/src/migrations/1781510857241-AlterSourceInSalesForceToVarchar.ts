import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterSourceInSalesForceToVarchar1781510857241 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE ioms
                MODIFY COLUMN source_in_sales_force VARCHAR(50) NOT NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE ioms
            MODIFY COLUMN source_in_sales_force TINYINT(1) NOT NULL DEFAULT 0
        `);
  }
}
