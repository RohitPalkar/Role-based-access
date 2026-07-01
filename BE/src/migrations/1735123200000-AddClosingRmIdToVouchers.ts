import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClosingRmIdToVouchers1735123200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vouchers
      ADD COLUMN closing_rm_id INT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE vouchers
      ADD CONSTRAINT fk_vouchers_closing_rm
      FOREIGN KEY (closing_rm_id) REFERENCES users(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX idx_vouchers_closing_rm_id ON vouchers (closing_rm_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX idx_vouchers_closing_rm_id ON vouchers
    `);

    await queryRunner.query(`
      ALTER TABLE vouchers
      DROP FOREIGN KEY fk_vouchers_closing_rm
    `);

    await queryRunner.query(`
      ALTER TABLE vouchers
      DROP COLUMN closing_rm_id
    `);
  }
}
