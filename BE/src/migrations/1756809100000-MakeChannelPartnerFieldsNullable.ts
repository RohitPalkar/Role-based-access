import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeChannelPartnerFieldsNullable1756809100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE channel_partners
      MODIFY COLUMN email VARCHAR(100) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE channel_partners
      MODIFY COLUMN contact_number VARCHAR(10) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE channel_partners
      MODIFY COLUMN address TEXT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE channel_partners
      MODIFY COLUMN email VARCHAR(100) NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE channel_partners
      MODIFY COLUMN contact_number VARCHAR(10) NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE channel_partners
      MODIFY COLUMN address TEXT NOT NULL
    `);
  }
}
