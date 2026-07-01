import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApprovalStatusEmailTemplate1777011874581 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            INSERT INTO email_templates (event, subject, body, layout, isActive, created_at, updated_at)
            VALUES (
              'unit_mapping_approval_request_bh',
              'Unit allotment Approval Request for {PRID}',
              '  <p>Dear {APPROVER_NAME},</p>

  <p>
    A request has been raised to <strong>map a unit to a customer by bypassing the minimum threshold amount
      condition</strong>.
  </p>

  <p><strong>Request Details:</strong></p>

  <table border="1" style="border-collapse: collapse;">
    <tr>
      <td><strong>Campaign/Project Name</strong></td>
      <td>{PROJECT_NAME}</td>
    </tr>
    <tr>
      <td><strong>Customer Name</strong></td>
      <td>{CUSTOMER_NAME}</td>
    </tr>
    <tr>
      <td><strong>PRID</strong></td>
      <td>{PRID}</td>
    </tr>
    <tr>
      <td><strong>Unit Details</strong></td>
      <td>{UNIT_NUMBER} | {TOWER}</td>
    </tr>
    <tr>
      <td><strong>Typology</strong></td>
      <td>{TYPOLOGY}</td>
    </tr>
    <tr>
      <td><strong>Preferential Amount Payable</strong></td>
      <td>₹{AMOUNT_PAYABLE}</td>
    </tr>
    <tr>
      <td><strong>Defined Threshold Amount</strong></td>
      <td>₹{THRESHOLD_AMOUNT}</td>
    </tr>
    <tr>
      <td><strong>Total Amount Paid</strong></td>
      <td>₹{AMOUNT_PAID}</td>
    </tr>
    <tr>
      <td><strong>Closing RM</strong></td>
      <td>{RM_NAME}</td>
    </tr>
  </table>

 <p><strong>Transaction Details:</strong></p>
  <table border="1" style="border-collapse: collapse;">
    <tr>
      <td width="100px"><strong>Date</strong></td>
      <td width="100px"><strong>Amount</strong></td>
      <td width="120px"><strong>Method</strong></td>
      <td width="100px"><strong>Status</strong></td>
    </tr>
    {TX_ROWS}
  </table>
  <p><strong>Action Required:</strong></p>

  <p>
    Please review the request and choose one of the following actions:
  </p>

  <p>
    <a href="{APPROVE_LINK}"><span style="text-align:center;margin:24px 0"><span
          style="background:#1A407D;color:#fff;padding:12px 24px;font-size:18px;font-weight:bold;border-radius:8px;display:inline-block;letter-spacing:2px">Approve</span></span></a>
    <a href="{REJECT_LINK}"><span style="text-align:center;margin:24px 0"><span
          style="background:#da3d38;color:#fff;padding:12px 24px;font-size:18px;font-weight:bold;border-radius:8px;display:inline-block;letter-spacing:2px">Reject</span></span></a>
  </p>
  <p>
    Kindly take action at the earliest to avoid delays in unit allocation.
  </p>

  <p>
    Regards,
    <br>
    <strong>Team Puravankara</strong>
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

    // 🔹 2. Approval Status (Approved / Rejected)
    await queryRunner.query(`
        INSERT INTO email_templates (event, subject, body, layout, isActive, created_at, updated_at)
        VALUES (
          'unit_mapping_approve_reject',
          'Unit Mapping Request {STATUS} for {PRID}',
          '<p>Dear {RM_NAME},</p>

    <p>
    The approval request for unit mapping has been <strong>{STATUS}</strong>.
    </p>

    <p><strong>Details:</strong></p>

    <ul>
    <li><strong>PRID:</strong> {PRID}</li>
    <li><strong>Customer Name:</strong> {CUSTOMER_NAME}</li>
    <li><strong>Unit:</strong> {UNIT_NUMBER} | {TOWER}</li>
    </ul>
    {REJECTION_BLOCK}

    <p>
    Regards,
    <br>
    <strong>Team Puravankara</strong>
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
            WHERE event IN ('unit_mapping_approval_request_bh', 'unit_mapping_approval_status');
          `);
  }
}
