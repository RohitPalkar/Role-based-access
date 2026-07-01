import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRegionTable1765385530969 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // create regions (if not already created)
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS \`regions\` (
            \`id\` INT NOT NULL AUTO_INCREMENT,
            \`name\` VARCHAR(255) NOT NULL UNIQUE,
            \`is_deleted\` TINYINT(1) NOT NULL DEFAULT 0,
            \`deleted_at\` TIMESTAMP NULL DEFAULT NULL,
            \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // add the column (nullable to be safe)
    await queryRunner.query(`
        ALTER TABLE incentive_policies ADD COLUMN region_ids JSON NULL;
    `);

    await queryRunner.query(`
        ALTER TABLE \`city_master\` ADD COLUMN \`region_id\` INT NULL;
    `);

    // create index
    await queryRunner.query(`
        CREATE INDEX \`idx_city_master_region_id\` ON \`city_master\` (\`region_id\`);
    `);

    // add FK (string types must match exactly)
    await queryRunner.query(`
        ALTER TABLE \`city_master\`
        ADD CONSTRAINT \`fk_city_master_region\`
        FOREIGN KEY (\`region_id\`) REFERENCES \`regions\`(\`id\`)
        ON UPDATE CASCADE
        ON DELETE SET NULL;
    `);

    await queryRunner.query(
      'ALTER TABLE incentive_slabs ADD COLUMN launch_min_bookings INT NULL DEFAULT NULL AFTER sustenance_incentive_percentage;',
    );
    await queryRunner.query(
      'ALTER TABLE incentive_slabs ADD COLUMN sustenance_min_bookings INT NULL DEFAULT NULL AFTER `launch_min_bookings`;',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE \`city_master\` DROP FOREIGN KEY \`fk_city_master_region\`;
    `);
    await queryRunner.query(`
        ALTER TABLE incentive_policies DROP COLUMN region_ids;
    `);
    await queryRunner.query(`
        DROP INDEX \`idx_city_master_region_id\` ON \`city_master\`;
    `);
    await queryRunner.query(`
        ALTER TABLE \`city_master\` DROP COLUMN \`region_id\`;
    `);
    await queryRunner.query(`
        DROP TABLE IF EXISTS \`regions\`;
    `);
    await queryRunner.query(
      'ALTER TABLE incentive_slabs DROP COLUMN launch_min_bookings;',
    );
    await queryRunner.query(
      'ALTER TABLE incentive_slabs DROP COLUMN sustenance_min_bookings;',
    );
  }
}
