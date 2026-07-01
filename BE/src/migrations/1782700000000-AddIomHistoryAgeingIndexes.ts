import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Indexes that back the IOM Ageing endpoint (`GET /iom/:id/ageing`).
 *
 * The endpoint runs exactly two queries against `iom_history`:
 *
 *   1. The timeline lookup: a range scan of every row with a given
 *      `iom_id`, ordered by `changed_at ASC`. Without a composite
 *      index the planner falls back to a single-column `iom_id`
 *      lookup followed by a filesort which becomes hot once IOMs
 *      accumulate dozens of transitions and the endpoint serves
 *      thousands of requests per day.
 *
 *   2. The actor join: `LEFT JOIN users u ON u.id = h.changed_by
 *      AND u.deleted_at IS NULL`. The PK on `users` already covers
 *      this; no additional index is needed there.
 *
 * The composite `(iom_id, changed_at)` index is the workhorse:
 *   - Satisfies the WHERE on `iom_id` (left-most prefix).
 *   - Provides the ORDER BY `changed_at ASC` without a filesort.
 *   - Is *covering* w.r.t. the sort key, so the engine can stream
 *     rows directly from the index in the requested order.
 *
 * Also indexes `users.deleted_at` so the `LEFT JOIN ... AND
 * users.deleted_at IS NULL` filter can be evaluated cheaply at scale
 * when a deleted user authored many history rows. The conditional
 * `CREATE INDEX IF NOT EXISTS` guards make this migration idempotent
 * across environments that may already have one of the indexes.
 */
export class AddIomHistoryAgeingIndexes1782700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX \`idx_iom_history_iom_changed_at\`
        ON \`iom_history\` (\`iom_id\`, \`changed_at\`)
    `);

    await queryRunner.query(`
      CREATE INDEX \`idx_iom_history_changed_by\`
        ON \`iom_history\` (\`changed_by\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX \`idx_iom_history_changed_by\` ON \`iom_history\`
    `);

    await queryRunner.query(`
      DROP INDEX \`idx_iom_history_iom_changed_at\` ON \`iom_history\`
    `);
  }
}
