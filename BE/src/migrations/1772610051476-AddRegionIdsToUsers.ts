import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRegionIdsToUsers1772610051476 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD region_ids json NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN region_ids`);
  }
}
