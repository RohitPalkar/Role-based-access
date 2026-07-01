import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentTransactions1723968000000 implements MigrationInterface {
  name = 'CreatePaymentTransactions1723968000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`payment_transactions\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`entityType\` VARCHAR(50) NOT NULL,
        \`entityId\` INT NOT NULL,
        \`orderId\` VARCHAR(100) NOT NULL,
        \`gatewayOrderId\` VARCHAR(100) NULL,
        \`gatewayPaymentId\` VARCHAR(100) NULL,
        \`gatewaySignature\` VARCHAR(100) NULL,
        \`method\` VARCHAR(50) NULL,
        \`amount\` DECIMAL(10,2) NOT NULL,
        \`currency\` VARCHAR(3) NOT NULL DEFAULT 'INR',
        \`status\` ENUM('pending', 'success', 'failed', 'refunded', 'disputed') NOT NULL DEFAULT 'pending',
        \`gatewayName\` VARCHAR(50) NOT NULL,
        \`metadata\` JSON NULL,
        \`notes\` JSON NULL,
        \`userId\` INT NULL,
        \`createdAt\` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_payment_orderId\` (\`orderId\`)
      ) ENGINE=InnoDB;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`payment_transactions\``);
  }
}
