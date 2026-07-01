import { HttpException } from '@nestjs/common';

import { Iom } from '../entities/iom.entity';
import { IomErrorCodeEnum } from '../enums/iom-error-code.enum';
import { RolesEnum } from 'src/enums/roles.enum';
import { IomAgeingService } from './iom-ageing.service';
import { AuthenticatedUser } from './iom-validation.service';

const CRM_USER: AuthenticatedUser = {
  dbId: 7,
  email: 'crm@example.test',
  role: RolesEnum.CRM,
  crmProjects: [10],
};

/**
 * Build the minimal IOM shape consumed by the service. Only the
 * columns the summary projection reads are populated; everything
 * else is left undefined.
 */
const makeIom = (overrides: Partial<Iom> = {}): Iom =>
  ({
    id: 12,
    iomNo: 'IOM00045',
    salesOrderId: 'SO123456',
    projectId: 10,
    customerDetails: { name: 'Rahul Sharma' },
    createdAt: new Date('2026-06-26T09:10:00Z'),
    statusId: 2,
    status: {
      id: 2,
      code: 'CRM_TL_APPROVAL_PENDING',
      label: 'CRM TL Approval Pending',
    },
    project: { id: 10, name: 'Purva Heights' },
    ...overrides,
  }) as Iom;

/**
 * Convenience shape mirroring `RawTimelineRow`. Kept colocated with the
 * tests because the interface is service-private.
 */
type RawRow = {
  historyId: number;
  toStatusId: number;
  action: string | null;
  remarks: string | null;
  changedAt: Date;
  changedBy: number | null;
  statusCode: string | null;
  userId: number | null;
  userName: string | null;
};

