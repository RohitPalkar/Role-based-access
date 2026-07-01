import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserAvailability1781264100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE user_availability (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        unavailable_from DATETIME NOT NULL COMMENT 'Unavailability start time',
        unavailable_to DATETIME NOT NULL COMMENT 'Unavailability end time',
        marked_by INT NOT NULL COMMENT 'User who marked this unavailability',
        reason VARCHAR(255) NULL COMMENT 'Optional reason for unavailability',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_user_availability_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_availability_marked_by
          FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE RESTRICT,
        INDEX idx_user_availability_user (user_id),
        INDEX idx_user_availability_window (user_id, unavailable_from, unavailable_to)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE user_availability`);
  }
}
