import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seeds the `iom_statuses` master with edit permissions embedded
 * at status level (JSON-based).
 *
 * - `allow_edit`: whether editing is allowed in this status
 * - `allowed_roles`: list of role names allowed to edit
 *
 * Workflow enforcement happens at application level.
 */
const STATUSES: Array<{
  code: string;
  label: string;
  sequence: number;
  allow_edit: boolean;
  allowed_roles: string[] | null;
}> = [
  {
    code: 'IOM_TO_BE_CREATED',
    label: 'IOM To Be Created',
    sequence: 10,
    allow_edit: true,
    allowed_roles: ['CRM'],
  },
  {
    code: 'IOM_CREATED',
    label: 'IOM Created',
    sequence: 20,
    allow_edit: false,
    allowed_roles: null,
  },
  {
    code: 'TL_APPROVED',
    label: 'TL Approved',
    sequence: 30,
    allow_edit: false,
    allowed_roles: null,
  },
  {
    code: 'TL_REJECTED',
    label: 'TL Rejected',
    sequence: 35,
    allow_edit: true,
    allowed_roles: ['CRM'],
  },
  {
    code: 'CRM_HEAD_APPROVED',
    label: 'CRM Head Approved',
    sequence: 40,
    allow_edit: false,
    allowed_roles: null,
  },
  {
    code: 'CRM_HEAD_REJECTED',
    label: 'CRM Head Rejected',
    sequence: 45,
    allow_edit: true,
    allowed_roles: ['CRM'],
  },
  {
    code: 'FINANCE_VERIFICATION_PENDING',
    label: 'Finance Verification Pending',
    sequence: 50,
    allow_edit: true,
    allowed_roles: ['Finance Member'],
  },
  {
    code: 'FINANCE_VERIFIED',
    label: 'Finance Verified',
    sequence: 60,
    allow_edit: false,
    allowed_roles: null,
  },
  {
    code: 'FINANCE_REJECTED',
    label: 'Finance Rejected',
    sequence: 65,
    allow_edit: true,
    allowed_roles: ['CRM'],
  },
  {
    code: 'POINTS_TO_BE_UPLOADED',
    label: 'Points To Be Uploaded',
    sequence: 70,
    allow_edit: true,
    allowed_roles: ['Loyalty'],
  },
  {
    code: 'POINTS_UPLOADED',
    label: 'Points Uploaded',
    sequence: 75,
    allow_edit: false,
    allowed_roles: null,
  },
  {
    code: 'INVOICE_REQUESTED',
    label: 'Invoice Requested From Vendor',
    sequence: 80,
    allow_edit: false,
    allowed_roles: null,
  },
  {
    code: 'INVOICE_SUBMITTED',
    label: 'Invoice Submitted To Finance',
    sequence: 85,
    allow_edit: true,
    allowed_roles: ['Finance Member'],
  },
  {
    code: 'INVOICE_RECEIVED',
    label: 'Invoice Received By Finance',
    sequence: 90,
    allow_edit: false,
    allowed_roles: null,
  },
  {
    code: 'IOM_CLOSED',
    label: 'IOM Closed',
    sequence: 100,
    allow_edit: false,
    allowed_roles: null,
  },
];

export class SeedIomStatuses1780669000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const s of STATUSES) {
      await queryRunner.query(
        `
        INSERT INTO \`iom_statuses\`
          (\`code\`, \`label\`, \`sequence\`, \`allow_edit\`, \`allowed_roles\`)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          \`label\` = VALUES(\`label\`),
          \`sequence\` = VALUES(\`sequence\`),
          \`allow_edit\` = VALUES(\`allow_edit\`),
          \`allowed_roles\` = VALUES(\`allowed_roles\`)
        `,
        [
          s.code,
          s.label,
          s.sequence,
          s.allow_edit,
          s.allowed_roles ? JSON.stringify(s.allowed_roles) : null,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const codes = STATUSES.map((s) => s.code);
    await queryRunner.query(
      `
      DELETE FROM \`iom_statuses\`
      WHERE \`code\` IN (${codes.map(() => '?').join(',')})
      `,
      codes,
    );
  }
}