describe('IomAgeingService', () => {
  let service: IomAgeingService;
  let iomQb: {
    innerJoinAndSelect: jest.Mock;
    leftJoinAndSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    getOne: jest.Mock;
  };
  let historyQb: {
    leftJoin: jest.Mock;
    where: jest.Mock;
    orderBy: jest.Mock;
    addOrderBy: jest.Mock;
    select: jest.Mock;
    getRawMany: jest.Mock;
  };
  let iomRepo: { createQueryBuilder: jest.Mock };
  let historyRepo: { createQueryBuilder: jest.Mock };
  let validator: { assertProjectAccess: jest.Mock };

  /**
   * Freeze `now` so per-stage duration and summary ageing become
   * deterministic. The chosen instant is 5 days after the IOM was
   * created.
   */
  const NOW = new Date('2026-07-01T09:10:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);

    iomQb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };
    historyQb = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    };
    iomRepo = { createQueryBuilder: jest.fn().mockReturnValue(iomQb) };
    historyRepo = { createQueryBuilder: jest.fn().mockReturnValue(historyQb) };
    validator = { assertProjectAccess: jest.fn().mockResolvedValue(undefined) };

    service = new IomAgeingService(
      iomRepo as never,
      historyRepo as never,
      validator as never,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('error handling', () => {
    it('throws IOM_NOT_FOUND when the IOM does not exist', async () => {
      iomQb.getOne.mockResolvedValue(null);

      await expect(
        service.getAgeingTimeline(CRM_USER, 99),
      ).rejects.toMatchObject({
        response: { code: IomErrorCodeEnum.IOM_NOT_FOUND },
      });

      expect(validator.assertProjectAccess).not.toHaveBeenCalled();
      expect(historyRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('propagates project-access denial from the validator', async () => {
      iomQb.getOne.mockResolvedValue(makeIom());
      validator.assertProjectAccess.mockRejectedValue(
        new HttpException(
          { code: IomErrorCodeEnum.UNAUTHORIZED_PROJECT_ACCESS },
          403,
        ),
      );

      await expect(
        service.getAgeingTimeline(CRM_USER, 12),
      ).rejects.toMatchObject({
        response: { code: IomErrorCodeEnum.UNAUTHORIZED_PROJECT_ACCESS },
      });

      expect(historyRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('empty timeline (no history rows)', () => {
    it('returns summary with timeline = [] and uses createdAt as the ageing anchor', async () => {
      iomQb.getOne.mockResolvedValue(makeIom());
      historyQb.getRawMany.mockResolvedValue([]);

      const result = await service.getAgeingTimeline(CRM_USER, 12);

      expect(result.timeline).toEqual([]);
      expect(result.summary).toEqual({
        iomId: 12,
        salesOrderId: 'SO123456',
        iomNo: 'IOM00045',
        projectName: 'Purva Heights',
        customerName: 'Rahul Sharma',
        submittedAt: new Date('2026-06-26T09:10:00Z'),
        currentStage: 'CRM_TL_APPROVAL_PENDING',
        currentStageSince: new Date('2026-06-26T09:10:00Z'),
        ageingInDays: 5,
        ageingInHours: 5 * 24,
      });
    });
  });

  describe('populated timeline', () => {
    /**
     * Three transitions spread across five days:
     *   - 26/06 09:10 -> IOM_TO_BE_CREATED  (by CRM User; 25h before next)
     *   - 27/06 10:10 -> CRM_TL_APPROVAL_PENDING (by CRM TL; 47h before next)
     *   - 29/06 09:10 -> CRM_HEAD_APPROVAL_PENDING (current; 48h to NOW)
     */
    const buildRows = (): RawRow[] => [
      {
        historyId: 1,
        toStatusId: 1,
        action: 'CREATE',
        remarks: null,
        changedAt: new Date('2026-06-26T09:10:00Z'),
        changedBy: 8,
        statusCode: 'IOM_TO_BE_CREATED',
        userId: 8,
        userName: 'CRM User',
      },
      {
        historyId: 2,
        toStatusId: 2,
        action: 'SUBMIT',
        remarks: 'Submitted to TL',
        changedAt: new Date('2026-06-27T10:10:00Z'),
        changedBy: 15,
        statusCode: 'CRM_TL_APPROVAL_PENDING',
        userId: 15,
        userName: 'CRM TL',
      },
      {
        historyId: 3,
        toStatusId: 3,
        action: 'APPROVE',
        remarks: 'Looks good',
        changedAt: new Date('2026-06-29T09:10:00Z'),
        changedBy: 22,
        statusCode: 'CRM_HEAD_APPROVAL_PENDING',
        userId: 22,
        userName: 'CRM Head',
      },
    ];

    it('maps every row in changed_at order and flags only the latest as the current stage', async () => {
      iomQb.getOne.mockResolvedValue(makeIom({ statusId: 3 }));
      historyQb.getRawMany.mockResolvedValue(buildRows());

      const result = await service.getAgeingTimeline(CRM_USER, 12);

      expect(result.timeline).toHaveLength(3);
      expect(result.timeline[0]).toMatchObject({
        statusId: 1,
        status: 'IOM_TO_BE_CREATED',
        completedOn: new Date('2026-06-26T09:10:00Z'),
        completedBy: { id: 8, name: 'CRM User' },
        action: 'CREATE',
        remarks: null,
        durationInHours: 25,
        isCurrentStage: false,
      });
      expect(result.timeline[1]).toMatchObject({
        statusId: 2,
        status: 'CRM_TL_APPROVAL_PENDING',
        completedOn: new Date('2026-06-27T10:10:00Z'),
        completedBy: { id: 15, name: 'CRM TL' },
        action: 'SUBMIT',
        remarks: 'Submitted to TL',
        durationInHours: 47,
        isCurrentStage: false,
      });
      expect(result.timeline[2]).toMatchObject({
        statusId: 3,
        status: 'CRM_HEAD_APPROVAL_PENDING',
        completedOn: new Date('2026-06-29T09:10:00Z'),
        completedBy: { id: 22, name: 'CRM Head' },
        action: 'APPROVE',
        remarks: 'Looks good',
        durationInHours: 48,
        isCurrentStage: true,
      });
    });

    it('anchors summary ageing to the latest history row, not createdAt', async () => {
      iomQb.getOne.mockResolvedValue(makeIom({ statusId: 3 }));
      historyQb.getRawMany.mockResolvedValue(buildRows());

      const result = await service.getAgeingTimeline(CRM_USER, 12);

      expect(result.summary.currentStageSince).toEqual(
        new Date('2026-06-29T09:10:00Z'),
      );
      expect(result.summary.ageingInHours).toBe(48);
      expect(result.summary.ageingInDays).toBe(2);
    });

    it('returns completedBy = null when the user join produced no row', async () => {
      iomQb.getOne.mockResolvedValue(makeIom({ statusId: 3 }));
      historyQb.getRawMany.mockResolvedValue([
        {
          ...buildRows()[0],
          userId: null,
          userName: null,
        },
      ]);

      const result = await service.getAgeingTimeline(CRM_USER, 12);

      expect(result.timeline[0].completedBy).toBeNull();
    });

    it('returns remarks = null verbatim and tolerates a missing action', async () => {
      iomQb.getOne.mockResolvedValue(makeIom({ statusId: 3 }));
      historyQb.getRawMany.mockResolvedValue([
        {
          ...buildRows()[0],
          remarks: null,
          action: null,
        },
      ]);

      const result = await service.getAgeingTimeline(CRM_USER, 12);

      expect(result.timeline[0].remarks).toBeNull();
      expect(result.timeline[0].action).toBeNull();
    });

    it('sorts the timeline by changed_at ASC via the query builder', async () => {
      iomQb.getOne.mockResolvedValue(makeIom({ statusId: 3 }));
      historyQb.getRawMany.mockResolvedValue([]);

      await service.getAgeingTimeline(CRM_USER, 12);

      expect(historyQb.orderBy).toHaveBeenCalledWith('h.changed_at', 'ASC');
      expect(historyQb.addOrderBy).toHaveBeenCalledWith('h.id', 'ASC');
      expect(historyQb.where).toHaveBeenCalledWith('h.iom_id = :iomId', {
        iomId: 12,
      });
    });
  });

  describe('query optimisation', () => {
    it('executes exactly two repository createQueryBuilder calls (no N+1)', async () => {
      iomQb.getOne.mockResolvedValue(makeIom());
      historyQb.getRawMany.mockResolvedValue([]);

      await service.getAgeingTimeline(CRM_USER, 12);

      expect(iomRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(historyRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
    });
  });

  describe('summary fallbacks', () => {
    it('returns null fields when optional columns are missing', async () => {
      iomQb.getOne.mockResolvedValue(
        makeIom({
          iomNo: null,
          salesOrderId: null,
          customerDetails: null,
          project: null,
        }),
      );
      historyQb.getRawMany.mockResolvedValue([]);

      const result = await service.getAgeingTimeline(CRM_USER, 12);

      expect(result.summary).toMatchObject({
        iomNo: null,
        salesOrderId: null,
        projectName: null,
        customerName: null,
      });
    });

    it('falls back through customerDetails keys (name -> customerName -> fullName)', async () => {
      iomQb.getOne.mockResolvedValue(
        makeIom({
          customerDetails: {
            fullName: 'Fallback Name',
          },
        }),
      );
      historyQb.getRawMany.mockResolvedValue([]);

      const result = await service.getAgeingTimeline(CRM_USER, 12);

      expect(result.summary.customerName).toBe('Fallback Name');
    });
  });
});
