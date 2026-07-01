import { MigrationInterface, QueryRunner } from 'typeorm';

type Transition = {
  fromCode: string;
  toCode: string;
  roleName: string;
};

const TRANSITIONS: Transition[] = [
  // CRM ---------------------------------------------------
  { fromCode: 'IOM_TO_BE_CREATED', toCode: 'DRAFT', roleName: 'CRM' },
  {
    fromCode: 'IOM_TO_BE_CREATED',
    toCode: 'CRM_TL_APPROVAL_PENDING',
    roleName: 'CRM',
  },

  { fromCode: 'DELETED', toCode: 'CRM_TL_APPROVAL_PENDING', roleName: 'CRM' },

  { fromCode: 'IOM_TO_BE_CREATED', toCode: 'DELETED', roleName: 'CRM' },
  { fromCode: 'DRAFT', toCode: 'DELETED', roleName: 'CRM' },
  { fromCode: 'CRM_TL_APPROVAL_PENDING', toCode: 'DELETED', roleName: 'CRM' },

  {
    fromCode: 'CRM_TL_REJECTED',
    toCode: 'CRM_TL_APPROVAL_PENDING',
    roleName: 'CRM',
  },
  {
    fromCode: 'CRM_HEAD_REJECTED',
    toCode: 'CRM_TL_APPROVAL_PENDING',
    roleName: 'CRM',
  },
  {
    fromCode: 'FINANCE_MEMBER_REJECTED',
    toCode: 'CRM_TL_APPROVAL_PENDING',
    roleName: 'CRM',
  },
  {
    fromCode: 'FINANCE_HEAD_REJECTED',
    toCode: 'CRM_TL_APPROVAL_PENDING',
    roleName: 'CRM',
  },

  // CRM TL ----------------------------------------------------
  {
    fromCode: 'CRM_TL_APPROVAL_PENDING',
    toCode: 'CRM_HEAD_APPROVAL_PENDING',
    roleName: 'CRM TL',
  },
  {
    fromCode: 'CRM_TL_APPROVAL_PENDING',
    toCode: 'CRM_TL_REJECTED',
    roleName: 'CRM TL',
  },

  {
    fromCode: 'CRM_TL_APPROVAL_PENDING',
    toCode: 'DELETED',
    roleName: 'CRM TL',
  },
  {
    fromCode: 'CRM_HEAD_APPROVAL_PENDING',
    toCode: 'DELETED',
    roleName: 'CRM TL',
  },

  // CRM Head ---------------------------------------------
  {
    fromCode: 'CRM_HEAD_APPROVAL_PENDING',
    toCode: 'FINANCE_MEMBER_VERIFICATION_PENDING',
    roleName: 'CRM_HEAD',
  },
  {
    fromCode: 'CRM_HEAD_APPROVAL_PENDING',
    toCode: 'CRM_HEAD_REJECTED',
    roleName: 'CRM_HEAD',
  },
  {
    fromCode: 'CRM_HEAD_APPROVAL_PENDING',
    toCode: 'OTHER_BROKERAGE_ADJUSTMENT',
    roleName: 'CRM_HEAD',
  },

  // Finance Member ---------------------------------------
  {
    fromCode: 'FINANCE_MEMBER_VERIFICATION_PENDING',
    toCode: 'FINANCE_APPROVER_APPROVAL_PENDING',
    roleName: 'FINANCE_USER',
  },
  {
    fromCode: 'FINANCE_MEMBER_VERIFICATION_PENDING',
    toCode: 'FINANCE_MEMBER_REJECTED',
    roleName: 'FINANCE_USER',
  },

  // Finance Approver -------------------------------------
  {
    fromCode: 'FINANCE_APPROVER_APPROVAL_PENDING',
    toCode: 'POINTS_TO_BE_UPLOADED',
    roleName: 'FINANCE_HEAD',
  },
  {
    fromCode: 'FINANCE_APPROVER_APPROVAL_PENDING',
    toCode: 'FINANCE_APPROVER_REJECTED',
    roleName: 'FINANCE_HEAD',
  },

  // Loyalty ----------------------------------------------
  {
    fromCode: 'POINTS_TO_BE_UPLOADED',
    toCode: 'POINTS_UPLOADED',
    roleName: 'LOYALTY',
  },

  // Loyalty Invoice --------------------------------------
  {
    fromCode: 'POINTS_UPLOADED',
    toCode: 'INVOICE_REQUESTED_FROM_VENDOR',
    roleName: 'LOYALTY',
  },
  {
    fromCode: 'INVOICE_REQUESTED_FROM_VENDOR',
    toCode: 'INVOICE_SUBMITTED',
    roleName: 'LOYALTY',
  },

  // Finance Closure --------------------------------------

  {
    fromCode: 'INVOICE_SUBMITTED',
    toCode: 'IOM_CLOSED',
    roleName: 'FINANCE_APPROVER',
  },
];

export class SeedIomTransitions1780669000200 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const t of TRANSITIONS) {
      await queryRunner.query(
        `
        INSERT INTO iom_transitions (from_status_id, to_status_id, allowed_role_id)
        SELECT fs.id, ts.id, r.id
        FROM iom_statuses fs
        JOIN iom_statuses ts ON ts.code = ?
        JOIN roles r ON r.name = ?
        WHERE fs.code = ?
          AND NOT EXISTS (
            SELECT 1 FROM iom_transitions it
            WHERE it.from_status_id = fs.id
              AND it.to_status_id = ts.id
              AND it.allowed_role_id = r.id
          )
        `,
        [t.toCode, t.roleName, t.fromCode],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const t of TRANSITIONS) {
      await queryRunner.query(
        `
        DELETE it FROM iom_transitions it
        JOIN iom_statuses fs ON fs.id = it.from_status_id AND fs.code = ?
        JOIN iom_statuses ts ON ts.id = it.to_status_id AND ts.code = ?
        JOIN roles r ON r.id = it.allowed_role_id AND r.name = ?
        `,
        [t.fromCode, t.toCode, t.roleName],
      );
    }
  }
}
