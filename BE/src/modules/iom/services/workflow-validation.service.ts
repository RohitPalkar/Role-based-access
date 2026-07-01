import {
  ForbiddenException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { IomStatus } from '../entities/iom-status.entity';
import { IomTransition } from '../entities/iom-transition.entity';
import { Role } from 'src/modules/roles/entities/roles.entity';

import { IomStatusCodeEnum } from '../enums/iom-status-code.enum';
import { IomErrorCodeEnum } from '../enums/iom-error-code.enum';
import {
  APPROVAL_TARGET_STATUS_CODES,
  TERMINAL_STATUS_CODES,
} from '../constants';

// Single source of truth for IOM workflow authorisation.

@Injectable()
export class WorkflowValidationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WorkflowValidationService.name);

  private statusIdByCode = new Map<IomStatusCodeEnum, number>();
  private statusCodeById = new Map<number, IomStatusCodeEnum>();
  /** Active status ids (excludes soft-deleted) - the only ids that can participate in a transition. */
  private activeStatusIds = new Set<number>();

  private roleIdByName = new Map<string, number>();
  private roleNameById = new Map<number, string>();

  private transitionSet = new Set<string>();

  private outgoingByFromRole = new Map<
    string,
    Array<{ toStatusId: number; toStatusCode: IomStatusCodeEnum }>
  >();

  private loaded = false;

  constructor(
    @InjectRepository(IomStatus)
    private readonly statusRepo: Repository<IomStatus>,
    @InjectRepository(IomTransition)
    private readonly transitionRepo: Repository<IomTransition>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.reload();
  }

  validateTransition(
    currentStatusId: number,
    targetStatusId: number,
    userRoleId: number,
    options?: {
      actorUserId?: number;
      iomCreatedBy?: number | null;
    },
  ): void {
    this.ensureLoaded();

    this.assertActiveStatus(currentStatusId, 'current');
    this.assertActiveStatus(targetStatusId, 'target');
    this.assertNotTerminal(currentStatusId);

    const key = this.transitionKey(currentStatusId, targetStatusId, userRoleId);
    if (!this.transitionSet.has(key)) {
      throw this.forbidden(
        IomErrorCodeEnum.INVALID_STATUS_FOR_ACTION,
        'No workflow transition is defined for this role from the current status.',
        {
          currentStatusId,
          targetStatusId,
          userRoleId,
        },
      );
    }

    if (options?.actorUserId != null && options?.iomCreatedBy != null) {
      this.assertNotSelfApproval(
        options.iomCreatedBy,
        options.actorUserId,
        targetStatusId,
      );
    }
  }

  canAct(currentStatusId: number, userRoleId: number): boolean {
    this.ensureLoaded();
    if (!this.isStatusActive(currentStatusId)) return false;
    if (this.isTerminal(currentStatusId)) return false;
    const outgoing = this.outgoingByFromRole.get(
      this.outgoingKey(currentStatusId, userRoleId),
    );
    return !!outgoing && outgoing.length > 0;
  }

  assertCanAct(currentStatusId: number, userRoleId: number): void {
    if (!this.canAct(currentStatusId, userRoleId)) {
      throw this.forbidden(
        IomErrorCodeEnum.INVALID_STATUS_FOR_ACTION,
        'The current IOM status does not allow any action for your role.',
        { currentStatusId, userRoleId },
      );
    }
  }

  // to get allowed status transitions from current status
  getAllowedTransitions(
    currentStatusId: number,
    userRoleId: number,
  ): Array<{ toStatusId: number; toStatusCode: IomStatusCodeEnum }> {
    this.ensureLoaded();
    if (
      !this.isStatusActive(currentStatusId) ||
      this.isTerminal(currentStatusId)
    ) {
      return [];
    }
    return (
      this.outgoingByFromRole.get(
        this.outgoingKey(currentStatusId, userRoleId),
      ) ?? []
    ).slice();
  }

  isTerminal(statusId: number): boolean {
    const code = this.statusCodeById.get(Number(statusId));
    return !!code && TERMINAL_STATUS_CODES.has(code);
  }

  assertNotTerminal(statusId: number): void {
    if (this.isTerminal(statusId)) {
      throw this.forbidden(
        IomErrorCodeEnum.INVALID_STATUS_FOR_ACTION,
        'The IOM is in a terminal state and cannot be modified.',
        { statusId, statusCode: this.statusCodeById.get(Number(statusId)) },
      );
    }
  }

  // don't allow to self approve
  assertNotSelfApproval(
    iomCreatedBy: number,
    actorUserId: number,
    targetStatusId: number,
  ): void {
    const targetCode = this.statusCodeById.get(Number(targetStatusId));
    if (!targetCode) return;
    const isApprovalTarget = APPROVAL_TARGET_STATUS_CODES.has(targetCode);
    if (isApprovalTarget && Number(iomCreatedBy) === Number(actorUserId)) {
      throw this.forbidden(
        IomErrorCodeEnum.UNAUTHORIZED_PROJECT_ACCESS,
        'You cannot approve an IOM you created.',
        { iomCreatedBy, actorUserId, targetStatus: targetCode },
      );
    }
  }

  getStatusId(code: IomStatusCodeEnum): number {
    this.ensureLoaded();
    const id = this.statusIdByCode.get(code);
    if (id == null) {
      throw new Error(
        `IOM status code "${code}" is not seeded in iom_statuses (or has been soft-deleted). Run the SeedIomStatuses migration / restore the row.`,
      );
    }
    return id;
  }

  getStatusCode(id: number): IomStatusCodeEnum {
    this.ensureLoaded();
    const code = this.statusCodeById.get(Number(id));
    if (!code) {
      throw new Error(
        `IOM status id "${id}" is unknown; iom_statuses may be out of sync with IomStatusCodeEnum.`,
      );
    }
    return code;
  }

  resolveRoleId(roleName: string): number {
    this.ensureLoaded();
    const id = this.roleIdByName.get(roleName);
    if (id == null) {
      // No PII in the error - role names are non-secret system labels.
      throw new Error(
        `Role "${roleName}" is not present in the roles table; cannot validate workflow.`,
      );
    }
    return id;
  }

  resolveRoleName(roleId: number): string | undefined {
    this.ensureLoaded();
    return this.roleNameById.get(Number(roleId));
  }

  async reload(): Promise<void> {
    const [statuses, transitions, roles] = await Promise.all([
      this.statusRepo.find(),
      this.transitionRepo.find(),
      this.roleRepo.find(),
    ]);

    const statusIdByCode = new Map<IomStatusCodeEnum, number>();
    const statusCodeById = new Map<number, IomStatusCodeEnum>();
    const activeStatusIds = new Set<number>();

    for (const s of statuses) {
      const id = Number(s.id);
      const code = s.code as IomStatusCodeEnum;
      statusCodeById.set(id, code);

      if (!s.isDeleted) {
        statusIdByCode.set(code, id);
        activeStatusIds.add(id);
      }
    }

    const roleIdByName = new Map<string, number>();
    const roleNameById = new Map<number, string>();
    for (const r of roles) {
      const id = Number(r.id);
      roleIdByName.set(r.name, id);
      roleNameById.set(id, r.name);
    }

    const transitionSet = new Set<string>();
    const outgoingByFromRole = new Map<
      string,
      Array<{ toStatusId: number; toStatusCode: IomStatusCodeEnum }>
    >();
    const duplicates: string[] = [];

    for (const t of transitions) {
      const fromId = Number(t.fromStatusId);
      const toId = Number(t.toStatusId);
      const roleId = Number(t.allowedRoleId);

      // Skip rows that reference a soft-deleted or unknown status.
      const fromCode = statusCodeById.get(fromId);
      const toCode = statusCodeById.get(toId);
      if (!fromCode || !toCode) {
        this.logger.warn(
          `Skipping iom_transitions id=${t.id}: from/to status not found (from=${fromId}, to=${toId}).`,
        );
        continue;
      }
      if (!activeStatusIds.has(fromId) || !activeStatusIds.has(toId)) {
        this.logger.warn(
          `Skipping iom_transitions id=${t.id}: references a soft-deleted status.`,
        );
        continue;
      }
      if (!roleNameById.has(roleId)) {
        this.logger.warn(
          `Skipping iom_transitions id=${t.id}: unknown role id=${roleId}.`,
        );
        continue;
      }

      const key = this.transitionKey(fromId, toId, roleId);
      if (transitionSet.has(key)) {
        duplicates.push(key);
        continue;
      }
      transitionSet.add(key);

      const outKey = this.outgoingKey(fromId, roleId);
      const existing = outgoingByFromRole.get(outKey) ?? [];
      existing.push({ toStatusId: toId, toStatusCode: toCode });
      outgoingByFromRole.set(outKey, existing);
    }

    if (duplicates.length > 0) {
      this.logger.error(
        `Detected ${duplicates.length} ambiguous duplicate iom_transitions rows. Deduplicate the table: ${duplicates.join(', ')}`,
      );
    }

    this.statusIdByCode = statusIdByCode;
    this.statusCodeById = statusCodeById;
    this.activeStatusIds = activeStatusIds;
    this.roleIdByName = roleIdByName;
    this.roleNameById = roleNameById;
    this.transitionSet = transitionSet;
    this.outgoingByFromRole = outgoingByFromRole;
    this.loaded = true;

    this.logger.log(
      `Workflow loaded: statuses=${statuses.length} (active=${activeStatusIds.size}), transitions=${transitionSet.size}, roles=${roles.length}.`,
    );
  }

  private isStatusActive(statusId: number): boolean {
    return this.activeStatusIds.has(Number(statusId));
  }

  private assertActiveStatus(
    statusId: number,
    label: 'current' | 'target',
  ): void {
    if (!this.isStatusActive(statusId)) {
      throw this.forbidden(
        IomErrorCodeEnum.INVALID_STATUS_FOR_ACTION,
        `The ${label} IOM status is not active (it may have been retired).`,
        { statusId, label },
      );
    }
  }

  private transitionKey(fromId: number, toId: number, roleId: number): string {
    return `${fromId}|${toId}|${roleId}`;
  }

  private outgoingKey(fromId: number, roleId: number): string {
    return `${fromId}|${roleId}`;
  }

  private ensureLoaded(): void {
    if (!this.loaded) {
      throw new Error(
        'WorkflowValidationService used before onApplicationBootstrap completed. ' +
          'In tests, await `reload()` before invoking the service.',
      );
    }
  }

  /**
   * Single throw helper so every authorisation failure
   */
  private forbidden(
    code: IomErrorCodeEnum,
    message: string,
    details?: Record<string, unknown>,
  ): ForbiddenException {
    return new ForbiddenException({
      code,
      message,
      ...(details ? { details } : {}),
    });
  }
}
