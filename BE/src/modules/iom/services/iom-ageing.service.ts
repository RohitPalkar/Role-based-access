import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Iom } from '../entities/iom.entity';
import { IomHistory } from '../entities/iom-history.entity';
import { IomErrorCodeEnum } from '../enums/iom-error-code.enum';
import { throwIomError } from '../utils/iom-error.util';
import {
  diffInDays,
  diffInHours,
  resolveCustomerNameFromDetails,
} from '../utils/iom-ageing.util';
import {
  AgeingResponseDto,
  AgeingSummaryDto,
  AgeingTimelineItemDto,
} from '../dto/ageing-response.dto';
import {
  AuthenticatedUser,
  IomValidationService,
} from './iom-validation.service';

/**
 * Raw projection returned by the timeline QueryBuilder. The
 * `iom_history` row drives the shape; the joined `iom_statuses`
 * and `users` rows supply human-readable fields.
 *
 * `LEFT JOIN`s mean the joined columns are `null` when the linked
 * row is missing or soft-deleted - the service must tolerate this.
 */
interface RawTimelineRow {
  historyId: string | number;
  toStatusId: string | number | null;
  action: string | null;
  remarks: string | null;
  changedAt: Date | string;
  changedBy: string | number | null;
  statusCode: string | null;
  userId: string | number | null;
  userName: string | null;
}

/**
 * Read-only service that builds the per-IOM ageing timeline.
 *
 * Query plan (two round-trips, no N+1):
 *
 *   1. `loadSummaryOrThrow`     - one query joining `ioms` to
 *      `projects` + the current `iom_statuses` row. Throws
 *      `IOM_NOT_FOUND` when the IOM is missing or soft-deleted.
 *
 *   2. `loadTimeline`           - one query against `iom_history`
 *      with LEFT JOINs to `iom_statuses` (for the stage code) and
 *      `users` (for the actor's display name). Sorted by
 *      `changed_at ASC, id ASC` to give a stable ordering even when
 *      multiple rows share the same second-precision timestamp.
 *
 * Both queries are scoped to a single `iom_id`, so the
 * `idx_iom_history_iom_changed_at` composite index introduced by the
 * companion migration short-circuits the second query to an index
 * range scan.
 *
 * Project-level authorisation is enforced via
 * `IomValidationService.assertProjectAccess` (same chokepoint used by
 * `getIom` / `getIomPdf`) - the controller's `RolesGuard` only gates
 * *who may attempt the call*; the service is the authoritative gate on
 * *which IOMs they may see*.
 */
@Injectable()
export class IomAgeingService {
  constructor(
    @InjectRepository(Iom)
    private readonly iomRepo: Repository<Iom>,
    @InjectRepository(IomHistory)
    private readonly historyRepo: Repository<IomHistory>,
    private readonly validator: IomValidationService,
  ) {}

  /**
   * Public entry point invoked by the controller.
   *
   * Steps:
   *   1. Load the summary (Query 1) - throws if the IOM is missing.
   *   2. Re-authorise the caller against the IOM's project.
   *   3. Load the timeline rows (Query 2).
   *   4. Map raw rows to DTOs, computing per-stage `durationInHours`
   *      in a single pass.
   *   5. Compute the summary's ageing window from the latest
   *      timeline entry (or `createdAt` when the timeline is empty).
   *
   * `now` is captured once at the top of the call so every duration
   * is measured against the same wall-clock instant.
   */
  async getAgeingTimeline(
    user: AuthenticatedUser,
    iomId: number,
  ): Promise<AgeingResponseDto> {
    const now = new Date();

    const iom = await this.loadSummaryOrThrow(iomId);
    await this.validator.assertProjectAccess(user, iom.projectId);

    const rawTimeline = await this.loadTimeline(iomId);
    const timeline = this.toTimelineDtos(rawTimeline, now);

    const summary = this.buildSummary(iom, timeline, now);

    return { summary, timeline };
  }

  /**
   * Query 1 - the IOM summary row.
   *
   * Inner-joins `iom_statuses` because every active IOM MUST have a
   * status (FK is NOT NULL); left-joins `projects` because legacy rows
   * may have `project_id = NULL` and the spec requires `projectName`
   * to degrade to `null` rather than 404 the request.
   *
   * The column list is intentionally narrow - we never need the
   * customer/referrer JSON blobs beyond `customer_details` for the
   * name fallback, and we never need the financial/audit columns.
   */
  private async loadSummaryOrThrow(iomId: number): Promise<Iom> {
    const iom = await this.iomRepo
      .createQueryBuilder('i')
      .innerJoinAndSelect('i.status', 'status')
      .leftJoinAndSelect('i.project', 'project')
      .where('i.id = :iomId', { iomId })
      .andWhere('i.deletedAt IS NULL')
      .getOne();

    if (!iom) {
      throwIomError(IomErrorCodeEnum.IOM_NOT_FOUND, { iomId });
    }
    return iom as Iom;
  }

