import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPinelabCustomerIdsToIoms1782500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ioms
        ADD COLUMN referee_pinelab_customer_id VARCHAR(100) NULL
        AFTER brokerage_adj_non_loyalty
    `);

    await queryRunner.query(`
      ALTER TABLE ioms
        ADD COLUMN referrer_pinelab_customer_id VARCHAR(100) NULL
        AFTER referee_pinelab_customer_id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ioms
        DROP COLUMN referrer_pinelab_customer_id
    `);

    await queryRunner.query(`
      ALTER TABLE ioms
        DROP COLUMN referee_pinelab_customer_id
    `);
  }
}
