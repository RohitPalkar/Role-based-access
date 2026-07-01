import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the columns the CRM Edit IOM API depends on:
 *
 *   - `ioms.referral_points_adjustment FLOAT NULL`
 *       New CRM-editable field per the locked spec. Defaults to 0 so
 *       existing rows have a sensible value and downstream math doesn't
 *       break (`referrer_points + adjustment` style additions).
 *
 *   - `projects.max_brokerage_percentage DECIMAL(5,2) NOT NULL DEFAULT 5.00`
 *       Per-project ceiling used by the edit validation chain
 *       (`brokerage_percentage <= project.max_brokerage_percentage`).
 *       Backfilled to 5.00% which is the org-wide default; specific
 *       projects can be tuned via admin tooling later.
 *
 *   - `iom_history.action VARCHAR(50) NULL`
 *       First-class action label (e.g. `CRM_EDIT`) so audit queries
 *       don't have to grep `remarks`. Nullable to preserve existing
 *       rows; new writes will always populate it.
 */
export class ExtendForCrmEdit1780669500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`ioms\`
        ADD COLUMN \`referral_points_adjustment\` FLOAT NULL DEFAULT 0
        AFTER \`referee_points\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`projects\`
        ADD COLUMN \`max_brokerage_percentage\` DECIMAL(5,2) NOT NULL
        DEFAULT 5.00
    `);

    await queryRunner.query(`
      ALTER TABLE \`iom_history\`
        ADD COLUMN \`action\` VARCHAR(50) NULL AFTER \`changed_by\`,
        ADD INDEX \`idx_iom_history_action\` (\`action\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`iom_history\`
        DROP INDEX \`idx_iom_history_action\`,
        DROP COLUMN \`action\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`projects\` DROP COLUMN \`max_brokerage_percentage\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`ioms\` DROP COLUMN \`referral_points_adjustment\`
    `);
  }
}
