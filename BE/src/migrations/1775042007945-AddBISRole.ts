import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBISRole1775042007945 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            INSERT INTO roles (name)
            SELECT 'BIS'
            WHERE NOT EXISTS (
                SELECT 1 FROM roles WHERE name = 'BIS'
            );
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DELETE FROM roles WHERE name = 'BIS';
    `);
  }
}
