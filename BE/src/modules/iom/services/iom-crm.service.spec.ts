import { ForbiddenException, HttpException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QueryFailedError } from 'typeorm';

import { IomCrmService } from './iom-crm.service';
import { WorkflowValidationService } from './workflow-validation.service';
import { IomValidationService } from './iom-validation.service';
import { IomSubmissionNotificationService } from './iom-submission-notification.service';

jest.mock('../helpers/iom-pdf-template.mapper', () => ({
  buildIomDetailsTemplateVars: jest.fn(() => ({})),
  buildReferralEditReasonTemplateVars: jest.fn(() => ({})),
  substituteTemplateVars: jest.fn((html: string) => html),
  loadTemplate: jest.fn().mockResolvedValue('<html></html>'),
}));

import { buildIomDetailsTemplateVars } from '../helpers/iom-pdf-template.mapper';

import { Iom } from '../entities/iom.entity';
import { IomStatusCodeEnum } from '../enums/iom-status-code.enum';
import { IomErrorCodeEnum } from '../enums/iom-error-code.enum';
import { IOM_HISTORY_EVENT, IomHistoryActionEnum } from '../constants';
import { PaymentStatusEnum } from 'src/enums/booking-list.enums';
import { RolesEnum } from 'src/enums/roles.enum';

const STATUS_IDS: Record<IomStatusCodeEnum, number> = {
  [IomStatusCodeEnum.DRAFT]: 50,
  [IomStatusCodeEnum.IOM_TO_BE_CREATED]: 1,
  [IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING]: 2,
  [IomStatusCodeEnum.CRM_TL_REJECTED]: 4,
  [IomStatusCodeEnum.CRM_HEAD_APPROVAL_PENDING]: 3,
  [IomStatusCodeEnum.CRM_HEAD_REJECTED]: 6,
  [IomStatusCodeEnum.FINANCE_MEMBER_VERIFICATION_PENDING]: 5,
  [IomStatusCodeEnum.FINANCE_MEMBER_REJECTED]: 9,
  [IomStatusCodeEnum.FINANCE_APPROVER_APPROVAL_PENDING]: 7,
  [IomStatusCodeEnum.FINANCE_APPROVER_REJECTED]: 90,
  [IomStatusCodeEnum.POINTS_TO_BE_UPLOADED]: 8,
  [IomStatusCodeEnum.POINTS_UPLOADED]: 10,
  [IomStatusCodeEnum.INVOICE_REQUESTED_FROM_VENDOR]: 80,
  [IomStatusCodeEnum.INVOICE_SUBMITTED]: 85,
  [IomStatusCodeEnum.INVOICE_REJECTED_BY_FINANCE]: 88,
  [IomStatusCodeEnum.IOM_CLOSED]: 11,
  [IomStatusCodeEnum.OTHER_BROKERAGE_ADJUSTMENT]: 110,
  [IomStatusCodeEnum.DELETED]: 12,
};
const CRM_ROLE_ID = 100;
const CRM_TL_ROLE_ID = 101;
const CRM_HEAD_ROLE_ID = 102;
const FINANCE_USER_ROLE_ID = 103;
const FINANCE_HEAD_ROLE_ID = 104;

const CRM_USER = {
  dbId: 7,
  email: 'crm@example.test',
  role: RolesEnum.CRM,
  crmProjects: [10, 11, 12],
};

const CRM_TL_USER = {
  dbId: 11,
  email: 'bob.tl@example.test',
  role: RolesEnum.CRM_TL,
  crmProjects: [10, 11, 12],
};

/**
 * Baseline IOM row in `IOM_TO_BE_CREATED` with a 1:1 split (both
 * ratios = 1) and a 2.5% brokerage on a 10M sale -> 250000 total
 * brokerage, 125000 / 125000 split.
 *
 * `referralSplitType` is the canonical `"X:Y"` wire string written
 * by the edit endpoint; legacy rows may still carry categorical
 * values like 'EQUAL' but a freshly-edited IOM stores the ratio
 * string directly.
 */
const baseIom = (overrides: Partial<Iom> = {}): Iom =>
  ({
    id: 1,
    bookingId: 100,
    projectId: 10,
    salePrice: 10_000_000,
    totalBrokerageAmount: 250000,
    brokeragePercentage: 2.5,
    customerMobile: '9999999999',
    referrerMobile: null,
    referralSplitType: '1:1',
    referrerRatio: 1,
    refereeRatio: 1,
    referrerPoints: 125000,
    refereePoints: 125000,
    referralPointsAdjustment: 1,
    referralClassification: 'CLASS_A',
    referralPointsEditReason: null,
    salePriceEdited: false,
    referralPointsEdited: false,
    brokeragePercentageEditedBy: null,
    brokeragePercentageEditedAt: null,
    statusId: STATUS_IDS[IomStatusCodeEnum.IOM_TO_BE_CREATED],
    rejectionReason: null,
    iomPdf: null,
    createdBy: 7,
    version: 3,
    ...overrides,
  }) as Iom;

const project = (max = 5) => ({ id: 10, maxBrokeragePercentage: max }) as any;

/**
 * A "touch every field" edit that bumps salePrice to 8M, brokerage to
 * 2%, and keeps the ratio at 1:1. All three edit flags are set.
 * Uses `action: 'submit'` (the default / original behaviour).
 */
const fullEditBody = () => ({
  action: 'submit' as const,
  salePriceEdited: true,
  brokeragePercentageEdited: true,
  referralPointsRatioEdited: true,
  salePrice: 8_000_000,
  brokeragePercentage: 2,
  referralPointsRatio: '1:1',
});

/**
 * A no-op edit body that re-sends the stored values - exercises the
 * "silent skip" branch where flags are true but no values differ.
 */
const noopEditBody = () => ({
  action: 'submit' as const,
  salePriceEdited: true,
  brokeragePercentageEdited: true,
  referralPointsRatioEdited: true,
  salePrice: 10_000_000,
  brokeragePercentage: 2.5,
  referralPointsRatio: '1:1',
});

const makeUpdateQB = (affected: number) => ({
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue({ affected }),
});

const makeLockQB = (iom: Iom | null) => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  setLock: jest.fn().mockReturnThis(),
  getOne: jest.fn().mockResolvedValue(iom),
});

const makeWorkflow = (): jest.Mocked<WorkflowValidationService> => {
  const codeById = (id: number): IomStatusCodeEnum => {
    const e = Object.entries(STATUS_IDS).find(([, v]) => v === Number(id));
    if (!e) throw new Error(`unknown id ${id}`);
    return e[0] as IomStatusCodeEnum;
  };
  const w = {
    getStatusId: jest.fn((c: IomStatusCodeEnum) => STATUS_IDS[c]),
    getStatusCode: jest.fn(codeById),
    resolveRoleId: jest.fn((name: string) => {
      switch (name) {
        case RolesEnum.CRM:
          return CRM_ROLE_ID;
        case RolesEnum.CRM_TL:
          return CRM_TL_ROLE_ID;
        case RolesEnum.CRM_HEAD:
          return CRM_HEAD_ROLE_ID;
        case RolesEnum.FINANCE_USER:
          return FINANCE_USER_ROLE_ID;
        case RolesEnum.FINANCE_HEAD:
          return FINANCE_HEAD_ROLE_ID;
        default:
          throw new Error(`unknown role ${name}`);
      }
    }),
    resolveRoleName: jest.fn(),
    canAct: jest.fn().mockReturnValue(true),
    assertCanAct: jest.fn(),
    validateTransition: jest.fn(),
    getAllowedTransitions: jest.fn().mockReturnValue([]),
    isTerminal: jest.fn().mockReturnValue(false),
    assertNotTerminal: jest.fn(),
    assertNotSelfApproval: jest.fn(),
    reload: jest.fn(),
    onApplicationBootstrap: jest.fn(),
  };
  return w as unknown as jest.Mocked<WorkflowValidationService>;
};

const expectErrCode = (err: unknown, code: IomErrorCodeEnum): void => {
  const ex = err as HttpException;
  expect(ex).toBeInstanceOf(HttpException);
  const body = ex.getResponse() as { code: IomErrorCodeEnum };
  expect(body.code).toBe(code);
};

/**
 * Build a stub `IomSubmissionNotificationService`. The real service
 * fires email + in-app notifications to the project's CRM TL post
 * commit; for the unit tests we only need to verify that `editIom`
 * dials it with the persisted IOM + acting user, and that exceptions
 * thrown by the notifier don't bubble out of the workflow.
 */
const makeSubmissionNotifier =
  (): jest.Mocked<IomSubmissionNotificationService> =>
    ({
      notifySubmission: jest.fn().mockResolvedValue(undefined),
    }) as unknown as jest.Mocked<IomSubmissionNotificationService>;

const wireStubs = () => {
  const iomRepoTxn = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
  };
  const projectRepoTxn = {
    findOne: jest.fn(),
  };
  const bookingRepoTxn = {
    createQueryBuilder: jest.fn(),
  };

  const iomRepo = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  // The same `project_user_mapping` table is consulted for two
  // unrelated jobs in the service code:
  //   - `IomValidationService.resolveUserProjects` (filters by
  //      `where.user.id` + `relations: ['project']`) - drives
  //      `assertProjectAccess`.
  //   - `IomCrmService.findAssignedReviewers` (filters by
  //      `where.project.id` + `where.role` + `relations: ['user']`) -
  //      drives the signatory block.
  //
  // We disambiguate based on the `where` shape so tests can override
  // either lane independently without one stub clobbering the other.
  // - Default user lookup grants access to CRM_USER's stored
  //   `crmProjects` so existing tests don't need to wire it up.
  // - Default reviewer lookup is empty; tests opt-in via
  //   `mockProjectMappings` from `getIom` describe.
  const projectUserMappingRepo = {
    find: jest.fn().mockImplementation((opts?: any) => {
      const where = opts?.where ?? {};
      if (where.user) {
        const ids: number[] = CRM_USER.crmProjects ?? [];
        return Promise.resolve(
          ids.map((id) => ({ project: { id }, removedAt: null })),
        );
      }
      return Promise.resolve([]);
    }),
  };

  // Non-transactional projects repo, used by getIom to resolve the
  // referrer's project name from `referrer_details.projectId`.
  // Defaults to "not found" so existing tests don't need to stub it.
  const projectsRepo = {
    findOne: jest.fn().mockResolvedValue(null),
  };

  const dataSource = {
    transaction: jest.fn(async (fn: (mgr: any) => Promise<unknown>) => {
      const manager = {
        getRepository: (entity: any) => {
          if (entity?.name === 'IncentiveBooking') return bookingRepoTxn;
          if (entity?.name === 'Projects') return projectRepoTxn;
          return iomRepoTxn;
        },
      };
      return fn(manager);
    }),
  };

  return {
    iomRepo,
    iomRepoTxn,
    projectRepoTxn,
    bookingRepoTxn,
    projectUserMappingRepo,
    projectsRepo,
    dataSource,
  };
};

