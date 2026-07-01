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
 * Args for `IomSubmissionNotificationService.notifySubmission`.
 *
 * The submission notification fires the moment an IOM moves into the
 * approval pipeline (status `IOM_TO_BE_CREATED` -> `IOM_CREATED`) so
 * the project's assigned CRM TL is told an item is now pending their
 * review.
 */
export interface NotifyIomSubmissionArgs {
  /** The IOM that just transitioned to `IOM_CREATED`. The caller MUST
   *  pass the post-update row so any audit columns the templates read
   *  (submittedAt etc.) reflect the freshly-recorded submission. */
  iom: Iom;
  /** Auth user id of the CRM who submitted (the IOM creator on the
   *  edit endpoint). Used as a dedupe key so the submitter never
   *  appears in the TO / CC list - e.g. if they happen to also be
   *  mapped as a CRM TL on the same project. */
  submittedByUserId: number;
  /** Optional brand for template branding. Defaults to Puravankara. */
  brand?: string;
  /** Optional template-variable overrides if the caller wants to
   *  inject extra context (project name, booking ref, etc.). */
  extraVariables?: Record<string, string>;
}

interface ResolvedRecipients {
  /** Auth user ids of the TO recipients (every active CRM TL mapped
   *  to the IOM's project, excluding the submitter). */
  toUserIds: number[];
  /** Emails of `toUserIds`, only those whose `users.email` is
   *  populated. */
  toEmails: string[];
}

/**
 * In-app notification `type` written to the `notifications` table for
 * every IOM submission notification. Kept stable so the FE can filter
 * / theme this category consistently.
 */
const IOM_SUBMISSION_NOTIFICATION_TYPE = 'IOM Submission';

/**
 * Helper that fans out the IOM-submitted notification (email +
 * in-app) to the project's assigned CRM TL(s) when an IOM moves into
 * `IOM_CREATED`. Designed to mirror the conventions used by
 * `IomApprovalNotificationService` / `IomRejectionNotificationService`:
 *
 *   - Both dispatches go via the event emitter so the originating
 *     workflow never holds on them.
 *   - All errors are swallowed + logged. Per the workflow spec
 *     ("Notification failures must not rollback workflow"), this
 *     helper never throws.
 *
 * The in-app dispatch reuses `NotificationModule` (CREATE_NOTIFICATIONS
 * event -> NotificationController listener -> NotificationService.create),
 * which already handles row insertion + WebSocket push.
 */
@Injectable()
export class IomSubmissionNotificationService {
  private readonly logger = new Logger(IomSubmissionNotificationService.name);

