import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';

import { ProjectUserMapping, Users } from 'src/entities';
import { BRAND_PURAVANKARA } from 'src/config/constants';
import {
  ComposeEmailsEnum,
  EventMessagesEnum,
} from 'src/enums/event-messages.enum';
import { ComposeEmailEvent } from 'src/events/email.events';
import { RolesEnum } from 'src/enums/roles.enum';

import { Iom } from '../entities/iom.entity';

/**
 * Which approval stage just completed.
 *
 * The cascade is intentionally forward-looking: each stage's
 * notification targets the NEXT approver as TO (so they know an item
 * is now pending in their queue) and CCs the creator + every prior
 * approver (so the audit chain is informed of progress). The final
 * stage (FINANCE_HEAD) has no "next approver" - in that case the
 * creator becomes TO and prior approvers are CC.
 *
 * The next-approver lookup uses `project_user_mapping` because the
 * next-stage user has not yet acted on the IOM (and therefore is not
 * yet present on the `ioms` row's actor columns).
 */
export enum IomApprovalStage {
  CRM_TL = 'CRM_TL',
  CRM_HEAD = 'CRM_HEAD',
  FINANCE_USER = 'FINANCE_USER',
  FINANCE_HEAD = 'FINANCE_HEAD',
}

export interface NotifyIomApprovalArgs {
  /** The IOM that just got approved at the stage indicated. The
   *  caller (`IomApproveService`) MUST pass the post-update row so
   *  the prior-actor columns reflect the freshly-recorded approver. */
  iom: Iom;
  /** Stage whose actor performed the approval. */
  approvedBy: IomApprovalStage;
  /** Auth user id of the actor who just approved. Used as a dedupe
   *  key so the actor never appears in the CC list. */
  approvedByUserId: number;
  /** Optional remarks the approver attached on the request body. */
  remarks?: string | null;
  /** Optional brand for template branding. Defaults to Puravankara. */
  brand?: string;
  /** Optional template-variable overrides if the caller wants to
   *  inject extra context (project name, booking ref, etc.). */
  extraVariables?: Record<string, string>;
}

interface ResolvedRecipients {
  /** Auth user ids of the TO recipients (next approver(s) at
   *  intermediate stages; the creator at the final stage). */
  toUserIds: number[];
  /** Auth user ids of the CC recipients (creator + prior approvers
   *  at intermediate stages; prior approvers only at the final
   *  stage). Already deduped, with the approver and any TO ids
   *  filtered out. */
  ccUserIds: number[];
  /** Emails of `toUserIds`, only those whose `users.email` is
   *  populated. */
  toEmails: string[];
  /** Emails of `ccUserIds`, only those whose `users.email` is
   *  populated. */
  ccEmails: string[];
}

/**
 * In-app notification `type` written to the `notifications` table for
 * every IOM approval notification, irrespective of stage. Kept stable
 * so the FE can filter / theme this category consistently.
 */
const IOM_APPROVAL_NOTIFICATION_TYPE = 'IOM Approval';

interface StagePlan {
  templateEvent: ComposeEmailsEnum;
  /** Role name to look up in `project_user_mapping` for the NEXT
   *  approver. `null` for the final stage (no next approver - the
   *  creator becomes TO). */
  nextApproverRole: RolesEnum | null;
  /** Prior-stage actor user-id getters in CC priority order. Each
   *  function returns the ids that already acted on this IOM at an
   *  earlier stage. */
  priorActorIds: (iom: Iom) => Array<number | null | undefined>;
  /** Human-readable label of the approving stage. */
  stageLabel: string;
  /** Human-readable label of the NEXT stage. `null` at the final
   *  stage where the approval is the terminal one in the cascade. */
  nextStageLabel: string | null;
}

@Injectable()
export class IomApprovalNotificationService {
  private readonly logger = new Logger(IomApprovalNotificationService.name);