  /**
   * Query 2 - the timeline rows for this IOM.
   *
   * Selected via `.getRawMany()` instead of entity hydration because:
   *   - We only need a flat projection (no relation graph).
   *   - `LEFT JOIN users` may produce `null` for soft-deleted actors;
   *     entity hydration would still attempt to build a `Users`
   *     instance whose required fields are all null.
   *   - Skipping hydration avoids the per-row reflection cost which
   *     matters when a long-running IOM accumulates many rows.
   *
   * Filtering `users.deleted_at IS NULL` inside the join condition
   * (rather than the WHERE clause) is important - moving it to WHERE
   * would turn the LEFT JOIN into an effective INNER JOIN and drop
   * history rows authored by deleted users.
   */
  private async loadTimeline(iomId: number): Promise<RawTimelineRow[]> {
    return this.historyRepo
      .createQueryBuilder('h')
      .leftJoin('iom_statuses', 'status', 'status.id = h.to_status_id')
      .leftJoin(
        'users',
        'user',
        'user.id = h.changed_by AND user.deleted_at IS NULL',
      )
      .where('h.iom_id = :iomId', { iomId })
      .orderBy('h.changed_at', 'ASC')
      .addOrderBy('h.id', 'ASC')
      .select([
        'h.id AS historyId',
        'h.to_status_id AS toStatusId',
        'h.action AS action',
        'h.remarks AS remarks',
        'h.changed_at AS changedAt',
        'h.changed_by AS changedBy',
        'status.code AS statusCode',
        'user.id AS userId',
        'user.name AS userName',
      ])
      .getRawMany<RawTimelineRow>();
  }

  /**
   * Map raw rows to DTOs in a single O(n) pass, computing each
   * stage's duration against the NEXT row's `changed_at` (or `now`
   * for the final/current row). The last row is the only one with
   * `isCurrentStage = true`.
   */
  private toTimelineDtos(
    rows: RawTimelineRow[],
    now: Date,
  ): AgeingTimelineItemDto[] {
    if (rows.length === 0) return [];

    const result: AgeingTimelineItemDto[] = new Array(rows.length);
    const lastIndex = rows.length - 1;

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const isCurrent = i === lastIndex;
      const nextChangedAt = isCurrent ? now : rows[i + 1].changedAt;

      const userId = row.userId == null ? null : Number(row.userId);
      const completedBy =
        userId !== null && Number.isFinite(userId)
          ? { id: userId, name: row.userName ?? null }
          : null;

      result[i] = {
        statusId: Number(row.toStatusId ?? 0),
        status: row.statusCode ?? '',
        completedOn: new Date(row.changedAt),
        completedBy,
        action: row.action ?? null,
        remarks: row.remarks ?? null,
        durationInHours: diffInHours(row.changedAt, nextChangedAt),
        isCurrentStage: isCurrent,
      };
    }
    return result;
  }

  /**
   * Build the summary block.
   *
   * `currentStageSince` is the canonical anchor for ageing:
   *   - When the timeline is non-empty, it equals the latest row's
   *     `completedOn` (i.e. when the IOM entered its current stage).
   *   - When the timeline is empty (no history rows yet), it falls
   *     back to `ioms.created_at` so the FE always has a non-null
   *     anchor and ageing is measured from the IOM's birth.
   *
   * `ageingInHours` and `ageingInDays` are floored independently so
   * `ageingInHours` is always the more precise of the two (e.g. an
   * IOM 26 hours old reports `ageingInDays = 1, ageingInHours = 26`).
   */
  private buildSummary(
    iom: Iom,
    timeline: AgeingTimelineItemDto[],
    now: Date,
  ): AgeingSummaryDto {
    const currentStageSince =
      timeline.length > 0
        ? timeline[timeline.length - 1].completedOn
        : iom.createdAt;

    return {
      iomId: Number(iom.id),
      salesOrderId: iom.salesOrderId ?? null,
      iomNo: iom.iomNo ?? null,
      projectName: iom.project?.name ?? null,
      customerName: resolveCustomerNameFromDetails(iom.customerDetails),
      // Per spec: `submittedAt` is sourced from `ioms.created_at`,
      // NOT the dedicated `ioms.submitted_at` column.
      submittedAt: iom.createdAt ?? null,
      currentStage: iom.status?.code ?? '',
      currentStageSince,
      ageingInDays: diffInDays(currentStageSince, now),
      ageingInHours: diffInHours(currentStageSince, now),
    };
  }
}
