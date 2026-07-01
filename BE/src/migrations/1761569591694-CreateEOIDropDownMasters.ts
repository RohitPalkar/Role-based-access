import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateEOIDropDownMasters1761569591694 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // development_types
    await queryRunner.createTable(
      new Table({
        name: 'development_types',
        engine: 'InnoDB',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'is_deleted',
            type: 'tinyint',
            width: 1,
            isNullable: false,
            default: 0, // false
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

    // inventory_types
    await queryRunner.createTable(
      new Table({
        name: 'inventory_types',
        engine: 'InnoDB',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'is_deleted',
            type: 'tinyint',
            width: 1,
            isNullable: false,
            default: 0, // false
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

    // development_inventory_types (join)
    await queryRunner.createTable(
      new Table({
        name: 'development_inventory_types',
        engine: 'InnoDB',
        columns: [
          {
            name: 'development_type_id',
            type: 'int',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'inventory_type_id',
            type: 'int', // changed from bigint to int
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'sort_order',
            type: 'smallint',
            isNullable: true,
            default: 0,
          },
          {
            name: 'is_active',
            type: 'tinyint',
            width: 1,
            isNullable: true,
            default: 1,
          },
        ],
      }),
      true,
    );

    // KEY `fk_inv` (`inventory_type_id`)
    await queryRunner.createIndex(
      'development_inventory_types',
      new TableIndex({
        name: 'fk_inv',
        columnNames: ['inventory_type_id'],
      }),
    );

    // FKs with RESTRICT
    await queryRunner.createForeignKeys('development_inventory_types', [
      new TableForeignKey({
        name: 'fk_dev',
        columnNames: ['development_type_id'],
        referencedTableName: 'development_types',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'RESTRICT',
      }),
      new TableForeignKey({
        name: 'fk_inv',
        columnNames: ['inventory_type_id'],
        referencedTableName: 'inventory_types',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'RESTRICT',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('development_inventory_types', 'fk_inv');
    await queryRunner.dropForeignKey('development_inventory_types', 'fk_dev');
    await queryRunner.dropIndex('development_inventory_types', 'fk_inv');
    await queryRunner.dropTable('development_inventory_types', true);

    await queryRunner.dropTable('inventory_types', true);
    await queryRunner.dropTable('development_types', true);
  }
}
