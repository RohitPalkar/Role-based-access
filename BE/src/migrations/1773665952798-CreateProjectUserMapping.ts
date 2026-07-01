import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProjectUserMapping1773665952798 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE project_user_mapping (
        id CHAR(36) NOT NULL,
        project_id INT NOT NULL,
        user_id INT NOT NULL,
        role VARCHAR(50) NOT NULL,
        isPrimary TINYINT(1) NOT NULL DEFAULT 0,
        assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        removed_at TIMESTAMP NULL DEFAULT NULL,

        PRIMARY KEY (id),

        INDEX idx_project_id (project_id),
        INDEX idx_user_id (user_id),
        INDEX idx_role (role),
        INDEX idx_removed_at (removed_at),

        CONSTRAINT fk_project_user_mapping_project
          FOREIGN KEY (project_id)
          REFERENCES projects(id)
          ON DELETE CASCADE,

        CONSTRAINT fk_project_user_mapping_user
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
        ALTER TABLE project_user_mapping
        ADD COLUMN active_flag TINYINT
        AS (CASE WHEN removed_at IS NULL THEN 1 ELSE NULL END) STORED;
    `);

    await queryRunner.query(`
        CREATE UNIQUE INDEX uniq_active_mapping
        ON project_user_mapping (project_id, user_id, role, active_flag);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS project_user_mapping;
    `);
  }
}
