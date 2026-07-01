import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveTlIdAndRshIdFromProjects1773909000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE projects
      DROP FOREIGN KEY fk_projects_ph_tl,
      DROP FOREIGN KEY fk_projects_rsh,
      DROP COLUMN tl_id,
      DROP COLUMN rsh_id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE projects
      ADD COLUMN tl_id INT NULL,
      ADD COLUMN rsh_id INT NULL,
      ADD CONSTRAINT fk_projects_ph_tl
        FOREIGN KEY (tl_id) REFERENCES users(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
      ADD CONSTRAINT fk_projects_rsh
        FOREIGN KEY (rsh_id) REFERENCES users(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
    `);
  }
}
