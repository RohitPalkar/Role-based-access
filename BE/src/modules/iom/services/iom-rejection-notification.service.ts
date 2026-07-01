import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Users } from 'src/entities';
import { BRAND_PURAVANKARA } from 'src/config/constants';
import {
  ComposeEmailsEnum,
  EventMessagesEnum,
} from 'src/enums/event-messages.enum';
import { ComposeEmailEvent } from 'src/events/email.events';

import { Iom } from '../entities/iom.entity';

/**
 * Which approval stage rejected the IOM.
 *
 * The cascade is intentionally additive: every stage notifies the
 * CRM creator (always TO) and CCs every actor of a stage that has
 * already approved this IOM. That information lives directly on the
 * `ioms` row (`crmVerifiedBy`, `crmApprovedBy`, `financeVerifiedBy`)
 * so we never need a "which user is the TL for project X" lookup.
 */
export enum IomRejectionStage {
  CRM_TL = 'CRM_TL',
  CRM_HEAD = 'CRM_HEAD',
  FINANCE_USER = 'FINANCE_USER',
  FINANCE_HEAD = 'FINANCE_HEAD',
}

export interface NotifyIomRejectionArgs {
  /** The IOM being rejected. Must already have the rejecter's prior
   *  approvers populated (crmVerifiedBy / crmApprovedBy / financeVerifiedBy). */
  iom: Iom;
  /** Stage whose actor is performing the rejection. */
  rejectedBy: IomRejectionStage;
  /** Auth user id of the actor performing the rejection. Used for
   *  template variables and (optionally) to dedupe out of the CC list
   *  if the actor would otherwise appear there. */
  rejectedByUserId: number;
  /** Required by the workflow spec ("Rejection reason mandatory"). */
  reason: string;
  /** Optional brand for template branding. Defaults to Puravankara. */
  brand?: string;
  /** Optional template-variable overrides if the caller wants to
   *  inject extra context (project name, booking ref, etc.). */
  extraVariables?: Record<string, string>;
}

interface ResolvedRecipients {
  /** Auth user id of the creator (workflow TO recipient). */
  toUserId: number | null;
  /** Auth user ids of the prior-stage actors (workflow CC recipients),
   *  already deduped and with the rejecter / creator filtered out. */
  ccUserIds: number[];
  /** Email of `toUserId`, if the user has one and was resolved. */
  toEmails: string[];
  /** Emails of `ccUserIds`, only those whose `users.email` is populated. */
  ccEmails: string[];
}

/**
 * In-app notification `type` written to the `notifications` table for
 * every IOM rejection notification, irrespective of stage. Kept stable
 * so the FE can filter / theme this category consistently.
 */
const IOM_REJECTION_NOTIFICATION_TYPE = 'IOM Rejection';

interface StagePlan {
  templateEvent: ComposeEmailsEnum;
  /** Stage actor user-id getters in CC priority order. */
  ccActorIds: (iom: Iom) => Array<number | null | undefined>;
  /** Human-readable label of the rejecting stage; used in both the
   *  email subject variables (via REJECTED_BY_STAGE) and the in-app
   *  notification title / body. */
  stageLabel: string;
}

@Injectable()
export class IomRejectionNotificationService {
  private readonly logger = new Logger(IomRejectionNotificationService.name);

  private readonly stagePlan: Record<IomRejectionStage, StagePlan> = {
    [IomRejectionStage.CRM_TL]: {
      templateEvent: ComposeEmailsEnum.IOM_TL_REJECTED,
      ccActorIds: () => [],
      stageLabel: 'CRM TL',
    },
    [IomRejectionStage.CRM_HEAD]: {
      templateEvent: ComposeEmailsEnum.IOM_CRM_HEAD_REJECTED,
      ccActorIds: (iom) => [iom.crmVerifiedBy],
      stageLabel: 'CRM Head',
    },
    [IomRejectionStage.FINANCE_USER]: {
      templateEvent: ComposeEmailsEnum.IOM_FINANCE_REJECTED,
      ccActorIds: (iom) => [iom.crmVerifiedBy, iom.crmApprovedBy],
      stageLabel: 'Finance Verifier',
    },
    [IomRejectionStage.FINANCE_HEAD]: {
      templateEvent: ComposeEmailsEnum.FINANCE_APPROVER_REJECTED,
      ccActorIds: (iom) => [
        iom.crmVerifiedBy,
        iom.crmApprovedBy,
        iom.financeVerifiedBy,
      ],
      stageLabel: 'Finance Approver',
    },
  };

