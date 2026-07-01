import { Injectable, Logger } from '@nestjs/common';
import { format } from 'date-fns';
import { PassThrough } from 'stream';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  IsNull,
  QueryFailedError,
  Repository,
  EntityManager,
} from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Iom } from '../entities/iom.entity';
import {
  IncentiveBooking,
  Projects,
  Users,
  ProjectUserMapping,
  Brands,
} from 'src/entities';
import { PaymentStatusEnum } from 'src/enums/booking-list.enums';
import { RolesEnum } from 'src/enums/roles.enum';

import { WorkflowValidationService } from './workflow-validation.service';
import {
  AuthenticatedUser,
  IomValidationService,
} from './iom-validation.service';
import { IomSubmissionNotificationService } from './iom-submission-notification.service';
import { CustomConfigService } from 'src/config/custom-config.service';
import { AwsService } from 'src/modules/aws/aws.service';
import { PdfService } from 'src/modules/pdf/pdf.service';
import {
  buildIomDetailsTemplateVars,
  buildReferralEditReasonTemplateVars,
  loadTemplate,
  substituteTemplateVars,
} from '../helpers/iom-pdf-template.mapper';
import { IomStatusCodeEnum } from '../enums/iom-status-code.enum';
import { IomErrorCodeEnum } from '../enums/iom-error-code.enum';
import { throwIomError } from '../utils/iom-error.util';
import { IomHistoryEvent } from '../events/iom-history.event';
import {
  IOM_HISTORY_EVENT,
  IomHistoryActionEnum,
  REJECTION_STATUS_CODES,
} from '../constants';

import { GenerateIomDto } from '../dto/generate-iom.dto';
import { EditIomDto } from '../dto/edit-iom.dto';
import { SubmitIomDto } from '../dto/submit-iom.dto';
import {
  IomReviewerSummary,
  IomSignatoryBlock,
  IomSignatoryInfo,
  IomSignatoryRole,
} from '../types/iom-signatory.interface';

/** Role hierarchy for PDF signatory scoping (low → high). */
const PDF_SIGNATORY_ROLE_LEVEL: Partial<Record<RolesEnum, number>> = {
  [RolesEnum.CRM]: 0,
  [RolesEnum.CRM_TL]: 1,
  [RolesEnum.CRM_HEAD]: 2,
  [RolesEnum.FINANCE_USER]: 3,
  [RolesEnum.FINANCE_HEAD]: 4,
};

const PDF_SIGNATORY_SLOTS: (keyof IomSignatoryBlock)[] = [
  'crm',
  'crmTl',
  'crmHead',
  'financeVerifier',
  'financeApprover',
];

/** MySQL driver error code for unique-constraint violation. */
const MYSQL_DUP_ENTRY = 'ER_DUP_ENTRY';

/**
 * Statuses from which a `resubmit` action on `PATCH /iom/:id` is
 * permitted. Mirrors the standalone `POST /:id/resubmit` contract but
 * also includes `DRAFT` (the user may have saved a draft and then
 * decided to submit) and `DELETED` (ops recovery path).
 *
 * Authorization for the actual transition is still 100 % DB-driven via
 * `iom_transitions`; this set is only a pre-lock fast-fail so the
 * caller gets a clear 400 before the FOR UPDATE lock is acquired.
 */
const PATCH_RESUBMIT_ALLOWED: ReadonlySet<IomStatusCodeEnum> = new Set([
  IomStatusCodeEnum.CRM_TL_REJECTED,
  IomStatusCodeEnum.CRM_HEAD_REJECTED,
  IomStatusCodeEnum.FINANCE_MEMBER_REJECTED,
  IomStatusCodeEnum.FINANCE_APPROVER_REJECTED,
  IomStatusCodeEnum.INVOICE_REJECTED_BY_FINANCE,
  IomStatusCodeEnum.DELETED,
]);

/** Round to 2 decimal places using banker's-friendly half-up. */
const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Safely extract a string-shaped field out of a JSON-column payload.
 *
 * Accepts a list of candidate keys and returns the first one that
 * resolves to a non-empty string. This is needed because the JSON
 * blobs on `ioms` are written by multiple producers and use mixed
 * casing - e.g. `customer_details` stores `project_location` /
 * `booking_date`, while `referrer_details` stores the camelCase
 * `projectLocation` / `bookingDate`. The view layer normalises both.
 *
 * Trims whitespace, normalises empty strings to null, and coerces
 * numeric values to their string representation so date/id columns
 * stored as numbers still surface as strings.
 */
const pickStringField = (
  obj: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string | null => {
  if (!obj) return null;
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) return trimmed;
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
};

export type IomViewMode = 'editable' | 'view-only';

/**
 * Extra fields surfaced alongside the raw IOM entity by `getIom`.
 *
 * - `statusCode` is the human-readable code from `iom_statuses.code`
 *   (e.g. `IOM_TO_BE_CREATED`) - the FE consumes this directly so it
 *   never has to keep a copy of the status-id mapping.
 * - `sourceInSAP` mirrors `ioms.source_in_sales_force` under the
 *   FE-friendly name the contract uses.
 * - `customerProjectName` resolves `ioms.project_id` (the IOM's own
 *   project) to `projects.name` via the joined relation.
 * - The remaining `customer*` / `referrer*` fields are flattened
 *   from the `customer_details` / `referrer_details` JSON columns;
 *   we never expose the raw JSON shape to the FE.
 * - `referrerProjectName` is resolved by looking up the project the
 *   referrer's existing booking belongs to, using
 *   `referrer_details.projectId` (by id when numeric, by
 *   `projects.name` otherwise). Returns null when the lookup fails.
 */
export interface IomDetailExtras {
  statusCode: string;
  sourceInSAP: string | null;
  customerProjectName: string | null;
  customerProjectLocation: string | null;
  customerBookingDate: string | null;
  referrerProjectName: string | null;
  referrerUnitNo: string | null;
  referrerBookingDate: string | null;
  referrerProjectLocation: string | null;
  brand: string | null;
}

export interface IomDetailResult extends IomDetailExtras {
  iom: Iom;
  mode: IomViewMode;
  signatories: IomSignatoryBlock;
}

/**
 * Internal projection of one `project_user_mapping` row used by the
 * signatory-block builder. `isPrimary` is kept around so we don't have
 * to re-sort in the picker - the SQL already orders by it but the flag
 * is the deterministic tie-breaker when multiple rows share the same
 * `assigned_at`.
 *
 * `signatureImage` is carried along so the slot builder can surface
 * the *current caller's* own signature when they are the assigned
 * reviewer on a pending stage (see `buildSignatorySlot`). Other
 * assigned reviewers' signatures are NEVER exposed before they act -
 * the field stays internal to this module.
 */
interface AssignedReviewer {
  userId: number;
  name: string;
  isPrimary: boolean;
  signatureImage: string | null;
}

/**
 * Internal snapshot shape persisted to `iom_history.prev_value /
 * updated_value`. Only includes the editable + derived + audit fields
 * touched by the edit endpoint - keeps the audit row compact and
 * focused on what the CRM actually changed.
 *
 * Keys are camelCase to match the API contract.
 */
interface IomEditSnapshot {
  salePrice: number;
  brokeragePercentage: number;
  referrerRatio: number | null;
  refereeRatio: number | null;
  referralPointsRatio: string | null;
  referralSplitType: string | null;
  totalBrokerageAmount: number;
  referrerPoints: number;
  refereePoints: number;
  referralPointsEditReason: string | null;
  statusId: number;
  version: number;
}

