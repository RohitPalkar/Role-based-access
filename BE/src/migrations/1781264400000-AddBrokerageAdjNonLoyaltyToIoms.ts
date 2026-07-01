import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBrokerageAdjNonLoyaltyToIoms1781264400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ioms
        ADD COLUMN brokerage_adj_non_loyalty TINYINT DEFAULT 0
        AFTER brokerage_percentage_edited_at
    `);

    await queryRunner.query(`
      ALTER TABLE ioms
        MODIFY COLUMN created_by BIGINT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ioms
        DROP COLUMN brokerage_adj_non_loyalty
    `);

    await queryRunner.query(`
      ALTER TABLE ioms
        MODIFY COLUMN created_by BIGINT NOT NULL
    `);
  }
}
