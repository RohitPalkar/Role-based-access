import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extends the `ioms` table created in CreateIoms1780668175687 with everything the
 * CRM IOM scope needs:
 *
 * - `project_id` (so CRM-project scoping can be enforced without a 3-table join)
 * - `version` for TypeORM optimistic locking
 * - `updated_at` / `updated_by` audit columns
 * - `deleted_at` soft-delete + `is_active` generated column (the latter is NULL
 *    for soft-deleted rows so the composite unique `(booking_id, is_active)`
 *    permits multiple closed IOMs against the same booking while preventing
 *    more than one *active* IOM)
 * - FKs to `incentive_bookings(id)` and `projects(id)`
 *
 * `ioms.booking_id` is declared BIGINT but `incentive_bookings.id` is INT.
 * MySQL requires FK columns to be of identical type, so we narrow
 * `booking_id` to INT in the same migration. Safe because the column is
 * brand-new (no production data yet).
 */
export class ExtendIomsForCrmScope1780669000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`ioms\` MODIFY COLUMN \`booking_id\` INT NOT NULL`,
    );

    await queryRunner.query(`
      ALTER TABLE \`ioms\`
        ADD COLUMN \`project_id\` INT NULL AFTER \`booking_id\`,
        ADD COLUMN \`version\` INT NOT NULL DEFAULT 0,
        ADD COLUMN \`updated_at\` TIMESTAMP NULL DEFAULT NULL
          ON UPDATE CURRENT_TIMESTAMP,
        ADD COLUMN \`updated_by\` BIGINT NULL,
        ADD COLUMN \`deleted_at\` TIMESTAMP NULL DEFAULT NULL,
        ADD COLUMN \`is_active\` TINYINT GENERATED ALWAYS AS
          (CASE WHEN \`deleted_at\` IS NULL THEN 1 ELSE NULL END) STORED
    `);

    await queryRunner.query(`
      ALTER TABLE \`ioms\`
        ADD UNIQUE INDEX \`uq_ioms_active_booking\` (\`booking_id\`, \`is_active\`),
        ADD INDEX \`idx_ioms_project\` (\`project_id\`),
        ADD INDEX \`idx_ioms_status\` (\`status_id\`),
        ADD INDEX \`idx_ioms_deleted_at\` (\`deleted_at\`)
    `);

    await queryRunner.query(`
      ALTER TABLE \`ioms\`
        ADD CONSTRAINT \`fk_ioms_booking\`
          FOREIGN KEY (\`booking_id\`) REFERENCES \`incentive_bookings\`(\`id\`)
          ON DELETE RESTRICT ON UPDATE CASCADE,
        ADD CONSTRAINT \`fk_ioms_project\`
          FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`)
          ON DELETE RESTRICT ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`ioms\` DROP FOREIGN KEY \`fk_ioms_project\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`ioms\` DROP FOREIGN KEY \`fk_ioms_booking\``,
    );

    await queryRunner.query(
      `ALTER TABLE \`ioms\` DROP INDEX \`uq_ioms_active_booking\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`ioms\` DROP INDEX \`idx_ioms_project\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`ioms\` DROP INDEX \`idx_ioms_status\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`ioms\` DROP INDEX \`idx_ioms_deleted_at\``,
    );

    await queryRunner.query(`
      ALTER TABLE \`ioms\`
        DROP COLUMN \`is_active\`,
        DROP COLUMN \`deleted_at\`,
        DROP COLUMN \`updated_by\`,
        DROP COLUMN \`updated_at\`,
        DROP COLUMN \`version\`,
        DROP COLUMN \`project_id\`
    `);

    await queryRunner.query(
      `ALTER TABLE \`ioms\` MODIFY COLUMN \`booking_id\` BIGINT NOT NULL`,
    );
  }
}