  constructor(
    @InjectRepository(Users)
    private readonly usersRepo: Repository<Users>,
    @InjectRepository(ProjectUserMapping)
    private readonly projectUserMappingRepo: Repository<ProjectUserMapping>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Single entry point for "an IOM has just been submitted, fan out
   * the email AND the in-app notification to the project's CRM TL(s)".
   */
  async notifySubmission(args: NotifyIomSubmissionArgs): Promise<void> {
    let recipients: ResolvedRecipients;
    try {
      recipients = await this.resolveRecipients(args);
    } catch (err) {
      this.logger.error(
        `Failed to resolve IOM submission recipients. iom=${args.iom?.id}: ${
          (err as Error)?.message ?? err
        }`,
        (err as Error)?.stack,
      );
      return;
    }

    await this.dispatchEmail(args, recipients);
    this.dispatchInAppNotifications(args, recipients);
  }

  /**
   * Build the email payload and emit COMPOSE_EMAIL. Swallows errors
   * so notification failures cannot bubble out of `notifySubmission`.
   */
  private async dispatchEmail(
    args: NotifyIomSubmissionArgs,
    recipients: ResolvedRecipients,
  ): Promise<void> {
    try {
      if (recipients.toEmails.length === 0) {
        this.logger.warn(
          `IOM submission email skipped (no CRM TL email resolved). iom=${args.iom.id} project=${args.iom.projectId}`,
        );
        return;
      }

      const variables = await this.buildTemplateVariables(args);

      await this.eventEmitter.emitAsync(
        EventMessagesEnum.COMPOSE_EMAIL,
        new ComposeEmailEvent(
          ComposeEmailsEnum.IOM_CREATED_FOR_TL,
          variables,
          args.brand ?? BRAND_PURAVANKARA,
          { to: recipients.toEmails },
        ),
      );

      this.logger.log(
        `IOM submission email dispatched. iom=${args.iom.id} to=${recipients.toEmails.join(
          ',',
        )}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to dispatch IOM submission email. iom=${args.iom?.id}: ${
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
   * (assigned CRM TL(s), submitter excluded).
   *
   * Fire-and-forget: any failure is logged and swallowed.
   */
  private dispatchInAppNotifications(
    args: NotifyIomSubmissionArgs,
    recipients: ResolvedRecipients,
  ): void {
    try {
      const userIds = Array.from(new Set(recipients.toUserIds));

      if (userIds.length === 0) {
        this.logger.warn(
          `IOM submission in-app notification skipped (no recipients resolved). iom=${args.iom.id} project=${args.iom.projectId}`,
        );
        return;
      }

      const { title, message } = this.buildInAppContent(args);

      this.eventEmitter.emit(EventMessagesEnum.CREATE_NOTIFICATIONS, {
        notifications: [
          {
            type: IOM_SUBMISSION_NOTIFICATION_TYPE,
            title,
            message,
            userIds,
          },
        ],
      });

      this.logger.log(
        `IOM submission in-app notification dispatched. iom=${args.iom.id} userIds=${userIds.join(',')}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to dispatch IOM submission in-app notification. iom=${args.iom?.id}: ${
          (err as Error)?.message ?? err
        }`,
        (err as Error)?.stack,
      );
    }
  }

  /**
   * Title / body fed into the in-app notification row. Booking id is
   * included so the recipient can correlate the item without opening
   * the IOM.
   */
  private buildInAppContent(args: NotifyIomSubmissionArgs): {
    title: string;
    message: string;
  } {
    const iomId = args.iom?.id ?? '';
    const bookingId = args.iom?.bookingId ?? '';

    const title = `IOM #${iomId} submitted - pending CRM TL approval`;
    const message =
      `IOM #${iomId} (Booking #${bookingId}) has been submitted by CRM and is now pending your approval as CRM TL.`.trim();

    return { title, message };
  }

  /**
   * Resolve the TO list:
   *   - Look up active `project_user_mapping` rows for the IOM's
   *     project with `role = CRM TL`.
   *   - Dedupe and drop the submitter (in the rare case where the
   *     submitter is also mapped as a CRM TL on the same project).
   *   - Resolve emails from `users.email`, dropping rows with no
   *     email populated.
   *
   * Failure-tolerant: returns an empty result on error rather than
   * throwing, since the IOM submission itself has already been
   * persisted by the time we reach this code path.
   */
  private async resolveRecipients(
    args: NotifyIomSubmissionArgs,
  ): Promise<ResolvedRecipients> {
    const submitterId = Number(args.submittedByUserId);

    const crmTlUserIds = await this.findCrmTlUserIds(args.iom.projectId);

    const toUserIds = Array.from(
      new Set(crmTlUserIds.filter((id) => id !== submitterId)),
    );

    let toEmails: string[] = [];
    if (toUserIds.length > 0) {
      const users = await this.usersRepo.find({
        where: { id: In(toUserIds) },
        select: ['id', 'email'],
      });

      const emailById = new Map<number, string>();
      for (const u of users) {
        if (u?.email) emailById.set(Number(u.id), u.email);
      }

      toEmails = toUserIds
        .map((id) => emailById.get(id))
        .filter((e): e is string => Boolean(e));
    }

    return { toUserIds, toEmails };
  }

  /**
   * Lookup the active CRM TL user ids assigned to a project via
   * `project_user_mapping`. Returns an empty array when no mapping
   * exists - the caller then degrades to "no recipient" + warn rather
   * than failing the workflow.
   */
  private async findCrmTlUserIds(projectId: number | null): Promise<number[]> {
    if (projectId == null) return [];
    try {
      const rows = await this.projectUserMappingRepo.find({
        where: {
          project: { id: Number(projectId) },
          role: RolesEnum.CRM_TL,
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
        `Failed to resolve CRM TL mapping for project=${projectId}: ${
          (err as Error)?.message ?? err
        }`,
        (err as Error)?.stack,
      );
      return [];
    }
  }

  private async buildTemplateVariables(
    args: NotifyIomSubmissionArgs,
  ): Promise<Record<string, string>> {
    const submitter = await this.usersRepo.findOne({
      where: { id: args.submittedByUserId },
      select: ['id', 'name', 'email'],
    });

    return {
      IOM_ID: String(args.iom.id ?? ''),
      BOOKING_ID: String(args.iom.bookingId ?? ''),
      SUBMITTED_BY_NAME: submitter?.name ?? '',
      SUBMITTED_BY_EMAIL: submitter?.email ?? '',
      SUBMITTED_AT: (args.iom.submittedAt ?? new Date()).toISOString(),
      ...(args.extraVariables ?? {}),
    };
  }
}
