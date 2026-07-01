import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBookingPaymentsTable1758179558409 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE booking_payments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            booking_id INT NOT NULL,
            opportunity_id VARCHAR(50) NOT NULL,
            paid_amount DECIMAL(15,2) NOT NULL,
            payment_mode ENUM('Offline', 'Gateway') NOT NULL,
            payment_date TIMESTAMP NOT NULL,
            status ENUM('Unverified','Verified','Rejected','Refunded','Reversed') NOT NULL,
            payment_details JSON,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE,

            -- Indexes
            INDEX idx_booking_id (booking_id)
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS booking_payments;
    `);
  }
}
