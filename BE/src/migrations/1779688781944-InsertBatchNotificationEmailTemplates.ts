import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertBatchNotificationEmailTemplates1779688781944 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        INSERT INTO email_templates (
          event,
          subject,
          body,
          layout,
          isActive,
          created_at,
          updated_at
        )
        VALUES (
          'batch_cancellation_notification',
          'Important Update Regarding Your {EVENT_TYPE} Batch',
          '<p>
            Dear 
            <span style="font-weight:600">{CUSTOMER_NAME}</span>,
          </p>
  
          <p>
            Greetings from Puravankara Limited.
          </p>
  
          <p>
            We regret to inform you that the scheduled batch for the 
            <strong>{EVENT_TYPE}</strong> of 
            <strong>{PROJECT_NAME}</strong> has been cancelled due to operational reasons.
          </p>
  
          <p style="margin-top:20px;font-size:16px;font-weight:600;">
            Cancelled Batch Details
          </p>
  
          <ul style="padding-left:20px;line-height:1.8;">
            <li>
              <strong>Batch No:</strong> {BATCH_NUMBER}
            </li>
  
            <li>
              <strong>Batch Date & Time:</strong> {BATCH_DATE_TIME}
            </li>
          </ul>
  
          <p>
            Our team is currently working on rescheduling your participation and the updated batch details will be communicated to you shortly through email.
          </p>
  
          <p>
            We sincerely regret the inconvenience caused and appreciate your patience and understanding.
          </p>
  
          <p>
            For any immediate assistance, please feel free to reach out to your Relationship Manager.
          </p>
  
          <p>
            Warm Regards,<br/>
            Team Puravankara
          </p>',
          'default',
          TRUE,
          NOW(),
          NOW()
        ),
        (
        'batch_move_notification',
        'Revised Batch Details for {EVENT_TYPE} – {PROJECT_NAME}',
        '<p>
          Dear 
          <span style="font-weight:600">{CUSTOMER_NAME}</span>,
        </p>

        <p>
          Greetings from Puravankara Limited.
        </p>

        <p>
          We would like to inform you that your scheduled slot for the 
          <strong>{EVENT_TYPE}</strong> of 
          <strong>{PROJECT_NAME}</strong> has been revised.
        </p>

        <p style="margin-top:20px;">
          <strong>PRID:</strong> {PRID}
        </p>

        {EOIID}

        <p style="margin-top:20px;">
          Kindly find the updated batch details below:
        </p>

        <p style="margin-top:20px;font-size:16px;font-weight:600;">
          Updated Batch Details
        </p>

        <ul style="padding-left:20px;line-height:1.8;">
          <li>
            <strong>Batch No:</strong> {BATCH_NUMBER}
          </li>

          <li>
            <strong>Batch Date & Time:</strong> {BATCH_DATE_TIME}
          </li>
        </ul>

        <p>
          <strong>Venue:</strong> {VENUE_NAME}
        </p>

        {LOCATION_LINK}

         <p>We request you to kindly make note of the revised schedule and plan your visit accordingly.</p>

        <p>
          Thank you for your understanding and continued trust in Puravankara Limited.
        </p>

        <p>
          We look forward to welcoming you to the launch event.
        </p>

        <p>
          Warm Regards,<br/>
          Team Puravankara
        </p>',
        'default',
        TRUE,
        NOW(),
        NOW()
        ),
        (
  'unit_allotment_invitation',
  'Invitation to the Preferential Allotment – {PROJECT_NAME}',
  '<p>
    Dear 
    <span style="font-weight:600">{CUSTOMER_NAME}</span>,
  </p>

  <p>
    Greetings from Puravankara Limited.
  </p>

  <p>
    We are delighted to invite you to the Preferential Allotment event of 
    <strong>{PROJECT_NAME}</strong>.
  </p>

  <p>
    Kindly find below the batch details and important information to help ensure a smooth and seamless experience during the event.
  </p>

  <p style="margin-top:24px;">
    <strong>PRID:</strong> {PRID}
  </p>

  {EOIID}
 
  <p style="margin-top:20px;font-size:16px;font-weight:600;">
    Batch Details
  </p>

  <ul style="padding-left:20px; margin:12px 0; line-height:1.8;">
    <li>
      <strong>Batch No:</strong> {BATCH_NUMBER}
    </li>

    <li>
      <strong>Batch Date & Time:</strong> {BATCH_DATE_TIME}
    </li>
  </ul>

  <p>
    <strong>Venue:</strong> {VENUE_NAME}
  </p>

  {LOCATION_LINK}

  <p>
    Thank you for your continued trust in Puravankara Limited.
  </p>

  <p>
    We look forward to welcoming you and making this a memorable experience for you and your family.
  </p>

  <p>
    Warm regards,<br>
    <strong>Team Puravankara</strong>
  </p>',
  'default',
  TRUE,
  NOW(),
  NOW()
),
(
  'launch_event_invitation',
  'Invitation to the Launch Event – {PROJECT_NAME}',
  '<p>
    Dear 
    <span style="font-weight:600;">{CUSTOMER_NAME}</span>,
  </p>

  <p>
    Greetings from Puravankara Limited.
  </p>

  <p>
    We are delighted to invite you to the exclusive launch event of 
    <strong>{PROJECT_NAME}</strong>.
  </p>

  <p>
    Kindly find below the batch details and important information to help ensure a smooth and seamless experience during the event.
  </p>

  <p style="margin-top:20px;font-size:16px;font-weight:600;">
    Batch Details
  </p>

  <ul style="padding-left:20px;line-height:1.8;">
    <li>
      <strong>Batch No:</strong> {BATCH_NUMBER}
    </li>

    <li>
      <strong>Batch Date & Time:</strong> {BATCH_DATE_TIME}
    </li>
  </ul>

  <p>
    <strong>Venue:</strong> {VENUE_NAME}
  </p>

  {LOCATION_LINK}

  <p style="margin-top:24px;font-size:16px;font-weight:600;">
    Additional Information
  </p>

  <p>
    <strong>Agreement Draft</strong>
  </p>

  <p>
    Please find the draft copy of the Agreement below. We request you to review the same and reach out to us in case of any queries or clarifications.
  </p>

{AGREEMENT_DRAFT_LINK}

  <p style="margin-top:20px;">
    <strong>Applicant Details Update</strong>
  </p>

  <p>
    In case you have not yet completed adding applicant details, we request you to update the same prior to the event for a hassle-free booking process.
    <em>(Please ignore if already completed.)</em>
  </p>

  {APPLICANT_DETAILS_LINK}
  <p style="margin-top:24px;font-size:16px;font-weight:600;">
    Launch Day Agenda
  </p>

  <p>
    <strong>Registration Desk</strong>
  </p>

  <p>
    Customers are requested to complete their registration using the QR code available at the registration desk.
  </p>

  <p>
    <strong>Sales Desk</strong>
  </p>

  <p>
    Our sales team will assist you with:
  </p>

  <ul style="padding-left:20px;line-height:1.8;">
    {SHOW_UNIT_SHORTLISTING}
    <li>Payment of agreement value</li>
    <li>Booking confirmation process</li>
  </ul>

  <p>
    <strong>CRM Desk</strong>
  </p>

  <ul style="padding-left:20px;line-height:1.8;">
    <li>Agreement Signing Process</li>
  </ul>

  <p style="margin-top:24px;font-size:16px;font-weight:600;">
    Important Instructions
  </p>

  <p>
    <strong>1. Add Puravankara Bank Account as Beneficiary</strong>
  </p>

  <ul style="padding-left:18px;">
    <li>
      In case the agreement amount will be paid through Net Banking or Bank Transfer, kindly add our bank account as a beneficiary in advance to ensure a smooth transaction process during the event.
    </li>
  </ul>

<p><strong>Company Bank Account Details</strong></p>

<table 
  style="
    width:100%;
    border-collapse:collapse;
    margin-top:10px;
    font-size:14px;
  "
>
  <tr>
    <td 
      style="
        border:1px solid #ddd;
        padding:10px;
        font-weight:600;
        background:#f7f7f7;
        width:35%;
      "
    >
      Account Holder Name
    </td>

    <td style="border:1px solid #ddd;padding:10px;">
      {ACCOUNT_NAME}
    </td>
  </tr>

  <tr>
    <td 
      style="
        border:1px solid #ddd;
        padding:10px;
        font-weight:600;
        background:#f7f7f7;
      "
    >
      Bank Name
    </td>

    <td style="border:1px solid #ddd;padding:10px;">
      {BANK_NAME}
    </td>
  </tr>

  <tr>
    <td 
      style="
        border:1px solid #ddd;
        padding:10px;
        font-weight:600;
        background:#f7f7f7;
      "
    >
      Account Number
    </td>

    <td style="border:1px solid #ddd;padding:10px;">
      {ACCOUNT_NUMBER}
    </td>
  </tr>

  <tr>
    <td 
      style="
        border:1px solid #ddd;
        padding:10px;
        font-weight:600;
        background:#f7f7f7;
      "
    >
      IFSC Code
    </td>

    <td style="border:1px solid #ddd;padding:10px;">
      {IFSC_CODE}
    </td>
  </tr>
</table>

  <ul style="padding-left:18px;">
    <li>
      If the payment is being made through Debit Card or Credit Card, we request you to increase your transaction limit in advance to facilitate hassle-free payment at the event.
    </li>
  </ul>

  <p style="margin-top:20px;">
    <strong>2. Booking Terms & Conditions</strong>
  </p>

  <p>
    Please find the Terms & Conditions for booking with Puravankara below. Kindly review the same and reach out to us in case of any queries.
  </p>

  <p>
    <a 
      href="{TERMS_AND_CONDITIONS_LINK}" 
      target="_blank"
      style="font-weight:600;text-decoration:underline;color:#1A73E8;"
    >
      View Terms & Conditions
    </a>
  </p>

  <p style="margin-top:24px;">
    <strong>3. Mandatory Documents</strong>
  </p>

  <p>
    Please carry physical copies of the following documents for all applicants:
  </p>

  <ul style="padding-left:20px;line-height:1.8;">
    <li>Aadhaar Card</li>
    <li>PAN Card</li>
    <li>Passport (For NRI applicants)</li>
    <li>Recent Passport size Photo of the applicants</li>
  </ul>

  <p>
    Thank you for your continued trust in Puravankara Limited.
  </p>

  <p>
    We look forward to welcoming you and making this launch event a memorable experience for you and your family.
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
            WHERE event IN (
        'batch_cancellation_notification',
        'batch_move_notification',
        'unit_allotment_invitation
        );
        `);
  }
}
