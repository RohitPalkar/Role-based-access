import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangePhaseToJsonArrayInEoiCampaigns1771419882353 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Convert ENUM to VARCHAR(255) to allow data manipulation
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      MODIFY COLUMN phase VARCHAR(255) NOT NULL
    `);

    // Step 2: Update existing data: convert single enum values to JSON array strings
    await queryRunner.query(`
      UPDATE eoi_campaigns
      SET phase = CASE
        WHEN phase = 'VOUCHER' THEN '["VOUCHER"]'
        WHEN phase = 'EOI' THEN '["EOI"]'
        ELSE '["VOUCHER"]'
      END
    `);

    // Step 3: Convert VARCHAR(255) to JSON type
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      MODIFY COLUMN phase JSON NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Convert JSON to VARCHAR(255) (MySQL will convert JSON to its string representation)
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      MODIFY COLUMN phase VARCHAR(255) NOT NULL
    `);

    // Step 2: Extract first element from JSON array string and convert to enum value
    // The phase column now contains JSON strings like '["VOUCHER"]' or '["EOI"]'
    // We'll use JSON functions by casting back to JSON temporarily, or use string parsing
    await queryRunner.query(`
      UPDATE eoi_campaigns
      SET phase = CASE
        WHEN JSON_UNQUOTE(JSON_EXTRACT(CAST(phase AS JSON), '$[0]')) = 'VOUCHER' THEN 'VOUCHER'
        WHEN JSON_UNQUOTE(JSON_EXTRACT(CAST(phase AS JSON), '$[0]')) = 'EOI' THEN 'EOI'
        ELSE 'VOUCHER'
      END
    `);

    // Step 3: Change column back to enum
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      MODIFY COLUMN phase ENUM('VOUCHER', 'EOI') NOT NULL DEFAULT 'VOUCHER'
    `);
  }
}
