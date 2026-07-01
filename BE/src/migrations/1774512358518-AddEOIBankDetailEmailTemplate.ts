import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEOIBankDetailEmailTemplate1774512358518 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        INSERT INTO email_templates 
       (event, subject, body, layout, isActive, created_at, updated_at)
        VALUES (
          'eoi_bank_detail_email',
          'Bank Account Details to buy Purva Voucher',
         '<p>Dear Customer</p>

    <p>Greetings from <strong>Puravankara Limited.</strong></p>

    <p>
      As part of your voucher buying journey, please find below the <strong>bank account details</strong>
      for making the payment or adding us as a beneficiary:
    </p>

    <p><strong>Company Bank Account Details</strong></p>

    <ul style="padding-left: 18px;">
      <li><strong>Account Holder Name:</strong> {ACCOUNT_NAME}</li>
      <li><strong>Bank Name:</strong> {BANK_NAME}</li>
      <li><strong>Account Number:</strong> {ACCOUNT_NUMBER}</li>
      <li><strong>IFSC Code:</strong> {IFSC_CODE}</li>
      <li><strong>SWIFT Code:</strong> {SWIFT_CODE}</li>
    </ul>

    <p style="margin-top: 16px;">
      Kindly ensure the above mentioned <strong>details are used while adding us as a beneficiary.</strong>
    </p>

    <p>
      Once the payment is completed, we request you to share the <strong>transaction details or payment proof</strong>
      with your Relationship Manager for confirmation.
    </p>

    <p>
      In case you need any assistance, please feel free to reach out to us.
    </p>

    <p>
      Warm regards,<br>
      <strong>Team Puravankara Limited</strong>
    </p>',
       'default',
        TRUE,
        NOW(),
        NOW()
        );
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DELETE FROM email_templates
            WHERE event = 'eoi_bank_detail_email';
          `);
  }
}
