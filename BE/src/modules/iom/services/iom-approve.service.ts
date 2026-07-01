import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { RolesEnum } from 'src/enums/roles.enum';

import { Iom } from '../entities/iom.entity';
import { IomStatusCodeEnum } from '../enums/iom-status-code.enum';
import { IomErrorCodeEnum } from '../enums/iom-error-code.enum';
import { throwIomError } from '../utils/iom-error.util';
import { IomHistoryEvent } from '../events/iom-history.event';
import { IOM_HISTORY_EVENT, IomHistoryActionEnum } from '../constants';

import {
  AuthenticatedUser,
  IomValidationService,
} from './iom-validation.service';
import { WorkflowValidationService } from './workflow-validation.service';
import {
  IomApprovalNotificationService,
  IomApprovalStage,
} from './iom-approval-notification.service';

import { ApproveIomDto } from '../dto/approve-iom.dto';

/**
 * Approver-column setters keyed by stage. Each stage records both the
 * actor (`*_by`) and the moment they acted (`*_at`) on the IOM row.
 * These are the partial-update payloads handed to TypeORM's `update`
 * builder alongside the status / version bump.
 *
 * The shape matches `Partial<Iom>` so the compiler enforces that every
 * stage only writes columns that actually exist on the entity.
 */
type ApprovalActorPatch = Partial<Iom>;

/**
 * Per-stage plan for the unified `POST /iom/:id/approve` endpoint.
 *
 *   expectedFrom    - The ONLY current status this approver may act
 *                     on. (Defensive identifier-level gate; the real
 *                     authorisation gate is DB-driven
 *                     `WorkflowValidationService.validateTransition`.)
 *   target          - The status the IOM moves to on approval.
 *   historyAction   - Stable, machine-readable label written to
 *                     `iom_history.action`.
 *   notifierStage   - Stage label fed to the approval-notification
 *                     helper so it can pick the right template + CC
 *                     list + next-approver lookup.
 *   priorActorIds   - Function returning every actor id that must not
 *                     equal the approver. Enforces maker-checker
 *                     rule 6 ("same user cannot act in multiple
 *                     approval stages") at every stage. Includes the
 *                     creator at every stage.
 *   actorPatch      - Function returning the actor-column patch
 *                     (`*_by` + `*_at`) for this stage, given the
 *                     acting user id. Persisted as part of the same
 *                     UPDATE that bumps status + version.
 */
interface StagePlan {
  expectedFrom: IomStatusCodeEnum;
  target: IomStatusCodeEnum;
  historyAction: IomHistoryActionEnum;
  notifierStage: IomApprovalStage;
  priorActorIds: (iom: Iom) => Array<number | null | undefined>;
  actorPatch: (userId: number, now: Date) => ApprovalActorPatch;
}

