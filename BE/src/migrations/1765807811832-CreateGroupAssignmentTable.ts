import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGroupAssignmentTable1765807811832 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS \`user_group_assignments\` (
            \`id\` INT NOT NULL AUTO_INCREMENT,

            \`user_id\` INT NOT NULL,
            \`group_id\` INT NOT NULL,

            \`start_date\` DATETIME(6) NOT NULL,
            \`end_date\` DATETIME(6) DEFAULT NULL,

            \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,

            \`is_deleted\` TINYINT(1) NOT NULL DEFAULT 0,
            \`deleted_at\` DATETIME(6) DEFAULT NULL,

            \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
            ON UPDATE CURRENT_TIMESTAMP(6),

            PRIMARY KEY (\`id\`),

            INDEX \`idx_uga_user_id\` (\`user_id\`),
            INDEX \`idx_uga_group_id\` (\`group_id\`),
            INDEX \`idx_uga_user_dates\` (\`user_id\`, \`start_date\`, \`end_date\`),

            CONSTRAINT \`fk_uga_user\`
            FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`)
            ON DELETE CASCADE,

            CONSTRAINT \`fk_uga_group\`
            FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`)
            ON DELETE CASCADE
        ) ENGINE=InnoDB
        DEFAULT CHARSET=utf8mb4
        COLLATE=utf8mb4_0900_ai_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TABLE IF EXISTS \`user_group_assignments\`;
    `);
  }
}
