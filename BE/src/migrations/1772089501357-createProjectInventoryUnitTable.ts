import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProjectInventoryUnitTable1772089501357 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE \`project_inventory_units\` (
          \`id\` CHAR(36) NOT NULL,
          \`campaign_id\` INT NOT NULL,
          \`tower_id\` VARCHAR(100) NOT NULL,
          \`unit_id\` VARCHAR(100) NULL,
          \`tower_name\` VARCHAR(150) NOT NULL,
          \`floor\` VARCHAR(20) NOT NULL,
          \`unit_number\` VARCHAR(150) NOT NULL,
          \`configuration\` VARCHAR(100) NULL,
          \`facing\` VARCHAR(100) NULL,
          \`car_park_type\` VARCHAR(100) NULL,
          \`number_of_car_parks\` INT NULL,
          \`area_sba\` DECIMAL(10,2) NULL,
          \`status\` VARCHAR(50) NOT NULL DEFAULT 'Available',
          \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          \`deleted_at\` TIMESTAMP NULL DEFAULT NULL,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`IDX_campaign_unit_unique\` (\`campaign_id\`, \`unit_number\`),
          INDEX \`IDX_campaign_id\` (\`campaign_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE \`project_inventory_units\`;
        `);
  }
}
