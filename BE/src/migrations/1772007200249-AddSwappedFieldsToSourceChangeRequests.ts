import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSwappedFieldsToSourceChangeRequests1772007200249 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE source_change_requests ADD swapped_fields JSON NULL AFTER new_data`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE source_change_requests DROP COLUMN swapped_fields`,
    );
  }
}
