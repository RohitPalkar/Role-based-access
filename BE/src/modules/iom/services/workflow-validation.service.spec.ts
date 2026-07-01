import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';

import { WorkflowValidationService } from './workflow-validation.service';
import { IomStatus } from '../entities/iom-status.entity';
import { IomTransition } from '../entities/iom-transition.entity';
import { Role } from 'src/modules/roles/entities/roles.entity';
import { IomStatusCodeEnum } from '../enums/iom-status-code.enum';
import { IomErrorCodeEnum } from '../enums/iom-error-code.enum';

/**
 * Tests for the DB-driven workflow validator. Covers every edge case
 * the refactor brief calls out:
 *   - Soft-deleted status rows are dropped from the active set.
 *   - Ambiguous duplicate transitions are logged but don't double-fire.
 *   - Transitions referencing a soft-deleted status are skipped.
 *   - Terminal states block all outgoing transitions.
 *   - Self-approval is blocked even when the DB would otherwise allow it.
 *   - Role mismatch produces ForbiddenException, not InternalServerError.
 */

const STATUS = {
  IOM_TO_BE_CREATED: 1,
  CRM_TL_APPROVAL_PENDING: 2,
  CRM_HEAD_APPROVAL_PENDING: 3,
  CRM_TL_REJECTED: 4,
  FINANCE_MEMBER_VERIFICATION_PENDING: 5,
  IOM_CLOSED: 11,
  DELETED: 12,
  RETIRED: 99, // soft-deleted in the master
};

const ROLE = {
  CRM: 100,
  SALES_TL: 101,
  LOYALTY: 102,
  GHOST: 200, // role not seeded into the matrix
};

const baseStatuses: IomStatus[] = [
  {
    id: STATUS.IOM_TO_BE_CREATED,
    code: IomStatusCodeEnum.IOM_TO_BE_CREATED,
    label: 'IOM To Be Created',
    sequence: 10,
    isDeleted: 0,
  } as IomStatus,
  {
    id: STATUS.CRM_TL_APPROVAL_PENDING,
    code: IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING,
    label: 'CRM TL Approval Pending',
    sequence: 25,
    isDeleted: 0,
  } as IomStatus,
  {
    id: STATUS.CRM_HEAD_APPROVAL_PENDING,
    code: IomStatusCodeEnum.CRM_HEAD_APPROVAL_PENDING,
    label: 'CRM Head Approval Pending',
    sequence: 38,
    isDeleted: 0,
  } as IomStatus,
  {
    id: STATUS.CRM_TL_REJECTED,
    code: IomStatusCodeEnum.CRM_TL_REJECTED,
    label: 'CRM TL Rejected',
    sequence: 35,
    isDeleted: 0,
  } as IomStatus,
  {
    id: STATUS.FINANCE_MEMBER_VERIFICATION_PENDING,
    code: IomStatusCodeEnum.FINANCE_MEMBER_VERIFICATION_PENDING,
    label: 'Finance Member Verification Pending',
    sequence: 50,
    isDeleted: 0,
  } as IomStatus,
  {
    id: STATUS.IOM_CLOSED,
    code: IomStatusCodeEnum.IOM_CLOSED,
    label: 'IOM Closed',
    sequence: 100,
    isDeleted: 0,
  } as IomStatus,
  {
    id: STATUS.DELETED,
    code: IomStatusCodeEnum.DELETED,
    label: 'Deleted',
    sequence: 200,
    isDeleted: 0,
  } as IomStatus,
  {
    // Soft-deleted: should not be usable as either side of a transition.
    id: STATUS.RETIRED,
    code: 'LEGACY_STATUS' as IomStatusCodeEnum,
    label: 'Legacy',
    sequence: 99,
    isDeleted: 1,
  } as IomStatus,
];

const baseRoles: Role[] = [
  { id: ROLE.CRM, name: 'CRM' } as Role,
  { id: ROLE.SALES_TL, name: 'Sales TL' } as Role,
  { id: ROLE.LOYALTY, name: 'Loyalty' } as Role,
];

