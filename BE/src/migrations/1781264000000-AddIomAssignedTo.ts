import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIomAssignedTo1781264000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ioms
        ADD COLUMN assigned_to INT NULL,
        ADD COLUMN soruce_insap BIGINT NULL,
        ADD COLUMN source_in_sales_force varchar(255) NOT NULL DEFAULT 0
          COMMENT 'lead originated from which brand',

        ADD COLUMN agreement_date DATE NULL
          COMMENT 'Agreement signed date',

        ADD COLUMN referrer_paid BIGINT NOT NULL DEFAULT 0
          COMMENT 'How much count referrer payed',

        ADD COLUMN referee_paid BIGINT NOT NULL DEFAULT 0
          COMMENT 'How much count referee payed',

        ADD COLUMN brokerage_percentage_edited_by BIGINT NULL
          COMMENT 'User who edited brokerage percentage',

        ADD COLUMN brokerage_percentage_edited_at TIMESTAMP NULL
          COMMENT 'Timestamp when brokerage percentage was edited',

        ADD COLUMN bp_code VARCHAR(50) NULL
          COMMENT 'Business Partner code',

        ADD COLUMN unit_number VARCHAR(50) NULL
          COMMENT 'Unit / flat number',

        ADD INDEX idx_ioms_assigned_to (assigned_to),
        ADD CONSTRAINT fk_ioms_assigned_to
          FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ioms
        DROP FOREIGN KEY fk_ioms_assigned_to,
        DROP INDEX idx_ioms_assigned_to,
        DROP COLUMN assigned_to,
        DROP COLUMN source_in_sales_force,
        DROP COLUMN agreement_date,
        DROP COLUMN referrer_paid,
        DROP COLUMN referee_paid,
        DROP COLUMN brokerage_percentage_edited_by,
        DROP COLUMN brokerage_percentage_edited_at,
        DROP COLUMN bp_code,
        DROP COLUMN unit_number
    `);
  }
}