  private readonly stagePlan: Record<IomApprovalStage, StagePlan> = {
    [IomApprovalStage.CRM_TL]: {
      templateEvent: ComposeEmailsEnum.IOM_TL_APPROVED,
      nextApproverRole: RolesEnum.CRM_HEAD,
      priorActorIds: () => [],
      stageLabel: 'CRM TL',
      nextStageLabel: 'CRM Head',
    },
    [IomApprovalStage.CRM_HEAD]: {
      templateEvent: ComposeEmailsEnum.IOM_CRM_HEAD_APPROVED,
      nextApproverRole: RolesEnum.FINANCE_USER,
      priorActorIds: (iom) => [iom.crmVerifiedBy],
      stageLabel: 'CRM Head',
      nextStageLabel: 'Finance Verifier',
    },
    [IomApprovalStage.FINANCE_USER]: {
      templateEvent: ComposeEmailsEnum.IOM_FINANCE_VERIFIED,
      nextApproverRole: RolesEnum.FINANCE_HEAD,
      priorActorIds: (iom) => [iom.crmVerifiedBy, iom.crmApprovedBy],
      stageLabel: 'Finance Verifier',
      nextStageLabel: 'Finance Approver',
    },
    [IomApprovalStage.FINANCE_HEAD]: {
      templateEvent: ComposeEmailsEnum.IOM_FINANCE_APPROVED,
      // Final stage: no next approver. Creator becomes TO.
      nextApproverRole: null,
      priorActorIds: (iom) => [
        iom.crmVerifiedBy,
        iom.crmApprovedBy,
        iom.financeVerifiedBy,
      ],
      stageLabel: 'Finance Approver',
      nextStageLabel: null,
    },
  };

