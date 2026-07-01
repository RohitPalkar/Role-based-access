import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVoucherUnitMappings1771398471193 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`voucher_unit_mappings\` (
        \`id\` CHAR(36) NOT NULL,
        \`voucher_id\` INT NOT NULL,
        \`source\` VARCHAR(50) NOT NULL,
        \`sfdc_tower_id\` VARCHAR(100) NOT NULL,
        \`tower_name\` VARCHAR(255) NOT NULL,
        \`floor\` INT NOT NULL,
        \`inventory_unit_id\` CHAR(36) NULL,
        \`sfdc_unit_id\` VARCHAR(100) NULL,
        \`unit_number\` VARCHAR(100) NOT NULL,
        \`configuration\` VARCHAR(50) NULL,
        \`facing\` VARCHAR(100) NULL,
        \`area_sba\` DECIMAL(10,2) NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_voucher_id\` (\`voucher_id\`),
        INDEX \`idx_unit_number\` (\`unit_number\`),
        INDEX \`idx_sfdc_tower_id\` (\`sfdc_tower_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE \`voucher_unit_mappings\`;
    `);
  }
}
