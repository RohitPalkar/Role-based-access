import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateVoucherSubmittedEmailTemplate1763362688674 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE email_templates
      SET body = '<p>Dear {CUSTOMER_NAME},</p>
        <p>Thank you for submitting your Purva Voucher and Expressing the Interest for Puravankara Group Projects.</p>
        <p>We have successfully received your details.</p>
        <p>{QUEUE_ID_MESSAGE}</p>
        <p>To keep you informed every step of the way, we''ve created a dedicated page for your Voucher. Here, you can track the real-time status of your end-to-end journey with us.</p>
        <p><a href="{CUSTOMER_PAGE_LINK}" style="color: #0066cc; text-decoration: underline;">Access your page here</a></p>
        <p>You can log in at any time with a simple OTP verification sent to your email ID to view the latest updates.</p>
        <p>If you have any questions, please contact your Relationship Manager</p>
        <p>We appreciate your partnership.</p>
        <p>Warmly,<br>The Puravankara Team</p>',
        updated_at = NOW()
      WHERE event = 'voucher_submitted';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE email_templates
      SET body = '<p>Dear {CUSTOMER_NAME},</p>
        <p>Thank you for submitting your Purva Voucher and Expressing the Interest for Puravankara Group Projects.</p>
        <p>We have successfully received your details.</p>
        <p>{QUEUE_ID_MESSAGE}</p>
        <p>To keep you informed every step of the way, we''ve created a dedicated page for your Voucher. Here, you can track the real-time status of your end-to-end journey with us.</p>
        <p>Access your page here: <a href="{CUSTOMER_PAGE_LINK}">{CUSTOMER_PAGE_LINK}</a></p>
        <p>You can log in at any time with a simple OTP verification sent to your email ID to view the latest updates.</p>
        <p>If you have any questions, please contact your Relationship Manager</p>
        <p>We appreciate your partnership.</p>
        <p>Warmly,<br>The Puravankara Team</p>',
        updated_at = NOW()
      WHERE event = 'voucher_submitted';
    `);
  }
}
