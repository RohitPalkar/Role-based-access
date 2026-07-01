import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKeyAndSaltInProjectTerms1769598825640 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE project_terms
      ADD COLUMN brand_id INT NOT NULL,
      ADD COLUMN sub_merchant_id VARCHAR(255) NULL,
      ADD COLUMN easebuzz_key VARCHAR(255) NULL AFTER sub_merchant_id,
      ADD COLUMN easebuzz_salt VARCHAR(255) NULL AFTER easebuzz_key;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE project_terms
      DROP COLUMN brand_id,
      DROP COLUMN sub_merchant_id,
      DROP COLUMN easebuzz_key,
      DROP COLUMN easebuzz_salt;
    `);
  }
}
