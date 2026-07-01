import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClosingRmIdToBookings1758889500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE bookings
      ADD COLUMN closing_rm_id INT NULL
    `);
    await queryRunner.query(`
        ALTER TABLE bookings
      CHANGE COLUMN isAggreedOnTerms is_agreed_on_terms tinyint(1)  DEFAULT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE bookings
      ADD CONSTRAINT fk_bookings_closing_rm
      FOREIGN KEY (closing_rm_id) REFERENCES users(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX idx_bookings_closing_rm_id ON bookings (closing_rm_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX idx_bookings_closing_rm_id ON bookings
    `);

    await queryRunner.query(`
      ALTER TABLE bookings
      DROP FOREIGN KEY fk_bookings_closing_rm
    `);

    await queryRunner.query(`
      ALTER TABLE bookings
      DROP COLUMN closing_rm_id
    `);

    await queryRunner.query(`
      ALTER TABLE bookings
      CHANGE COLUMN is_agreed_on_terms isAgreedOnTerms tinyint(1) NOT NULL DEFAULT 0
    `);
  }
}
