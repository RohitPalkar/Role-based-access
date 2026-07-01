import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIoms1780668175687 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
  CREATE TABLE ioms (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT NOT NULL,

    sale_price DECIMAL(15,2) NOT NULL,
    sale_price_edited BOOLEAN DEFAULT FALSE,
    sale_price_edited_at TIMESTAMP NULL,
    sale_price_edited_by BIGINT NULL,

    customer_mobile VARCHAR(20) NOT NULL,
    customer_details JSON NULL,

    referrer_mobile VARCHAR(20) NULL,
    referrer_details JSON NULL,

    total_brokerage_amount FLOAT NOT NULL,
    brokerage_percentage DECIMAL(5,2) NOT NULL,

    referral_split_type VARCHAR(30) NOT NULL,
    referral_split_ratio JSON NULL,

    referrer_ratio FLOAT NULL,
    referee_ratio FLOAT NULL,

    /* Calculated Allocation */
    referrer_points FLOAT NOT NULL,
    referee_points FLOAT NOT NULL,

    /* Loyalty Execution */
    referrer_points_released FLOAT NULL,
    referee_points_released FLOAT NULL,

    referral_points_edited BOOLEAN DEFAULT FALSE,
    referral_points_edited_at TIMESTAMP NULL,
    referral_points_edited_by BIGINT NULL,
    referral_points_edit_reason VARCHAR(255) NULL,

    loyalty_points_release_type ENUM('ELIGIBLE', 'REDEEMABLE'),

    referral_classification VARCHAR(50) NOT NULL,

    loyalty_details JSON NULL,

    /* Invoice */
    invoice_id BIGINT NULL,

    /* Status & Rejection */
    status_id BIGINT NOT NULL,
    rejection_reason VARCHAR(255) NULL,

    crm_verified_by BIGINT NULL,
    crm_approved_by BIGINT NULL,
    finance_verified_by BIGINT NULL,
    finance_approved_by BIGINT NULL,
    points_allotted_by BIGINT NULL,

    crm_verified_at TIMESTAMP NULL,
    crm_approved_at TIMESTAMP NULL,
    finance_verified_at TIMESTAMP NULL,
    finance_approved_at TIMESTAMP NULL,
    points_allotted_at TIMESTAMP NULL,
    iom_pdf VARCHAR(255) NULL,

    created_by BIGINT NOT NULL,
    submitted_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ioms_status
      FOREIGN KEY (status_id) REFERENCES iom_statuses(id)
  ) ENGINE=InnoDB;
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE ioms`);
  }
}