  constructor(
    @InjectRepository(Users)
    private readonly usersRepo: Repository<Users>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Single entry point for "an IOM has just been rejected, fan out
   * the email AND the in-app notification." Safe to call inside a
   * transaction:
   *
   *   - Both dispatches are async (event emitter) so they never hold
   *     the txn.
   *   - All errors are swallowed + logged. Per the workflow spec
   *     ("Notification failures must not rollback workflow"), this
   *     helper never throws.
   *
   * The in-app dispatch reuses the existing `NotificationModule`
   * (CREATE_NOTIFICATIONS event -> NotificationController listener
   * -> NotificationService.create), which already handles row
   * insertion and the WebSocket push.
   *
   * Example:
   *
   *   await this.rejectionNotifier.notifyRejection({
   *     iom,
   *     rejectedBy: IomRejectionStage.CRM_HEAD,
   *     rejectedByUserId: user.dbId,
   *     reason: dto.reason,
   *   });
   */
  async notifyRejection(args: NotifyIomRejectionArgs): Promise<void> {
    const plan = this.stagePlan[args.rejectedBy];
    if (!plan) {
      this.logger.warn(
        `Unknown rejection stage "${args.rejectedBy}" for iom=${args.iom?.id}; skipping notifications.`,
      );
      return;
    }

    let recipients: ResolvedRecipients;
    try {
      recipients = await this.resolveRecipients(args, plan);
    } catch (err) {
      this.logger.error(
        `Failed to resolve IOM rejection recipients. iom=${args.iom?.id} stage=${args.rejectedBy}: ${
          (err as Error)?.message ?? err
        }`,
        (err as Error)?.stack,
      );
      return;
    }

    // Each channel is dispatched independently so a failure in one
    // (e.g. email template lookup) does not suppress the other.
    await this.dispatchEmail(args, plan, recipients);
    this.dispatchInAppNotifications(args, plan, recipients);
  }

  /**
   * Build the email payload and emit COMPOSE_EMAIL. Swallows errors
   * so notification failures cannot bubble out of `notifyRejection`.
   */
  private async dispatchEmail(
    args: NotifyIomRejectionArgs,
    plan: StagePlan,
    recipients: ResolvedRecipients,
  ): Promise<void> {
    try {
      if (recipients.toEmails.length === 0) {
        this.logger.warn(
          `IOM rejection email skipped (no TO recipient resolved). iom=${args.iom.id} stage=${args.rejectedBy}`,
        );
        return;
      }

      const variables = await this.buildTemplateVariables(args);

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
        `IOM rejection email dispatched. iom=${args.iom.id} stage=${args.rejectedBy} to=${recipients.toEmails.join(
          ',',
        )} cc=${recipients.ccEmails.join(',') || '-'}`,
      );
    } catch (err) {
      // Spec: notification failures must NOT rollback workflow.
      this.logger.error(
        `Failed to dispatch IOM rejection email. iom=${args.iom?.id} stage=${args.rejectedBy}: ${
          (err as Error)?.message ?? err
        }`,
        (err as Error)?.stack,
      );
    }
  }

