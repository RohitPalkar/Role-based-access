import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertDevelopmentAndInventoryToManyToMany1761653004000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create junction table for development types
    await queryRunner.query(`
      CREATE TABLE eoi_campaign_development_types (
        campaign_id INT NOT NULL,
        development_type_id INT NOT NULL,
        PRIMARY KEY (campaign_id, development_type_id),
        CONSTRAINT fk_eoi_campaign_dev_types_campaign
          FOREIGN KEY (campaign_id) REFERENCES eoi_campaigns(id) ON DELETE CASCADE,
        CONSTRAINT fk_eoi_campaign_dev_types_dev_type
          FOREIGN KEY (development_type_id) REFERENCES development_types(id) ON DELETE CASCADE
      )
    `);

    // Create junction table for inventory types
    await queryRunner.query(`
      CREATE TABLE eoi_campaign_inventory_types (
        campaign_id INT NOT NULL,
        inventory_type_id INT NOT NULL,
        PRIMARY KEY (campaign_id, inventory_type_id),
        CONSTRAINT fk_eoi_campaign_inv_types_campaign
          FOREIGN KEY (campaign_id) REFERENCES eoi_campaigns(id) ON DELETE CASCADE,
        CONSTRAINT fk_eoi_campaign_inv_types_inv_type
          FOREIGN KEY (inventory_type_id) REFERENCES inventory_types(id) ON DELETE CASCADE
      )
    `);

    // Migrate existing development type data to junction table
    await queryRunner.query(`
      INSERT INTO eoi_campaign_development_types (campaign_id, development_type_id)
      SELECT id, development_type_id
      FROM eoi_campaigns
      WHERE development_type_id IS NOT NULL
    `);

    // Migrate existing inventory type data to junction table
    await queryRunner.query(`
      INSERT INTO eoi_campaign_inventory_types (campaign_id, inventory_type_id)
      SELECT id, inventory_type_id
      FROM eoi_campaigns
      WHERE inventory_type_id IS NOT NULL
    `);

    // Drop old columns (no foreign key constraints exist for these columns)
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      DROP COLUMN development_type_id
    `);

    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      DROP COLUMN inventory_type_id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back old columns
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      ADD COLUMN development_type_id INT NULL AFTER brand_id
    `);

    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      ADD COLUMN inventory_type_id INT NULL AFTER development_type_id
    `);

    // Restore data from junction tables (taking the first entry for each campaign)
    await queryRunner.query(`
      UPDATE eoi_campaigns ec
      INNER JOIN (
        SELECT campaign_id, MIN(development_type_id) as development_type_id
        FROM eoi_campaign_development_types
        GROUP BY campaign_id
      ) ecdt ON ec.id = ecdt.campaign_id
      SET ec.development_type_id = ecdt.development_type_id
    `);

    await queryRunner.query(`
      UPDATE eoi_campaigns ec
      INNER JOIN (
        SELECT campaign_id, MIN(inventory_type_id) as inventory_type_id
        FROM eoi_campaign_inventory_types
        GROUP BY campaign_id
      ) ecit ON ec.id = ecit.campaign_id
      SET ec.inventory_type_id = ecit.inventory_type_id
    `);

    // Drop junction tables (no foreign key constraints to restore)
    await queryRunner.query(`DROP TABLE eoi_campaign_inventory_types`);
    await queryRunner.query(`DROP TABLE eoi_campaign_development_types`);
  }
}
