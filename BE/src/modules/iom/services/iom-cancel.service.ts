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

import { CancelIomDto } from '../dto/cancel-iom.dto';

@Injectable()
export class IomCancelService {
  private readonly logger = new Logger(IomCancelService.name);

  constructor(
    @InjectRepository(Iom)
    private readonly iomRepo: Repository<Iom>,
    private readonly workflow: WorkflowValidationService,
    private readonly validator: IomValidationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async deleteIom(
    user: AuthenticatedUser,
    id: number,
    dto: CancelIomDto,
  ): Promise<Iom> {
    if (user.role !== RolesEnum.CRM && user.role !== RolesEnum.CRM_TL) {
      throwIomError(IomErrorCodeEnum.UNAUTHORIZED_PROJECT_ACCESS, {
        role: user.role,
        reason: 'Only CRM users are permitted to delete an IOM.',
      });
    }

    const iom = await this.iomRepo.findOne({ where: { id } });
    if (!iom) {
      throwIomError(IomErrorCodeEnum.IOM_NOT_FOUND, { iomId: id });
    }

    await this.validator.assertProjectAccess(user, iom!.projectId);

    const fromStatusId = Number(iom!.statusId);
    const currentCode = this.workflow.getStatusCode(fromStatusId);

    // Cancellation is only allowed BEFORE the CRM TL has acted on the
    // submitted IOM (i.e. while it's still awaiting TL approval).
    // if (currentCode !== IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING) {
    //   throwIomError(IomErrorCodeEnum.INVALID_STATUS_FOR_ACTION, {
    //     currentStatus: currentCode,
    //     allowed: [IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING],
    //   });
    // }

    const targetStatusId = this.workflow.getStatusId(IomStatusCodeEnum.DELETED);
    const userRoleId = this.workflow.resolveRoleId(user.role ?? '');

    // DB-driven authorisation: the `iom_transitions` row (2 -> 20 for
    // role CRM) is the single source of truth for whether this move
    // is legal.
    this.workflow.validateTransition(fromStatusId, targetStatusId, userRoleId, {
      actorUserId: user.dbId,
      iomCreatedBy: iom!.createdBy,
    });

    const trimmedReason = (dto.reason ?? '').trim() || null;

    const result = await this.iomRepo
      .createQueryBuilder()
      .update(Iom)
      .set({
        statusId: targetStatusId,
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
        IomHistoryActionEnum.CRM_CANCEL,
        fromStatusId,
        trimmedReason ?? 'Cancelled by CRM',
        {
          statusCode: currentCode,
          version: iom!.version,
        },
        {
          statusCode: IomStatusCodeEnum.DELETED,
          cancelledBy: user.dbId,
          ...(trimmedReason ? { reason: trimmedReason } : {}),
        },
      ),
    );

    const updated = await this.iomRepo.findOne({ where: { id } });
    if (!updated) {
      throwIomError(IomErrorCodeEnum.IOM_NOT_FOUND, { iomId: id });
    }
    return updated as Iom;
  }

  private emitHistory(event: IomHistoryEvent): void {
    this.eventEmitter.emit(IOM_HISTORY_EVENT, event);
  }
}
