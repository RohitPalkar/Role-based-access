import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBatchManagerEntities1778400003000 implements MigrationInterface {
  name = 'CreateBatchManagerEntities1778400003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /**
     * eoi_batches
     */
    await queryRunner.query(`
      CREATE TABLE \`eoi_batches\` (
        \`id\` varchar(36) NOT NULL,
        \`campaign_id\` int NULL,
        \`name\` varchar(255) NOT NULL,
        \`stage\` varchar(50) NOT NULL,
        \`residential_status\` varchar(50) NOT NULL,
        \`slot_duration\` int NOT NULL,
        \`capacity_per_slot\` int NOT NULL,
        \`total_users\` int NOT NULL,
        \`open_batch_before\` int NULL,
        \`status\` varchar(30) NOT NULL DEFAULT 'ACTIVE',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`start_date\` datetime(6) NULL,
        \`end_date\` datetime(6) NULL,
        \`notify_at\` datetime(6) NULL,
        \`is_notified\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`preference_ids\` JSON NOT NULL,
        \`typology\` JSON NOT NULL,
        \`is_user_mapped\` BOOLEAN NOT NULL DEFAULT FALSE,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      ALTER TABLE \`eoi_batches\`
      ADD CONSTRAINT \`UQ_EOI_BATCHES_NAME_DELETED_AT\`
      UNIQUE (\`name\`,\`deleted_at\`)
    `);

    /**
     * eoi_batch_days
     */
    await queryRunner.query(`
      CREATE TABLE \`eoi_batch_days\` (
        \`id\` varchar(36) NOT NULL,
        \`batch_id\` varchar(36) NOT NULL,
        \`date\` date NOT NULL,
        \`start_time\` varchar(5) NOT NULL,
        \`end_time\` varchar(5) NOT NULL,
        \`deleted_at\` datetime(6) NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      ALTER TABLE \`eoi_batch_days\`
      ADD CONSTRAINT \`FK_EOI_BATCH_DAYS_BATCH_ID\`
      FOREIGN KEY (\`batch_id\`)
      REFERENCES \`eoi_batches\`(\`id\`)
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX \`IDX_BATCH_DAYS_BATCH_ID_DATE\`
      ON \`eoi_batch_days\`
      (\`batch_id\`, \`date\`)
    `);

    /**
     * eoi_batch_slots
     */
    await queryRunner.query(`
      CREATE TABLE \`eoi_batch_slots\` (
        \`id\` varchar(36) NOT NULL,
        \`name\` varchar(50) NOT NULL,
        \`batch_id\` varchar(36) NOT NULL,
        \`date\` date NOT NULL,
        \`sequence\` int NOT NULL,
        \`start_time\` varchar(5) NOT NULL,
        \`end_time\` varchar(5) NOT NULL,
        \`duration\` int NOT NULL,
        \`filled_count\` int NOT NULL DEFAULT 0,
        \`capacity\` int NOT NULL,
        \`status\` varchar(30) NOT NULL DEFAULT 'LOCKED',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      ALTER TABLE \`eoi_batch_slots\`
      ADD CONSTRAINT \`FK_EOI_BATCH_SLOTS_BATCH_ID\`
      FOREIGN KEY (\`batch_id\`)
      REFERENCES \`eoi_batches\`(\`id\`)
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX \`IDX_BATCH_SLOTS_BATCH_ID_DATE_SEQ\`
      ON \`eoi_batch_slots\`
      (\`batch_id\`, \`date\`, \`sequence\`)
    `);

    /**
     * eoi_batch_vouchers
     */
    await queryRunner.query(`
      CREATE TABLE \`eoi_batch_vouchers\` (
        \`id\` varchar(36) NOT NULL,
        \`batch_id\` varchar(36) NOT NULL,
        \`slot_id\` varchar(36) NOT NULL,
        \`voucher_id\` int NOT NULL,
        \`stage\` varchar(50) NOT NULL,
        \`status\` enum(
         'Mapped',
         'Invited',
         'Attended',
         'Agreement Signed',
         'Booked'
        )  NULL ,
        \`customer_name\` varchar(255) NULL,
        \`email\` varchar(255) NULL,
        \`phone\` varchar(20) NULL,
        \`comments\` text NULL,
        \`assigned_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      ALTER TABLE \`eoi_batch_vouchers\`
      ADD CONSTRAINT \`FK_BATCH_VOUCHERS_BATCH_ID\`
      FOREIGN KEY (\`batch_id\`)
      REFERENCES \`eoi_batches\`(\`id\`)
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE \`eoi_batch_vouchers\`
      ADD CONSTRAINT \`FK_BATCH_VOUCHERS_SLOT_ID\`
      FOREIGN KEY (\`slot_id\`)
      REFERENCES \`eoi_batch_slots\`(\`id\`)
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE \`eoi_batch_vouchers\`
      ADD CONSTRAINT \`FK_BATCH_VOUCHERS_VOUCHER_ID\`
      FOREIGN KEY (\`voucher_id\`)
      REFERENCES \`vouchers\`(\`id\`)
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);

    /**
     * Prevent same voucher
     * from participating twice
     * in same stage.
     */
    await queryRunner.query(`
      CREATE UNIQUE INDEX \`IDX_BATCH_VOUCHERS_VOUCHER_STAGE\`
      ON \`eoi_batch_vouchers\`
      (\`voucher_id\`, \`stage\`)
    `);

    /**
     * Optimized lookup index
     * for slot occupancy/statistics.
     */
    await queryRunner.query(`
      CREATE INDEX \`IDX_BATCH_VOUCHERS_BATCH_SLOT\`
      ON \`eoi_batch_vouchers\`
      (\`batch_id\`, \`slot_id\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    /**
     * eoi_batch_vouchers
     */
    await queryRunner.query(`
      DROP INDEX \`IDX_BATCH_VOUCHERS_BATCH_SLOT\`
      ON \`eoi_batch_vouchers\`
    `);

    await queryRunner.query(`
      DROP INDEX \`IDX_BATCH_VOUCHERS_VOUCHER_STAGE\`
      ON \`eoi_batch_vouchers\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`eoi_batch_vouchers\`
      DROP FOREIGN KEY \`FK_BATCH_VOUCHERS_SLOT_ID\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`eoi_batch_vouchers\`
      DROP FOREIGN KEY \`FK_BATCH_VOUCHERS_BATCH_ID\`
    `);

    await queryRunner.query(`
      DROP TABLE \`eoi_batch_vouchers\`
    `);

    /**
     * eoi_batch_slots
     */
    await queryRunner.query(`
      DROP INDEX \`IDX_BATCH_SLOTS_BATCH_ID_DATE_SEQ\`
      ON \`eoi_batch_slots\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`eoi_batch_slots\`
      DROP FOREIGN KEY \`FK_EOI_BATCH_SLOTS_BATCH_ID\`
    `);

    await queryRunner.query(`
      DROP TABLE \`eoi_batch_slots\`
    `);

    /**
     * eoi_batch_days
     */
    await queryRunner.query(`
      DROP INDEX \`IDX_BATCH_DAYS_BATCH_ID_DATE\`
      ON \`eoi_batch_days\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`eoi_batch_days\`
      DROP FOREIGN KEY \`FK_EOI_BATCH_DAYS_BATCH_ID\`
    `);

    await queryRunner.query(`
      DROP TABLE \`eoi_batch_days\`
    `);

    /**
     * eoi_batches
     */
    await queryRunner.query(`
      ALTER TABLE \`eoi_batches\`
      DROP INDEX \`UQ_EOI_BATCHES_NAME\`
    `);

    await queryRunner.query(`
      DROP TABLE \`eoi_batches\`
    `);
  }
}