const STAGE_PLAN: Record<string, StagePlan> = {
  [RolesEnum.CRM_TL]: {
    expectedFrom: IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING,
    target: IomStatusCodeEnum.CRM_HEAD_APPROVAL_PENDING,
    historyAction: IomHistoryActionEnum.TL_APPROVE,
    notifierStage: IomApprovalStage.CRM_TL,
    priorActorIds: (iom) => [iom.createdBy],
    actorPatch: (userId, now) => ({
      crmVerifiedBy: userId,
      crmVerifiedAt: now,
    }),
  },
  [RolesEnum.CRM_HEAD]: {
    expectedFrom: IomStatusCodeEnum.CRM_HEAD_APPROVAL_PENDING,
    target: IomStatusCodeEnum.FINANCE_MEMBER_VERIFICATION_PENDING,
    historyAction: IomHistoryActionEnum.CRM_HEAD_APPROVE,
    notifierStage: IomApprovalStage.CRM_HEAD,
    priorActorIds: (iom) => [iom.createdBy, iom.crmVerifiedBy],
    actorPatch: (userId, now) => ({
      crmApprovedBy: userId,
      crmApprovedAt: now,
    }),
  },
  [RolesEnum.FINANCE_USER]: {
    expectedFrom: IomStatusCodeEnum.FINANCE_MEMBER_VERIFICATION_PENDING,
    target: IomStatusCodeEnum.FINANCE_APPROVER_APPROVAL_PENDING,
    historyAction: IomHistoryActionEnum.FINANCE_APPROVE,
    notifierStage: IomApprovalStage.FINANCE_USER,
    priorActorIds: (iom) => [
      iom.createdBy,
      iom.crmVerifiedBy,
      iom.crmApprovedBy,
    ],
    actorPatch: (userId, now) => ({
      financeVerifiedBy: userId,
      financeVerifiedAt: now,
    }),
  },
  [RolesEnum.FINANCE_HEAD]: {
    expectedFrom: IomStatusCodeEnum.FINANCE_APPROVER_APPROVAL_PENDING,
    target: IomStatusCodeEnum.POINTS_TO_BE_UPLOADED,
    historyAction: IomHistoryActionEnum.FINANCE_HEAD_APPROVE,
    notifierStage: IomApprovalStage.FINANCE_HEAD,
    priorActorIds: (iom) => [
      iom.createdBy,
      iom.crmVerifiedBy,
      iom.crmApprovedBy,
      iom.financeVerifiedBy,
    ],
    actorPatch: (userId, now) => ({
      financeApprovedBy: userId,
      financeApprovedAt: now,
    }),
  },
};

@Injectable()
export class IomApproveService {
  private readonly logger = new Logger(IomApproveService.name);