  /**
   * Emit `CREATE_NOTIFICATIONS` so the existing NotificationController
   * listener persists rows in `notifications` and pushes a WebSocket
   * event to each user. Same recipient list as the email path
   * (creator as TO, prior-stage actors as CC, rejecter excluded).
   *
   * Fire-and-forget: any failure is logged and swallowed.
   */
  private dispatchInAppNotifications(
    args: NotifyIomRejectionArgs,
    plan: StagePlan,
    recipients: ResolvedRecipients,
  ): void {
    try {
      const userIds: number[] = [];
      if (recipients.toUserId != null) userIds.push(recipients.toUserId);
      for (const id of recipients.ccUserIds) {
        if (!userIds.includes(id)) userIds.push(id);
      }

      if (userIds.length === 0) {
        this.logger.warn(
          `IOM rejection in-app notification skipped (no recipients resolved). iom=${args.iom.id} stage=${args.rejectedBy}`,
        );
        return;
      }

      const { title, message } = this.buildInAppContent(args, plan);

      this.eventEmitter.emit(EventMessagesEnum.CREATE_NOTIFICATIONS, {
        notifications: [
          {
            type: IOM_REJECTION_NOTIFICATION_TYPE,
            title,
            message,
            userIds,
          },
        ],
      });

      this.logger.log(
        `IOM rejection in-app notification dispatched. iom=${args.iom.id} stage=${args.rejectedBy} userIds=${userIds.join(',')}`,
      );
    } catch (err) {
      // Spec: notification failures must NOT rollback workflow.
      this.logger.error(
        `Failed to dispatch IOM rejection in-app notification. iom=${args.iom?.id} stage=${args.rejectedBy}: ${
          (err as Error)?.message ?? err
        }`,
        (err as Error)?.stack,
      );
    }
  }

  /**
   * Build the per-stage in-app title and message. Same content goes
   * to TO (creator) and CC (prior approvers) - this mirrors the
   * email which uses one body for both. Booking id is included so
   * the recipient can correlate without opening the IOM.
   */
  private buildInAppContent(
    args: NotifyIomRejectionArgs,
    plan: StagePlan,
  ): { title: string; message: string } {
    const iomId = args.iom?.id ?? '';
    const bookingId = args.iom?.bookingId ?? '';
    const reason = (args.reason ?? '').trim();

    const title = `IOM #${iomId} rejected by ${plan.stageLabel}`;

    const reasonSuffix = reason ? ` Reason: ${reason}` : '';
    const message =
      `IOM #${iomId} (Booking #${bookingId}) has been rejected by ${plan.stageLabel}.${reasonSuffix}`.trim();

    return { title, message };
  }

  private async resolveRecipients(
    args: NotifyIomRejectionArgs,
    plan: StagePlan,
  ): Promise<ResolvedRecipients> {
    const creatorId =
      args.iom.createdBy != null ? Number(args.iom.createdBy) : null;
    const rejecterId = Number(args.rejectedByUserId);

    const rawCcIds = plan
      .ccActorIds(args.iom)
      .filter((id): id is number => id != null)
      .map((id) => Number(id))
      // Drop CC slots that match the creator (already TO) or the
      // rejecter (must never receive self-notification).
      .filter((id) => id !== creatorId && id !== rejecterId);

    const ccUserIds = Array.from(new Set(rawCcIds));

    const idsToLookup = Array.from(
      new Set(
        [creatorId, ...ccUserIds].filter((id): id is number => id != null),
      ),
    );

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

      toEmails =
        creatorId != null && emailById.get(creatorId)
          ? [emailById.get(creatorId) as string]
          : [];
      ccEmails = ccUserIds
        .map((id) => emailById.get(id))
        .filter((e): e is string => Boolean(e));
    }

    return {
      toUserId: creatorId,
      ccUserIds,
      toEmails,
      ccEmails,
    };
  }

  private async buildTemplateVariables(
    args: NotifyIomRejectionArgs,
  ): Promise<Record<string, string>> {
    const rejecter = await this.usersRepo.findOne({
      where: { id: args.rejectedByUserId },
      select: ['id', 'name', 'email'],
    });

    return {
      IOM_ID: String(args.iom.id ?? ''),
      BOOKING_ID: String(args.iom.bookingId ?? ''),
      REJECTED_BY_STAGE: args.rejectedBy,
      REJECTED_BY_NAME: rejecter?.name ?? '',
      REJECTED_BY_EMAIL: rejecter?.email ?? '',
      REJECTION_REASON: args.reason ?? '',
      REJECTED_AT: new Date().toISOString(),
      ...(args.extraVariables ?? {}),
    };
  }
}
