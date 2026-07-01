import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSignedOfflineEmailTemplate1773903093057 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        UPDATE email_templates
        SET 
          body = '<p>Dear {NAME},</p>
  
  <p>
  The <strong>Booking Form has been successfully submitted and signed</strong> by the customer for the below opportunity:
  </p>
  
  <p>
  <strong>Customer Name:</strong> {CUSTOMER_NAME}<br>
  <strong>Enquiry Ref ID:</strong> {ENQUIRY_ID}<br>
  <strong>Unit:</strong> {UNIT_NUMBER}<br>
  <strong>Source:</strong> {SOURCE}
  {SIGNATURE_MODE}
  </p>
  
  <p><strong>Action Required:</strong></p>
  
  <p>
  Kindly log in to the RM Panel and complete the <strong>Office Use Section</strong> at the earliest.
  </p>
  
  <p>Please ensure the following details are updated before submission:</p>
  
  <ul>
  {OFFLINE_INSTRUCTIONS_LIST}
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE email_templates
            SET 
              subject = 'Update Office Use Section - {UNIT_NUMBER}',
             body = '<p>Dear <span style="color:#1A407D;font-weight:600">{NAME}</span>,</p>
    
    <p>
    The Booking Application for <strong>{PROJECT_NAME}</strong> 
    (Unit <strong>{UNIT_NUMBER}</strong>, Enquiry <strong>{ENQUIRY_ID}</strong>) 
    has been successfully signed ({SIGNATURE_MODE}).
    </p>
    
    <p style="text-align:center;margin:24px 0">
      <a href="{SIGNED_PDF_URL}" target="_blank" rel="noopener"
        style="background:#1A407D;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block">
        View Signed PDF
      </a>
    </p>
    
    <p><strong>Next steps (Action Required):</strong></p>
    
    <ul>
      <li>
        Please login to the portal and update the <strong>Office Use</strong> section with the required details and documents.
      </li>
      <li>
        Verify that all mandatory fields and attachments are completed.
      </li>
    </ul>
    
    <p style="text-align:center;margin:24px 0">
      <a href="{OFFICE_USE_URL}" target="_blank" rel="noopener"
        style="background:#1A407D;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block">
        Access Office Use Section
      </a>
    </p>
    
    <p>
    Booking Application Form: 
    <a href="{FORM_URL}" target="_blank" rel="noopener">Open Booking Form</a>
    </p>
    
    <p>
    Warm regards,<br>
    Automated Email (Booking Application)
    </p>',
              updated_at = NOW()
            WHERE event = 'get_signed_pdf';
          `);
  }
}
