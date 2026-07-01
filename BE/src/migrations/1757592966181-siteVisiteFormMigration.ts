import { MigrationInterface, QueryRunner } from 'typeorm';

export class SiteVisiteFormMigration1757592966181 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`site_visit_form\` (
        \`id\` CHAR(36) NOT NULL DEFAULT (UUID()),
        \`project_name\` VARCHAR(255) DEFAULT NULL,
        \`mobile\` VARCHAR(50) NOT NULL,
        \`first_name\` VARCHAR(255) NOT NULL,
        \`last_name\` VARCHAR(255) NOT NULL,
        \`email\` VARCHAR(255) NOT NULL,
        \`residential_address\` TEXT NOT NULL,
        \`occupation\` VARCHAR(255) NOT NULL,
        \`company_name\` VARCHAR(255) DEFAULT NULL,
        \`designation\` VARCHAR(255) DEFAULT NULL,
        \`current_accommodation\` VARCHAR(255) DEFAULT NULL,
        \`owned_house_count\` VARCHAR(255) DEFAULT NULL,
        \`purchase_duration\` VARCHAR(255) NOT NULL,
        \`finance_source\` VARCHAR(255) DEFAULT NULL,
        \`residential_status\` VARCHAR(255) DEFAULT NULL,
        \`gender\` VARCHAR(255) DEFAULT NULL,
        \`marital_status\` VARCHAR(255) DEFAULT NULL,
        \`inventory_options\` VARCHAR(255) DEFAULT NULL,
        \`company_address\` TEXT,
        \`purchase_reason\` VARCHAR(255) DEFAULT NULL,
        \`price_range\` VARCHAR(255) DEFAULT NULL,
        \`current_residence_type\` VARCHAR(255) DEFAULT NULL,
        \`alternate_mobile\` VARCHAR(255) DEFAULT NULL,
        \`assigned_rm\` VARCHAR(255) DEFAULT NULL,
        \`assigned_GRE\` BIGINT DEFAULT NULL,
        \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`enquiry_id\` BIGINT NOT NULL,
        \`visit_count\` INT DEFAULT 1,
        \`project_id\` BIGINT DEFAULT NULL,
        \`primary_source\` VARCHAR(45) DEFAULT NULL,
        \`channel_partner\` VARCHAR(255) DEFAULT NULL,
        \`referred_by\` VARCHAR(255) DEFAULT NULL,
        \`ex_project_name\` VARCHAR(45) DEFAULT NULL,
        \`unit_number\` VARCHAR(45) DEFAULT NULL,
        \`head_count\` INT DEFAULT 1,
        \`exit_time\` VARCHAR(45) DEFAULT NULL,
        \`status\` VARCHAR(45) DEFAULT 'Pending',
        \`sourcing_rm\` VARCHAR(255) DEFAULT NULL,
        \`sourcing_rm_name\` VARCHAR(255) DEFAULT NULL,
        \`assigned_rm_name\` VARCHAR(255) DEFAULT NULL,
        \`visit_type\` VARCHAR(45) DEFAULT 'SV',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`enquiry_id_UNIQUE\` (\`enquiry_id\`)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE \`sfdc_project_listing\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`display_name\` VARCHAR(255) NOT NULL,
        \`project_name\` VARCHAR(255) NOT NULL,
        \`inventory_options\` VARCHAR(255) DEFAULT NULL,
        \`brand_name\` VARCHAR(255) DEFAULT NULL,
        \`price_range\` VARCHAR(255) DEFAULT NULL,
        \`is_deleted\` TINYINT(1) DEFAULT 0,
        \`GRE_id\` VARCHAR(45) DEFAULT NULL,
        PRIMARY KEY (\`id\`)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`site_visit_form\`;`);
    await queryRunner.query(`DROP TABLE \`sfdc_project_listing\`;`);
  }
}
