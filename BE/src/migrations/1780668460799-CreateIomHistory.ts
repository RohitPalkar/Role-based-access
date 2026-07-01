import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIomHistory1780668460799 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE iom_history (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            iom_id BIGINT NOT NULL,
            from_status_id BIGINT NULL,
            to_status_id BIGINT NOT NULL,
            changed_by BIGINT NOT NULL,
            remarks TEXT NULL,
            prev_value JSON NULL,
            updated_value JSON NULL,
            changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            CONSTRAINT fk_history_iom
            FOREIGN KEY (iom_id) REFERENCES ioms(id),
            CONSTRAINT fk_history_to_status
            FOREIGN KEY (to_status_id) REFERENCES iom_statuses(id)
        ) ENGINE=InnoDB;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE iom_history`);
  }
}
