import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVoucherPaymentsTable1757054718543 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE voucher_payments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            voucher_id INT NOT NULL,
            paid_amount DECIMAL(12,2) NOT NULL,
            payment_mode ENUM('Offline', 'Gateway') NOT NULL,
            date TIMESTAMP NOT NULL,
            status ENUM('Unverified', 'Verified', 'Rejected', 'Refunded', 'Disputed', 'Reversed') NOT NULL,
            payment_details JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_voucher FOREIGN KEY (voucher_id) REFERENCES vouchers (id) ON DELETE CASCADE
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS voucher_payments;
    `);
  }
}
