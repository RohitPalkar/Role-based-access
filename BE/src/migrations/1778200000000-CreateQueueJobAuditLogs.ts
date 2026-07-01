import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Generic append-only audit for BullMQ (or other) background jobs — any queue name / module.
 */
export class CreateQueueJobAuditLogs1778200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE queue_job_audit_logs (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        queue_name VARCHAR(128) NOT NULL,
        job_id VARCHAR(128) NOT NULL,
        job_name VARCHAR(128) NULL,
        source_module VARCHAR(128) NULL,
        event VARCHAR(32) NOT NULL,
        summary TEXT NULL,
        context JSON NULL,
        triggered_by_user_id INT UNSIGNED NULL,
        created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        KEY idx_queue_job_audit_queue_job (queue_name, job_id),
        KEY idx_queue_job_audit_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS queue_job_audit_logs`);
  }
}
