import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVenueFieldsToEoiCampaign1779343159629 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE eoi_campaigns
            ADD COLUMN venue_name TEXT NULL,
            ADD COLUMN venue_map_link TEXT NULL,
            ADD COLUMN agreement_doc_link TEXT NULL
          `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE eoi_campaigns
        DROP COLUMN agreement_doc_link,,
        DROP COLUMN venue_map_link,
        DROP COLUMN venue_name
      `);
  }
}
