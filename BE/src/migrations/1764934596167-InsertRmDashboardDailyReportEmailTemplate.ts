import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertRmDashboardDailyReportEmailTemplate1764934596167 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO email_templates (event, subject, body, layout, isActive, created_at, updated_at)
      VALUES (
        'rm_dashboard_daily_report',
        'Daily Report - {CAMPAIGN_NAME}',
        '<table border="1" cellpadding="4" cellspacing="0" width="100%" style="width:100%; table-layout:auto; border-collapse:collapse; font-size:11px;">

  <!-- Title -->
  <tr bgcolor="#3b78d8">
    <td colspan="5"><font color="#ffffff"><b>Daily Report</b></font></td>
  </tr>
  <tr bgcolor="#fff28a">
    <td colspan="5"><font color="#000000"><b>Summary</b></font></td>
  </tr>

  <!-- Summary heading + big value cell + three small value cells aligned to the right -->
  <tr bgcolor="">
    <!-- Big value cell (matches screenshot: "5 Units - EOI Collected") -->
    <td colspan="2"><b>{VOUCHERS_COLLECTED} Units - EOI Collected</b></td>

    <!-- Small numeric cells -->
    <td colspan="1" style="width:15%;"><b>{VALUE_OF_EOIS}</b></td>
    <td colspan="1" style="width:15%;"><b>{EOI_AMOUNT_COLLECTED}</b></td>
    <td colspan="1" style="width:10%;"><b>{CANCELLATIONS_REFUNDS}</b></td>
  </tr>

  <!-- Row below: left big cell aligns under the big value cell; the 3 small labels align under the 3 numeric cells -->
  <tr>
    <!-- This big cell spans the summary label + big-value area so text sits under them -->
    <td colspan="2">{VOUCHERS_SHARED} Shared | {VOUCHERS_IN_PROGRESS} in progress</td>

    <!-- These three cells are labels under 25L / 23L / 0 respectively -->
    <td style="width:15%; font-size:10px;">Value of EOIs</td>
    <td style="width:15%; font-size:10px;">EOI amount collected</td>
    <td style="width:10%; font-size:10px;">Cancellations &amp; Refunds</td>
  </tr>

  <!-- spacer -->
  <tr><td colspan="5" height="8"></td></tr>

  <!-- Source wise split (left) and BHK wise split (right) headers -->
  <tr bgcolor="#fff28a">
    <td colspan="2"><b>Source wise split</b></td>
    <td colspan="3"><b>BHK wise Split</b></td>
  </tr>

{SOURCE_AND_BHK_ROWS}
  <!-- spacer -->
  <tr><td colspan="5" height="8"></td></tr>

  <!-- EOI Status (left) and Department wise pending (right) headers -->
  <tr bgcolor="#fff28a">
    <td colspan="2"><b>EOI Status</b></td>
    <td colspan="3"><b>Department wise Pending EOIs</b></td>
  </tr>

  <tr>
    <td>EOIs Collected</td>
    <td>{EOIS_COLLECTED}</td>
    <td colspan="2">RM Pending</td>
    <td>{RM_PENDING}</td>
  </tr>

  <tr>
    <td>QIDs assigned</td>
    <td>{QIDS_ASSIGNED}</td>
    <td colspan="2">MIS Pending</td>
    <td>{MIS_PENDING}</td>
  </tr>

  <tr>
    <td>Active EOIs</td>
    <td>{ACTIVE_EOIS}</td>
    <td colspan="2">CRM Pending</td>
    <td>{CRM_PENDING}</td>
  </tr>

  <tr>
    <td>Pending Reconciliation</td>
    <td>{PENDING_RECONCILIATION}</td>

    <td colspan="2">Finance Pending</td>
    <td>{FINANCE_PENDING}</td>
  </tr>

  <!-- spacer -->
  <tr><td colspan="5" height="8"></td></tr>

  <!-- Daily Tracker header -->
  <tr bgcolor="#fff28a">
    <td style="width:20%; font-size:10px;"><b>Daily Tracker</b></td>
    <td style="width:20%; font-size:10px;"><b>EOI Links shared</b></td>
    <td style="width:20%; font-size:10px;"><b>Forms submitted</b></td>
    <td style="width:20%; font-size:10px;"><b>QIDs assigned</b></td>
    <td style="width:20%; font-size:10px;"><b>New CP links created</b></td>
  </tr>

{DAILY_TRACKER_ROWS}
</table>',
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
      WHERE event = 'rm_dashboard_daily_report';
    `);
  }
}