  constructor(
    @InjectRepository(Iom)
    private readonly iomRepo: Repository<Iom>,
    private readonly workflow: WorkflowValidationService,
    private readonly validator: IomValidationService,
    private readonly approvalNotifier: IomApprovalNotificationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Unified approval endpoint. The acting user's role determines the
   * stage; the contract enforced here mirrors `IomRejectService.rejectIom`:
   *
   *   1. Role gate (controller @Roles) limits callers to the 4
   *      approver roles.
   *   2. Load IOM by id; 404 if not found.
   *   3. Project scoping: approver must have access to the IOM's
   *      project.
   *   4. Stage plan lookup: caller's role -> (target, history action,
   *      notifier stage, maker-checker prior-actor ids,
   *      actor-column patch). Unmapped role => 403.
   *   5. Maker-checker rule 6: approver must not equal the creator
   *      or ANY prior-stage actor on the IOM row.
   *   6. DB-driven `validateTransition` is the single source of truth
   *      for "is this transition legal for this role from this
   *      status". This also blocks self-approval of the creator.
   *   7. Conditional UPDATE: status + actor patch (e.g. crm_verified_by
   *      + crm_verified_at) + updated_by + version bump, gated on
   *      the status the IOM was loaded with. A zero-row result
   *      indicates a concurrent state change.
   *   8. Audit event emitted to the existing IOM history pipeline.
   *   9. Approval notification helper invoked (fire-and-forget;
   *      failure does not roll back). The notifier resolves the
   *      NEXT approver(s) via project_user_mapping and CCs the
   *      creator + prior approvers; the final stage notifies the
   *      creator as TO.
   */
  async approveIom(
    user: AuthenticatedUser,
    id: number,
    dto: ApproveIomDto,
  ): Promise<Iom> {
    const iom = await this.iomRepo.findOne({ where: { id } });
    if (!iom) {
      throwIomError(IomErrorCodeEnum.IOM_NOT_FOUND, { iomId: id });
    }

    await this.validator.assertProjectAccess(user, iom!.projectId);

    const plan = STAGE_PLAN[user.role ?? ''];
    if (!plan) {
      throwIomError(IomErrorCodeEnum.UNAUTHORIZED_PROJECT_ACCESS, {
        role: user.role,
        reason: 'Role is not permitted to approve an IOM.',
      });
    }

    this.assertMakerCheckerOnApprove(plan!, iom!, user);
    let targetStatusCode = plan!.target;

    if (iom.brokerageAdjNonLoyalty === 1) {
      targetStatusCode = IomStatusCodeEnum.OTHER_BROKERAGE_ADJUSTMENT;
    }

    const shouldNotify =
      targetStatusCode !== IomStatusCodeEnum.OTHER_BROKERAGE_ADJUSTMENT;

    const targetStatusId = this.workflow.getStatusId(targetStatusCode);
    const userRoleId = this.workflow.resolveRoleId(user.role ?? '');

    this.workflow.validateTransition(
      Number(iom!.statusId),
      targetStatusId,
      userRoleId,
      {
        actorUserId: user.dbId,
        iomCreatedBy: iom!.createdBy,
      },
    );

    const previousStatusId = Number(iom!.statusId);
    const previousStatusCode = this.workflow.getStatusCode(previousStatusId);

    const now = new Date();
    const result = await this.iomRepo
      .createQueryBuilder()
      .update(Iom)
      .set({
        statusId: targetStatusId,
        ...plan!.actorPatch(user.dbId, now),
        updatedBy: user.dbId,
        version: () => '`version` + 1',
      })
      .where('id = :id AND status_id = :statusId', {
        id,
        statusId: iom!.statusId,
      })
      .execute();

    if (!result.affected || result.affected === 0) {
      throwIomError(IomErrorCodeEnum.CONCURRENT_MODIFICATION_DETECTED, {
        iomId: id,
      });
    }

    const trimmedRemarks = (dto.remarks ?? '').trim() || null;

    this.emitHistory(
      new IomHistoryEvent(
        Number(id),
        targetStatusId,
        user.dbId,
        plan!.historyAction,
        previousStatusId,
        trimmedRemarks ?? `Approved at stage ${plan!.notifierStage}`,
        {
          statusCode: previousStatusCode,
          version: iom!.version,
        },
        {
          statusCode: targetStatusCode,
          approvedBy: user.dbId,
          ...(trimmedRemarks ? { remarks: trimmedRemarks } : {}),
        },
      ),
    );

    const updated = await this.iomRepo.findOne({ where: { id } });
    if (!updated) {
      throwIomError(IomErrorCodeEnum.IOM_NOT_FOUND, { iomId: id });
    }

    if (shouldNotify) {
      try {
        await this.approvalNotifier.notifyApproval({
          iom: updated!,
          approvedBy: plan!.notifierStage,
          approvedByUserId: user.dbId,
          remarks: trimmedRemarks,
        });
      } catch (err) {
        this.logger.error(
          `Failed to send approval notification for IOM ${id}`,
          err instanceof Error ? err.stack : undefined,
        );
      }
    }
    return updated as Iom;
  }

  /**
   * Maker-checker rule 6: the approver must not be the creator and
   * must not be any prior-stage actor on this very IOM (TL approving
   * an IOM they edited, Finance verifier approving an IOM they
   * previously approved as CRM Head, etc.). Plan defines the list
   * per stage; the creator is always included.
   *
   * Note: `WorkflowValidationService.assertNotSelfApproval` also
   * blocks creator self-approval, but we re-check here so the error
   * fires before the (more expensive) workflow transition lookup and
   * so the error code is `UNAUTHORIZED_PROJECT_ACCESS` with the full
   * `priorStageActors` payload the FE relies on.
   */
  private assertMakerCheckerOnApprove(
    plan: StagePlan,
    iom: Iom,
    user: AuthenticatedUser,
  ): void {
    const priorIds = plan
      .priorActorIds(iom)
      .filter((v): v is number => v != null)
      .map((v) => Number(v));

    if (priorIds.includes(Number(user.dbId))) {
      throwIomError(IomErrorCodeEnum.UNAUTHORIZED_PROJECT_ACCESS, {
        actorUserId: user.dbId,
        reason:
          'Maker-checker violation: you cannot approve an IOM you previously acted on.',
        priorStageActors: priorIds,
      });
    }
  }

  private emitHistory(event: IomHistoryEvent): void {
    this.eventEmitter.emit(IOM_HISTORY_EVENT, event);
  }
}
