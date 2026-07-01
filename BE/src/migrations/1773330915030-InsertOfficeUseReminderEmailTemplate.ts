import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertOfficeUseReminderEmailTemplate1773330915030 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO email_templates (event, subject, body, layout, isActive, created_at, updated_at)
      VALUES (
        'office_use_reminder',
        'Reminder: Update Office Use Section for Booking Forms',
        '<p>Dear Team,</p>
        
        <p>
        This is a reminder to update and submit the Office Use section for the booking forms listed below. 
        </p>

        <p>
        The Booking Form has already been filled and digitally signed by the customer, and the next step 
        is to complete the Office Use section to proceed further in the booking process.
        </p>
        
        <p><strong>Please find the details of the pending opportunities below:</strong></p>
        
        {BOOKINGS_TABLE}
        
        <p>
        Kindly review the records and update the Office Use section at the earliest using the "Update Now" 
        link provided in the grid.
        </p>

        <p>
        Timely submission will help avoid delays in the downstream processes & Login of the File by CRM.
        </p>
        
        <p>
        Warm Regards,<br/>
        Team Puravankara
        </p>',
        'default',
        TRUE,
        NOW(),
        NOW()
      )
      ON DUPLICATE KEY UPDATE
        subject = VALUES(subject),
        body = VALUES(body),
        updated_at = NOW();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM email_templates
      WHERE event = 'office_use_reminder';
    `);
  }
}
