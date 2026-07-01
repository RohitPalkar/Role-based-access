import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePinelabCustomers1782600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE pinelab_customers (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        brand_id INT NOT NULL,
        mobile_no VARCHAR(15) NOT NULL,
        pinelab_customer_id VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_pinelab_customers_brand_mobile (brand_id, mobile_no),
        CONSTRAINT fk_pinelab_customers_brand
          FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE RESTRICT
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE pinelab_customers
        DROP FOREIGN KEY fk_pinelab_customers_brand
    `);

    await queryRunner.query(`
      DROP TABLE pinelab_customers
    `);
  }
}
