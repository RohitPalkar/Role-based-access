import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';

import { Users } from 'src/entities';
import { Role } from 'src/modules/roles/entities/roles.entity';
import { RolesEnum } from 'src/enums/roles.enum';
import { StatusEnum } from 'src/enums/status.enum';

import { Iom } from '../entities/iom.entity';
import { UserAvailability } from 'src/modules/users/entities/user-availability.entity';
import { IomStatusCodeEnum } from '../enums/iom-status-code.enum';
import { WorkflowValidationService } from './workflow-validation.service';

const ASSIGNMENT_STATE_ID = 1;
const DEFAULT_BATCH_SIZE = 50;

export interface IomAssignmentResult {
  assigned: number;
  skipped: number;
  errors: number;
}

type AssignmentOutcome = 'assigned' | 'skipped' | 'error';

/**
 * Picks the next CRM user for round-robin assignment among currently available users.
 * `crmUserIds` must be sorted ascending by id.
 */
export function pickNextAvailableUser(
  crmUserIds: number[],
  availableUserIds: Set<number>,
  lastUserId: number | null,
): number | null {
  const available = crmUserIds.filter((id) => availableUserIds.has(id));
  if (available.length === 0) {
    return null;
  }

  if (lastUserId == null || !crmUserIds.includes(lastUserId)) {
    return available[0];
  }

  const afterLast = available.filter((id) => id > lastUserId);
  if (afterLast.length > 0) {
    return afterLast[0];
  }

  return available[0];
}

@Injectable()
export class IomAssignmentService {
  private readonly logger = new Logger(IomAssignmentService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Iom) private readonly iomRepo: Repository<Iom>,
    @InjectRepository(Users) private readonly usersRepo: Repository<Users>,
    @InjectRepository(UserAvailability)
    private readonly availabilityRepo: Repository<UserAvailability>,
    private readonly workflow: WorkflowValidationService,
  ) {}

  async assignEligibleIoms(): Promise<IomAssignmentResult> {
    const result: IomAssignmentResult = { assigned: 0, skipped: 0, errors: 0 };

    const statusId = this.workflow.getStatusId(
      IomStatusCodeEnum.IOM_TO_BE_CREATED,
    );
    const batchSize = this.resolveBatchSize();
    const now = new Date();

    const eligibleIoms = await this.iomRepo.find({
      where: {
        statusId,
        assignedTo: IsNull(),
        deletedAt: IsNull(),
      },
      order: { id: 'ASC' },
      take: batchSize,
      select: ['id'],
    });

    if (eligibleIoms.length === 0) {
      return result;
    }

    const crmUserIds = await this.loadCrmUserIds();
    if (crmUserIds.length === 0) {
      this.logger.warn('No active CRM users found for IOM assignment');
      return result;
    }

    const unavailableUserIds = await this.loadUnavailableUserIds(now);
    const availableUserIds = new Set(
      crmUserIds.filter((id) => !unavailableUserIds.has(id)),
    );

    for (const iom of eligibleIoms) {
      const outcome = await this.assignIomInTransaction(
        iom.id,
        statusId,
        crmUserIds,
        availableUserIds,
      );

      if (outcome === 'assigned') {
        result.assigned++;
      } else if (outcome === 'skipped') {
        result.skipped++;
      } else {
        result.errors++;
      }
    }

    return result;
  }

  private resolveBatchSize(): number {
    const raw = process.env.IOM_ASSIGNMENT_BATCH_SIZE;
    if (raw == null || raw === '') {
      return DEFAULT_BATCH_SIZE;
    }
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_BATCH_SIZE;
  }

  private async loadCrmUserIds(): Promise<number[]> {
    const rows = await this.usersRepo
      .createQueryBuilder('user')
      .innerJoin(Role, 'role', 'role.id = user.role_id')
      .where('role.name = :crmRole', { crmRole: RolesEnum.CRM })
      .andWhere('user.status = :status', { status: StatusEnum.ACTIVE })
      .andWhere('user.deleted_at IS NULL')
      .orderBy('user.id', 'ASC')
      .select('user.id', 'id')
      .getRawMany<{ id: number }>();

    return rows.map((row) => Number(row.id));
  }

  private async loadUnavailableUserIds(now: Date): Promise<Set<number>> {
    const rows = await this.availabilityRepo
      .createQueryBuilder('ua')
      .select('ua.user_id', 'userId')
      .where('ua.unavailable_from <= :now', { now })
      .andWhere('ua.unavailable_to >= :now', { now })
      .andWhere('ua.cancelled_at IS NULL')
      .andWhere('ua.is_deleted = 0')
      .getRawMany<{ userId: number }>();

    return new Set(rows.map((row) => Number(row.userId)));
  }

  private async assignIomInTransaction(
    iomId: number,
    statusId: number,
    crmUserIds: number[],
    availableUserIds: Set<number>,
  ): Promise<AssignmentOutcome> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const stateRows = (await queryRunner.query(
        `SELECT last_user_id AS lastUserId
         FROM iom_assignment_state
         WHERE id = ?
         FOR UPDATE`,
        [ASSIGNMENT_STATE_ID],
      )) as Array<{ lastUserId: number | null }>;

      const lastUserId = stateRows[0]?.lastUserId ?? null;
      const assigneeId = pickNextAvailableUser(
        crmUserIds,
        availableUserIds,
        lastUserId,
      );

      if (assigneeId == null) {
        await queryRunner.rollbackTransaction();
        this.logger.log(`Skipping IOM ${iomId}: no available CRM users`);
        return 'skipped';
      }

      const updateResult = await queryRunner.query(
        `UPDATE ioms
         SET assigned_to = ?
         WHERE id = ?
           AND assigned_to IS NULL
           AND status_id = ?
           AND deleted_at IS NULL`,
        [assigneeId, iomId, statusId],
      );

      const affectedRows = this.extractAffectedRows(updateResult);
      if (affectedRows === 0) {
        await queryRunner.rollbackTransaction();
        return 'error';
      }

      await queryRunner.query(
        `UPDATE iom_assignment_state SET last_user_id = ? WHERE id = ?`,
        [assigneeId, ASSIGNMENT_STATE_ID],
      );

      await queryRunner.commitTransaction();
      return 'assigned';
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to assign IOM ${iomId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return 'error';
    } finally {
      await queryRunner.release();
    }
  }

  private extractAffectedRows(updateResult: unknown): number {
    if (updateResult == null) {
      return 0;
    }

    if (Array.isArray(updateResult)) {
      return this.extractAffectedRows(updateResult[0]);
    }

    if (typeof updateResult === 'object' && 'affectedRows' in updateResult) {
      const affected = (updateResult as { affectedRows?: number }).affectedRows;
      return typeof affected === 'number' ? affected : 0;
    }

    return 0;
  }
}
