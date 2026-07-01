import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeGroupBookingMappings1770286000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Create the new group_booking_mappings table
    await queryRunner.query(`
      CREATE TABLE group_booking_mappings (
        id CHAR(36) NOT NULL PRIMARY KEY,
        group_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
        opportunity_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_deleted TINYINT(1) NOT NULL DEFAULT 0,
        INDEX idx_group_id (group_id),
        INDEX idx_opportunity_id (opportunity_id),
        INDEX idx_group_id_deleted (group_id, is_deleted),
        INDEX idx_opportunity_id_deleted (opportunity_id, is_deleted),
        FOREIGN KEY (group_id) REFERENCES group_booking_master(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    // Step 2: Migrate existing data from JSON column to the new table
    await queryRunner.query(`
      INSERT INTO group_booking_mappings (id, group_id, opportunity_id, created_at, updated_at, is_deleted)
      SELECT 
        UUID() as id,
        gbm.id as group_id,
        JSON_UNQUOTE(JSON_EXTRACT(gbm.grouped_oppo_id, CONCAT('$[', idx.n, ']'))) as opportunity_id,
        gbm.created_at,
        gbm.updated_at,
        gbm.is_deleted
      FROM group_booking_master gbm
      CROSS JOIN (
        SELECT 0 as n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL
        SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL
        SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL
        SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15
      ) idx
      WHERE JSON_EXTRACT(gbm.grouped_oppo_id, CONCAT('$[', idx.n, ']')) IS NOT NULL
        AND JSON_EXTRACT(gbm.grouped_oppo_id, CONCAT('$[', idx.n, ']')) != 'null'
        AND gbm.is_deleted = 0;
    `);

    // Step 3: Drop the JSON column from group_booking_master
    await queryRunner.query(`
      ALTER TABLE group_booking_master
      DROP COLUMN grouped_oppo_id;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add back the JSON column
    await queryRunner.query(`
      ALTER TABLE group_booking_master
      ADD COLUMN grouped_oppo_id JSON NULL;
    `);

    // Step 2: Migrate data back from mappings table to JSON column
    await queryRunner.query(`
      UPDATE group_booking_master gbm
      SET grouped_oppo_id = (
        SELECT JSON_ARRAYAGG(gbm2.opportunity_id)
        FROM group_booking_mappings gbm2
        WHERE gbm2.group_id = gbm.id
          AND gbm2.is_deleted = 0
      )
      WHERE EXISTS (
        SELECT 1 FROM group_booking_mappings gbm2
        WHERE gbm2.group_id = gbm.id
      );
    `);

    // Step 3: Drop the mappings table
    await queryRunner.query(`
      DROP TABLE IF EXISTS group_booking_mappings;
    `);
  }
}