const buildService = async (
  transitions: IomTransition[],
  statuses: IomStatus[] = baseStatuses,
  roles: Role[] = baseRoles,
): Promise<{
  service: WorkflowValidationService;
  errorSpy: jest.SpyInstance;
  warnSpy: jest.SpyInstance;
}> => {
  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [
      WorkflowValidationService,
      {
        provide: getRepositoryToken(IomStatus),
        useValue: { find: jest.fn().mockResolvedValue(statuses) },
      },
      {
        provide: getRepositoryToken(IomTransition),
        useValue: { find: jest.fn().mockResolvedValue(transitions) },
      },
      {
        provide: getRepositoryToken(Role),
        useValue: { find: jest.fn().mockResolvedValue(roles) },
      },
    ],
  }).compile();

  // Silence the logger so noisy-but-expected warnings don't pollute the
  // test output. We still verify they were called when relevant.
  const errorSpy = jest
    .spyOn(
      (WorkflowValidationService as any).prototype.logger ?? console,
      'error',
    )
    .mockImplementation(() => undefined);
  const warnSpy = jest
    .spyOn(
      (WorkflowValidationService as any).prototype.logger ?? console,
      'warn',
    )
    .mockImplementation(() => undefined);

  const service = moduleRef.get(WorkflowValidationService);
  // Patch the actual instance logger as well so log calls inside the
  // service are captured (we already patched the prototype to no-op,
  // but if the constructor created a fresh Logger we override that one
  // too).
  (service as any).logger.error = errorSpy;
  (service as any).logger.warn = warnSpy;

  await service.onApplicationBootstrap();
  return { service, errorSpy, warnSpy };
};

const transition = (
  fromId: number,
  toId: number,
  roleId: number,
  id = Math.floor(Math.random() * 1e9),
): IomTransition =>
  ({
    id,
    fromStatusId: fromId,
    toStatusId: toId,
    allowedRoleId: roleId,
  }) as IomTransition;

