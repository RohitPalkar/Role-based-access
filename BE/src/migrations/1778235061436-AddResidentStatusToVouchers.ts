import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResidentStatusToVouchers1778235061436 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vouchers 
      ADD COLUMN resident_status VARCHAR(50) NULL
    `);

    await queryRunner.query(`
     UPDATE vouchers
   SET resident_status = JSON_UNQUOTE(
  JSON_EXTRACT(
    applicant1,
    '$.personalDetails.residentStatus'
  )
)
WHERE applicant1 IS NOT NULL
AND JSON_EXTRACT(
  applicant1,
  '$.personalDetails.residentStatus'
) IS NOT NULL
AND JSON_UNQUOTE(
  JSON_EXTRACT(
    applicant1,
    '$.personalDetails.residentStatus'
  )
) != 'null'
AND TRIM(
  JSON_UNQUOTE(
    JSON_EXTRACT(
      applicant1,
      '$.personalDetails.residentStatus'
    )
  )
) != '';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vouchers 
      DROP COLUMN resident_status
    `);
  }
}
