import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Additive seed for `iom_statuses` covering the v2 workflow vocabulary
 * (pending/rejected per approver level + brokerage adjustment + draft/deleted).
 *
 * Strategy: ON DUPLICATE KEY UPDATE so this migration is safe to re-run and
 * does NOT delete any rows seeded by `SeedIomStatuses1780669000001`.
 *
 * - `allow_edit`: 1 when `allowed_roles` is a non-empty list, else 0.
 * - `allowed_roles`: JSON array of role names that can act on the IOM while
 *   it is in this status (null when no role currently owns the status).
 *
 * `down()` only removes the codes introduced by THIS migration; codes shared
 * with the original seed (IOM_TO_BE_CREATED, CRM_HEAD_REJECTED,
 * POINTS_TO_BE_UPLOADED, POINTS_UPLOADED, INVOICE_SUBMITTED, IOM_CLOSED) are
 * left intact so we don't accidentally wipe the original seed on revert.
 */

type SeedRow = {
  code: string;
  label: string;
  sequence: number;
  allowedRoles: string[] | null;
  /**
   * True when this code was introduced by this migration (eligible for
   * deletion in `down()`). False for codes that already exist from
   * `SeedIomStatuses1780669000001`.
   */
  isNew: boolean;
};

const STATUSES: SeedRow[] = [
  // `IOM_TO_BE_CREATED` is the canonical INITIAL status set by
  // `IomCrmService.generateIom`. `DRAFT` is reachable only as an
  // explicit "save as draft" action by the CRM author and is therefore
  // sequenced AFTER `IOM_TO_BE_CREATED` for display ordering. Sequence
  // values remain monotonic across the rest of the workflow so
  // listings sorted by `iom_statuses.sequence` produce the natural
  // creator -> reviewer -> closure order.
  {
    code: 'IOM_TO_BE_CREATED',
    label: 'IOM To Be Created',
    sequence: 10,
    allowedRoles: ['CRM'],
    isNew: false,
  },
  {
    code: 'DRAFT',
    label: 'Draft',
    sequence: 15,
    allowedRoles: ['CRM'],
    isNew: true,
  },
  {
    code: 'CRM_TL_APPROVAL_PENDING',
    label: 'CRM TL Approval Pending',
    sequence: 25,
    allowedRoles: ['CRM', 'CRM TL'],
    isNew: true,
  },
  {
    code: 'CRM_TL_REJECTED',
    label: 'CRM TL Rejected',
    sequence: 35,
    allowedRoles: ['CRM'],
    isNew: true,
  },
  {
    code: 'CRM_HEAD_APPROVAL_PENDING',
    label: 'CRM Head Approval Pending',
    sequence: 38,
    allowedRoles: ['CRM TL'],
    isNew: true,
  },
  {
    code: 'CRM_HEAD_REJECTED',
    label: 'CRM Head Rejected',
    sequence: 45,
    allowedRoles: ['CRM'],
    isNew: false,
  },
  {
    code: 'FINANCE_MEMBER_VERIFICATION_PENDING',
    label: 'Finance Member Verification Pending',
    sequence: 50,
    allowedRoles: ['Finance User'],
    isNew: true,
  },
  {
    code: 'FINANCE_MEMBER_REJECTED',
    label: 'Finance Member Rejected',
    sequence: 55,
    allowedRoles: ['CRM'],
    isNew: true,
  },
  {
    code: 'FINANCE_APPROVER_APPROVAL_PENDING',
    label: 'Finance Approver Approval Pending',
    sequence: 58,
    // No active role yet; allow_edit will resolve to 0.
    allowedRoles: null,
    isNew: true,
  },
  {
    code: 'FINANCE_APPROVER_REJECTED',
    label: 'Finance Approver Rejected',
    sequence: 65,
    allowedRoles: ['Finance Head'],
    isNew: true,
  },
  {
    code: 'POINTS_TO_BE_UPLOADED',
    label: 'Points To Be Uploaded',
    sequence: 70,
    allowedRoles: ['Loyalty'],
    isNew: false,
  },
  {
    code: 'POINTS_UPLOADED',
    label: 'Points Uploaded',
    sequence: 75,
    allowedRoles: ['Loyalty'],
    isNew: false,
  },
  {
    code: 'INVOICE_REQUESTED_FROM_VENDOR',
    label: 'Invoice Requested From Vendor',
    sequence: 80,
    allowedRoles: null,
    isNew: true,
  },
  {
    code: 'INVOICE_SUBMITTED',
    label: 'Invoice Submitted To Finance',
    sequence: 85,
    allowedRoles: ['Finance Member'],
    isNew: false,
  },
  {
    code: 'INVOICE_REJECTED_BY_FINANCE',
    label: 'Invoice Rejected By Finance',
    sequence: 88,
    allowedRoles: null,
    isNew: true,
  },
  {
    code: 'IOM_CLOSED',
    label: 'IOM Closed',
    sequence: 100,
    allowedRoles: null,
    isNew: false,
  },
  {
    code: 'OTHER_BROKERAGE_ADJUSTMENT',
    label: 'Brokerage Adjustment Other Than Loyalty Points',
    sequence: 110,
    allowedRoles: ['CRM Head'],
    isNew: true,
  },
  {
    code: 'DELETED',
    label: 'Deleted',
    sequence: 200,
    allowedRoles: ['CRM', 'CRM TL'],
    isNew: true,
  },
];

export class SeedIomStatusesV21781264300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const s of STATUSES) {
      const allowEdit =
        Array.isArray(s.allowedRoles) && s.allowedRoles.length > 0 ? 1 : 0;
      const rolesJson =
        Array.isArray(s.allowedRoles) && s.allowedRoles.length > 0
          ? JSON.stringify(s.allowedRoles)
          : null;

      await queryRunner.query(
        `
        INSERT INTO \`iom_statuses\`
          (\`code\`, \`label\`, \`sequence\`, \`allow_edit\`, \`allowed_roles\`)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          \`label\` = VALUES(\`label\`),
          \`sequence\` = VALUES(\`sequence\`),
          \`allow_edit\` = VALUES(\`allow_edit\`),
          \`allowed_roles\` = VALUES(\`allowed_roles\`),
          \`is_deleted\` = 0,
          \`updated_at\` = CURRENT_TIMESTAMP
        `,
        [s.code, s.label, s.sequence, allowEdit, rolesJson],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const newCodes = STATUSES.filter((s) => s.isNew).map((s) => s.code);
    if (newCodes.length === 0) {
      return;
    }
    const placeholders = newCodes.map(() => '?').join(', ');
    await queryRunner.query(
      `DELETE FROM \`iom_statuses\` WHERE \`code\` IN (${placeholders})`,
      newCodes,
    );
  }
}
