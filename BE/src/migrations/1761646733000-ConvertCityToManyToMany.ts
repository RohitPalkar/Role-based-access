import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertCityToManyToMany1761646733000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create junction table for eoi_campaign_cities
    await queryRunner.query(`
      CREATE TABLE eoi_campaign_cities (
        campaign_id INT NOT NULL,
        city_id INT NOT NULL,
        PRIMARY KEY (campaign_id, city_id),
        CONSTRAINT fk_eoi_campaign_cities_campaign
          FOREIGN KEY (campaign_id) REFERENCES eoi_campaigns(id) ON DELETE CASCADE,
        CONSTRAINT fk_eoi_campaign_cities_city
          FOREIGN KEY (city_id) REFERENCES city_master(id) ON DELETE CASCADE
      );
    `);

    // 2. Drop the foreign key constraint for city_id
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      DROP FOREIGN KEY fk_eoi_campaigns_city;
    `);

    // 3. Drop the city_id column
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      DROP COLUMN city_id;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Add back the city_id column
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      ADD COLUMN city_id INT NOT NULL AFTER brand_id;
    `);

    // 2. Add back the foreign key constraint
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      ADD CONSTRAINT fk_eoi_campaigns_city
      FOREIGN KEY (city_id) REFERENCES city_master(id) ON DELETE RESTRICT;
    `);

    // 3. Drop the junction table
    await queryRunner.query(`
      DROP TABLE eoi_campaign_cities;
    `);
  }
}