describe('WorkflowValidationService', () => {
  afterEach(() => jest.restoreAllMocks());

  // ----------------------------------------------------------------
  // Happy path
  // ----------------------------------------------------------------
  describe('validateTransition - happy path', () => {
    it('allows a seeded transition for the matching role', async () => {
      const { service } = await buildService([
        transition(
          STATUS.IOM_TO_BE_CREATED,
          STATUS.CRM_TL_APPROVAL_PENDING,
          ROLE.CRM,
        ),
      ]);
      expect(() =>
        service.validateTransition(
          STATUS.IOM_TO_BE_CREATED,
          STATUS.CRM_TL_APPROVAL_PENDING,
          ROLE.CRM,
        ),
      ).not.toThrow();
    });
  });

  // ----------------------------------------------------------------
  // Role mismatch
  // ----------------------------------------------------------------
  describe('validateTransition - role mismatch', () => {
    it('throws ForbiddenException when the role has no matching transition', async () => {
      const { service } = await buildService([
        transition(
          STATUS.IOM_TO_BE_CREATED,
          STATUS.CRM_TL_APPROVAL_PENDING,
          ROLE.CRM,
        ),
      ]);
      try {
        service.validateTransition(
          STATUS.IOM_TO_BE_CREATED,
          STATUS.CRM_TL_APPROVAL_PENDING,
          ROLE.SALES_TL,
        );
        fail('expected throw');
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
        const body = (err as ForbiddenException).getResponse() as {
          code: IomErrorCodeEnum;
        };
        expect(body.code).toBe(IomErrorCodeEnum.INVALID_STATUS_FOR_ACTION);
      }
    });
  });

  // ----------------------------------------------------------------
  // Soft-deleted status edge case
  // ----------------------------------------------------------------
  describe('soft-deleted statuses', () => {
    it('refuses a transition that uses a soft-deleted status as the source', async () => {
      const { service } = await buildService([
        // Transition references a retired status - the loader should
        // skip it entirely, so calling validateTransition for it
        // surfaces a ForbiddenException.
        transition(STATUS.RETIRED, STATUS.CRM_TL_APPROVAL_PENDING, ROLE.CRM),
      ]);
      try {
        service.validateTransition(
          STATUS.RETIRED,
          STATUS.CRM_TL_APPROVAL_PENDING,
          ROLE.CRM,
        );
        fail('expected throw');
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it('skips transition rows that reference a soft-deleted status (boot-time log)', async () => {
      const { service, warnSpy } = await buildService([
        transition(STATUS.RETIRED, STATUS.CRM_TL_APPROVAL_PENDING, ROLE.CRM),
        transition(
          STATUS.IOM_TO_BE_CREATED,
          STATUS.CRM_TL_APPROVAL_PENDING,
          ROLE.CRM,
        ),
      ]);
      // Only the valid transition should have been indexed.
      expect(service.canAct(STATUS.IOM_TO_BE_CREATED, ROLE.CRM)).toBe(true);
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // Ambiguous duplicate transitions
  // ----------------------------------------------------------------
  describe('ambiguous duplicate transitions', () => {
    it('logs an error and dedupes when (from,to,role) appears twice', async () => {
      const { service, errorSpy } = await buildService([
        transition(
          STATUS.IOM_TO_BE_CREATED,
          STATUS.CRM_TL_APPROVAL_PENDING,
          ROLE.CRM,
          1,
        ),
        transition(
          STATUS.IOM_TO_BE_CREATED,
          STATUS.CRM_TL_APPROVAL_PENDING,
          ROLE.CRM,
          2,
        ),
      ]);
      expect(errorSpy).toHaveBeenCalled();
      // Only one outgoing entry survives - we still allow the
      // transition (first row wins) so we don't break callers.
      const outgoing = service.getAllowedTransitions(
        STATUS.IOM_TO_BE_CREATED,
        ROLE.CRM,
      );
      expect(outgoing).toHaveLength(1);
    });
  });

  // ----------------------------------------------------------------
  // Terminal state
  // ----------------------------------------------------------------
  describe('terminal status', () => {
    it('blocks any outgoing transition from IOM_CLOSED (terminal)', async () => {
      const { service } = await buildService([
        // Mis-seeded transition out of a terminal status: should be
        // rejected at validation time regardless of what the DB says.
        transition(STATUS.IOM_CLOSED, STATUS.CRM_TL_APPROVAL_PENDING, ROLE.CRM),
      ]);
      try {
        service.validateTransition(
          STATUS.IOM_CLOSED,
          STATUS.CRM_TL_APPROVAL_PENDING,
          ROLE.CRM,
        );
        fail('expected throw');
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it('isTerminal / assertNotTerminal agree with the constant', async () => {
      const { service } = await buildService([]);
      expect(service.isTerminal(STATUS.IOM_CLOSED)).toBe(true);
      expect(service.isTerminal(STATUS.DELETED)).toBe(true);
      expect(service.isTerminal(STATUS.CRM_TL_APPROVAL_PENDING)).toBe(false);
      expect(() => service.assertNotTerminal(STATUS.DELETED)).toThrow(
        ForbiddenException,
      );
    });

    it('canAct returns false from a terminal status even if a transition exists', async () => {
      const { service } = await buildService([
        transition(STATUS.IOM_CLOSED, STATUS.CRM_TL_APPROVAL_PENDING, ROLE.CRM),
      ]);
      expect(service.canAct(STATUS.IOM_CLOSED, ROLE.CRM)).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // Self-approval
  // ----------------------------------------------------------------
  describe('self-approval', () => {
    it('blocks creator from approving own IOM even if the DB transition allows it', async () => {
      // Mis-seed: pretend the CRM role has a transition into
      // CRM_HEAD_APPROVAL_PENDING (an approval-target code).
      const { service } = await buildService([
        transition(
          STATUS.CRM_TL_APPROVAL_PENDING,
          STATUS.CRM_HEAD_APPROVAL_PENDING,
          ROLE.CRM,
        ),
      ]);
      try {
        service.validateTransition(
          STATUS.CRM_TL_APPROVAL_PENDING,
          STATUS.CRM_HEAD_APPROVAL_PENDING,
          ROLE.CRM,
          { actorUserId: 42, iomCreatedBy: 42 },
        );
        fail('expected throw');
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
        const body = (err as ForbiddenException).getResponse() as {
          code: IomErrorCodeEnum;
        };
        expect(body.code).toBe(IomErrorCodeEnum.UNAUTHORIZED_PROJECT_ACCESS);
      }
    });

    it('lets a different user approve the same IOM', async () => {
      const { service } = await buildService([
        transition(
          STATUS.CRM_TL_APPROVAL_PENDING,
          STATUS.CRM_HEAD_APPROVAL_PENDING,
          ROLE.SALES_TL,
        ),
      ]);
      expect(() =>
        service.validateTransition(
          STATUS.CRM_TL_APPROVAL_PENDING,
          STATUS.CRM_HEAD_APPROVAL_PENDING,
          ROLE.SALES_TL,
          { actorUserId: 7, iomCreatedBy: 42 },
        ),
      ).not.toThrow();
    });

    it('does not enforce self-approval on non-approval targets', async () => {
      const { service } = await buildService([
        transition(
          STATUS.IOM_TO_BE_CREATED,
          STATUS.CRM_TL_APPROVAL_PENDING,
          ROLE.CRM,
        ),
      ]);
      expect(() =>
        service.validateTransition(
          STATUS.IOM_TO_BE_CREATED,
          STATUS.CRM_TL_APPROVAL_PENDING,
          ROLE.CRM,
          { actorUserId: 42, iomCreatedBy: 42 },
        ),
      ).not.toThrow();
    });
  });

  // ----------------------------------------------------------------
  // canAct / getAllowedTransitions
  // ----------------------------------------------------------------
  describe('canAct & getAllowedTransitions', () => {
    it('canAct is true iff at least one outgoing transition exists', async () => {
      const { service } = await buildService([
        transition(
          STATUS.IOM_TO_BE_CREATED,
          STATUS.CRM_TL_APPROVAL_PENDING,
          ROLE.CRM,
        ),
      ]);
      expect(service.canAct(STATUS.IOM_TO_BE_CREATED, ROLE.CRM)).toBe(true);
      expect(service.canAct(STATUS.IOM_TO_BE_CREATED, ROLE.SALES_TL)).toBe(
        false,
      );
      expect(service.canAct(STATUS.CRM_TL_APPROVAL_PENDING, ROLE.CRM)).toBe(
        false,
      );
    });

    it('assertCanAct throws when no outgoing transition exists', async () => {
      const { service } = await buildService([
        transition(
          STATUS.IOM_TO_BE_CREATED,
          STATUS.CRM_TL_APPROVAL_PENDING,
          ROLE.CRM,
        ),
      ]);
      try {
        service.assertCanAct(STATUS.CRM_TL_APPROVAL_PENDING, ROLE.CRM);
        fail('expected throw');
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it('getAllowedTransitions returns reachable targets only', async () => {
      const { service } = await buildService([
        transition(
          STATUS.CRM_TL_APPROVAL_PENDING,
          STATUS.CRM_HEAD_APPROVAL_PENDING,
          ROLE.SALES_TL,
        ),
        transition(
          STATUS.CRM_TL_APPROVAL_PENDING,
          STATUS.CRM_TL_REJECTED,
          ROLE.SALES_TL,
        ),
        transition(
          STATUS.CRM_HEAD_APPROVAL_PENDING,
          STATUS.FINANCE_MEMBER_VERIFICATION_PENDING,
          ROLE.SALES_TL,
        ),
      ]);
      const targets = service
        .getAllowedTransitions(STATUS.CRM_TL_APPROVAL_PENDING, ROLE.SALES_TL)
        .map((t) => t.toStatusId)
        .sort();
      expect(targets).toEqual(
        [STATUS.CRM_HEAD_APPROVAL_PENDING, STATUS.CRM_TL_REJECTED].sort(),
      );
    });

    it('returns an empty list from a terminal status', async () => {
      const { service } = await buildService([]);
      expect(
        service.getAllowedTransitions(STATUS.IOM_CLOSED, ROLE.CRM),
      ).toEqual([]);
    });
  });

  // ----------------------------------------------------------------
  // Identifier translation
  // ----------------------------------------------------------------
  describe('identifier translation', () => {
    it('resolveRoleId returns the seeded id', async () => {
      const { service } = await buildService([]);
      expect(service.resolveRoleId('CRM')).toBe(ROLE.CRM);
    });

    it('resolveRoleId throws for an unseeded role name', async () => {
      const { service } = await buildService([]);
      expect(() => service.resolveRoleId('Phantom')).toThrow();
    });

    it('getStatusId throws for a soft-deleted code', async () => {
      const { service } = await buildService([]);
      // RETIRED is soft-deleted - it should not be addressable by code.
      expect(() =>
        service.getStatusId('LEGACY_STATUS' as IomStatusCodeEnum),
      ).toThrow();
    });
  });
});
