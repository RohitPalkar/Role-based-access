import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class UpdateEoiCampaignAddInventoryDetails1761741314115 implements MigrationInterface {
  name = 'UpdateEoiCampaignAddInventoryDetails1761741314115';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop old columns if they exist
    const table = await queryRunner.getTable('eoi_campaigns');
    if (table) {
      const hasSbaRange = table.columns.some((c) => c.name === 'sba_range');
      const hasPriceRange = table.columns.some((c) => c.name === 'price_range');

      if (hasSbaRange) {
        await queryRunner.dropColumn('eoi_campaigns', 'sba_range');
      }

      if (hasPriceRange) {
        await queryRunner.dropColumn('eoi_campaigns', 'price_range');
      }
    }

    // Add new JSON column
    await queryRunner.addColumn(
      'eoi_campaigns',
      new TableColumn({
        name: 'inventory_details',
        type: 'json',
        isNullable: true,
        comment:
          'Holds an array of inventory-wise SBA and price details, e.g. [{type:"2 BHK", minSBA:980, maxSBA:1180, minPrice:500000, maxPrice:1000000}]',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('eoi_campaigns', 'inventory_details');

    await queryRunner.addColumns('eoi_campaigns', [
      new TableColumn({
        name: 'sba_range',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'price_range',
        type: 'varchar',
        isNullable: true,
      }),
    ]);
  }
}