@Injectable()
export class IomCrmService {
  private readonly logger = new Logger(IomCrmService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Users)
    private readonly usersRepo: Repository<Users>,
    @InjectRepository(Iom)
    private readonly iomRepo: Repository<Iom>,
    @InjectRepository(ProjectUserMapping)
    private readonly projectUserMappingRepo: Repository<ProjectUserMapping>,
    @InjectRepository(Projects)
    private readonly projectsRepo: Repository<Projects>,
    private readonly workflow: WorkflowValidationService,
    private readonly validator: IomValidationService,
    private readonly eventEmitter: EventEmitter2,
    private readonly submissionNotifier: IomSubmissionNotificationService,
    private readonly pdfService: PdfService,
    private readonly awsService: AwsService,
    private readonly configService: CustomConfigService,
    @InjectRepository(Brands)
    private readonly brandRepo: Repository<Brands>,
  ) {}

  // ============================================================
  // GENERATE
  // ============================================================

  async generateIom(
    user: AuthenticatedUser,
    dto: GenerateIomDto,
  ): Promise<Iom> {
    return this.dataSource.transaction(async (manager) => {
      const booking = await this.lockBookingForGenerate(manager, dto.bookingId);

      const projectId = booking.projectPhase?.project?.id ?? null;
      await this.validator.assertProjectAccess(user, projectId);

      this.assertBookingIsEligible(booking);
      await this.assertNoActiveIomForBooking(manager, dto.bookingId);

      const initialStatusId = this.workflow.getStatusId(
        IomStatusCodeEnum.IOM_TO_BE_CREATED,
      );

      const repo = manager.getRepository(Iom);
      const insert = repo.create({
        bookingId: dto.bookingId,
        projectId,
        salePrice: dto.salePrice,
        totalBrokerageAmount: dto.totalBrokerageAmount,
        brokeragePercentage: dto.brokeragePercentage,
        customerMobile: dto.customerMobile,
        customerDetails: dto.customerDetails ?? null,
        referrerMobile: dto.referrerMobile ?? null,
        referrerDetails: dto.referrerDetails ?? null,
        referralSplitType: dto.referralSplitType,
        referralSplitRatio: dto.referralSplitRatio ?? null,
        referrerRatio: dto.referrerRatio ?? null,
        refereeRatio: dto.refereeRatio ?? null,
        referrerPoints: dto.referrerPoints,
        refereePoints: dto.refereePoints,
        referralClassification: dto.referralClassification,
        loyaltyDetails: dto.loyaltyDetails ?? null,
        statusId: initialStatusId,
        createdBy: user.dbId,
        version: 0,
      });

      let saved: Iom;
      try {
        saved = await repo.save(insert);
        saved.iomNo = `IOM_${format(new Date(), 'yyyyMMdd')}_${saved.id}`;
        await this.iomRepo.save(saved);
      } catch (err) {
        if (this.isDuplicateBookingError(err)) {
          throwIomError(IomErrorCodeEnum.DUPLICATE_IOM_EXISTS, {
            bookingId: dto.bookingId,
          });
        }
        throw err;
      }

      this.emitHistory(
        new IomHistoryEvent(
          Number(saved.id),
          initialStatusId,
          user.dbId,
          IomHistoryActionEnum.IOM_CREATED,
          null,
          'IOM Created',
          null,
          { initialStatus: IomStatusCodeEnum.IOM_TO_BE_CREATED },
        ),
      );

      return saved;
    });
  }

  // ============================================================
  // EDIT
  // ============================================================

  /**
   * CRM Edit IOM – supports three lifecycle actions via `dto.action`:
   *
   *   `submit`   – existing auto-submit flow (IOM_TO_BE_CREATED → CRM_TL_APPROVAL_PENDING).
   *   `draft`    – save without submitting; status becomes DRAFT.
   *   `resubmit` – edit + resubmit from DRAFT or any rejection state.
   *
   * Shared rules (all actions):
   *   1. Body whitelist enforced via `CRM_ALLOWED_INPUT_FIELDS` ∪ `DERIVED_FIELDS`.
   *   2. Action-specific status gate (`assertEditActionAllowed`).
   *   3. Pessimistic `SELECT ... FOR UPDATE` lock serialises concurrent edits.
   *   4. Per-field edit-flag model: flags drive which inputs are compared
   *      against the stored row; unchanged values are silently skipped;
   *      only genuinely different values are persisted with audit stamps.
   *   5. Effective-state validation: brokerage cap, ratio invariants.
   *   6. Derived recompute: `totalBrokerageAmount`, `referrerPoints`,
   *      `refereePoints` from effective inputs; FE-supplied values are
   *      tolerance-checked but never persisted directly.
   *   7. Atomic persist via query-builder UPDATE; `version` always bumped.
   *
   * Action-specific rules:
   *   - `submit`   → `assertMandatoryForSubmission` + `validateTransition`
   *                  → statusId=CRM_TL_APPROVAL_PENDING + submittedAt stamp
   *                  → CRM_EDIT (if fields changed) + CRM_SUBMIT events
   *                  → submission notification fan-out (post-commit).
   *   - `draft`    → skip mandatory + workflow validation
   *                  → statusId=DRAFT (no submittedAt)
   *                  → CRM_EDIT (if fields changed) + CRM_DRAFT events.
   *   - `resubmit` → `assertMandatoryForSubmission` + `validateTransition`
   *                  → statusId=CRM_TL_APPROVAL_PENDING + submittedAt stamp
   *                  → CRM_EDIT (if fields changed) + CRM_RESUBMIT events
   *                  → submission notification fan-out (post-commit).
   */
  async editIom(
    user: AuthenticatedUser,
    id: number,
    dto: EditIomDto,
    rawPayload: Record<string, unknown>,
  ): Promise<Iom> {
    // Defence-in-depth body whitelist (the ValidationPipe already
    // stripped, but some callers may bypass).
    this.validator.assertCrmEditWhitelist(rawPayload);

    // Every flag set to true must come with the matching input value.
    // Runs before the transaction so we don't lock the row for a
    // request that's already missing required data.
    //
    // `deviation` + `referrerRatio` / `refereeRatio` are forwarded so
    // the "other"-split-type contract can be enforced in one place:
    // when the FE selects `referralPointsRatio === "other"` AND
    // `deviation === false`, the numeric ratio components MUST also
    // be supplied. When `deviation === true`, they must NOT be sent
    // (the ratio columns will be nulled out).
    this.validator.assertFlaggedInputsArePresent({
      salePriceEdited: dto.salePriceEdited,
      brokeragePercentageEdited: dto.brokeragePercentageEdited,
      referralPointsRatioEdited: dto.referralPointsRatioEdited,
      salePrice: dto.salePrice,
      brokeragePercentage: dto.brokeragePercentage,
      referralPointsRatio: dto.referralPointsRatio,
      deviation: dto.deviation,
      referrerRatio: dto.referrerRatio,
      refereeRatio: dto.refereeRatio,
    });

    const persisted = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Iom);

      // Pessimistic FOR UPDATE lock.
      const iom = await repo
        .createQueryBuilder('iom')
        .where('iom.id = :id', { id })
        .andWhere('iom.deletedAt IS NULL')
        .setLock('pessimistic_write')
        .getOne();

      if (!iom) {
        throwIomError(IomErrorCodeEnum.IOM_NOT_FOUND, { iomId: id });
      }

      // Authorization checks.
      await this.validator.assertProjectAccess(user, iom!.projectId);

      const userRoleId = this.workflow.resolveRoleId(user.role ?? '');
      this.workflow.assertCanAct(Number(iom!.statusId), userRoleId);

      // Action-specific status gate.
      const fromStatusId = Number(iom!.statusId);
      const currentCode = this.workflow.getStatusCode(fromStatusId);
      this.assertEditActionAllowed(dto.action, currentCode);

      // Resolve project for the brokerage cap.
      const project = await this.loadProjectOrThrow(manager, iom!.projectId);

      // Build the effective state, validate it, recompute derived
      // fields, and produce the SET payload.
      const plan = this.buildEditPlan(iom!, dto, user, project);

      // Snapshot BEFORE persisting so the history event carries the
      // prev values regardless of which fields actually changed.
      const before = this.snapshotForEdit(iom!);

      // ---- Action-specific lifecycle transition ----

      let targetStatusId: number;

      if (dto.action === 'submit' || dto.action === 'resubmit') {
        // Build the effective IOM (stored merged with SET payload) so
        // `assertMandatoryForSubmission` sees what the row WILL look
        // like after this txn commits. Fields not editable via PATCH
        // (e.g. `customerMobile`, `referralClassification`) are
        // inherited from the stored row and must already be populated.
        const effectiveIom = this.buildEffectiveIomForSubmission(iom!, plan);
        this.validator.assertMandatoryForSubmission(effectiveIom);

        // DB-driven transition gate + maker-checker rule.
        targetStatusId =
          currentCode === 'CRM_TL_APPROVAL_PENDING'
            ? this.workflow.getStatusId(
                IomStatusCodeEnum.CRM_HEAD_APPROVAL_PENDING,
              )
            : this.workflow.getStatusId(
                IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING,
              );
        this.workflow.validateTransition(
          fromStatusId,
          targetStatusId,
          userRoleId,
          {
            actorUserId: user.dbId,
            iomCreatedBy: iom!.createdBy,
          },
        );

        plan.setPayload.statusId = targetStatusId;
        plan.setPayload.submittedAt = new Date();
        plan.setPayload.brokerageAdjNonLoyalty = dto.deviation ? 1 : 0;
        if (
          currentCode === IomStatusCodeEnum.IOM_TO_BE_CREATED &&
          user.role === 'CRM'
        ) {
          plan.setPayload.createdBy = user.dbId;
        }
        if (
          currentCode === IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING &&
          user.role === 'CRM TL'
        ) {
          plan.setPayload.crmVerifiedBy = user.dbId;
          plan.setPayload.crmVerifiedAt = new Date();
        }
        if (
          currentCode === IomStatusCodeEnum.CRM_HEAD_APPROVAL_PENDING &&
          user.role === 'CRM Head'
        ) {
          plan.setPayload.crmApprovedBy = user.dbId;
          plan.setPayload.crmApprovedAt = new Date();
        }
      } else {
        // draft: save without submitting; no mandatory validation, no
        // workflow transition gate.
        targetStatusId = this.workflow.getStatusId(IomStatusCodeEnum.DRAFT);
        plan.setPayload.statusId = targetStatusId;
      }

      // Atomic persist. The SET payload contains only genuinely
      // changed columns plus their audit stamps, the status
      // transition, and the version bump.
      const result = await repo
        .createQueryBuilder()
        .update(Iom)
        .set(plan.setPayload)
        .where('id = :id', { id })
        .execute();

      if (!result.affected || result.affected === 0) {
        throwIomError(IomErrorCodeEnum.CONCURRENT_MODIFICATION_DETECTED, {
          iomId: id,
        });
      }

      const persisted = await repo.findOne({ where: { id } });
      if (!persisted) {
        throwIomError(IomErrorCodeEnum.IOM_NOT_FOUND, { iomId: id });
      }
      const after = this.snapshotForEdit(persisted!);

      // CRM_EDIT: field-level before/after snapshot. Suppressed for
      // pure no-op PATCHs so audit tooling stays clean.
      if (plan.anyChange) {
        this.emitHistory(
          new IomHistoryEvent(
            Number(id),
            fromStatusId,
            user.dbId,
            IomHistoryActionEnum.CRM_EDIT,
            fromStatusId,
            IomHistoryActionEnum.CRM_EDIT,
            before as unknown as Record<string, unknown>,
            after as unknown as Record<string, unknown>,
          ),
        );
      }

      // Lifecycle event: always emitted regardless of field changes.
      if (dto.action === 'submit') {
        this.emitHistory(
          new IomHistoryEvent(
            Number(id),
            targetStatusId,
            user.dbId,
            IomHistoryActionEnum.CRM_SUBMIT,
            fromStatusId,
            'Submitted for TL approval',
            { statusCode: currentCode },
            { statusCode: IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING },
          ),
        );
      } else if (dto.action === 'resubmit') {
        this.emitHistory(
          new IomHistoryEvent(
            Number(id),
            targetStatusId,
            user.dbId,
            IomHistoryActionEnum.CRM_RESUBMIT,
            fromStatusId,
            'Resubmitted for TL approval',
            { statusCode: currentCode },
            { statusCode: IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING },
          ),
        );
      } else {
        this.emitHistory(
          new IomHistoryEvent(
            Number(id),
            targetStatusId,
            user.dbId,
            IomHistoryActionEnum.CRM_DRAFT,
            fromStatusId,
            'Saved as draft',
            { statusCode: currentCode },
            { statusCode: IomStatusCodeEnum.DRAFT },
          ),
        );
      }

      return persisted!;
    });

    // Post-commit notification fan-out for submit / resubmit only.
    // Deliberately AFTER the transaction so the CRM TL never sees a
    // notification for an IOM the DB rolled back. Fire-and-forget:
    // notification failures must NOT roll back the workflow.
    if (dto.action === 'submit' || dto.action === 'resubmit') {
      this.submissionNotifier
        .notifySubmission({
          iom: persisted,
          submittedByUserId: user.dbId,
        })
        .catch((err) => {
          this.logger.error(
            `Failed to dispatch IOM submission notification for IOM ${id}`,
            err instanceof Error ? err.stack : undefined,
          );
        });
    }

    return persisted;
  }

  /**
   * Enforce the per-action allowed-status contract for `PATCH /iom/:id`.
   *
   *   submit   – only from `IOM_TO_BE_CREATED` (first-time submission).
   *   draft    – from `IOM_TO_BE_CREATED`, `DRAFT`, or any state in
   *              `PATCH_RESUBMIT_ALLOWED` (user pauses mid-flow).
   *   resubmit – from `PATCH_RESUBMIT_ALLOWED` only (rejected / deleted).
   *
   * Throws `INVALID_STATUS_FOR_ACTION` with a descriptive payload when the
   * contract is violated; returns void when the action is permitted.
   */
  private assertEditActionAllowed(
    action: 'draft' | 'submit' | 'resubmit',
    currentCode: IomStatusCodeEnum,
  ): void {
    if (action === 'submit') {
      if (
        currentCode !== IomStatusCodeEnum.IOM_TO_BE_CREATED &&
        currentCode !== IomStatusCodeEnum.DRAFT &&
        currentCode !== IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING
      ) {
        throwIomError(IomErrorCodeEnum.INVALID_STATUS_FOR_ACTION, {
          currentStatus: currentCode,
          allowed: [
            IomStatusCodeEnum.IOM_TO_BE_CREATED,
            IomStatusCodeEnum.DRAFT,
            IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING,
          ],
          reason:
            'submit action is only permitted before the IOM has been submitted.',
        });
      }
      return;
    }

    if (action === 'resubmit') {
      if (!PATCH_RESUBMIT_ALLOWED.has(currentCode)) {
        throwIomError(IomErrorCodeEnum.INVALID_STATUS_FOR_ACTION, {
          currentStatus: currentCode,
          allowed: [...PATCH_RESUBMIT_ALLOWED],
          reason:
            'resubmit action is only permitted from a DRAFT or rejected state.',
        });
      }
      return;
    }

    // draft: allowed from IOM_TO_BE_CREATED or any resubmit-eligible state.
    if (
      currentCode !== IomStatusCodeEnum.IOM_TO_BE_CREATED &&
      !PATCH_RESUBMIT_ALLOWED.has(currentCode)
    ) {
      throwIomError(IomErrorCodeEnum.INVALID_STATUS_FOR_ACTION, {
        currentStatus: currentCode,
        allowed: [
          IomStatusCodeEnum.IOM_TO_BE_CREATED,
          ...PATCH_RESUBMIT_ALLOWED,
        ],
        reason: 'draft action is not permitted in the current status.',
      });
    }
  }

  /**
   * Build a synthetic `Iom` representing the row state AFTER the
   * planned UPDATE commits, used as the input to
   * `assertMandatoryForSubmission` on the auto-submit path.
   *
   * The merge is "stored, with overrides from the SET payload" -
   * any field present in `plan.setPayload` wins (because that's what
   * the UPDATE will write), and everything else falls through to
   * the locked row. The audit / version / status-transition keys in
   * the payload are harmless overrides for validation purposes since
   * `assertMandatoryForSubmission` only inspects the business
   * fields.
   */
  private buildEffectiveIomForSubmission(
    iom: Iom,
    plan: { setPayload: Record<string, unknown> },
  ): Iom {
    return {
      ...iom,
      ...(plan.setPayload as Partial<Iom>),
    } as Iom;
  }

  /**
   * Build the per-field edit plan for a CRM Edit IOM request.
   *
   * The orchestrator (`editIom`) handles transactions, locking, and
   * history; this helper owns the pure data transformation:
   *
   *   1. Compute the *effective* per-field state by merging incoming
   *      overrides (when flag=true AND value differs) on top of the
   *      stored row. Anything else falls through to the stored value.
   *   2. Validate the effective state against the project's brokerage
   *      cap and the basic numeric invariants.
   *   3. Recompute `referrerRatio` / `refereeRatio` /
   *      `totalBrokerageAmount` / `referrerPoints` / `refereePoints`
   *      from the effective inputs and tolerance-compare them against
   *      any FE-supplied derived values.
   *   4. Produce a TypeORM-style SET payload containing only the
   *      columns that genuinely changed (inputs + their audit stamps
   *      + the derived block + the optional edit reason).
   *
   * Returning `anyChange = false` means the request is a pure no-op
   * apart from the version bump - the caller skips the history event.
   */
  // Cyclomatic complexity here is high (~29) by design: the function
  // encodes a small per-field state machine (3 inputs x {flag,
  // diff} + 5 derived diffs + 1 audit note). Splitting it across
  // helpers obscures the linear data flow without removing any of
  // the necessary branches, so we suppress the rule locally and lean
  // on the test suite (`iom-crm.service.spec.ts`) for safety.
  // eslint-disable-next-line complexity
  private buildEditPlan(
    iom: Iom,
    dto: EditIomDto,
    user: AuthenticatedUser,
    project: Projects,
  ): { setPayload: Record<string, unknown>; anyChange: boolean } {
    const storedReferrerRatio =
      iom.referrerRatio == null ? null : Number(iom.referrerRatio);
    const storedRefereeRatio =
      iom.refereeRatio == null ? null : Number(iom.refereeRatio);

    const stored = {
      salePrice: Number(iom.salePrice),
      brokeragePercentage: Number(iom.brokeragePercentage),
      totalBrokerageAmount: Number(iom.totalBrokerageAmount),
      referrerPoints: Number(iom.referrerPoints),
      refereePoints: Number(iom.refereePoints),
      referrerRatio: storedReferrerRatio,
      refereeRatio: storedRefereeRatio,
      // Canonical `"X:Y"` derived from the stored numeric ratios; this
      // is what we compare the incoming `referralPointsRatio` string
      // against. Null when either column is null (fresh / legacy row).
      referralPointsRatio: this.validator.formatReferralRatio(
        storedReferrerRatio,
        storedRefereeRatio,
      ),
    };
    const original =
      (iom.originalPaymentDetails as Record<string, unknown>) ?? {};

    const originalSalePrice = Number(original.sale_price);

    const originalBrokeragePercentage = Number(original.brokerage_percentage);

    const originalReferralSplitType =
      typeof original.referral_split_type === 'string'
        ? original.referral_split_type
        : null;

    const salePriceChanged =
      dto.salePriceEdited === true &&
      this.validator.valuesDiffer(dto.salePrice, stored.salePrice);
    const brokeragePercentageChanged =
      dto.brokeragePercentageEdited === true &&
      this.validator.valuesDiffer(
        dto.brokeragePercentage,
        stored.brokeragePercentage,
      );

    // Ratio parses early so we can both compare and recompute from
    // the same source of truth. The `@Matches` regex on the DTO
    // guarantees the string is well-shaped before we get here, so a
    // null parse means either "the FE didn't send it" or the FE
    // sent the literal `"other"` marker (handled separately below).
    const incomingRatio = this.validator.parseReferralRatio(
      dto.referralPointsRatio,
    );
    const trimmedIncomingRatio = (dto.referralPointsRatio ?? '').trim();
    // `"other"` is the opaque FE marker for "user picked the 'other'
    // split-type but didn't (yet) send a numeric ratio". It has no
    // parseable X/Y, so we never touch `referrer_ratio`,
    // `referee_ratio`, or `referral_split_ratio` for this case - we
    // only stamp `referral_split_type = 'other'` and the audit cols.
    const isOtherRatio = trimmedIncomingRatio === 'other';
    // The wire format now accepts decimals (e.g. "1.2:0.8" for the
    // FE "other" split). MySQL `float` storage can introduce sub-LSB
    // drift on round-trip, so a strict string compare may say
    // "changed" when the numbers are functionally identical. We
    // require BOTH a string mismatch AND a tolerance-level numeric
    // mismatch on either part before marking the field as changed.
    // For legacy integer ratios this matches today's behavior
    // exactly (e.g. "1:1" vs stored 1/1 -> same string, same numbers
    // -> no-op).
    const ratioStringDiffers =
      trimmedIncomingRatio !== (stored.referralPointsRatio ?? '');
    const ratioNumericallyDiffers =
      incomingRatio != null &&
      (this.validator.valuesDiffer(
        incomingRatio.referrerRatio,
        stored.referrerRatio,
      ) ||
        this.validator.valuesDiffer(
          incomingRatio.refereeRatio,
          stored.refereeRatio,
        ));
    const referralPointsRatioChanged =
      dto.referralPointsRatioEdited === true &&
      incomingRatio != null &&
      ratioStringDiffers &&
      ratioNumericallyDiffers;
    // "FE picked the `other` split-type for this edit", regardless of
    // whether the stored split-type was already `'other'`. The numeric
    // ratio columns may still need to be (re)written from the FE's
    // explicit `referrerRatio` / `refereeRatio` even when the type
    // itself is unchanged.
    const otherRatioSelected =
      dto.referralPointsRatioEdited === true && isOtherRatio;
    // Subset of the above used only for the `referralSplitType`
    // column update: we only write `'other'` to the type column when
    // the stored type is something else (transitioning into `'other'`).
    const otherRatioChanged =
      otherRatioSelected && iom.referralSplitType !== 'other';
    const effectiveReferralSplitType = referralPointsRatioChanged
      ? trimmedIncomingRatio
      : otherRatioSelected
        ? 'other'
        : iom.referralSplitType;

    const revertedReferralSplitType =
      !!originalReferralSplitType &&
      effectiveReferralSplitType === originalReferralSplitType;

    const effectiveSalePrice = salePriceChanged
      ? (dto.salePrice as number)
      : stored.salePrice;
    const effectiveBrokeragePercentage = brokeragePercentageChanged
      ? (dto.brokeragePercentage as number)
      : stored.brokeragePercentage;
    const revertedBrokeragePercentage =
      originalBrokeragePercentage > 0 &&
      effectiveBrokeragePercentage === originalBrokeragePercentage;
    // Persisted ratio numbers (what we will write to
    // `ioms.referrer_ratio` / `ioms.referee_ratio`). Can be `null`
    // when `deviation === true` - the ratio concept does not apply
    // in deviation mode, so both columns are stored as `null`.
    //
    // Resolution order:
    //   1. `deviation === true`            → null, null  (no ratio applies)
    //   2. FE sent a parseable `"X:Y"`     → parsed parts
    //   3. FE sent `"other"` (no deviation)→ FE-supplied
    //                                        `dto.referrerRatio` /
    //                                        `dto.refereeRatio`
    //                                        (validator already
    //                                        ensured they are present)
    //   4. Otherwise                       → stored values
    let persistedReferrerRatio: number | null;
    let persistedRefereeRatio: number | null;
    if (dto.deviation === true) {
      persistedReferrerRatio = null;
      persistedRefereeRatio = null;
    } else if (referralPointsRatioChanged) {
      persistedReferrerRatio = incomingRatio!.referrerRatio;
      persistedRefereeRatio = incomingRatio!.refereeRatio;
    } else if (otherRatioSelected) {
      persistedReferrerRatio = dto.referrerRatio as number;
      persistedRefereeRatio = dto.refereeRatio as number;
    } else {
      persistedReferrerRatio = stored.referrerRatio;
      persistedRefereeRatio = stored.refereeRatio;
    }
    const revertedSalePrice =
      originalSalePrice > 0 && effectiveSalePrice === originalSalePrice;

    this.validator.assertCrmEditInputs({
      salePrice: effectiveSalePrice,
      brokeragePercentage: effectiveBrokeragePercentage,
      referrerRatio: persistedReferrerRatio,
      refereeRatio: persistedRefereeRatio,
      maxBrokeragePercentage: Number(project.maxBrokeragePercentage),
      deviation: dto.deviation,
    });

    // Two completely separate paths for the derived bundle
    // (`totalBrokerageAmount`, `referrerPoints`, `refereePoints`):
    //
    //   - **Non-deviation**: BE is authoritative. We recompute from
    //     `effectiveSalePrice * brokeragePercentage / 100`, then
    //     distribute by the ratio (un-normalised, `"2:0"` = all to
    //     referrer, etc.). Any FE-supplied derived values are
    //     tolerance-checked against the BE recompute and discarded;
    //     the BE numbers are what get persisted. `assertCrmEditInputs`
    //     has already ensured the ratio parts are non-null and not
    //     `"0:0"`, so `ratioSum > 0` is safe here.
    //
    //   - **Deviation**: FE is authoritative - the CRM has explicitly
    //     opted out of the standard brokerage / point formula (e.g.
    //     one-off Finance-approved override). We persist the FE's
    //     `totalBrokerageAmount` / `referrerPoints` / `refereePoints`
    //     verbatim and skip the BE recompute entirely (no 1:1
    //     fallback). The ratio columns themselves are nulled out
    //     separately (see `persistedReferrerRatio` /
    //     `persistedRefereeRatio`) because no ratio applies to a
    //     manually overridden split. Falling back to the stored row
    //     when the FE omits a field keeps the column well-defined.
    let totalBrokerageAmount: number;
    let referrerPoints: number;
    let refereePoints: number;
    if (dto.deviation === true) {
      totalBrokerageAmount =
        dto.totalBrokerageAmount != null
          ? round2(Number(dto.totalBrokerageAmount))
          : Number(stored.totalBrokerageAmount);
      referrerPoints =
        dto.referrerPoints != null
          ? round2(Number(dto.referrerPoints))
          : Number(stored.referrerPoints);
      refereePoints =
        dto.refereePoints != null
          ? round2(Number(dto.refereePoints))
          : Number(stored.refereePoints);
    } else {
      const ratioSum = persistedReferrerRatio! + persistedRefereeRatio!;
      totalBrokerageAmount = round2(
        effectiveSalePrice * (effectiveBrokeragePercentage / 100),
      );
      referrerPoints = round2(
        (totalBrokerageAmount * persistedReferrerRatio!) / ratioSum,
      );
      refereePoints = round2(
        (totalBrokerageAmount * persistedRefereeRatio!) / ratioSum,
      );
      this.validator.assertFeDerivedMatchesBe(
        {
          totalBrokerageAmount: dto.totalBrokerageAmount,
          referrerPoints: dto.referrerPoints,
          refereePoints: dto.refereePoints,
        },
        { totalBrokerageAmount, referrerPoints, refereePoints },
      );
    }

    const derivedChanged =
      this.validator.valuesDiffer(
        totalBrokerageAmount,
        stored.totalBrokerageAmount,
      ) ||
      this.validator.valuesDiffer(referrerPoints, stored.referrerPoints) ||
      this.validator.valuesDiffer(refereePoints, stored.refereePoints) ||
      this.validator.valuesDiffer(
        persistedReferrerRatio,
        stored.referrerRatio,
      ) ||
      this.validator.valuesDiffer(persistedRefereeRatio, stored.refereeRatio);

    const editReasonProvided = dto.referralPointsEditReason !== undefined;
    const editReasonChanged =
      editReasonProvided &&
      (dto.referralPointsEditReason ?? null) !==
        (iom.referralPointsEditReason ?? null);

    const now = new Date();
    const setPayload: Record<string, unknown> = {
      updatedBy: user.dbId,
      version: () => '`version` + 1',
    };
    if (!iom.originalPaymentDetails) {
      setPayload.originalPaymentDetails = {
        sale_price: Number(iom.salePrice),
        referral_split_type: iom.referralSplitType,
        brokerage_percentage: Number(iom.brokeragePercentage),
      };
    }

    if (salePriceChanged) {
      setPayload.salePrice = effectiveSalePrice;

      if (revertedSalePrice) {
        setPayload.salePriceEdited = false;
        setPayload.salePriceEditedAt = null;
        setPayload.salePriceEditedBy = null;
      } else {
        setPayload.salePriceEdited = true;
        setPayload.salePriceEditedAt = now;
        setPayload.salePriceEditedBy = user.dbId;
      }
    }
    if (brokeragePercentageChanged) {
      setPayload.brokeragePercentage = effectiveBrokeragePercentage;

      if (revertedBrokeragePercentage) {
        setPayload.brokeragePercentageEditedAt = null;
        setPayload.brokeragePercentageEditedBy = null;
      } else {
        setPayload.brokeragePercentageEditedAt = now;
        setPayload.brokeragePercentageEditedBy = user.dbId;
      }
    }
    if (referralPointsRatioChanged) {
      // The new ratio is stored in four places, all transactionally
      // updated together so the row stays internally consistent:
      //   - `referral_split_type` holds the raw `"X:Y"` wire string
      //     (the new authoritative split descriptor for this IOM).
      //   - `referrer_ratio` / `referee_ratio` hold the parsed parts
      //     for downstream math (point allocation, listing surface).
      //   - `referral_split_ratio` (JSON) holds the percentage form
      //     ({ referrer: %, referee: % } summing to 100) that the
      //     listing / detail surfaces consume directly. Derived from
      //     the parsed parts so the wire string remains the single
      //     source of truth.
      //   - The legacy `referral_points_adjustment` FLOAT column is
      //     deliberately NOT touched here - it can't represent
      //     `"X:0"` and is being phased out.
      setPayload.referralSplitType = trimmedIncomingRatio;
      if (revertedReferralSplitType) {
        setPayload.referralPointsEdited = false;
        setPayload.referralPointsEditedAt = null;
        setPayload.referralPointsEditedBy = null;
      } else {
        setPayload.referralPointsEdited = true;
        setPayload.referralPointsEditedAt = now;
        setPayload.referralPointsEditedBy = user.dbId;
      }
    } else if (otherRatioChanged) {
      // Transitioning the type column to `'other'`. The actual
      // numeric ratio components are written via the
      // `derivedChanged` branch below (using the FE-supplied
      // `referrerRatio` / `refereeRatio`, or `null` in deviation mode).
      setPayload.referralSplitType = 'other';
      if (revertedReferralSplitType) {
        setPayload.referralPointsEdited = false;
        setPayload.referralPointsEditedAt = null;
        setPayload.referralPointsEditedBy = null;
      } else {
        setPayload.referralPointsEdited = true;
        setPayload.referralPointsEditedAt = now;
        setPayload.referralPointsEditedBy = user.dbId;
      }
    }
    if (editReasonProvided) {
      setPayload.referralPointsEditReason =
        dto.referralPointsEditReason ?? null;
    }
    if (derivedChanged) {
      // `referrer_ratio` / `referee_ratio` may be `null` in deviation
      // mode (the ratio concept does not apply). `referral_split_ratio`
      // mirrors them: `null` when either component is `null`, otherwise
      // the percentage-form JSON enriched with the originating
      // `type` (the value we're writing to `referral_split_type` -
      // either `"X:Y"`, `"other"`, or the stored value when neither
      // is being touched). Keeping the numeric columns and the JSON
      // column in lock-step here avoids inconsistent state.
      setPayload.referrerRatio = persistedReferrerRatio;
      setPayload.refereeRatio = persistedRefereeRatio;
      setPayload.referralSplitRatio =
        this.validator.buildReferralSplitRatioJson(
          persistedReferrerRatio,
          persistedRefereeRatio,
          effectiveReferralSplitType,
        );
      setPayload.totalBrokerageAmount = totalBrokerageAmount;
      setPayload.referrerPoints = referrerPoints;
      setPayload.refereePoints = refereePoints;
    }

    const anyChange =
      salePriceChanged ||
      brokeragePercentageChanged ||
      referralPointsRatioChanged ||
      otherRatioChanged ||
      derivedChanged ||
      editReasonChanged;

    return { setPayload, anyChange };
  }

  // ============================================================
  // SUBMIT / RESUBMIT
  // ============================================================

  async submitIom(
    user: AuthenticatedUser,
    id: number,
    dto: SubmitIomDto,
  ): Promise<Iom> {
    return this.transitionToCreated(user, id, dto, 'submit');
  }

  async resubmitIom(
    user: AuthenticatedUser,
    id: number,
    dto: SubmitIomDto,
  ): Promise<Iom> {
    return this.transitionToCreated(user, id, dto, 'resubmit');
  }

  // ============================================================
  // VIEW
  // ============================================================

  async getIom(user: AuthenticatedUser, id: number): Promise<IomDetailResult> {
    const iom = await this.loadIomWithReviewersOrThrow(id);
    await this.validator.assertProjectAccess(user, iom.projectId);

    const roleId = this.workflow.resolveRoleId(user.role ?? '');
    const mode: IomViewMode = this.workflow.canAct(Number(iom.statusId), roleId)
      ? 'editable'
      : 'view-only';

    const signatories = await this.buildSignatoryBlock(iom, user.dbId);
    const extras = await this.buildIomDetailExtras(iom);

    return { iom, mode, signatories, ...extras };
  }

  /**
   * Flatten the IOM detail extras from the raw entity:
   *   - `statusCode` from the workflow registry (avoids an extra join
   *     and keeps the source of truth in `iom_statuses.code`).
   *   - `sourceInSAP` mirrors `source_in_sales_force` under the
   *     FE-facing name.
   *   - `customer*` / `referrer*` fields are pulled from the
   *     `customer_details` / `referrer_details` JSON blobs.
   *   - `referrerProjectName` is resolved against `projects` so the
   *     FE never has to interpret the referrer's stored project id.
   *
   * The lookup is best-effort - any failure degrades to `null` rather
   * than breaking the GET. The view contract treats every flattened
   * field as optional.
   */
  private async buildIomDetailExtras(iom: Iom): Promise<IomDetailExtras> {
    const statusCode = this.workflow.getStatusCode(Number(iom.statusId));

    const customer = (iom.customerDetails ?? {}) as Record<string, unknown>;
    const referrer = (iom.referrerDetails ?? {}) as Record<string, unknown>;

    const referrerProjectName = await this.resolveReferrerProjectName(
      pickStringField(referrer, 'projectId', 'project_id'),
    );
    const brand = await this.resolveBrandName(iom.projectId);

    return {
      statusCode,
      sourceInSAP: iom.sourceInSalesForce ?? null,
      customerProjectName: iom.project?.name ?? null,
      customerProjectLocation: pickStringField(
        customer,
        'projectLocation',
        'project_location',
      ),
      customerBookingDate: pickStringField(
        customer,
        'bookingDate',
        'booking_date',
      ),
      referrerProjectName,
      referrerUnitNo: pickStringField(referrer, 'unitNo', 'unit_no'),
      referrerBookingDate: pickStringField(
        referrer,
        'bookingDate',
        'booking_date',
      ),
      referrerProjectLocation: pickStringField(
        referrer,
        'projectLocation',
        'project_location',
      ),
      brand,
    };
  }

  /**
   * Resolve the human-readable name of the referrer's project given
   * the raw value from `referrer_details.projectId`.
   *
   * The stored value can be either:
   *   - a numeric `projects.id` (e.g. `"42"`); we cast and look up by id.
   *   - a `projects.name` / external code (e.g. `"PRJ001"`); we look up
   *     by `name` as a fallback.
   *
   * Returns `null` if the value is missing, the project can't be found,
   * or the lookup fails. We intentionally swallow DB errors here -
   * the GET must not 500 just because we can't resolve a derived name.
   */
  private async resolveReferrerProjectName(
    rawProjectId: string | null,
  ): Promise<string | null> {
    if (!rawProjectId) return null;
    const trimmed = rawProjectId.trim();
    if (!trimmed) return null;

    try {
      let project: Projects | null = null;
      if (/^\d+$/.test(trimmed)) {
        project = await this.projectsRepo.findOne({
          where: { id: Number(trimmed) },
        });
      }
      if (!project) {
        project = await this.projectsRepo.findOne({
          where: { name: trimmed },
        });
      }
      return project?.name ?? null;
    } catch (err) {
      this.logger.warn(
        `Failed to resolve referrer project name for projectId="${rawProjectId}": ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return null;
    }
  }
  async resolveBrandName(projectId: number): Promise<string | null> {
    try {
      const project = await this.projectsRepo.findOne({
        where: { id: projectId },
        select: ['brandId'],
      });

      if (!project?.brandId) {
        return null;
      }
      const brandLogo = await this.brandRepo.findOne({
        where: { id: project.brandId },
        select: ['logo'], // use your actual logo column name
      });
      return brandLogo.logo;
    } catch (err) {
      this.logger.warn(
        `Failed to resolve brand name for projectId=${projectId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );

      return null;
    }
  }

  async getIomPdf(
    id: number,
    loggedInUser?: AuthenticatedUser,
  ): Promise<{ filePath: string; basePath: string } | void> {
    const iom = await this.loadIomForPdfOrThrow(id);

    if (loggedInUser) {
      await this.validator.assertProjectAccess(loggedInUser, iom.projectId);
    }

    const basePath = this.configService.get<string>('AWS_S3_ACCESS_URL') ?? '';
    const signatories = await this.resolvePdfSignatoryBlock(iom, loggedInUser);
    const extras = await this.buildIomDetailExtras(iom);

    const mainVars = buildIomDetailsTemplateVars(
      iom,
      extras,
      signatories,
      basePath,
    );
    const mainHtml = substituteTemplateVars(
      await loadTemplate('iom-details-pdf.html'),
      mainVars,
    );
    let finalPdf = await this.pdfService.generatePdfFromInlineHtml(mainHtml);

    if (iom.referralPointsEditReason?.trim()) {
      const reasonVars = buildReferralEditReasonTemplateVars(iom);
      const reasonHtml = substituteTemplateVars(
        await loadTemplate('iom-referral-edit-reason-pdf.html'),
        reasonVars,
      );
      const reasonPdf =
        await this.pdfService.generatePdfFromInlineHtml(reasonHtml);
      finalPdf = await this.pdfService.mergeWithMainPdf(finalPdf, reasonPdf);
    }

    const filePath = `exports/iom/iom-${id}-${Date.now()}.pdf`;
    const stream = new PassThrough();
    stream.end(finalPdf);
    await this.awsService.uploadToS3(filePath, stream, true);
    await this.iomRepo.update({ id }, { iomPdf: filePath });

    if (!loggedInUser) {
      return;
    }

    return { filePath, basePath };
  }

  // ============================================================
  // Internals
  // ============================================================

  private async transitionToCreated(
    user: AuthenticatedUser,
    id: number,
    dto: SubmitIomDto,
    intent: 'submit' | 'resubmit',
  ): Promise<Iom> {
    const iom = await this.loadIomOrThrow(id);
    await this.validator.assertProjectAccess(user, iom.projectId);

    const currentCode = this.workflow.getStatusCode(Number(iom.statusId));
    const targetStatusId = this.workflow.getStatusId(
      IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING,
    );
    const userRoleId = this.workflow.resolveRoleId(user.role ?? '');

    if (intent === 'submit') {
      if (REJECTION_STATUS_CODES.has(currentCode)) {
        throwIomError(IomErrorCodeEnum.INVALID_STATUS_FOR_ACTION, {
          reason: 'Use the resubmit endpoint for rejected IOMs.',
          currentStatus: currentCode,
        });
      }
    } else {
      if (currentCode === IomStatusCodeEnum.IOM_TO_BE_CREATED) {
        throwIomError(IomErrorCodeEnum.INVALID_STATUS_FOR_ACTION, {
          reason:
            'First-time submission must use the submit endpoint, not resubmit.',
          currentStatus: currentCode,
        });
      }
      if (!iom.rejectionReason || iom.rejectionReason.trim().length === 0) {
        throwIomError(IomErrorCodeEnum.REJECTION_REASON_MISSING, {
          iomId: id,
        });
      }
    }

    this.validator.assertMandatoryForSubmission(iom);

    this.workflow.validateTransition(
      Number(iom.statusId),
      targetStatusId,
      userRoleId,
      {
        actorUserId: user.dbId,
        iomCreatedBy: iom.createdBy,
      },
    );

    const result = await this.iomRepo
      .createQueryBuilder()
      .update(Iom)
      .set({
        statusId: targetStatusId,
        submittedAt: new Date(),
        updatedBy: user.dbId,
        version: () => '`version` + 1',
      })
      .where('id = :id AND status_id = :statusId', {
        id,
        statusId: iom.statusId,
      })
      .execute();

    if (!result.affected || result.affected === 0) {
      throwIomError(IomErrorCodeEnum.CONCURRENT_MODIFICATION_DETECTED, {
        iomId: id,
      });
    }

    const action =
      intent === 'resubmit'
        ? IomHistoryActionEnum.CRM_RESUBMIT
        : IomHistoryActionEnum.CRM_SUBMIT;

    this.emitHistory(
      new IomHistoryEvent(
        Number(id),
        targetStatusId,
        user.dbId,
        action,
        Number(iom.statusId),
        intent === 'resubmit'
          ? 'Resubmitted for TL approval'
          : 'Submitted for TL approval',
        { remarks: dto.remarks ?? null, statusCode: currentCode },
        { statusCode: IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING },
      ),
    );

    return this.loadIomOrThrow(id);
  }

  private async lockBookingForGenerate(
    manager: EntityManager,
    bookingId: number,
  ): Promise<IncentiveBooking> {
    const booking = await manager
      .getRepository(IncentiveBooking)
      .createQueryBuilder('ib')
      .innerJoinAndSelect('ib.projectPhase', 'pp')
      .innerJoinAndSelect('pp.project', 'p')
      .where('ib.id = :id', { id: bookingId })
      .andWhere('ib.deletedAt IS NULL')
      .setLock('pessimistic_write')
      .getOne();

    if (!booking) {
      throwIomError(IomErrorCodeEnum.BOOKING_NOT_FOUND, { bookingId });
    }
    return booking as IncentiveBooking;
  }

  private assertBookingIsEligible(booking: IncentiveBooking): void {
    const eligible: PaymentStatusEnum[] = [
      PaymentStatusEnum.PAID,
      PaymentStatusEnum.PAYABLE,
    ];
    if (!eligible.includes(booking.paymentStatus)) {
      throwIomError(IomErrorCodeEnum.BOOKING_NOT_ELIGIBLE, {
        bookingId: booking.id,
        paymentStatus: booking.paymentStatus,
      });
    }
  }

  private async assertNoActiveIomForBooking(
    manager: EntityManager,
    bookingId: number,
  ): Promise<void> {
    const existing = await manager.getRepository(Iom).findOne({
      where: { bookingId, deletedAt: null as unknown as Date },
      withDeleted: false,
    });
    if (existing) {
      throwIomError(IomErrorCodeEnum.DUPLICATE_IOM_EXISTS, { bookingId });
    }
  }

  private async loadProjectOrThrow(
    manager: EntityManager,
    projectId: number | null | undefined,
  ): Promise<Projects> {
    if (projectId == null) {
      throwIomError(IomErrorCodeEnum.UNAUTHORIZED_PROJECT_ACCESS, {
        reason: 'IOM has no associated project',
      });
    }
    const project = await manager
      .getRepository(Projects)
      .findOne({ where: { id: projectId as number } });
    if (!project) {
      throwIomError(IomErrorCodeEnum.UNAUTHORIZED_PROJECT_ACCESS, {
        projectId,
        reason: 'Project not found',
      });
    }
    return project as Projects;
  }

  private async loadIomOrThrow(id: number): Promise<Iom> {
    const iom = await this.iomRepo.findOne({ where: { id } });
    if (!iom) {
      throwIomError(IomErrorCodeEnum.IOM_NOT_FOUND, { iomId: id });
    }
    return iom as Iom;
  }

  private async loadIomForPdfOrThrow(id: number): Promise<Iom> {
    const iom = await this.iomRepo
      .createQueryBuilder('iom')
      .leftJoinAndSelect('iom.project', 'project')
      .leftJoinAndSelect('iom.creator', 'creator')
      .leftJoinAndSelect('iom.crmVerifier', 'crmVerifier')
      .leftJoinAndSelect('iom.crmApprover', 'crmApprover')
      .leftJoinAndSelect('iom.finVerifier', 'finVerifier')
      .leftJoinAndSelect('iom.finApprover', 'finApprover')
      .leftJoinAndSelect('iom.status', 'status')
      // .leftJoinAndSelect('iom.booking', 'booking')
      .leftJoinAndSelect('iom.invoice', 'invoice')
      .leftJoinAndSelect('iom.referralPointsEditor', 'referralPointsEditor')
      .where('iom.id = :id', { id })
      .andWhere('iom.deletedAt IS NULL')
      .getOne();

    if (!iom) {
      throwIomError(IomErrorCodeEnum.IOM_NOT_FOUND, { iomId: id });
    }
    return iom as Iom;
  }

  private async loadIomWithReviewersOrThrow(id: number): Promise<Iom> {
    const iom = await this.iomRepo
      .createQueryBuilder('iom')
      .leftJoinAndSelect('iom.project', 'project')
      .leftJoinAndSelect('iom.creator', 'creator')
      .leftJoinAndSelect('iom.crmVerifier', 'crmVerifier')
      .leftJoinAndSelect('iom.crmApprover', 'crmApprover')
      .leftJoinAndSelect('iom.finVerifier', 'finVerifier')
      .leftJoinAndSelect('iom.finApprover', 'finApprover')
      .where('iom.id = :id', { id })
      .andWhere('iom.deletedAt IS NULL')
      .getOne();

    if (!iom) {
      throwIomError(IomErrorCodeEnum.IOM_NOT_FOUND, { iomId: id });
    }
    return iom as Iom;
  }

  /**
   * Resolve signatories for PDF rendering.
   * Internal calls use workflow-completed signatures only.
   * API calls scope signatures to the caller's role hierarchy.
   */
  private async resolvePdfSignatoryBlock(
    iom: Iom,
    loggedInUser?: AuthenticatedUser,
  ): Promise<IomSignatoryBlock> {
    const currentUserId = loggedInUser?.dbId ?? null;
    const block = await this.buildSignatoryBlock(iom, currentUserId);

    if (!loggedInUser?.role) {
      return block;
    }

    const callerLevel = PDF_SIGNATORY_ROLE_LEVEL[loggedInUser.role] ?? 4;
    const scoped = { ...block };

    PDF_SIGNATORY_SLOTS.forEach((slot, index) => {
      if (index > callerLevel) {
        const info = scoped[slot];
        if (!info.hasActed) {
          scoped[slot] = { ...info, signature: null };
        }
      }
    });

    return scoped;
  }

  /**
   * Build the five-stage signatory ledger for an IOM.
   *
   * Each slot resolves three orthogonal facts:
   *   1. Has someone acted at this stage?            -> `hasActed`
   *      (FK populated on the IOM, e.g. crm_verified_by)
   *   2. Who acted, or who is *assigned* to act?     -> `name`, `userId`
   *      - if acted    -> the actor (FK -> Users)
   *      - if not acted -> the project-mapped user from
   *                        `project_user_mapping` (primary preferred,
   *                        but the *current caller* wins when they
   *                        are also one of the assigned reviewers -
   *                        so a CRM TL who isn't flagged primary
   *                        still sees themselves as the slot user).
   *   3. Can we render their signature?              -> `signature`
   *      - If hasActed: the actor's signature_image (or null +
   *        signatureMissing when the actor never uploaded one).
   *      - If NOT hasActed: only the *current caller's* own signature
   *        is exposed, and only when they are the slot user (per #2).
   *        Other assigned reviewers' signatures are NEVER exposed
   *        before they sign - this is what lets a CRM see the TL /
   *        Head names without seeing their signatures, while still
   *        letting the TL pre-fill their own signature into the
   *        in-flight IOM preview.
   *
   * The four reviewer mappings are fetched in one query and grouped
   * in-memory to avoid four round-trips.
   */
  private async buildSignatoryBlock(
    iom: Iom,
    currentUserId: number | null,
  ): Promise<IomSignatoryBlock> {
    // Only the stages that haven't completed need project mapping
    // lookup. If every reviewer has acted, skip the table hit entirely.
    const pendingRoles: RolesEnum[] = [];
    if (iom.crmVerifiedBy == null) pendingRoles.push(RolesEnum.CRM_TL);
    if (iom.crmApprovedBy == null) pendingRoles.push(RolesEnum.CRM_HEAD);
    if (iom.financeVerifiedBy == null)
      pendingRoles.push(RolesEnum.FINANCE_USER);
    if (iom.financeApprovedBy == null)
      pendingRoles.push(RolesEnum.FINANCE_HEAD);

    const mappingsByRole = await this.findAssignedReviewers(
      iom.projectId,
      pendingRoles,
    );
    const currentUser = await this.usersRepo.findOne({
      where: { id: currentUserId },
    });

    return {
      crm: this.buildSignatorySlot({
        role: 'CRM',
        actorUserId: iom.createdBy,
        actor: iom.creator,
        // Creator's "signed at" is the moment the IOM became active.
        // Use `submittedAt` once the CRM submits, otherwise the
        // creation timestamp - both are safe upper bounds for "when
        // the CRM signature was applied".
        signedAt: iom.submittedAt ?? iom.createdAt ?? null,
        hasActed: true,
        currentUserId,
        currentUser,
      }),
      crmTl: this.buildSignatorySlot({
        role: 'CRM TL',
        actorUserId: iom.crmVerifiedBy,
        actor: iom.crmVerifier,
        signedAt: iom.crmVerifiedAt,
        hasActed: iom.crmVerifiedBy != null,
        assignedReviewers: mappingsByRole.get(RolesEnum.CRM_TL),
        currentUserId,
      }),
      crmHead: this.buildSignatorySlot({
        role: 'CRM Head',
        actorUserId: iom.crmApprovedBy,
        actor: iom.crmApprover,
        signedAt: iom.crmApprovedAt,
        hasActed: iom.crmApprovedBy != null,
        assignedReviewers: mappingsByRole.get(RolesEnum.CRM_HEAD),
        currentUserId,
      }),
      financeVerifier: this.buildSignatorySlot({
        role: 'Finance Verifier',
        actorUserId: iom.financeVerifiedBy,
        actor: iom.finVerifier,
        signedAt: iom.financeVerifiedAt,
        hasActed: iom.financeVerifiedBy != null,
        assignedReviewers: mappingsByRole.get(RolesEnum.FINANCE_USER),
        currentUserId,
      }),
      financeApprover: this.buildSignatorySlot({
        role: 'Finance Approver',
        actorUserId: iom.financeApprovedBy,
        actor: iom.finApprover,
        signedAt: iom.financeApprovedAt,
        hasActed: iom.financeApprovedBy != null,
        assignedReviewers: mappingsByRole.get(RolesEnum.FINANCE_HEAD),
        currentUserId,
      }),
    };
  }

  /**
   * Assemble one signatory slot.
   *
   * Resolution order for `name` / `userId` on a pending stage:
   *   1. If `hasActed` -> the actor (the FK joined Users row).
   *   2. Else if the *current caller* is in `assignedReviewers` for
   *      this role -> the caller wins, even when they aren't flagged
   *      `isPrimary`. This lets a non-primary CRM TL still see
   *      themselves (and their own signature) in their own slot.
   *   3. Else if the project has any assigned reviewer for this role
   *      in `project_user_mapping` -> the primary mapping
   *      (`isPrimary = true`), or the oldest `assigned_at` as fallback.
   *   4. Else -> null / null.
   *
   * `signature` rules:
   *   - When `hasActed`: the actor's `signature_image` if present.
   *   - When NOT `hasActed`: only the *current caller's* own
   *     signature is surfaced, and only when they are the slot user
   *     (per resolution step 2). Other assigned reviewers' signatures
   *     are NEVER returned - this preserves the "CRM sees the TL /
   *     Head name only, not their signature" guarantee.
   *
   * `signatureMissing` flags the (rare) case where the stage has been
   * completed but the actor has no signature on their Users record -
   * the IOM PDF can't be sealed for that seat until they upload one.
   * It is NOT set for the pending-stage self-preview path: a caller
   * with no signature_image just sees `signature: null` and is
   * expected to upload one through the profile flow.
   */
  private buildSignatorySlot(args: {
    role: IomSignatoryRole;
    actorUserId: number | null | undefined;
    actor: Users | null | undefined;
    signedAt: Date | null;
    hasActed: boolean;
    assignedReviewers?: AssignedReviewer[];
    currentUserId: number | null;
    currentUser?: Users;
  }): IomSignatoryInfo {
    const {
      role,
      actorUserId,
      actor,
      signedAt,
      hasActed,
      assignedReviewers,
      currentUserId,
      currentUser,
    } = args;

    let userId: number | null;
    let name: string | null;
    let signature: string | null;
    let signatureMissing: boolean;
    let additionalReviewers: IomReviewerSummary[] | undefined;

    if (hasActed) {
      // The actor wins. Surface their signature if it exists.
      const rawSignature = actor?.signatureImage ?? null;
      userId = actorUserId != null ? Number(actorUserId) : null;
      name = actor?.name ?? null;
      signature = rawSignature || null;
      signatureMissing = !rawSignature;

      if (actorUserId != null && !actor) {
        // FK populated but the Users row didn't load - usually means
        // the user was soft-deleted after acting. Degrade gracefully
        // and log so on-call can investigate.
        this.logger.warn(
          `IOM signatory user ${actorUserId} (${role}) not found while ` +
            `building signatory block. The user record may have been ` +
            `removed after the stage completed.`,
        );
      }
      if (role === 'CRM' && !actor && currentUser) {
        userId = currentUser.id;
        name = currentUser.name;
        signature = currentUser.signatureImage;
        signatureMissing = !currentUser.signatureImage;
      }

      if (signatureMissing) {
        this.logger.warn(
          `IOM signatory ${actorUserId} (${role}) has no signature_image ` +
            `even though the stage has been completed. The IOM PDF cannot ` +
            `be sealed for this seat until the user uploads a signature.`,
        );
      }
    } else {
      // Not yet acted -> populate from the project mapping. The
      // current caller wins over the configured primary so the
      // signed-in reviewer always sees themselves (and their own
      // signature) in their own slot. Other reviewers' signatures
      // remain hidden until they actually sign.
      const callerMatch =
        currentUserId != null
          ? ((assignedReviewers ?? []).find(
              (r) => r.userId === currentUserId,
            ) ?? null)
          : null;
      const selected =
        callerMatch ?? this.pickPrimaryReviewer(assignedReviewers);
      userId = selected?.userId ?? null;
      name = selected?.name ?? null;
      signature = callerMatch?.signatureImage || null;
      signatureMissing = false;

      const extras = (assignedReviewers ?? []).filter(
        (r) => r.userId !== selected?.userId,
      );
      if (extras.length > 0) {
        additionalReviewers = extras.map((r) => ({
          userId: r.userId,
          name: r.name,
        }));
      }
    }

    const info: IomSignatoryInfo = {
      role,
      userId,
      name,
      signature,
      signedAt: signedAt ?? null,
      hasActed,
      signatureMissing,
    };
    if (additionalReviewers !== undefined) {
      info.additionalReviewers = additionalReviewers;
    }
    return info;
  }

  /**
   * Choose the single "primary" reviewer for a stage:
   *   1. Prefer the row with `isPrimary = true`.
   *   2. Otherwise the oldest `assigned_at` (deterministic ordering
   *      preserved from the SQL ORDER BY).
   *   3. If the list is empty -> null.
   */
  private pickPrimaryReviewer(
    reviewers: AssignedReviewer[] | undefined,
  ): AssignedReviewer | null {
    if (!reviewers || reviewers.length === 0) return null;
    const explicitPrimary = reviewers.find((r) => r.isPrimary);
    return explicitPrimary ?? reviewers[0];
  }

  /**
   * One-shot lookup of all assigned reviewers for an IOM's project
   * across every requested role. Returns a map keyed by role label
   * (`RolesEnum.*`) -> ordered list of reviewers.
   *
   * Ordering is `isPrimary DESC, assigned_at ASC` so `pickPrimary`
   * can naively take the head of each list when no explicit primary
   * is flagged.
   *
   * Failure-tolerant: a DB error here must NOT 500 the GET because
   * the actual workflow data is already in hand. We log and return
   * an empty map so the slots degrade to `name: null`.
   */
  private async findAssignedReviewers(
    projectId: number | null,
    roles: RolesEnum[],
  ): Promise<Map<string, AssignedReviewer[]>> {
    const empty = new Map<string, AssignedReviewer[]>();
    if (projectId == null || roles.length === 0) return empty;

    try {
      const rows = await this.projectUserMappingRepo.find({
        where: {
          project: { id: Number(projectId) },
          role: In(roles),
          removedAt: IsNull(),
        },
        relations: ['user'],
        order: { isPrimary: 'DESC', assignedAt: 'ASC' },
      });

      const grouped = new Map<string, AssignedReviewer[]>();
      for (const m of rows) {
        if (!m.user) continue;
        const list = grouped.get(m.role) ?? [];
        list.push({
          userId: Number(m.user.id),
          name: m.user.name,
          isPrimary: Boolean(m.isPrimary),
          signatureImage: m.user.signatureImage ?? null,
        });
        grouped.set(m.role, list);
      }
      return grouped;
    } catch (err) {
      this.logger.error(
        `Failed to resolve project reviewer mappings for project=${projectId}, roles=[${roles.join(
          ', ',
        )}]: ${err instanceof Error ? err.message : String(err)}`,
      );
      return empty;
    }
  }

  private isDuplicateBookingError(err: unknown): boolean {
    if (!(err instanceof QueryFailedError)) return false;
    const driverErr = (
      err as QueryFailedError & {
        driverError?: { code?: string };
      }
    ).driverError;
    return driverErr?.code === MYSQL_DUP_ENTRY;
  }

  /**
   * Compact "what the CRM edit touched" snapshot used for history's
   * `prev_value` / `updated_value`. Keeping only the affected scope
   * makes the audit row easier to diff and search later.
   */
  private snapshotForEdit(iom: Iom): IomEditSnapshot {
    const referrerRatio =
      iom.referrerRatio == null ? null : Number(iom.referrerRatio);
    const refereeRatio =
      iom.refereeRatio == null ? null : Number(iom.refereeRatio);
    return {
      salePrice: Number(iom.salePrice),
      brokeragePercentage: Number(iom.brokeragePercentage),
      referrerRatio,
      refereeRatio,
      referralPointsRatio: this.validator.formatReferralRatio(
        referrerRatio,
        refereeRatio,
      ),
      referralSplitType: iom.referralSplitType ?? null,
      totalBrokerageAmount: Number(iom.totalBrokerageAmount),
      referrerPoints: Number(iom.referrerPoints),
      refereePoints: Number(iom.refereePoints),
      referralPointsEditReason: iom.referralPointsEditReason ?? null,
      statusId: Number(iom.statusId),
      version: Number(iom.version),
    };
  }

  private emitHistory(event: IomHistoryEvent): void {
    this.eventEmitter.emit(IOM_HISTORY_EVENT, event);
  }
}