const makePdfService = () => ({
  generatePdf: jest.fn().mockResolvedValue(Buffer.from('main-pdf')),
  mergeWithMainPdf: jest.fn().mockImplementation(async (main: Buffer) => main),
});

const makeAwsService = () => ({
  uploadToS3: jest.fn().mockResolvedValue(undefined),
});

const makeConfigService = () => ({
  get: jest.fn().mockReturnValue('https://s3.example.com/'),
});

const makeIomCrmService = (
  stubs: ReturnType<typeof wireStubs>,
  workflow: jest.Mocked<WorkflowValidationService>,
  validator: IomValidationService,
  eventEmitter: EventEmitter2,
  submissionNotifier: jest.Mocked<IomSubmissionNotificationService>,
  pdfService = makePdfService(),
  awsService = makeAwsService(),
  configService = makeConfigService(),
) =>
  new IomCrmService(
    stubs.dataSource as any,
    stubs.iomRepo as any,
    stubs.projectUserMappingRepo as any,
    stubs.projectsRepo as any,
    workflow,
    validator,
    eventEmitter,
    submissionNotifier,
    pdfService as any,
    awsService as any,
    configService as any,
  );

describe('IomCrmService.editIom (flag-gated contract)', () => {
  let stubs: ReturnType<typeof wireStubs>;
  let workflow: jest.Mocked<WorkflowValidationService>;
  let validator: IomValidationService;
  let eventEmitter: EventEmitter2;
  let submissionNotifier: jest.Mocked<IomSubmissionNotificationService>;
  let service: IomCrmService;

  beforeEach(() => {
    stubs = wireStubs();
    workflow = makeWorkflow();
    validator = new IomValidationService(stubs.projectUserMappingRepo as any);
    eventEmitter = new EventEmitter2();
    jest.spyOn(eventEmitter, 'emit');
    submissionNotifier = makeSubmissionNotifier();

    service = makeIomCrmService(
      stubs,
      workflow,
      validator,
      eventEmitter,
      submissionNotifier,
    );
  });

  // -------------------------------------------------------------
  // Whitelist
  // -------------------------------------------------------------
  describe('body whitelist', () => {
    it('rejects payloads with fields outside the whitelist', async () => {
      try {
        await service.editIom(CRM_USER, 1, fullEditBody() as any, {
          ...fullEditBody(),
          status: 'IOM_APPROVED',
        });
        fail('expected throw');
      } catch (e) {
        expectErrCode(e, IomErrorCodeEnum.DISALLOWED_FIELD_IN_PAYLOAD);
      }
      expect(stubs.dataSource.transaction).not.toHaveBeenCalled();
    });

    it('accepts the documented inputs + flags + derived + edit reason', async () => {
      const iom = baseIom();
      stubs.iomRepoTxn.createQueryBuilder
        .mockReturnValueOnce(makeLockQB(iom))
        .mockReturnValueOnce(makeUpdateQB(1));
      stubs.projectRepoTxn.findOne.mockResolvedValue(project());
      stubs.iomRepoTxn.findOne.mockResolvedValue({ ...iom, version: 4 });

      const body = {
        ...fullEditBody(),
        totalBrokerageAmount: 160000,
        referrerPoints: 80000,
        refereePoints: 80000,
        referralPointsEditReason: 'corrected per Finance review',
        // action inherited from fullEditBody() -> 'submit'
      };
      await service.editIom(CRM_USER, 1, body as any, body);
      expect(stubs.dataSource.transaction).toHaveBeenCalled();
    });

    it('rejects FE-supplied numeric ratios when deviation=true', async () => {
      // In deviation mode the ratio columns are nulled out, so
      // accepting FE-supplied numbers would be ambiguous. The
      // validator rejects them up-front via DISALLOWED_FIELD_IN_PAYLOAD.
      try {
        await service.editIom(
          CRM_USER,
          1,
          {
            ...fullEditBody(),
            referralPointsRatio: 'other',
            deviation: true,
            referrerRatio: 0.5,
            refereeRatio: 0.5,
          } as any,
          {
            ...fullEditBody(),
            referralPointsRatio: 'other',
            deviation: true,
            referrerRatio: 0.5,
            refereeRatio: 0.5,
          },
        );
        fail('expected throw');
      } catch (e) {
        expectErrCode(e, IomErrorCodeEnum.DISALLOWED_FIELD_IN_PAYLOAD);
      }
    });
  });

  // -------------------------------------------------------------
  // Flag / value plumbing
  // -------------------------------------------------------------
  describe('edit flags', () => {
    it('rejects when a flag is true but the value is missing', async () => {
      try {
        await service.editIom(
          CRM_USER,
          1,
          {
            salePriceEdited: true,
            // salePrice intentionally omitted
          } as any,
          {
            salePriceEdited: true,
          },
        );
        fail('expected throw');
      } catch (e) {
        expectErrCode(e, IomErrorCodeEnum.MANDATORY_FIELDS_MISSING);
      }
    });

    it('silently skips an update when flag=true but value matches stored', async () => {
      const iom = baseIom();
      const updateQB = makeUpdateQB(1);
      stubs.iomRepoTxn.createQueryBuilder
        .mockReturnValueOnce(makeLockQB(iom))
        .mockReturnValueOnce(updateQB);
      stubs.projectRepoTxn.findOne.mockResolvedValue(project());
      stubs.iomRepoTxn.findOne.mockResolvedValue({ ...iom, version: 4 });

      await service.editIom(CRM_USER, 1, noopEditBody() as any, noopEditBody());

      const setCall = updateQB.set.mock.calls[0][0];
      // The version always bumps; nothing else should be in the SET.
      expect(setCall.salePrice).toBeUndefined();
      expect(setCall.brokeragePercentage).toBeUndefined();
      expect(setCall.referralSplitType).toBeUndefined();
      expect(setCall.referralSplitRatio).toBeUndefined();
      expect(setCall.salePriceEdited).toBeUndefined();
      // No `brokeragePercentageEdited` column exists on `ioms` -
      // `brokeragePercentageEditedBy` doubles as the edit indicator
      // and must stay null on a no-op.
      expect(setCall.brokeragePercentageEditedBy).toBeUndefined();
      expect(setCall.referralPointsEdited).toBeUndefined();
      expect(setCall.totalBrokerageAmount).toBeUndefined();
      expect(setCall.updatedBy).toBe(CRM_USER.dbId);
      expect(setCall.version).toBeDefined();

      // The auto-submit transition still happens on a pure no-op
      // (the IOM lifecycle moves IOM_TO_BE_CREATED -> IOM_CREATED),
      // so CRM_SUBMIT is emitted unconditionally. CRM_EDIT is
      // suppressed because no field actually changed.
      const historyCalls = (eventEmitter.emit as jest.Mock).mock.calls.filter(
        (c) => c[0] === IOM_HISTORY_EVENT,
      );
      expect(historyCalls).toHaveLength(1);
      expect(historyCalls[0][1].action).toBe(IomHistoryActionEnum.CRM_SUBMIT);
    });

    it('only writes the fields whose flag is true AND whose value changed', async () => {
      const iom = baseIom();
      const updateQB = makeUpdateQB(1);
      stubs.iomRepoTxn.createQueryBuilder
        .mockReturnValueOnce(makeLockQB(iom))
        .mockReturnValueOnce(updateQB);
      stubs.projectRepoTxn.findOne.mockResolvedValue(project());
      stubs.iomRepoTxn.findOne.mockResolvedValue({
        ...iom,
        salePrice: 8_000_000,
        totalBrokerageAmount: 200000,
        referrerPoints: 100000,
        refereePoints: 100000,
        version: 4,
      });

      const body = {
        action: 'submit' as const,
        salePriceEdited: true,
        salePrice: 8_000_000,
        // brokerage and ratio intentionally NOT flagged
        brokeragePercentageEdited: false,
        referralPointsRatioEdited: false,
      };

      await service.editIom(CRM_USER, 1, body as any, body);

      const setCall = updateQB.set.mock.calls[0][0];
      expect(setCall.salePrice).toBe(8_000_000);
      expect(setCall.salePriceEdited).toBe(true);
      expect(setCall.salePriceEditedBy).toBe(CRM_USER.dbId);
      // brokerage + ratio columns must NOT be in the SET.
      expect(setCall.brokeragePercentage).toBeUndefined();
      expect(setCall.brokeragePercentageEditedBy).toBeUndefined();
      expect(setCall.brokeragePercentageEditedAt).toBeUndefined();
      expect(setCall.referralSplitType).toBeUndefined();
      expect(setCall.referralPointsEdited).toBeUndefined();
      // Derived totals MUST be recomputed and persisted because the
      // salePrice change cascades into them.
      expect(setCall.totalBrokerageAmount).toBe(200000); // 8M * 2.5%
      expect(setCall.referrerPoints).toBe(100000);
      expect(setCall.refereePoints).toBe(100000);
    });

    it('ignores incoming values for fields whose flag is false', async () => {
      const iom = baseIom();
      const updateQB = makeUpdateQB(1);
      stubs.iomRepoTxn.createQueryBuilder
        .mockReturnValueOnce(makeLockQB(iom))
        .mockReturnValueOnce(updateQB);
      stubs.projectRepoTxn.findOne.mockResolvedValue(project());
      stubs.iomRepoTxn.findOne.mockResolvedValue({ ...iom, version: 4 });

      const body = {
        action: 'submit' as const,
        // No flags set, but values supplied. Those values must be
        // ignored - the SET should only contain version + updatedBy.
        salePrice: 999_999_999,
        brokeragePercentage: 99,
        referralPointsRatio: '5:1',
      };

      await service.editIom(CRM_USER, 1, body as any, body);

      const setCall = updateQB.set.mock.calls[0][0];
      expect(setCall.salePrice).toBeUndefined();
      expect(setCall.brokeragePercentage).toBeUndefined();
      expect(setCall.referralSplitType).toBeUndefined();
    });
  });

  // -------------------------------------------------------------
  // Status code gate
  // -------------------------------------------------------------
  describe('status code gate', () => {
    it('refuses edits when status is anything other than IOM_TO_BE_CREATED', async () => {
      const submitted = baseIom({
        statusId: STATUS_IDS[IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING],
      });
      stubs.iomRepoTxn.createQueryBuilder.mockReturnValue(
        makeLockQB(submitted),
      );

      try {
        await service.editIom(
          CRM_USER,
          1,
          fullEditBody() as any,
          fullEditBody(),
        );
        fail('expected throw');
      } catch (e) {
        expectErrCode(e, IomErrorCodeEnum.INVALID_STATUS_FOR_ACTION);
      }
    });
  });

  // -------------------------------------------------------------
  // Locking + version
  // -------------------------------------------------------------
  describe('locking + version', () => {
    it('issues a pessimistic FOR UPDATE lock when loading the IOM', async () => {
      const iom = baseIom();
      const lockQB = makeLockQB(iom);
      stubs.iomRepoTxn.createQueryBuilder
        .mockReturnValueOnce(lockQB)
        .mockReturnValueOnce(makeUpdateQB(1));
      stubs.projectRepoTxn.findOne.mockResolvedValue(project());
      stubs.iomRepoTxn.findOne.mockResolvedValue({ ...iom, version: 4 });

      await service.editIom(CRM_USER, 1, fullEditBody() as any, fullEditBody());
      expect(lockQB.setLock).toHaveBeenCalledWith('pessimistic_write');
    });

    it('throws CONCURRENT_MODIFICATION_DETECTED when the UPDATE affects 0 rows', async () => {
      const iom = baseIom();
      stubs.projectRepoTxn.findOne.mockResolvedValue(project());
      stubs.iomRepoTxn.createQueryBuilder
        .mockReturnValueOnce(makeLockQB(iom))
        .mockReturnValueOnce(makeUpdateQB(0));

      try {
        await service.editIom(
          CRM_USER,
          1,
          fullEditBody() as any,
          fullEditBody(),
        );
        fail('expected throw');
      } catch (e) {
        expectErrCode(e, IomErrorCodeEnum.CONCURRENT_MODIFICATION_DETECTED);
      }
    });
  });

  // -------------------------------------------------------------
  // Validation chain
  // -------------------------------------------------------------
  describe('validation chain', () => {
    it('rejects when effective brokerage exceeds the project cap', async () => {
      const iom = baseIom();
      stubs.iomRepoTxn.createQueryBuilder.mockReturnValue(makeLockQB(iom));
      stubs.projectRepoTxn.findOne.mockResolvedValue(project(3));

      const body = {
        action: 'submit' as const,
        brokeragePercentageEdited: true,
        brokeragePercentage: 4,
      };

      try {
        await service.editIom(CRM_USER, 1, body as any, body);
        fail('expected throw');
      } catch (e) {
        expectErrCode(e, IomErrorCodeEnum.MANDATORY_FIELDS_MISSING);
      }
    });

    it('validates the effective state, not just incoming overrides', async () => {
      // Even when the FE only edits salePrice, the resulting state
      // must remain consistent. Here brokerage stays at the stored
      // 2.5% which IS within the cap, so this should pass.
      const iom = baseIom();
      const updateQB = makeUpdateQB(1);
      stubs.iomRepoTxn.createQueryBuilder
        .mockReturnValueOnce(makeLockQB(iom))
        .mockReturnValueOnce(updateQB);
      stubs.projectRepoTxn.findOne.mockResolvedValue(project(3));
      stubs.iomRepoTxn.findOne.mockResolvedValue({ ...iom, version: 4 });

      const body = {
        action: 'submit' as const,
        salePriceEdited: true,
        salePrice: 8_000_000,
      };

      await service.editIom(CRM_USER, 1, body as any, body);
      expect(updateQB.execute).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------
  // Recompute math
  // -------------------------------------------------------------
  describe('backend recompute', () => {
    it('writes the raw "1:1" string to referralSplitType and computes 50/50 split', async () => {
      const iom = baseIom();
      const updateQB = makeUpdateQB(1);
      stubs.iomRepoTxn.createQueryBuilder
        .mockReturnValueOnce(makeLockQB(iom))
        .mockReturnValueOnce(updateQB);
      stubs.projectRepoTxn.findOne.mockResolvedValue(project());
      stubs.iomRepoTxn.findOne.mockResolvedValue({
        ...iom,
        salePrice: 8_000_000,
        totalBrokerageAmount: 200000,
        referrerPoints: 100000,
        refereePoints: 100000,
        version: 4,
      });

      // Switch the stored split string so the ratio actually changes
      // (baseIom now stores '1:1' for referralSplitType - to exercise
      // the writes we send a different ratio).
      iom.referralSplitType = '1:2';
      iom.referrerRatio = 1;
      iom.refereeRatio = 2;

      const body = {
        action: 'submit' as const,
        salePriceEdited: true,
        referralPointsRatioEdited: true,
        salePrice: 8_000_000,
        referralPointsRatio: '1:1',
      };

      await service.editIom(CRM_USER, 1, body as any, body);

      const setCall = updateQB.set.mock.calls[0][0];
      expect(setCall.referralSplitType).toBe('1:1');
      expect(setCall.referralSplitRatio).toEqual({
        referrer: 50,
        referee: 50,
        type: '1:1',
      });
      expect(setCall.referrerRatio).toBe(1);
      expect(setCall.refereeRatio).toBe(1);
      expect(setCall.totalBrokerageAmount).toBe(200000);
      expect(setCall.referrerPoints).toBe(100000);
      expect(setCall.refereePoints).toBe(100000);
    });

    it('handles a 2:1 split via the string ratio', async () => {
      const iom = baseIom();
      const updateQB = makeUpdateQB(1);
      stubs.iomRepoTxn.createQueryBuilder
        .mockReturnValueOnce(makeLockQB(iom))
        .mockReturnValueOnce(updateQB);
      stubs.projectRepoTxn.findOne.mockResolvedValue(project());
      stubs.iomRepoTxn.findOne.mockResolvedValue({ ...iom, version: 4 });

      const body = {
        action: 'submit' as const,
        referralPointsRatioEdited: true,
        referralPointsRatio: '2:1',
      };

      await service.editIom(CRM_USER, 1, body as any, body);

      const setCall = updateQB.set.mock.calls[0][0];
      // total brokerage unchanged at 250000, split 2:1 -> 166666.67 / 83333.33
      expect(setCall.referralSplitType).toBe('2:1');
      expect(setCall.referralSplitRatio).toEqual({
        referrer: 66.67,
        referee: 33.33,
        type: '2:1',
      });
      expect(setCall.referrerRatio).toBe(2);
      expect(setCall.refereeRatio).toBe(1);
      expect(setCall.referrerPoints).toBeCloseTo(166666.67, 1);
      expect(setCall.refereePoints).toBeCloseTo(83333.33, 1);
    });

    it('handles "2:0" (all brokerage to the referrer)', async () => {
      const iom = baseIom();
      const updateQB = makeUpdateQB(1);
      stubs.iomRepoTxn.createQueryBuilder
        .mockReturnValueOnce(makeLockQB(iom))
        .mockReturnValueOnce(updateQB);
      stubs.projectRepoTxn.findOne.mockResolvedValue(project());
      stubs.iomRepoTxn.findOne.mockResolvedValue({ ...iom, version: 4 });

      const body = {
        action: 'submit' as const,
        referralPointsRatioEdited: true,
        referralPointsRatio: '2:0',
      };

      await service.editIom(CRM_USER, 1, body as any, body);

      const setCall = updateQB.set.mock.calls[0][0];
      expect(setCall.referralSplitType).toBe('2:0');
      expect(setCall.referralSplitRatio).toEqual({
        referrer: 100,
        referee: 0,
        type: '2:0',
      });
      expect(setCall.referrerRatio).toBe(2);
      expect(setCall.refereeRatio).toBe(0);
      // Total brokerage (250000) all to referrer.
      expect(setCall.referrerPoints).toBe(250000);
      expect(setCall.refereePoints).toBe(0);
    });

    it('handles "0:2" (all brokerage to the referee)', async () => {
      const iom = baseIom();
      const updateQB = makeUpdateQB(1);
      stubs.iomRepoTxn.createQueryBuilder
        .mockReturnValueOnce(makeLockQB(iom))
        .mockReturnValueOnce(updateQB);
      stubs.projectRepoTxn.findOne.mockResolvedValue(project());
      stubs.iomRepoTxn.findOne.mockResolvedValue({ ...iom, version: 4 });

      const body = {
        action: 'submit' as const,
        referralPointsRatioEdited: true,
        referralPointsRatio: '0:2',
      };

      await service.editIom(CRM_USER, 1, body as any, body);

      const setCall = updateQB.set.mock.calls[0][0];
      expect(setCall.referralSplitType).toBe('0:2');
      expect(setCall.referralSplitRatio).toEqual({
        referrer: 0,
        referee: 100,
        type: '0:2',
      });
      expect(setCall.referrerRatio).toBe(0);
      expect(setCall.refereeRatio).toBe(2);
      expect(setCall.referrerPoints).toBe(0);
      expect(setCall.refereePoints).toBe(250000);
    });

    it('rejects "0:0" as no-allocation', async () => {
      const iom = baseIom();
      stubs.iomRepoTxn.createQueryBuilder.mockReturnValue(makeLockQB(iom));
      stubs.projectRepoTxn.findOne.mockResolvedValue(project());

      const body = {
        action: 'submit' as const,
        referralPointsRatioEdited: true,
        referralPointsRatio: '0:0',
      };

      try {
        await service.editIom(CRM_USER, 1, body as any, body);
        fail('expected throw');
      } catch (e) {
        expectErrCode(e, IomErrorCodeEnum.MANDATORY_FIELDS_MISSING);
      }
    });

    it('rejects FE-derived values that disagree with BE compute', async () => {
      const iom = baseIom();
      stubs.iomRepoTxn.createQueryBuilder.mockReturnValue(makeLockQB(iom));
      stubs.projectRepoTxn.findOne.mockResolvedValue(project());

      const body = {
        action: 'submit' as const,
        salePriceEdited: true,
        salePrice: 8_000_000,
        totalBrokerageAmount: 999999,
        referrerPoints: 999999,
        refereePoints: 999999,
      };

      try {
        await service.editIom(CRM_USER, 1, body as any, body);
        fail('expected throw');
      } catch (e) {
        expectErrCode(e, IomErrorCodeEnum.MANDATORY_FIELDS_MISSING);
      }
    });

    it('persists FE-supplied referrerRatio / refereeRatio when "other" + !deviation', async () => {
      // Start from a baseline 1:1 row and transition to the FE's
      // "other" split-type with custom 0.6 / 0.4 components.
      const iom = baseIom();
      const updateQB = makeUpdateQB(1);
      stubs.iomRepoTxn.createQueryBuilder
        .mockReturnValueOnce(makeLockQB(iom))
        .mockReturnValueOnce(updateQB);
      stubs.projectRepoTxn.findOne.mockResolvedValue(project());
      stubs.iomRepoTxn.findOne.mockResolvedValue({ ...iom, version: 4 });

      // Total brokerage = 10_000_000 * 2.5% = 250000.
      // Referrer = 250000 * 0.6 / 1.0 = 150000.
      // Referee  = 250000 * 0.4 / 1.0 = 100000.
      const body = {
        action: 'submit' as const,
        deviation: false,
        referralPointsRatioEdited: true,
        referralPointsRatio: 'other',
        referrerRatio: 0.6,
        refereeRatio: 0.4,
        totalBrokerageAmount: 250000,
        referrerPoints: 150000,
        refereePoints: 100000,
      };

      await service.editIom(CRM_USER, 1, body as any, body);

      const setCall = updateQB.set.mock.calls[0][0];
      expect(setCall.referralSplitType).toBe('other');
      expect(setCall.referrerRatio).toBe(0.6);
      expect(setCall.refereeRatio).toBe(0.4);
      expect(setCall.referralSplitRatio).toEqual({
        referrer: 60,
        referee: 40,
        type: 'other',
      });
      expect(setCall.referrerPoints).toBe(150000);
      expect(setCall.refereePoints).toBe(100000);
    });

    it('nulls out the ratio columns when deviation=true', async () => {
      // The IOM stored a 1:1 split; submitting with deviation=true
      // should clear the ratio columns even when the FE does NOT
      // touch the split-type itself. With no FE-supplied derived
      // values the persisted points fall back to the stored row
      // (no BE recompute happens in deviation mode).
      const iom = baseIom();
      const updateQB = makeUpdateQB(1);
      stubs.iomRepoTxn.createQueryBuilder
        .mockReturnValueOnce(makeLockQB(iom))
        .mockReturnValueOnce(updateQB);
      stubs.projectRepoTxn.findOne.mockResolvedValue(project());
      stubs.iomRepoTxn.findOne.mockResolvedValue({
        ...iom,
        referrerRatio: null,
        refereeRatio: null,
        version: 4,
      });

      const body = {
        action: 'submit' as const,
        deviation: true,
        // FE does not (and must not) send referrerRatio / refereeRatio
        // when deviation=true.
      };

      await service.editIom(CRM_USER, 1, body as any, body);

      const setCall = updateQB.set.mock.calls[0][0];
      expect(setCall.referrerRatio).toBeNull();
      expect(setCall.refereeRatio).toBeNull();
      expect(setCall.referralSplitRatio).toBeNull();
      expect(setCall.brokerageAdjNonLoyalty).toBe(1);
    });

    it('persists FE-supplied derived values verbatim in deviation mode (no 1:1 fallback)', async () => {
      // Reproduces the bug-report payload: deviation=true, "other"
      // split, salePrice=8M, brokerage=2%. Before the fix the BE
      // would fall back to a 1:1 ratio and compute 80000/80000 for
      // the points, overriding the FE's intentional 0/0 deviation.
      // The persisted row MUST honour the FE numbers verbatim - no
      // BE recompute happens in deviation mode.
      const iom = baseIom();
      const updateQB = makeUpdateQB(1);
      stubs.iomRepoTxn.createQueryBuilder
        .mockReturnValueOnce(makeLockQB(iom))
        .mockReturnValueOnce(updateQB);
      stubs.projectRepoTxn.findOne.mockResolvedValue(project());
      stubs.iomRepoTxn.findOne.mockResolvedValue({ ...iom, version: 4 });

      const body = {
        action: 'submit' as const,
        deviation: true,
        salePriceEdited: false,
        brokeragePercentageEdited: false,
        referralPointsRatioEdited: true,
        salePrice: 8_000_000,
        brokeragePercentage: 2,
        referralPointsRatio: 'other',
        referrerRatio: null,
        refereeRatio: null,
        totalBrokerageAmount: 160000,
        referrerPoints: 0,
        refereePoints: 0,
        referralPointsEditReason: null,
      };

      await service.editIom(CRM_USER, 1, body as any, body);

      const setCall = updateQB.set.mock.calls[0][0];
      expect(setCall.referrerRatio).toBeNull();
      expect(setCall.refereeRatio).toBeNull();
      expect(setCall.referralSplitRatio).toBeNull();
      expect(setCall.totalBrokerageAmount).toBe(160000);
      expect(setCall.referrerPoints).toBe(0);
      expect(setCall.refereePoints).toBe(0);
      expect(setCall.brokerageAdjNonLoyalty).toBe(1);
    });

    it('rejects "other" + !deviation without explicit ratio components', async () => {
      const iom = baseIom();
      stubs.iomRepoTxn.createQueryBuilder.mockReturnValue(makeLockQB(iom));
      stubs.projectRepoTxn.findOne.mockResolvedValue(project());

      const body = {
        action: 'submit' as const,
        deviation: false,
        referralPointsRatioEdited: true,
        referralPointsRatio: 'other',
      };

      try {
        await service.editIom(CRM_USER, 1, body as any, body);
        fail('expected throw');
      } catch (e) {
        expectErrCode(e, IomErrorCodeEnum.MANDATORY_FIELDS_MISSING);
      }
    });
  });

  // -------------------------------------------------------------
  // History snapshot
  // -------------------------------------------------------------
  describe('history snapshot', () => {
    it('emits CRM_EDIT (with before/after snapshot) AND CRM_SUBMIT on successful auto-submit edit', async () => {
      const iom = baseIom();
      const lockQB = makeLockQB(iom);
      const updateQB = makeUpdateQB(1);
      stubs.iomRepoTxn.createQueryBuilder
        .mockReturnValueOnce(lockQB)
        .mockReturnValueOnce(updateQB);
      stubs.projectRepoTxn.findOne.mockResolvedValue(project());
      const after = {
        ...iom,
        salePrice: 8_000_000,
        brokeragePercentage: 2,
        totalBrokerageAmount: 160000,
        referrerPoints: 80000,
        refereePoints: 80000,
        referrerRatio: 1,
        refereeRatio: 1,
        statusId: STATUS_IDS[IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING],
        version: 4,
      };
      stubs.iomRepoTxn.findOne.mockResolvedValue(after);

      await service.editIom(CRM_USER, 1, fullEditBody() as any, fullEditBody());

      const calls = (eventEmitter.emit as jest.Mock).mock.calls.filter(
        (c) => c[0] === IOM_HISTORY_EVENT,
      );
      expect(calls).toHaveLength(2);

      const editEvent = calls.find(
        (c) => c[1].action === IomHistoryActionEnum.CRM_EDIT,
      )?.[1];
      expect(editEvent).toBeDefined();
      expect(editEvent.changedBy).toBe(CRM_USER.dbId);
      expect(editEvent.prevValue.salePrice).toBe(10_000_000);
      expect(editEvent.updatedValue.salePrice).toBe(8_000_000);
      expect(editEvent.prevValue.totalBrokerageAmount).toBe(250000);
      expect(editEvent.updatedValue.totalBrokerageAmount).toBe(160000);

      const submitEvent = calls.find(
        (c) => c[1].action === IomHistoryActionEnum.CRM_SUBMIT,
      )?.[1];
      expect(submitEvent).toBeDefined();
      expect(submitEvent.fromStatusId).toBe(
        STATUS_IDS[IomStatusCodeEnum.IOM_TO_BE_CREATED],
      );
      expect(submitEvent.toStatusId).toBe(
        STATUS_IDS[IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING],
      );
    });

    it('writes statusId=IOM_CREATED and submittedAt into the SET payload', async () => {
      const iom = baseIom();
      const updateQB = makeUpdateQB(1);
      stubs.iomRepoTxn.createQueryBuilder
        .mockReturnValueOnce(makeLockQB(iom))
        .mockReturnValueOnce(updateQB);
      stubs.projectRepoTxn.findOne.mockResolvedValue(project());
      stubs.iomRepoTxn.findOne.mockResolvedValue({
        ...iom,
        statusId: STATUS_IDS[IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING],
        version: 4,
      });

      await service.editIom(CRM_USER, 1, fullEditBody() as any, fullEditBody());

      const setCall = updateQB.set.mock.calls[0][0];
      expect(setCall.statusId).toBe(
        STATUS_IDS[IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING],
      );
      expect(setCall.submittedAt).toBeInstanceOf(Date);
      expect(workflow.validateTransition).toHaveBeenCalledWith(
        STATUS_IDS[IomStatusCodeEnum.IOM_TO_BE_CREATED],
        STATUS_IDS[IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING],
        CRM_ROLE_ID,
        expect.objectContaining({
          actorUserId: CRM_USER.dbId,
          iomCreatedBy: iom.createdBy,
        }),
      );
    });
  });

  // -------------------------------------------------------------
  // Submission notification fan-out
  //
  // editIom transitions IOM_TO_BE_CREATED -> IOM_CREATED and then
  // tells `IomSubmissionNotificationService` to email + push the
  // project's CRM TL. The dispatch is post-commit + fire-and-forget;
  // tests below pin down both the happy path and the "notifier blew
  // up but the API call still succeeds" contract.
  // -------------------------------------------------------------
  describe('submission notification', () => {
    it('dispatches the submission notification with the persisted IOM and submitter on successful auto-submit', async () => {
      const iom = baseIom();
      const updateQB = makeUpdateQB(1);
      stubs.iomRepoTxn.createQueryBuilder
        .mockReturnValueOnce(makeLockQB(iom))
        .mockReturnValueOnce(updateQB);
      stubs.projectRepoTxn.findOne.mockResolvedValue(project());
      const persisted = {
        ...iom,
        statusId: STATUS_IDS[IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING],
        submittedAt: new Date('2026-06-17T03:30:00Z'),
        version: 4,
      };
      stubs.iomRepoTxn.findOne.mockResolvedValue(persisted);

      const returned = await service.editIom(
        CRM_USER,
        1,
        fullEditBody() as any,
        fullEditBody(),
      );

      expect(submissionNotifier.notifySubmission).toHaveBeenCalledTimes(1);
      expect(submissionNotifier.notifySubmission).toHaveBeenCalledWith({
        iom: persisted,
        submittedByUserId: CRM_USER.dbId,
      });
      expect(returned).toBe(persisted);
    });

    it('never dispatches the submission notification when the edit aborts before the status transition', async () => {
      // Foreign project => assertProjectAccess throws before the
      // workflow ever reaches the status transition.
      const foreign = baseIom({ projectId: 999 });
      stubs.iomRepoTxn.createQueryBuilder.mockReturnValue(makeLockQB(foreign));

      try {
        await service.editIom(
          CRM_USER,
          1,
          fullEditBody() as any,
          fullEditBody(),
        );
        fail('expected throw');
      } catch (e) {
        expectErrCode(e, IomErrorCodeEnum.UNAUTHORIZED_PROJECT_ACCESS);
      }

      expect(submissionNotifier.notifySubmission).not.toHaveBeenCalled();
    });

    it('swallows notifier failures so the workflow still returns the persisted IOM', async () => {
      const iom = baseIom();
      const updateQB = makeUpdateQB(1);
      stubs.iomRepoTxn.createQueryBuilder
        .mockReturnValueOnce(makeLockQB(iom))
        .mockReturnValueOnce(updateQB);
      stubs.projectRepoTxn.findOne.mockResolvedValue(project());
      const persisted = {
        ...iom,
        statusId: STATUS_IDS[IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING],
        version: 4,
      };
      stubs.iomRepoTxn.findOne.mockResolvedValue(persisted);
      submissionNotifier.notifySubmission.mockRejectedValueOnce(
        new Error('SMTP down'),
      );

      const returned = await service.editIom(
        CRM_USER,
        1,
        fullEditBody() as any,
        fullEditBody(),
      );

      expect(returned).toBe(persisted);
      expect(submissionNotifier.notifySubmission).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------
  // Project access
  // -------------------------------------------------------------
  describe('project access', () => {
    it('blocks editIom on foreign project', async () => {
      const foreign = baseIom({ projectId: 999 });
      stubs.iomRepoTxn.createQueryBuilder.mockReturnValue(makeLockQB(foreign));

      try {
        await service.editIom(
          CRM_USER,
          1,
          fullEditBody() as any,
          fullEditBody(),
        );
        fail('expected throw');
      } catch (e) {
        expectErrCode(e, IomErrorCodeEnum.UNAUTHORIZED_PROJECT_ACCESS);
      }
    });
  });

  // -------------------------------------------------------------
  // 404 path
  // -------------------------------------------------------------
  describe('not found', () => {
    it('throws IOM_NOT_FOUND when the row does not exist or is soft-deleted', async () => {
      stubs.iomRepoTxn.createQueryBuilder.mockReturnValue(makeLockQB(null));

      try {
        await service.editIom(
          CRM_USER,
          1,
          fullEditBody() as any,
          fullEditBody(),
        );
        fail('expected throw');
      } catch (e) {
        expectErrCode(e, IomErrorCodeEnum.IOM_NOT_FOUND);
      }
    });
  });

  // -------------------------------------------------------------
  // action = draft
  // -------------------------------------------------------------
  describe('action = draft', () => {
    it('saves to DRAFT without running mandatory submission validation', async () => {
      const iom = baseIom();
      const updateQB = makeUpdateQB(1);
      stubs.iomRepoTxn.createQueryBuilder
        .mockReturnValueOnce(makeLockQB(iom))
        .mockReturnValueOnce(updateQB);
      stubs.projectRepoTxn.findOne.mockResolvedValue(project());
      stubs.iomRepoTxn.findOne.mockResolvedValue({
        ...iom,
        statusId: STATUS_IDS[IomStatusCodeEnum.DRAFT],
        version: 4,
      });

      const body = { ...fullEditBody(), action: 'draft' as const };
      await service.editIom(CRM_USER, 1, body as any, body);

      const setCall = updateQB.set.mock.calls[0][0];
      expect(setCall.statusId).toBe(STATUS_IDS[IomStatusCodeEnum.DRAFT]);
      expect(setCall.submittedAt).toBeUndefined();
      expect(workflow.validateTransition).not.toHaveBeenCalled();
    });

    it('emits CRM_EDIT (when fields changed) and CRM_DRAFT events', async () => {
      const iom = baseIom();
      const updateQB = makeUpdateQB(1);
      stubs.iomRepoTxn.createQueryBuilder
        .mockReturnValueOnce(makeLockQB(iom))
        .mockReturnValueOnce(updateQB);
      stubs.projectRepoTxn.findOne.mockResolvedValue(project());
      stubs.iomRepoTxn.findOne.mockResolvedValue({
        ...iom,
        salePrice: 8_000_000,
        statusId: STATUS_IDS[IomStatusCodeEnum.DRAFT],
        version: 4,
      });

      const body = {
        action: 'draft' as const,
        salePriceEdited: true,
        salePrice: 8_000_000,
      };
      await service.editIom(CRM_USER, 1, body as any, body);

      const calls = (eventEmitter.emit as jest.Mock).mock.calls.filter(
        (c) => c[0] === IOM_HISTORY_EVENT,
      );
      expect(calls).toHaveLength(2);
      expect(
        calls.find((c) => c[1].action === IomHistoryActionEnum.CRM_EDIT),
      ).toBeDefined();
      const draftEvent = calls.find(
        (c) => c[1].action === IomHistoryActionEnum.CRM_DRAFT,
      )?.[1];
      expect(draftEvent).toBeDefined();
      expect(draftEvent.toStatusId).toBe(STATUS_IDS[IomStatusCodeEnum.DRAFT]);
    });

    it('does not fire the submission notifier', async () => {
      const iom = baseIom();
      const updateQB = makeUpdateQB(1);
      stubs.iomRepoTxn.createQueryBuilder
        .mockReturnValueOnce(makeLockQB(iom))
        .mockReturnValueOnce(updateQB);
      stubs.projectRepoTxn.findOne.mockResolvedValue(project());
      stubs.iomRepoTxn.findOne.mockResolvedValue({
        ...iom,
        statusId: STATUS_IDS[IomStatusCodeEnum.DRAFT],
        version: 4,
      });

      const body = { action: 'draft' as const };
      await service.editIom(CRM_USER, 1, body as any, body);

      expect(submissionNotifier.notifySubmission).not.toHaveBeenCalled();
    });

    it('rejects draft action from a post-submit non-editable status', async () => {
      const submitted = baseIom({
        statusId: STATUS_IDS[IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING],
      });
      stubs.iomRepoTxn.createQueryBuilder.mockReturnValue(
        makeLockQB(submitted),
      );

      try {
        await service.editIom(CRM_USER, 1, { action: 'draft' } as any, {
          action: 'draft',
        });
        fail('expected throw');
      } catch (e) {
        expectErrCode(e, IomErrorCodeEnum.INVALID_STATUS_FOR_ACTION);
      }
    });

    it('allows draft from DRAFT status (re-save a draft)', async () => {
      const draftIom = baseIom({
        statusId: STATUS_IDS[IomStatusCodeEnum.DRAFT],
      });
      const updateQB = makeUpdateQB(1);
      stubs.iomRepoTxn.createQueryBuilder
        .mockReturnValueOnce(makeLockQB(draftIom))
        .mockReturnValueOnce(updateQB);
      stubs.projectRepoTxn.findOne.mockResolvedValue(project());
      stubs.iomRepoTxn.findOne.mockResolvedValue({
        ...draftIom,
        version: 4,
      });

      const body = { action: 'draft' as const };
      await service.editIom(CRM_USER, 1, body as any, body);

      const setCall = updateQB.set.mock.calls[0][0];
      expect(setCall.statusId).toBe(STATUS_IDS[IomStatusCodeEnum.DRAFT]);
    });
  });

  // -------------------------------------------------------------
  // action = resubmit
  // -------------------------------------------------------------
  describe('action = resubmit', () => {
    it('transitions to CRM_TL_APPROVAL_PENDING from a rejected status', async () => {
      const rejected = baseIom({
        statusId: STATUS_IDS[IomStatusCodeEnum.CRM_TL_REJECTED],
      });
      const updateQB = makeUpdateQB(1);
      stubs.iomRepoTxn.createQueryBuilder
        .mockReturnValueOnce(makeLockQB(rejected))
        .mockReturnValueOnce(updateQB);
      stubs.projectRepoTxn.findOne.mockResolvedValue(project());
      stubs.iomRepoTxn.findOne.mockResolvedValue({
        ...rejected,
        statusId: STATUS_IDS[IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING],
        version: 4,
      });

      const body = { action: 'resubmit' as const };
      await service.editIom(CRM_USER, 1, body as any, body);

      const setCall = updateQB.set.mock.calls[0][0];
      expect(setCall.statusId).toBe(
        STATUS_IDS[IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING],
      );
      expect(setCall.submittedAt).toBeInstanceOf(Date);
    });

    it('transitions to CRM_TL_APPROVAL_PENDING from DRAFT', async () => {
      const draftIom = baseIom({
        statusId: STATUS_IDS[IomStatusCodeEnum.DRAFT],
      });
      const updateQB = makeUpdateQB(1);
      stubs.iomRepoTxn.createQueryBuilder
        .mockReturnValueOnce(makeLockQB(draftIom))
        .mockReturnValueOnce(updateQB);
      stubs.projectRepoTxn.findOne.mockResolvedValue(project());
      stubs.iomRepoTxn.findOne.mockResolvedValue({
        ...draftIom,
        statusId: STATUS_IDS[IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING],
        version: 4,
      });

      const body = { action: 'resubmit' as const };
      await service.editIom(CRM_USER, 1, body as any, body);

      const setCall = updateQB.set.mock.calls[0][0];
      expect(setCall.statusId).toBe(
        STATUS_IDS[IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING],
      );
    });

    it('emits CRM_RESUBMIT event', async () => {
      const rejected = baseIom({
        statusId: STATUS_IDS[IomStatusCodeEnum.CRM_TL_REJECTED],
      });
      const updateQB = makeUpdateQB(1);
      stubs.iomRepoTxn.createQueryBuilder
        .mockReturnValueOnce(makeLockQB(rejected))
        .mockReturnValueOnce(updateQB);
      stubs.projectRepoTxn.findOne.mockResolvedValue(project());
      stubs.iomRepoTxn.findOne.mockResolvedValue({
        ...rejected,
        statusId: STATUS_IDS[IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING],
        version: 4,
      });

      const body = { action: 'resubmit' as const };
      await service.editIom(CRM_USER, 1, body as any, body);

      const historyCalls = (eventEmitter.emit as jest.Mock).mock.calls.filter(
        (c) => c[0] === IOM_HISTORY_EVENT,
      );
      const resubmitEvent = historyCalls.find(
        (c) => c[1].action === IomHistoryActionEnum.CRM_RESUBMIT,
      )?.[1];
      expect(resubmitEvent).toBeDefined();
      expect(resubmitEvent.toStatusId).toBe(
        STATUS_IDS[IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING],
      );
    });

    it('rejects resubmit from IOM_TO_BE_CREATED', async () => {
      stubs.iomRepoTxn.createQueryBuilder.mockReturnValue(
        makeLockQB(baseIom()),
      );

      try {
        await service.editIom(CRM_USER, 1, { action: 'resubmit' } as any, {
          action: 'resubmit',
        });
        fail('expected throw');
      } catch (e) {
        expectErrCode(e, IomErrorCodeEnum.INVALID_STATUS_FOR_ACTION);
      }
    });

    it('fires the submission notifier on resubmit', async () => {
      const rejected = baseIom({
        statusId: STATUS_IDS[IomStatusCodeEnum.CRM_TL_REJECTED],
      });
      const updateQB = makeUpdateQB(1);
      stubs.iomRepoTxn.createQueryBuilder
        .mockReturnValueOnce(makeLockQB(rejected))
        .mockReturnValueOnce(updateQB);
      stubs.projectRepoTxn.findOne.mockResolvedValue(project());
      const persisted = {
        ...rejected,
        statusId: STATUS_IDS[IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING],
        version: 4,
      };
      stubs.iomRepoTxn.findOne.mockResolvedValue(persisted);

      const body = { action: 'resubmit' as const };
      await service.editIom(CRM_USER, 1, body as any, body);

      expect(submissionNotifier.notifySubmission).toHaveBeenCalledTimes(1);
      expect(submissionNotifier.notifySubmission).toHaveBeenCalledWith({
        iom: persisted,
        submittedByUserId: CRM_USER.dbId,
      });
    });
  });
});

/**
 * Slimmer coverage of the unchanged generate/submit/resubmit flows.
 * The edit-specific behaviour gets its dedicated suite above.
 */
describe('IomCrmService (generate / submit / resubmit)', () => {
  let stubs: ReturnType<typeof wireStubs>;
  let workflow: jest.Mocked<WorkflowValidationService>;
  let validator: IomValidationService;
  let eventEmitter: EventEmitter2;
  let service: IomCrmService;

  beforeEach(() => {
    stubs = wireStubs();
    workflow = makeWorkflow();
    workflow.validateTransition.mockImplementation((from, to, role) => {
      if (role !== CRM_ROLE_ID) {
        throw new ForbiddenException({
          code: IomErrorCodeEnum.INVALID_STATUS_FOR_ACTION,
        });
      }
      const allowed = new Set([
        `${STATUS_IDS[IomStatusCodeEnum.IOM_TO_BE_CREATED]}|${STATUS_IDS[IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING]}`,
        `${STATUS_IDS[IomStatusCodeEnum.CRM_TL_REJECTED]}|${STATUS_IDS[IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING]}`,
      ]);
      if (!allowed.has(`${from}|${to}`)) {
        throw new ForbiddenException({
          code: IomErrorCodeEnum.INVALID_STATUS_FOR_ACTION,
        });
      }
    });
    validator = new IomValidationService(stubs.projectUserMappingRepo as any);
    eventEmitter = new EventEmitter2();
    jest.spyOn(eventEmitter, 'emit');
    service = makeIomCrmService(
      stubs,
      workflow,
      validator,
      eventEmitter,
      makeSubmissionNotifier(),
    );
  });

  describe('generateIom', () => {
    it('maps ER_DUP_ENTRY to DUPLICATE_IOM_EXISTS', async () => {
      const bookingQB = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 100,
          paymentStatus: PaymentStatusEnum.PAID,
          projectPhase: { project: { id: 10 } },
        }),
      };
      stubs.bookingRepoTxn.createQueryBuilder.mockReturnValue(bookingQB);
      stubs.iomRepoTxn.findOne.mockResolvedValue(null);
      const iomRepoSave = Object.assign(stubs.iomRepoTxn, {
        create: jest.fn((x) => x),
        save: jest.fn(),
      }) as any;
      const dup = new QueryFailedError('INSERT', [], new Error('dup'));
      (dup as any).driverError = { code: 'ER_DUP_ENTRY' };
      iomRepoSave.save.mockRejectedValue(dup);

      try {
        await service.generateIom(CRM_USER, {
          bookingId: 100,
          salePrice: 1000,
          totalBrokerageAmount: 50,
          brokeragePercentage: 5,
          customerMobile: '9999999999',
          referralSplitType: 'EQUAL',
          referrerPoints: 10,
          refereePoints: 10,
          referralClassification: 'CLASS_A',
        });
        fail('expected throw');
      } catch (err) {
        expectErrCode(err, IomErrorCodeEnum.DUPLICATE_IOM_EXISTS);
      }
    });
  });

  describe('submitIom', () => {
    it('refuses from a rejected state (use /resubmit)', async () => {
      stubs.iomRepo.findOne.mockResolvedValue(
        baseIom({
          statusId: STATUS_IDS[IomStatusCodeEnum.CRM_TL_REJECTED],
          rejectionReason: 'too high',
        }),
      );
      try {
        await service.submitIom(CRM_USER, 1, {});
        fail('expected throw');
      } catch (e) {
        expectErrCode(e, IomErrorCodeEnum.INVALID_STATUS_FOR_ACTION);
      }
    });
  });

  describe('resubmitIom', () => {
    it('requires rejection_reason', async () => {
      stubs.iomRepo.findOne.mockResolvedValue(
        baseIom({
          statusId: STATUS_IDS[IomStatusCodeEnum.CRM_TL_REJECTED],
          rejectionReason: null,
        }),
      );
      try {
        await service.resubmitIom(CRM_USER, 1, {});
        fail('expected throw');
      } catch (e) {
        expectErrCode(e, IomErrorCodeEnum.REJECTION_REASON_MISSING);
      }
    });
  });

  describe('getIom', () => {
    const mockGetIomQb = (iom: Iom | null) => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(iom),
      };
      stubs.iomRepo.createQueryBuilder.mockReturnValue(qb);
      return qb;
    };

    const mockProjectMappings = (
      mappings: Array<{
        role: string;
        user: { id: number; name: string; signatureImage?: string | null };
        isPrimary?: boolean;
      }>,
    ) => {
      // Overrides ONLY the reviewer-lookup lane (where the find call
      // filters by `project.id`). The user-lookup lane used by
      // `IomValidationService.assertProjectAccess` (filters by
      // `user.id`) falls through to the default stub in
      // `wireStubs`, so existing test users keep their project
      // access without each test having to wire it up.
      (stubs.projectUserMappingRepo.find as jest.Mock).mockImplementation(
        (opts?: any) => {
          const where = opts?.where ?? {};
          if (where.user) {
            const callerId = (where.user as { id?: number }).id;
            const baseProjects: number[] = CRM_USER.crmProjects ?? [];
            // Any non-default caller (e.g. the assigned TL in a
            // self-signature test) shares the same project access.
            void callerId;
            return Promise.resolve(
              baseProjects.map((id) => ({
                project: { id },
                removedAt: null,
              })),
            );
          }
          return Promise.resolve(
            mappings.map((m) => ({
              role: m.role,
              user: m.user,
              isPrimary: m.isPrimary ?? false,
              assignedAt: new Date(),
            })),
          );
        },
      );
    };

    it('returns "editable" when workflow.canAct is true', async () => {
      mockGetIomQb(
        baseIom({ statusId: STATUS_IDS[IomStatusCodeEnum.IOM_TO_BE_CREATED] }),
      );
      const out = await service.getIom(CRM_USER, 1);
      expect(out.mode).toBe('editable');
    });

    it('returns "view-only" when workflow.canAct is false', async () => {
      workflow.canAct.mockReturnValue(false);
      mockGetIomQb(
        baseIom({ statusId: STATUS_IDS[IomStatusCodeEnum.IOM_CLOSED] }),
      );
      const out = await service.getIom(CRM_USER, 1);
      expect(out.mode).toBe('view-only');
    });

    it('builds a full signatory block with names + signatures', async () => {
      const iomRow = baseIom({
        statusId: STATUS_IDS[IomStatusCodeEnum.POINTS_TO_BE_UPLOADED],
        createdBy: 7,
        crmVerifiedBy: 11,
        crmApprovedBy: 12,
        financeVerifiedBy: 21,
        financeApprovedBy: 22,
        crmVerifiedAt: new Date('2024-01-02T10:00:00Z'),
        crmApprovedAt: new Date('2024-01-03T10:00:00Z'),
        financeVerifiedAt: new Date('2024-01-04T10:00:00Z'),
        financeApprovedAt: new Date('2024-01-05T10:00:00Z'),
        submittedAt: new Date('2024-01-01T10:00:00Z'),
        creator: { id: 7, name: 'Alice CRM', signatureImage: 'sig-alice.png' },
        crmVerifier: {
          id: 11,
          name: 'Bob TL',
          signatureImage: 'sig-bob.png',
        },
        crmApprover: {
          id: 12,
          name: 'Carol Head',
          signatureImage: 'sig-carol.png',
        },
        finVerifier: {
          id: 21,
          name: 'Dan FinVer',
          signatureImage: 'sig-dan.png',
        },
        finApprover: {
          id: 22,
          name: 'Eve FinHead',
          signatureImage: 'sig-eve.png',
        },
      } as any);
      mockGetIomQb(iomRow);

      const out = await service.getIom(CRM_USER, 1);

      expect(out.signatories.crm.name).toBe('Alice CRM');
      expect(out.signatories.crm.signature).toBe('sig-alice.png');
      expect(out.signatories.crm.hasActed).toBe(true);
      expect(out.signatories.crm.signatureMissing).toBe(false);

      expect(out.signatories.crmTl.name).toBe('Bob TL');
      expect(out.signatories.crmTl.signature).toBe('sig-bob.png');
      expect(out.signatories.crmTl.hasActed).toBe(true);
      expect(out.signatories.crmTl.additionalReviewers).toBeUndefined();

      expect(out.signatories.crmHead.signature).toBe('sig-carol.png');
      expect(out.signatories.financeVerifier.signature).toBe('sig-dan.png');
      expect(out.signatories.financeApprover.signature).toBe('sig-eve.png');
    });

    it('exposes project-assigned reviewer names without signatures before they act', async () => {
      const iomRow = baseIom({
        statusId: STATUS_IDS[IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING],
        creator: { id: 7, name: 'Alice CRM', signatureImage: 'sig-alice.png' },
      } as any);
      mockGetIomQb(iomRow);
      mockProjectMappings([
        {
          role: RolesEnum.CRM_TL,
          user: { id: 11, name: 'Bob TL' },
          isPrimary: true,
        },
        { role: RolesEnum.CRM_TL, user: { id: 13, name: 'Dave TL' } },
        {
          role: RolesEnum.CRM_HEAD,
          user: { id: 12, name: 'Carol Head' },
        },
        {
          role: RolesEnum.FINANCE_USER,
          user: { id: 21, name: 'Dan FinVer' },
        },
        {
          role: RolesEnum.FINANCE_HEAD,
          user: { id: 22, name: 'Eve FinHead' },
        },
      ]);

      const out = await service.getIom(CRM_USER, 1);

      expect(out.signatories.crm.signature).toBe('sig-alice.png');
      expect(out.signatories.crm.hasActed).toBe(true);

      expect(out.signatories.crmTl.name).toBe('Bob TL');
      expect(out.signatories.crmTl.userId).toBe(11);
      expect(out.signatories.crmTl.hasActed).toBe(false);
      expect(out.signatories.crmTl.signature).toBeNull();
      expect(out.signatories.crmTl.signedAt).toBeNull();
      expect(out.signatories.crmTl.additionalReviewers).toEqual([
        { userId: 13, name: 'Dave TL' },
      ]);

      expect(out.signatories.crmHead.name).toBe('Carol Head');
      expect(out.signatories.crmHead.signature).toBeNull();
      expect(out.signatories.crmHead.additionalReviewers).toBeUndefined();

      expect(out.signatories.financeVerifier.name).toBe('Dan FinVer');
      expect(out.signatories.financeVerifier.signature).toBeNull();
      expect(out.signatories.financeApprover.name).toBe('Eve FinHead');
      expect(out.signatories.financeApprover.signature).toBeNull();
    });

    it('surfaces the current caller as the slot user with their own signature on a pending stage', async () => {
      // The IOM is waiting for CRM TL approval. The caller (Bob TL,
      // id 11) is the assigned primary CRM TL for the project AND
      // has a signature_image on their Users record. Expectation:
      // the crmTl slot identifies Bob as the slot user AND exposes
      // his own signature - even though `hasActed` is still false.
      const TL_CALLER = {
        dbId: 11,
        email: 'bob.tl@example.test',
        role: RolesEnum.CRM_TL,
        crmProjects: [10, 11, 12],
      };
      const iomRow = baseIom({
        statusId: STATUS_IDS[IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING],
        creator: { id: 7, name: 'Alice CRM', signatureImage: 'sig-alice.png' },
      } as any);
      mockGetIomQb(iomRow);
      mockProjectMappings([
        {
          role: RolesEnum.CRM_TL,
          user: { id: 11, name: 'Bob TL', signatureImage: 'sig-bob.png' },
          isPrimary: true,
        },
        {
          role: RolesEnum.CRM_HEAD,
          user: { id: 12, name: 'Carol Head', signatureImage: 'sig-carol.png' },
        },
      ]);

      const out = await service.getIom(TL_CALLER, 1);

      expect(out.signatories.crm.signature).toBe('sig-alice.png');
      expect(out.signatories.crmTl.userId).toBe(11);
      expect(out.signatories.crmTl.name).toBe('Bob TL');
      expect(out.signatories.crmTl.hasActed).toBe(false);
      expect(out.signatories.crmTl.signature).toBe('sig-bob.png');
      expect(out.signatories.crmTl.signatureMissing).toBe(false);
      // Upper hierarchy stays hidden - we only ever surface the
      // caller's OWN signature, never another pending reviewer's.
      expect(out.signatories.crmHead.signature).toBeNull();
    });

    it('promotes the caller over the configured primary on a pending stage', async () => {
      // Dave TL (id 13) is the assigned non-primary CRM TL. He is
      // the one viewing the IOM. Expectation: Dave wins the slot
      // (even though Bob is flagged isPrimary) and his signature is
      // surfaced; Bob is demoted to additionalReviewers with no
      // signature exposed.
      const DAVE_CALLER = {
        dbId: 13,
        email: 'dave.tl@example.test',
        role: RolesEnum.CRM_TL,
        crmProjects: [10, 11, 12],
      };
      const iomRow = baseIom({
        statusId: STATUS_IDS[IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING],
        creator: { id: 7, name: 'Alice CRM', signatureImage: 'sig-alice.png' },
      } as any);
      mockGetIomQb(iomRow);
      mockProjectMappings([
        {
          role: RolesEnum.CRM_TL,
          user: { id: 11, name: 'Bob TL', signatureImage: 'sig-bob.png' },
          isPrimary: true,
        },
        {
          role: RolesEnum.CRM_TL,
          user: { id: 13, name: 'Dave TL', signatureImage: 'sig-dave.png' },
        },
      ]);

      const out = await service.getIom(DAVE_CALLER, 1);

      expect(out.signatories.crmTl.userId).toBe(13);
      expect(out.signatories.crmTl.name).toBe('Dave TL');
      expect(out.signatories.crmTl.signature).toBe('sig-dave.png');
      expect(out.signatories.crmTl.additionalReviewers).toEqual([
        { userId: 11, name: 'Bob TL' },
      ]);
    });

    it('does not leak signatures of other assigned reviewers to the caller', async () => {
      // The caller is the CRM creator (Alice, id 7). She is NOT an
      // assigned CRM TL. The crmTl slot must therefore continue to
      // show the configured primary (Bob) with NO signature - the
      // pre-existing privacy contract is preserved for non-callers.
      const iomRow = baseIom({
        statusId: STATUS_IDS[IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING],
        creator: { id: 7, name: 'Alice CRM', signatureImage: 'sig-alice.png' },
      } as any);
      mockGetIomQb(iomRow);
      mockProjectMappings([
        {
          role: RolesEnum.CRM_TL,
          user: { id: 11, name: 'Bob TL', signatureImage: 'sig-bob.png' },
          isPrimary: true,
        },
      ]);

      const out = await service.getIom(CRM_USER, 1);

      expect(out.signatories.crmTl.userId).toBe(11);
      expect(out.signatories.crmTl.name).toBe('Bob TL');
      expect(out.signatories.crmTl.signature).toBeNull();
      expect(out.signatories.crmTl.signatureMissing).toBe(false);
    });

    it('returns name=null when the project has no mapping for a role', async () => {
      const iomRow = baseIom({
        statusId: STATUS_IDS[IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING],
        creator: { id: 7, name: 'Alice CRM', signatureImage: 'sig-alice.png' },
      } as any);
      mockGetIomQb(iomRow);
      mockProjectMappings([]);

      const out = await service.getIom(CRM_USER, 1);

      expect(out.signatories.crmTl.name).toBeNull();
      expect(out.signatories.crmTl.userId).toBeNull();
      expect(out.signatories.crmTl.signature).toBeNull();
      expect(out.signatories.crmTl.additionalReviewers).toBeUndefined();
    });

    it('falls back to oldest assigned mapping when no isPrimary is flagged', async () => {
      const iomRow = baseIom({
        statusId: STATUS_IDS[IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING],
        creator: { id: 7, name: 'Alice CRM', signatureImage: 'sig-alice.png' },
      } as any);
      mockGetIomQb(iomRow);
      mockProjectMappings([
        { role: RolesEnum.CRM_TL, user: { id: 11, name: 'Bob TL' } },
        { role: RolesEnum.CRM_TL, user: { id: 13, name: 'Dave TL' } },
      ]);

      const out = await service.getIom(CRM_USER, 1);

      expect(out.signatories.crmTl.name).toBe('Bob TL');
      expect(out.signatories.crmTl.additionalReviewers).toEqual([
        { userId: 13, name: 'Dave TL' },
      ]);
    });

    it('flags signatureMissing when an actor has no signature_image', async () => {
      const iomRow = baseIom({
        statusId: STATUS_IDS[IomStatusCodeEnum.CRM_HEAD_APPROVAL_PENDING],
        crmVerifiedBy: 11,
        crmVerifiedAt: new Date('2024-01-02T10:00:00Z'),
        creator: { id: 7, name: 'Alice CRM', signatureImage: 'sig-alice.png' },
        crmVerifier: { id: 11, name: 'Bob TL', signatureImage: null },
      } as any);
      mockGetIomQb(iomRow);
      mockProjectMappings([]);

      const out = await service.getIom(CRM_USER, 1);

      expect(out.signatories.crmTl.hasActed).toBe(true);
      expect(out.signatories.crmTl.signature).toBeNull();
      expect(out.signatories.crmTl.signatureMissing).toBe(true);
    });

    it('throws IOM_NOT_FOUND when the row does not exist', async () => {
      mockGetIomQb(null);
      try {
        await service.getIom(CRM_USER, 1);
        fail('expected throw');
      } catch (e) {
        expectErrCode(e, IomErrorCodeEnum.IOM_NOT_FOUND);
      }
    });

    it('blocks getIom on a foreign project', async () => {
      mockGetIomQb(baseIom({ projectId: 999 }));
      try {
        await service.getIom(CRM_USER, 1);
        fail('expected throw');
      } catch (e) {
        expectErrCode(e, IomErrorCodeEnum.UNAUTHORIZED_PROJECT_ACCESS);
      }
    });
  });
});

describe('IomCrmService.getIomPdf', () => {
  let stubs: ReturnType<typeof wireStubs>;
  let workflow: jest.Mocked<WorkflowValidationService>;
  let validator: IomValidationService;
  let eventEmitter: EventEmitter2;
  let pdfService: ReturnType<typeof makePdfService>;
  let awsService: ReturnType<typeof makeAwsService>;
  let configService: ReturnType<typeof makeConfigService>;
  let service: IomCrmService;

  const mockPdfIomQb = (iom: Iom | null) => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(iom),
    };
    stubs.iomRepo.createQueryBuilder.mockReturnValue(qb);
    return qb;
  };

  const pdfReadyIom = (overrides: Partial<Iom> = {}): Iom =>
    baseIom({
      iomNo: 'IOM-001',
      status: { label: 'CRM TL Approval Pending' } as any,
      creator: { id: 7, name: 'Alice CRM', signatureImage: 'sig-alice.png' },
      ...overrides,
    } as any);

  beforeEach(() => {
    stubs = wireStubs();
    workflow = makeWorkflow();
    validator = new IomValidationService(stubs.projectUserMappingRepo as any);
    eventEmitter = new EventEmitter2();
    pdfService = makePdfService();
    awsService = makeAwsService();
    configService = makeConfigService();
    service = makeIomCrmService(
      stubs,
      workflow,
      validator,
      eventEmitter,
      makeSubmissionNotifier(),
      pdfService,
      awsService,
      configService,
    );
    (buildIomDetailsTemplateVars as jest.Mock).mockClear();
  });

  it('generates, uploads, updates DB, and returns filePath + basePath for API calls', async () => {
    mockPdfIomQb(pdfReadyIom());

    const out = await service.getIomPdf(1, CRM_USER);

    expect(pdfService.generatePdf).toHaveBeenCalledWith('<html></html>');
    expect(awsService.uploadToS3).toHaveBeenCalledWith(
      expect.stringMatching(/^exports\/iom\/iom-1-\d+\.pdf$/),
      expect.any(Object),
      true,
    );
    expect(stubs.iomRepo.update).toHaveBeenCalledWith(
      { id: 1 },
      { iomPdf: expect.stringMatching(/^exports\/iom\/iom-1-\d+\.pdf$/) },
    );
    expect(out).toEqual({
      filePath: expect.stringMatching(/^exports\/iom\/iom-1-\d+\.pdf$/),
      basePath: 'https://s3.example.com/',
    });
  });

  it('returns undefined for internal calls without a logged-in user', async () => {
    mockPdfIomQb(pdfReadyIom());

    const out = await service.getIomPdf(1);

    expect(pdfService.generatePdf).toHaveBeenCalledWith('<html></html>');
    expect(awsService.uploadToS3).toHaveBeenCalled();
    expect(stubs.iomRepo.update).toHaveBeenCalled();
    expect(out).toBeUndefined();
  });

  it('merges referral edit reason PDF when reason text is present', async () => {
    mockPdfIomQb(
      pdfReadyIom({ referralPointsEditReason: 'Adjusted split after review' }),
    );

    await service.getIomPdf(1, CRM_USER);

    expect(pdfService.mergeWithMainPdf).toHaveBeenCalled();
  });

  it('does not merge when referral edit reason is absent', async () => {
    mockPdfIomQb(pdfReadyIom({ referralPointsEditReason: null }));

    await service.getIomPdf(1, CRM_USER);

    expect(pdfService.mergeWithMainPdf).not.toHaveBeenCalled();
  });

  it('blocks API calls on a foreign project', async () => {
    mockPdfIomQb(pdfReadyIom({ projectId: 999 }));

    try {
      await service.getIomPdf(1, CRM_USER);
      fail('expected throw');
    } catch (e) {
      expectErrCode(e, IomErrorCodeEnum.UNAUTHORIZED_PROJECT_ACCESS);
    }
  });

  it('scopes signatories for API callers above their role level', async () => {
    const mockProjectMappings = (
      mappings: Array<{
        role: string;
        user: { id: number; name: string; signatureImage?: string | null };
        isPrimary?: boolean;
      }>,
    ) => {
      (stubs.projectUserMappingRepo.find as jest.Mock).mockImplementation(
        (opts?: any) => {
          const where = opts?.where ?? {};
          if (where.user) {
            return Promise.resolve(
              (CRM_TL_USER.crmProjects ?? []).map((id) => ({
                project: { id },
                removedAt: null,
              })),
            );
          }
          return Promise.resolve(
            mappings.map((m) => ({
              role: m.role,
              user: m.user,
              isPrimary: m.isPrimary ?? false,
              assignedAt: new Date(),
            })),
          );
        },
      );
    };

    mockPdfIomQb(
      pdfReadyIom({
        statusId: STATUS_IDS[IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING],
      }),
    );
    mockProjectMappings([
      {
        role: RolesEnum.CRM_TL,
        user: { id: 11, name: 'Bob TL', signatureImage: 'sig-bob.png' },
        isPrimary: true,
      },
      {
        role: RolesEnum.CRM_HEAD,
        user: { id: 11, name: 'Bob TL', signatureImage: 'sig-bob.png' },
        isPrimary: true,
      },
    ]);

    await service.getIomPdf(1, CRM_TL_USER);

    const signatories = (
      buildIomDetailsTemplateVars as jest.Mock
    ).mock.calls.at(-1)?.[2];
    expect(signatories.crmTl.signature).toBe('sig-bob.png');
    expect(signatories.crmHead.signature).toBeNull();
  });

  it('regenerates PDF when iomPdf already exists', async () => {
    mockPdfIomQb(
      pdfReadyIom({ iomPdf: 'exports/iom/iom-1-1700000000000.pdf' }),
    );

    await service.getIomPdf(1, CRM_USER);

    expect(awsService.uploadToS3).toHaveBeenCalledWith(
      expect.stringMatching(/^exports\/iom\/iom-1-\d+\.pdf$/),
      expect.any(Object),
      true,
    );
    expect(stubs.iomRepo.update).toHaveBeenCalledWith(
      { id: 1 },
      {
        iomPdf: expect.not.stringMatching(
          /^exports\/iom\/iom-1-1700000000000\.pdf$/,
        ),
      },
    );
  });

  it('calls generatePdf with HTML only (no CSS argument)', async () => {
    mockPdfIomQb(
      pdfReadyIom({ referralPointsEditReason: 'Adjusted split after review' }),
    );

    await service.getIomPdf(1, CRM_USER);

    expect(pdfService.generatePdf).toHaveBeenCalledTimes(2);
    for (const call of (pdfService.generatePdf as jest.Mock).mock.calls) {
      expect(call).toHaveLength(1);
      expect(typeof call[0]).toBe('string');
    }
  });
});
