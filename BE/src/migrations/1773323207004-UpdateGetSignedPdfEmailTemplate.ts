import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateGetSignedPdfEmailTemplate1773323207004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE email_templates
            SET 
              subject = 'Update Office Use Section - Unit {UNIT_NUMBER}',
              body = '<p>Dear {NAME},</p>
      
      <p>
      The <strong>Booking Form has been successfully submitted and signed</strong> by the customer for the below opportunity:
      </p>
      
      <p>
      <strong>Customer Name:</strong> {CUSTOMER_NAME}<br>
      <strong>Enquiry Ref ID:</strong> {ENQUIRY_ID}<br>
      <strong>Unit:</strong> {UNIT_NUMBER}<br>
      <strong>Source:</strong> {SOURCE}
      </p>
      
      <p><strong>Action Required:</strong></p>
      
      <p>
      Kindly log in to the RM Panel and complete the <strong>Office Use Section</strong> at the earliest.
      </p>
      
      <p>Please ensure the following details are updated before submission:</p>
      
      <ul>
      <li>Sales Information (Closing &amp; Sourcing Details)</li>
      <li>Upload any additional required documents (if applicable)</li>
      {CHANNEL_PARTNER_DETAILS}
      {REFERRER_DETAILS}
      {REMARKS_DETAILS}
      </ul>
      
      <p>
      <strong>Link:</strong>
      <a href="{OFFICE_USE_URL}" target="_blank" rel="noopener">
      {OFFICE_USE_URL}
      </a>
      </p>
      
      <p>
      <strong>Referral Form Link:</strong>
      <a href="{REFERRAL_FORM_URL}" target="_blank" rel="noopener">
      {REFERRAL_FORM_URL}
      </a>
      </p>
      
      <p>
      Timely submission of the Office Use section will help avoid delays in file login.
      </p>
      
      <p>
      Please proceed at the earliest.
      </p>
      
      <p>
      Regards,<br>
      Team Puravankara
      </p>',
              updated_at = NOW()
            WHERE event = 'get_signed_pdf';
          `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        UPDATE email_templates
        SET 
          subject = 'Update Office Use Section - {UNIT_NUMBER}',
          body = '<p>Dear {NAME},</p>
  <p>
  The <strong>Booking Form has been successfully submitted and signed</strong> by the customer for the below opportunity:
  </p>
  <p>
  <strong>Customer Name:</strong> {CUSTOMER_NAME}<br>
  <strong>Enquiry Ref ID:</strong> {ENQUIRY_ID}<br>
  <strong>Unit:</strong> {UNIT_NUMBER}<br>
  <strong>Source:</strong> {SOURCE}
  </p>
  <p><strong>Action Required:</strong></p>
  
  <p>
  Kindly log in to the RM Panel and complete the <strong>Office Use Section</strong> at the earliest.
  </p>
  
  <p>Please ensure the following details are updated before submission:</p>
  
  <ul>
  <li>Sales Information (Closing &amp; Sourcing Details)</li>
  <li>Upload any additional required documents (if applicable)</li>
  {CHANNEL_PARTNER_DETAILS}
  {REFERRER_DETAILS}
  <li>RM Remarks (if any)</li>
  </ul>
  
  <p>
  <strong>Link:</strong>
  <a href="{OFFICE_USE_URL}" target="_blank" rel="noopener">
  {OFFICE_USE_URL}
  </a>
  </p>
  
  {REFERRAL_FORM_URL}
  
  <p>
  Timely submission of the Office Use section will help avoid delays in file login.
  </p>
  
  <p>
  Please proceed at the earliest.
  </p>
  
  <p>
  Regards,<br>
 Team Puravankara
  </p>',
          updated_at = NOW()
        WHERE event = 'get_signed_pdf';
      `);
  }
}
