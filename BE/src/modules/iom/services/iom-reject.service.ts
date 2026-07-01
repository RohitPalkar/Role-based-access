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
  IomRejectionNotificationService,
  IomRejectionStage,
} from './iom-rejection-notification.service';

import { RejectIomDto } from '../dto/reject-iom.dto';

/**
 * Per-stage plan for the unified `POST /iom/:id/reject` endpoint.
 *
 *   expectedFrom    - The ONLY current status this rejecter may act on.
 *                     (Defensive identifier-level gate; the real
 *                     authorisation gate is the DB-driven
 *                     `WorkflowValidationService.validateTransition`.)
 *   target          - The status the IOM moves to.
 *   historyAction   - Stable, machine-readable label written to
 *                     `iom_history.action`.
 *   notifierStage   - Stage label fed to the rejection-email helper
 *                     so it can pick the right template + CC list.
 *   priorActorIds   - Function returning every actor id that must not
 *                     equal the rejecter. Enforces maker-checker
 *                     rule 6 ("same user cannot act in multiple
 *                     approval stages") at every stage. Includes the
 *                     creator at every stage.
 */
interface StagePlan {
  expectedFrom: IomStatusCodeEnum;
  target: IomStatusCodeEnum;
  historyAction: IomHistoryActionEnum;
  notifierStage: IomRejectionStage;
  priorActorIds: (iom: Iom) => Array<number | null | undefined>;
}

const STAGE_PLAN: Record<string, StagePlan> = {
  [RolesEnum.CRM_TL]: {
    expectedFrom: IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING,
    target: IomStatusCodeEnum.CRM_TL_REJECTED,
    historyAction: IomHistoryActionEnum.TL_REJECT,
    notifierStage: IomRejectionStage.CRM_TL,
    priorActorIds: (iom) => [iom.createdBy],
  },
  [RolesEnum.CRM_HEAD]: {
    expectedFrom: IomStatusCodeEnum.CRM_HEAD_APPROVAL_PENDING,
    target: IomStatusCodeEnum.CRM_HEAD_REJECTED,
    historyAction: IomHistoryActionEnum.CRM_HEAD_REJECT,
    notifierStage: IomRejectionStage.CRM_HEAD,
    priorActorIds: (iom) => [iom.createdBy, iom.crmVerifiedBy],
  },
  [RolesEnum.FINANCE_USER]: {
    expectedFrom: IomStatusCodeEnum.FINANCE_MEMBER_VERIFICATION_PENDING,
    target: IomStatusCodeEnum.FINANCE_MEMBER_REJECTED,
    historyAction: IomHistoryActionEnum.FINANCE_REJECT,
    notifierStage: IomRejectionStage.FINANCE_USER,
    priorActorIds: (iom) => [
      iom.createdBy,
      iom.crmVerifiedBy,
      iom.crmApprovedBy,
    ],
  },
  [RolesEnum.FINANCE_HEAD]: {
    expectedFrom: IomStatusCodeEnum.FINANCE_APPROVER_APPROVAL_PENDING,
    target: IomStatusCodeEnum.FINANCE_APPROVER_REJECTED,
    historyAction: IomHistoryActionEnum.FINANCE_HEAD_REJECT,
    notifierStage: IomRejectionStage.FINANCE_HEAD,
    priorActorIds: (iom) => [
      iom.createdBy,
      iom.crmVerifiedBy,
      iom.crmApprovedBy,
      iom.financeVerifiedBy,
    ],
  },
};

@Injectable()
export class IomRejectService {
  private readonly logger = new Logger(IomRejectService.name);

  constructor(
    @InjectRepository(Iom)
    private readonly iomRepo: Repository<Iom>,
    private readonly workflow: WorkflowValidationService,
    private readonly validator: IomValidationService,
    private readonly rejectionNotifier: IomRejectionNotificationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Unified rejection endpoint. The acting user's role determines the
   * stage; the contract enforced here is:
   *
   *   1. Role gate (controller @Roles) limits callers to the 4
   *      rejecter roles.
   *   2. Load IOM by id; 404 if not found.
   *   3. Project scoping: rejecter must have access to the IOM's project.
   *   4. Stage plan lookup: caller's role -> (target, history action,
   *      notifier stage, maker-checker prior-actor ids). Unmapped role
   *      => 403.
   *   5. Rejection reason must be present (non-blank).
   *   6. Maker-checker rule 6: rejecter must not equal the creator
   *      or ANY prior-stage actor on the IOM row.
   *   7. DB-driven `validateTransition` is the single source of truth
   *      for "is this transition legal for this role from this status".
   *   8. Conditional UPDATE: status + rejection_reason + updated_by +
   *      version bump, gated on the status the IOM was loaded with.
   *      A zero-row result indicates a concurrent state change.
   *   9. Audit event emitted to the existing IOM history pipeline.
   *   10. Rejection email helper invoked
   *       (fire-and-forget; failure does not roll back).
   */
  async rejectIom(
    user: AuthenticatedUser,
    id: number,
    dto: RejectIomDto,
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
        reason: 'Role is not permitted to reject an IOM.',
      });
    }

    const trimmedReason = dto.reason.trim();
    if (trimmedReason.length === 0) {
      throwIomError(IomErrorCodeEnum.REJECTION_REASON_MISSING, {
        iomId: id,
      });
    }

    this.assertMakerCheckerOnReject(plan!, iom!, user);

    const targetStatusId = this.workflow.getStatusId(plan!.target);
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

    const result = await this.iomRepo
      .createQueryBuilder()
      .update(Iom)
      .set({
        statusId: targetStatusId,
        rejectionReason: trimmedReason,
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

    this.emitHistory(
      new IomHistoryEvent(
        Number(id),
        targetStatusId,
        user.dbId,
        plan!.historyAction,
        previousStatusId,
        trimmedReason,
        {
          statusCode: previousStatusCode,
          version: iom!.version,
        },
        {
          statusCode: plan!.target,
          rejectionReason: trimmedReason,
          rejectedBy: user.dbId,
        },
      ),
    );

    const updated = await this.iomRepo.findOne({ where: { id } });
    if (!updated) {
      throwIomError(IomErrorCodeEnum.IOM_NOT_FOUND, { iomId: id });
    }

    try {
      await this.rejectionNotifier.notifyRejection({
        iom: updated!,
        rejectedBy: plan!.notifierStage,
        rejectedByUserId: user.dbId,
        reason: trimmedReason,
      });
    } catch (err) {
      this.logger.error(
        `Failed to send rejection notification for IOM ${id}`,
        err instanceof Error ? err.stack : undefined,
      );
    }
    return updated as Iom;
  }

  /**
   * Maker-checker rule 6: the rejecter must not be the creator and
   * must not be any prior-stage actor on this very IOM (TL approving
   * an IOM they edited, Finance verifier approving an IOM they
   * previously approved as CRM Head, etc.). Plan defines the list
   * per stage; the creator is always included.
   */
  private assertMakerCheckerOnReject(
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
          'Maker-checker violation: you cannot reject an IOM you previously acted on.',
        priorStageActors: priorIds,
      });
    }
  }

  private emitHistory(event: IomHistoryEvent): void {
    this.eventEmitter.emit(IOM_HISTORY_EVENT, event);
  }
}