  constructor(
    @InjectRepository(Users)
    private readonly usersRepo: Repository<Users>,
    @InjectRepository(ProjectUserMapping)
    private readonly projectUserMappingRepo: Repository<ProjectUserMapping>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Single entry point for "an IOM stage has just been approved, fan
   * out the email AND the in-app notification." Safe to call inside
   * a transaction:
   *
   *   - Both dispatches go via the event emitter (async) so the
   *     originating transaction never holds on them.
   *   - All errors are swallowed + logged. Per the workflow spec
   *     ("Notification failures must not rollback workflow"), this
   *     helper never throws.
   *
   * The in-app dispatch reuses `NotificationModule` (CREATE_NOTIFICATIONS
   * event -> NotificationController listener -> NotificationService.create),
   * which already handles row insertion + WebSocket push.
   */
  async notifyApproval(args: NotifyIomApprovalArgs): Promise<void> {
    const plan = this.stagePlan[args.approvedBy];
    if (!plan) {
      this.logger.warn(
        `Unknown approval stage "${args.approvedBy}" for iom=${args.iom?.id}; skipping notifications.`,
      );
      return;
    }

    let recipients: ResolvedRecipients;
    try {
      recipients = await this.resolveRecipients(args, plan);
    } catch (err) {
      this.logger.error(
        `Failed to resolve IOM approval recipients. iom=${args.iom?.id} stage=${args.approvedBy}: ${
          (err as Error)?.message ?? err
        }`,
        (err as Error)?.stack,
      );
      return;
    }

    await this.dispatchEmail(args, plan, recipients);
    this.dispatchInAppNotifications(args, plan, recipients);
  }

  /**
   * Build the email payload and emit COMPOSE_EMAIL. Swallows errors
   * so notification failures cannot bubble out of `notifyApproval`.
   */
  private async dispatchEmail(
    args: NotifyIomApprovalArgs,
    plan: StagePlan,
    recipients: ResolvedRecipients,
  ): Promise<void> {
    try {
      if (recipients.toEmails.length === 0) {
        this.logger.warn(
          `IOM approval email skipped (no TO recipient resolved). iom=${args.iom.id} stage=${args.approvedBy}`,
        );
        return;
      }

      const variables = await this.buildTemplateVariables(args, plan);

      await this.eventEmitter.emitAsync(
        EventMessagesEnum.COMPOSE_EMAIL,
        new ComposeEmailEvent(
          plan.templateEvent,
          variables,
          args.brand ?? BRAND_PURAVANKARA,
          {
            to: recipients.toEmails,
            cc:
              recipients.ccEmails.length > 0 ? recipients.ccEmails : undefined,
          },
        ),
      );

      this.logger.log(
        `IOM approval email dispatched. iom=${args.iom.id} stage=${args.approvedBy} to=${recipients.toEmails.join(
          ',',
        )} cc=${recipients.ccEmails.join(',') || '-'}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to dispatch IOM approval email. iom=${args.iom?.id} stage=${args.approvedBy}: ${
          (err as Error)?.message ?? err
        }`,
        (err as Error)?.stack,
      );
    }
  }

  /**
   * Emit `CREATE_NOTIFICATIONS` so the existing NotificationController
   * listener persists rows in `notifications` and pushes a WebSocket
   * event to each user. Same recipient list as the email path (next
   * approver(s) as TO, creator + prior actors as CC, approver
   * excluded).
   *
   * Fire-and-forget: any failure is logged and swallowed.
   */
  private dispatchInAppNotifications(
    args: NotifyIomApprovalArgs,
    plan: StagePlan,
    recipients: ResolvedRecipients,
  ): void {
    try {
      const userIds: number[] = [];
      for (const id of recipients.toUserIds) {
        if (!userIds.includes(id)) userIds.push(id);
      }
      for (const id of recipients.ccUserIds) {
        if (!userIds.includes(id)) userIds.push(id);
      }

      if (userIds.length === 0) {
        this.logger.warn(
          `IOM approval in-app notification skipped (no recipients resolved). iom=${args.iom.id} stage=${args.approvedBy}`,
        );
        return;
      }

      const { title, message } = this.buildInAppContent(args, plan);

      this.eventEmitter.emit(EventMessagesEnum.CREATE_NOTIFICATIONS, {
        notifications: [
          {
            type: IOM_APPROVAL_NOTIFICATION_TYPE,
            title,
            message,
            userIds,
          },
        ],
      });

      this.logger.log(
        `IOM approval in-app notification dispatched. iom=${args.iom.id} stage=${args.approvedBy} userIds=${userIds.join(',')}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to dispatch IOM approval in-app notification. iom=${args.iom?.id} stage=${args.approvedBy}: ${
          (err as Error)?.message ?? err
        }`,
        (err as Error)?.stack,
      );
    }
  }

  /**
   * Build the per-stage in-app title and message.
   *
   * Intermediate stages: TO is the next approver, message reads as
   * "action pending" so the recipient knows they have work to do.
   * Final stage: TO is the creator, message reads as "fully approved"
   * so the recipient knows the workflow is complete on the approval
   * side.
   */
  private buildInAppContent(
    args: NotifyIomApprovalArgs,
    plan: StagePlan,
  ): { title: string; message: string } {
    const iomId = args.iom?.id ?? '';
    const bookingId = args.iom?.bookingId ?? '';
    const remarks = (args.remarks ?? '').trim();
    const remarksSuffix = remarks ? ` Remarks: ${remarks}` : '';

    if (plan.nextStageLabel) {
      const title = `IOM #${iomId} approved by ${plan.stageLabel} - pending ${plan.nextStageLabel}`;
      const message =
        `IOM #${iomId} (Booking #${bookingId}) has been approved by ${plan.stageLabel} and is now pending ${plan.nextStageLabel} action.${remarksSuffix}`.trim();
      return { title, message };
    }

    const title = `IOM #${iomId} fully approved`;
    const message =
      `IOM #${iomId} (Booking #${bookingId}) has been fully approved (final approval by ${plan.stageLabel}).${remarksSuffix}`.trim();
    return { title, message };
  }

  /**
   * Resolve the TO + CC lists for both channels. Rules:
   *
   *   Intermediate stage (plan.nextApproverRole != null):
   *     TO = active project_user_mapping rows for nextApproverRole,
   *          dedup, exclude approver.
   *     CC = creator + prior approvers, dedup, exclude approver and
   *          any TO ids.
   *
   *   Final stage (plan.nextApproverRole == null):
   *     TO = creator (single id, if present).
   *     CC = prior approvers, dedup, exclude approver and the creator.
   *
   * The "exclude approver" rule prevents self-notification of the
   * very user who just took the action. The "exclude TO from CC"
   * rule prevents the same user appearing in both lists (e.g. if a
   * project mapping puts the creator in the next-approver pool).
   */
  private async resolveRecipients(
    args: NotifyIomApprovalArgs,
    plan: StagePlan,
  ): Promise<ResolvedRecipients> {
    const creatorId =
      args.iom.createdBy != null ? Number(args.iom.createdBy) : null;
    const approverId = Number(args.approvedByUserId);

    let toUserIds: number[];
    let ccCandidateIds: number[];

    if (plan.nextApproverRole) {
      const nextApproverIds = await this.findNextApproverUserIds(
        args.iom.projectId,
        plan.nextApproverRole,
      );
      toUserIds = Array.from(
        new Set(nextApproverIds.filter((id) => id !== approverId)),
      );

      ccCandidateIds = [
        ...(creatorId != null ? [creatorId] : []),
        ...plan
          .priorActorIds(args.iom)
          .filter((id): id is number => id != null)
          .map((id) => Number(id)),
      ];
    } else {
      toUserIds = creatorId != null ? [creatorId] : [];
      ccCandidateIds = plan
        .priorActorIds(args.iom)
        .filter((id): id is number => id != null)
        .map((id) => Number(id));
    }

    const ccUserIds = Array.from(
      new Set(
        ccCandidateIds.filter(
          (id) => id !== approverId && !toUserIds.includes(id),
        ),
      ),
    );

    const idsToLookup = Array.from(new Set([...toUserIds, ...ccUserIds]));

    let toEmails: string[] = [];
    let ccEmails: string[] = [];

    if (idsToLookup.length > 0) {
      const users = await this.usersRepo.find({
        where: { id: In(idsToLookup) },
        select: ['id', 'email'],
      });

      const emailById = new Map<number, string>();
      for (const u of users) {
        if (u?.email) emailById.set(Number(u.id), u.email);
      }

      toEmails = toUserIds
        .map((id) => emailById.get(id))
        .filter((e): e is string => Boolean(e));
      ccEmails = ccUserIds
        .map((id) => emailById.get(id))
        .filter((e): e is string => Boolean(e));
    }

    return {
      toUserIds,
      ccUserIds,
      toEmails,
      ccEmails,
    };
  }

  /**
   * Lookup the active user ids assigned to a project for a given role
   * via `project_user_mapping`. Returns an empty array when no
   * mapping exists - the calling notifier will then degrade to "no TO
   * recipient" and log a warning rather than failing the workflow.
   *
   * Failure-tolerant: a DB error here must NOT bubble up because the
   * approval itself has already been persisted by the time we reach
   * this code path.
   */
  private async findNextApproverUserIds(
    projectId: number | null,
    role: RolesEnum,
  ): Promise<number[]> {
    if (projectId == null) return [];
    try {
      const rows = await this.projectUserMappingRepo.find({
        where: {
          project: { id: Number(projectId) },
          role,
          removedAt: IsNull(),
        },
        relations: ['user'],
        order: { isPrimary: 'DESC', assignedAt: 'ASC' },
      });
      return rows
        .map((r) => (r.user ? Number(r.user.id) : null))
        .filter((id): id is number => id != null);
    } catch (err) {
      this.logger.error(
        `Failed to resolve next-approver mapping for project=${projectId} role=${role}: ${
          (err as Error)?.message ?? err
        }`,
        (err as Error)?.stack,
      );
      return [];
    }
  }

  private async buildTemplateVariables(
    args: NotifyIomApprovalArgs,
    plan: StagePlan,
  ): Promise<Record<string, string>> {
    const approver = await this.usersRepo.findOne({
      where: { id: args.approvedByUserId },
      select: ['id', 'name', 'email'],
    });

    return {
      IOM_ID: String(args.iom.id ?? ''),
      BOOKING_ID: String(args.iom.bookingId ?? ''),
      APPROVED_BY_STAGE: args.approvedBy,
      APPROVED_BY_STAGE_LABEL: plan.stageLabel,
      NEXT_STAGE_LABEL: plan.nextStageLabel ?? '',
      APPROVED_BY_NAME: approver?.name ?? '',
      APPROVED_BY_EMAIL: approver?.email ?? '',
      REMARKS: (args.remarks ?? '').trim(),
      APPROVED_AT: new Date().toISOString(),
      ...(args.extraVariables ?? {}),
    };
  }
}
