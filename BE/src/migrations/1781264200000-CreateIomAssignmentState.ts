import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIomAssignmentState1781264200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE iom_assignment_state (
        id INT AUTO_INCREMENT PRIMARY KEY,
        last_user_id INT NULL,
        updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_iom_assignment_state_user
          FOREIGN KEY (last_user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      INSERT INTO iom_assignment_state (id, last_user_id) VALUES (1, NULL)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE iom_assignment_state`);
  }
}
