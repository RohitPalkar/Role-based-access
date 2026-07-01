import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateCountryMaster1758787948282 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'country_master',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'iso_code', type: 'varchar', length: '3', isNullable: false },
          {
            name: 'country_name',
            type: 'varchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'country_code',
            type: 'varchar',
            length: '16',
            isNullable: false,
          },
          {
            name: 'created_by',
            type: 'varchar',
            length: '64',
            isNullable: false,
            default: `'system'`,
          },
          {
            name: 'updated_by',
            type: 'varchar',
            length: '64',
            isNullable: false,
            default: `'system'`,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('country_master');
  }
}
