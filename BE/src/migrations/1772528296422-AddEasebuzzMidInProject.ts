import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEasebuzzMidInProject1772528296422 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE projects
            ADD COLUMN easebuzz_booking_mid VARCHAR(255) NULL,
            ADD COLUMN easebuzz_milestone_mid VARCHAR(255) NULL,
            ADD COLUMN tl_id INT NULL,
            ADD COLUMN rsh_id INT NULL,
            ADD COLUMN easebuzz_booking_salt VARCHAR(255) NULL AFTER rsh_id,
            ADD COLUMN easebuzz_booking_key VARCHAR(255) NULL AFTER easebuzz_booking_salt,
            ADD COLUMN easebuzz_milestone_salt VARCHAR(255) NULL AFTER easebuzz_booking_key,
            ADD COLUMN easebuzz_milestone_key VARCHAR(255) NULL AFTER easebuzz_milestone_salt,
            ADD CONSTRAINT fk_projects_ph_tl
            FOREIGN KEY (tl_id) REFERENCES users(id)
            ON DELETE SET NULL
            ON UPDATE CASCADE,
            ADD CONSTRAINT fk_projects_rsh
            FOREIGN KEY (rsh_id) REFERENCES users(id)
            ON DELETE SET NULL
            ON UPDATE CASCADE;
          `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE projects
        DROP FOREIGN KEY fk_projects_ph_tl,
        DROP FOREIGN KEY fk_projects_rsh,
        DROP COLUMN easebuzz_booking_mid,
        DROP COLUMN easebuzz_milestone_mid,
        DROP COLUMN tl_id,
        DROP COLUMN rsh_id,
        DROP COLUMN easebuzz_booking_salt,
        DROP COLUMN easebuzz_booking_key,
        DROP COLUMN easebuzz_milestone_salt,
        DROP COLUMN easebuzz_milestone_key;
      `);
  }
}
