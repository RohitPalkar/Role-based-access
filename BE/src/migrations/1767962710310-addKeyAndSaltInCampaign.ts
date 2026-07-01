import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKeyAndSaltInCampaign1767962710310 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE eoi_campaigns
  ADD COLUMN easebuzz_key VARCHAR(255) NULL AFTER sub_merchant_id,
  ADD COLUMN easebuzz_salt VARCHAR(255) NULL AFTER easebuzz_key;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE eoi_campaigns  DROP COLUMN easebuzz_key,  DROP COLUMN easebuzz_salt;`,
    );
  }
}
