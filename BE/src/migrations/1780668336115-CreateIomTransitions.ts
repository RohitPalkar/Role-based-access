import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIomTransitions1780668336115 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE iom_transitions (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                from_status_id BIGINT NOT NULL,
                to_status_id BIGINT NOT NULL,
                allowed_role_id BIGINT NOT NULL,

                CONSTRAINT fk_transition_from_status
                FOREIGN KEY (from_status_id) REFERENCES iom_statuses(id),
                CONSTRAINT fk_transition_to_status
                FOREIGN KEY (to_status_id) REFERENCES iom_statuses(id)
            ) ENGINE=InnoDB;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE iom_transitions`);
  }
}
