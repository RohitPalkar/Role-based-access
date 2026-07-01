import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCampaignRelationToInventoryUnits1773292695693 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE project_inventory_units
            ADD CONSTRAINT fk_project_inventory_campaign
            FOREIGN KEY (campaign_id)
            REFERENCES eoi_campaigns(id)
            ON DELETE CASCADE
            ON UPDATE CASCADE
          `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE project_inventory_units
        DROP FOREIGN KEY fk_project_inventory_campaign
      `);
  }
}
