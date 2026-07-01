import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReceiptUploadEmailTemplate1775626661683 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(` 
        INSERT INTO email_templates (event, subject, body, layout, isActive, created_at, updated_at)
        VALUES (
  'receipt_upload',
  'Payment Receipt Acknowledgement - Purva Voucher',
  '<p><strong>Dear {CUSTOMER_NAME},</strong></p>

<p><strong>Warm Greetings from Puravankara!</strong></p>

<p>
We acknowledge the receipt of payment made towards Purva Voucher.
</p>

<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; text-align: left;">
  <tr>
    <th>S.no</th>
    <th>Transaction Mode</th>
    <th>Transaction ID / Cheque No</th>
    <th>Transaction Date</th>
    <th>Amount</th>
    <th>Receipt Link</th>
  </tr>
   {TRANSACTION_ROWS}
</table>

<p>
{Your Purva {TYPE} Number : <strong>{EOI_ID}</strong>}
</p>

<p>
Kindly quote this number in all future communications related to your voucher.
</p>

<p>
We request you to kindly refer to and keep in mind the <strong>Terms &amp; Conditions</strong> mentioned in the attached Purva Voucher.
</p>

<p>
We look forward to assisting you throughout your journey with Puravankara.
</p>

<p>
Warm regards,<br>
<strong>Team Puravankara</strong>
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
            WHERE event = 'receipt_upload';
          `);
  }
}
