import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectInventoryUnit } from './entities/project_inventory_units.entity';
import { In, MoreThan, Repository, SelectQueryBuilder } from 'typeorm';
import { InventoryListDto } from './dto/list-inventory.dto';
import {
  ApprovalRequestListDto,
  ApproveBlockingDto,
  RejectBlockingDto,
} from './dto/approval-request.dto';
import { logger } from '../../logger/logger';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import { UpdateInventoryUnitDto } from './dto/update-inventory.dto';
import { BRAND_PURAVANKARA, SUCCESS } from 'src/config/constants';
import {
  BlockingStatus,
  EmailActionsEnum,
  EoiCampaignStageType,
  EOITypeEnum,
  InventoryUnitStatusEnum,
  MappingStatus,
} from 'src/enums/eoi-form.enums';
import { InventoryDropdownsDto } from './dto/inventory-dropdowns.dto';
import { InventoryUnitFileDto } from './dto/inventory_unit_file.dto';
import { AwsService } from '../aws/aws.service';
import {
  ExcelColumnDefinition,
  normalizeData,
  parseExcelFile,
  validateExcelFile,
} from 'src/utils/excel.utils';
import {
  EoiCampaign,
  VoucherForm,
  VoucherPayment,
  VoucherUnitMapping,
} from 'src/entities';
import { BlockInventoryUnitDto } from './dto/block-inventory-unit.dto';
import { VoucherUnitBlocking } from './entities/voucher_unit_blocking.entity';
import {
  PaymentModeEnum,
  PaymentTxStatusEnum,
} from 'src/enums/payment-status.enum';
import * as ExcelJS from 'exceljs';
import { PassThrough } from 'node:stream';
import { buildInventoryExcelSheet } from 'src/helpers/inventoryExport.helper';
import { maskMobileNumber } from 'src/helpers/eoi.helper';
import { RolesEnum } from 'src/enums/roles.enum';
import { UpdateMappingPaymentDto } from './dto/update-payment.dto';
import * as jwt from 'jsonwebtoken';
import { CustomConfigService } from 'src/config/custom-config.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ComposeEmailsEnum,
  EventMessagesEnum,
} from 'src/enums/event-messages.enum';
import { ComposeEmailEvent } from 'src/events/email.events';
import { safeString } from 'src/helpers';
import { format } from 'date-fns';
import { ExecuteUnitBlockingParams } from './interface/inventory-uniy.interface';
import { VoucherFormsService } from '../eoi_manager/voucher_forms/voucher_form.service';
import { VoucherPaymentsDto } from '../eoi_manager/voucher_forms/dto/update-voucher-form.dto';

@Injectable()
export class InventoryUnitService {
  constructor(
    @InjectRepository(ProjectInventoryUnit)
    private readonly inventoryRepo: Repository<ProjectInventoryUnit>,
    @InjectRepository(EoiCampaign)
    private readonly eoiCampaignRepository: Repository<EoiCampaign>,
    @InjectRepository(VoucherForm)
    private readonly voucherFormRepository: Repository<VoucherForm>,
    @InjectRepository(VoucherUnitMapping)
    private readonly voucherUnitMappingRepository: Repository<VoucherUnitMapping>,
    @InjectRepository(VoucherUnitBlocking)
    private readonly blockingRepo: Repository<VoucherUnitBlocking>,
    @InjectRepository(VoucherPayment)
    private readonly voucherPaymentRepository: Repository<VoucherPayment>,
    private readonly awsService: AwsService,
    @Inject(forwardRef(() => VoucherFormsService))
    private readonly voucherFormsService: VoucherFormsService,
    private readonly configService: CustomConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getInventoryList(
    user: any,
    queryDto: InventoryListDto,
    isExcel?: boolean,
  ): Promise<any> {
    logger.info('Fetching inventory unit list');
    try {
      const {
        page = 1,
        limit = 10,
        search,
        campaignId,
        tower,
        floor,
        configuration,
        series,
        facing,
        inventoryStatus,
      } = queryDto;

      const skip = (page - 1) * limit;

      const query = this.inventoryRepo
        .createQueryBuilder('inventory')
        .innerJoinAndSelect('inventory.campaign', 'campaign');

      // Filter by campaignId
      if (campaignId) {
        query.andWhere('inventory.campaignId = :campaignId', { campaignId });
      }

      if (
        user?.role === RolesEnum.RM ||
        user?.role === RolesEnum.PROJECT_HEAD ||
        user?.role === RolesEnum.SALES_TL
      ) {
        query.andWhere('inventory.status = :status', {
          status: InventoryUnitStatusEnum.AVAILABLE,
        });
      }
      // Filter by tower (array)
      if (tower?.length) {
        query.andWhere('inventory.towerName IN (:...tower)', { tower });
      }

      // Filter by floor (array)
      if (floor?.length) {
        query.andWhere('inventory.floor IN (:...floor)', { floor });
      }

      // Filter by config (array)
      if (configuration?.length) {
        query.andWhere('inventory.configuration IN (:...configuration)', {
          configuration,
        });
      }

      // Filter by series (array)
      if (series?.length) {
        query.andWhere('inventory.series IN (:...series)', { series });
      }

      // Filter by facing (array)
      if (facing?.length) {
        query.andWhere('inventory.facing IN (:...facing)', { facing });
      }

      // Filter by status
      if (inventoryStatus) {
        query.andWhere('inventory.status = :inventoryStatus', {
          inventoryStatus,
        });
      }

      // Search on unit number
      if (search) {
        query.andWhere(
          `(inventory.unitNumber LIKE :search
            OR campaign.campaignName LIKE :search
            OR inventory.floor LIKE :search
            OR inventory.towerName LIKE :search)`,
          {
            search: `%${search}%`,
          },
        );
      }

      if (!isExcel) {
        query.skip(skip).take(limit);
      }

      const [inventories, total] = await query.getManyAndCount();

      const formatted = inventories.map((inv) =>
        this.toInventoryUnitPayload(inv),
      );

      return {
        message: 'Inventory Unit list fetched successfully.',
        data: {
          result: formatted,
          total,
        },
      };
    } catch (e) {
      logger.error('Error occurred while fetching inventory unit list');
      logsAndErrorHandling('InventoryService - getInventoryList', e);
    }
  }

  async getApprovalRequests(
    queryDto: ApprovalRequestListDto,
    user: any,
  ): Promise<any> {
    logger.info('Fetching unit approval requests');
    try {
      const {
        page = 1,
        limit = 10,
        search,
        cpLinkIds,
        campaignId,
        approvalStatus,
        rmUsers,
        sortBy,
      } = queryDto;

      const skip = (page - 1) * limit;
      const userId = user?.dbId ?? user?.id;

      const query = this.blockingRepo
        .createQueryBuilder('blocking')
        .withDeleted()
        .innerJoinAndSelect('blocking.campaign', 'campaign')
        .leftJoinAndSelect('blocking.inventoryUnit', 'inventoryUnit')
        .leftJoinAndSelect('blocking.voucher', 'voucher')
        .leftJoinAndSelect('voucher.createdBy', 'sourcingRm')
        .leftJoinAndSelect('voucher.closingRm', 'closingRm')
        .leftJoinAndSelect('voucher.channelPartner', 'channelPartner')
        .where('blocking.approvalExpiry IS NOT NULL')
        .andWhere(
          '(blocking.deleted_at IS NULL OR blocking.status = :rejected)',
          { rejected: BlockingStatus.REJECTED },
        );

      if (sortBy) {
        const [field, direction] = sortBy.split(':');
        query.orderBy(
          `blocking.${field}`,
          direction.toUpperCase() as 'ASC' | 'DESC',
        );
      } else {
        query.orderBy('blocking.createdAt', 'DESC');
      }

      if (approvalStatus) {
        query.andWhere('blocking.status = :approvalStatus', { approvalStatus });
      } else {
        query.andWhere('blocking.status IN(:status)', {
          status: [
            BlockingStatus.PENDING,
            BlockingStatus.APPROVED,
            BlockingStatus.REJECTED,
            BlockingStatus.EXPIRED,
            BlockingStatus.QUALIFIED,
          ],
        });
      }

      if (campaignId) {
        query.andWhere('blocking.campaignId = :campaignId', { campaignId });
      }

      if (cpLinkIds) {
        query.andWhere('channelPartner.id LIKE :cpLinkIds', {
          cpLinkIds,
        });
      }

      if (rmUsers?.length) {
        query.andWhere(
          '(voucher.createdBy IN (:...rmUsers) OR voucher.closingRm IN (:...rmUsers))',
          { rmUsers },
        );
      }
      if (user?.role !== RolesEnum.SUPER_ADMIN && user?.role !== RolesEnum.RM) {
        query.andWhere(
          `(campaign.unit_approver_id = :userId OR JSON_CONTAINS(campaign.additional_approvers, JSON_ARRAY(:userId)))`,
          { userId },
        );
      }

      if (user?.role === RolesEnum.RM) {
        query.andWhere('blocking.blocking_initiated_by = :userId', { userId });
      }

      if (search) {
        if (search) {
          query.andWhere(
            `(inventoryUnit.unitNumber LIKE :search
          OR inventoryUnit.configuration LIKE :search
          OR JSON_EXTRACT(voucher.applicant1, '$.personalDetails.firstName') LIKE :search
          OR JSON_EXTRACT(voucher.applicant1, '$.personalDetails.lastName') LIKE :search
          OR voucher.uniqueReferenceId LIKE :search)`,
            {
              search: `%${search}%`,
            },
          );
        }
      }

      query.skip(skip).take(limit);
      const [requests, total] = await query.getManyAndCount();

      const result = requests.map((request) => {
        // Calculate remaining time until approvalExpiry
        let remainingTime = null;
        if (
          request.approvalExpiry &&
          request.status === BlockingStatus.PENDING
        ) {
          const now = new Date();
          const expiry = new Date(request.approvalExpiry);
          const diffMs = expiry.getTime() - now.getTime();

          if (diffMs > 0) {
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor(
              (diffMs % (1000 * 60 * 60)) / (1000 * 60),
            );
            const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
            remainingTime = `${hours.toString().padStart(2, '0')}:${minutes
              .toString()
              .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          } else {
            remainingTime = '00:00:00';
          }
        }

        return {
          id: request.id,
          campaignId: request.campaignId,
          campaignName: request.campaign?.campaignName,
          inventoryUnitId: request.inventoryUnitId,
          preferredUnit: request.inventoryUnit?.unitNumber,
          typology: request.inventoryUnit?.configuration,
          uniqueReferenceId: request.voucher?.uniqueReferenceId,
          amountPaid: request.voucher?.paymentDetails?.totalAmountPaid || 0,
          amountPayable: request.voucher?.paymentDetails?.amountPayable || 0,
          paymentStatus: request.voucher?.paymentStatus,
          customerName:
            request.voucher?.applicant1?.personalDetails?.firstName +
            ' ' +
            request.voucher?.applicant1?.personalDetails?.lastName,
          sourcingRm: request.voucher?.createdBy?.name || null,
          closingRm: request.voucher?.closingRm?.name || null,
          cpName: request.voucher?.channelPartner?.cpName || null,
          approvalStatus: request.status,
          approvalExpiry: request.approvalExpiry,
          remainingTime,
          createdAt: request.createdAt,
        };
      });

      return {
        message: 'Approval requests fetched successfully.',
        data: {
          result,
          total,
        },
      };
    } catch (e) {
      logger.error('Error occurred while fetching approval requests');
      return logsAndErrorHandling(
        'InventoryUnitService - getApprovalRequests',
        e,
        {
          queryDto,
        },
      );
    }
  }

  async approveBlockingRequest(
    id: string,
    dto: ApproveBlockingDto,
    user: any,
  ): Promise<any> {
    logger.info(`Approving blocking request ${id}`);
    try {
      const userId = user?.dbId ?? user?.id;

      const blocking = await this.blockingRepo.findOne({
        where: { id },
        relations: [
          'campaign',
          'voucher',
          'inventoryUnit',
          'mapping',
          'blockingRM',
        ],
      });

      if (!blocking) {
        throw new NotFoundException('Approval request not found');
      }

      if (blocking.status !== BlockingStatus.PENDING) {
        throw new BadRequestException('Approval request is no longer pending');
      }

      this.assertUserCanApprove(blocking.campaign, userId);

      // Use transaction to update both blocking and mapping
      await this.blockingRepo.manager.transaction(async (manager) => {
        // Update blocking status
        blocking.status = BlockingStatus.APPROVED;
        blocking.approvedBy = `${userId}`;
        blocking.approvedAt = new Date();
        blocking.approvalSource = 'MANUAL_APPROVAL';
        if (dto?.remark) {
          blocking.approverRemark = dto.remark;
        }
        await manager.save(VoucherUnitBlocking, blocking);

        // Update mapping status to APPROVED
        if (blocking.mapping) {
          blocking.mapping.status = MappingStatus.APPROVED;
          await manager.save(VoucherUnitMapping, blocking.mapping);
        }
      });

      const customerName =
        blocking?.voucher?.applicant1?.personalDetails?.firstName +
        ' ' +
        blocking?.voucher?.applicant1?.personalDetails?.lastName;

      // Emit email event (non-blocking)
      this.eventEmitter.emit(
        EventMessagesEnum.COMPOSE_EMAIL,
        new ComposeEmailEvent(
          ComposeEmailsEnum.UNIT_APPROVE_REJECT,
          {
            RM_NAME: blocking.blockingRM?.name || 'RM',
            STATUS: MappingStatus.APPROVED,
            CUSTOMER_NAME: customerName,
            PRID: safeString(blocking?.voucher?.uniqueReferenceId),
            UNIT_NUMBER: blocking?.inventoryUnit?.unitNumber,
            TOWER: blocking?.inventoryUnit?.towerName,
            REJECTION_BLOCK: '',
          },
          BRAND_PURAVANKARA,
          { to: blocking?.blockingRM?.email || '' },
        ),
      );

      return {
        statusCode: SUCCESS,
        message: 'Approval request approved successfully',
        data: {
          id: blocking.id,
        },
      };
    } catch (e) {
      logger.error(`Error approving blocking request ${id}`, e);
      logsAndErrorHandling('InventoryUnitService - approveBlockingRequest', e, {
        id,
      });
    }
  }

  async rejectBlockingRequest(
    id: string,
    dto: RejectBlockingDto,
    user: any,
  ): Promise<any> {
    logger.info(`Rejecting blocking request ${id}`);
    try {
      const userId = user?.dbId ?? user?.id;

      const blocking = await this.blockingRepo.findOne({
        where: { id },
        relations: [
          'campaign',
          'inventoryUnit',
          'mapping',
          'voucher',
          'blockingRM',
        ],
      });

      if (!blocking) {
        throw new NotFoundException('Approval request not found');
      }

      if (blocking.status !== BlockingStatus.PENDING) {
        throw new BadRequestException('Approval request is no longer pending');
      }

      this.assertUserCanApprove(blocking.campaign, userId);

      // Use transaction to update blocking, delete mapping, and release inventory
      await this.blockingRepo.manager.transaction(async (manager) => {
        // Update blocking status
        blocking.status = BlockingStatus.REJECTED;
        blocking.rejectedReason = dto.rejectedReason;
        blocking.approvedBy = `${userId}`;
        blocking.approvedAt = new Date();
        blocking.approvalSource = 'Manual Rejection';
        if (dto?.remark) {
          blocking.approverRemark = dto.remark;
        }
        await manager.save(VoucherUnitBlocking, blocking);

        // Delete mapping - release unit from this mapping
        if (blocking.mapping) {
          await manager.remove(VoucherUnitMapping, blocking.mapping);
        }

        // Set is_unit_mapped = false for all payments of this voucher
        await manager.update(
          VoucherPayment,
          { voucherId: blocking.voucherId },
          { isUnitMapped: false },
        );

        // Reset inventory to AVAILABLE
        if (blocking.inventoryUnit) {
          blocking.inventoryUnit.isMapped = false;
          blocking.inventoryUnit.status = InventoryUnitStatusEnum.AVAILABLE;
          await manager.save(ProjectInventoryUnit, blocking.inventoryUnit);
        }

        // Soft delete the blocking record
        await manager.softDelete(VoucherUnitBlocking, { id });
      });

      const customerName =
        blocking?.voucher?.applicant1?.personalDetails?.firstName +
        ' ' +
        blocking?.voucher?.applicant1?.personalDetails?.lastName;

      // Emit email event (non-blocking)
      this.eventEmitter.emit(
        EventMessagesEnum.COMPOSE_EMAIL,
        new ComposeEmailEvent(
          ComposeEmailsEnum.UNIT_APPROVE_REJECT,
          {
            RM_NAME: blocking.blockingRM?.name || 'RM',
            STATUS: MappingStatus.REJECTED,
            CUSTOMER_NAME: customerName,
            PRID: safeString(blocking?.voucher?.uniqueReferenceId),
            UNIT_NUMBER: blocking?.inventoryUnit?.unitNumber,
            TOWER: blocking?.inventoryUnit?.towerName,
            REJECTION_BLOCK: 'Reason: ' + dto.rejectedReason,
          },
          BRAND_PURAVANKARA,
          { to: blocking?.blockingRM?.email || '' },
        ),
      );

      return {
        statusCode: SUCCESS,
        message: 'Approval request rejected successfully',
        data: {
          id: blocking.id,
        },
      };
    } catch (e) {
      logger.error(`Error rejecting blocking request ${id}`, e);
      logsAndErrorHandling('InventoryUnitService - rejectBlockingRequest', e, {
        id,
        dto,
      });
    }
  }

  /**
   * This method is used to release a blocking request. It can be called by admin or automatically when the block expiry time is reached.
   * It updates the blocking status to RELEASED and makes the inventory unit available again.
   */
  async releaseBlockingRequest(id: string, user: any): Promise<any> {
    logger.info(`Releasing blocking request ${id}`);
    try {
      const blocking = await this.blockingRepo.findOne({
        where: { id },
        relations: ['campaign', 'inventoryUnit', 'mapping'],
      });

      if (!blocking) {
        throw new NotFoundException(
          'Unit is not blocked with the provided id anymore it might be already released',
        );
      }

      // Use transaction to update blocking, delete mapping, and release inventory
      await this.blockingRepo.manager.transaction(async (manager) => {
        // Update inventory to AVAILABLE
        if (blocking.inventoryUnit) {
          blocking.inventoryUnit.isMapped = false;
          blocking.inventoryUnit.status = InventoryUnitStatusEnum.AVAILABLE;
          await manager.save(ProjectInventoryUnit, blocking.inventoryUnit);
        }

        // Delete mapping - release unit from this mapping
        if (blocking.mapping) {
          await manager.remove(VoucherUnitMapping, blocking.mapping);
        }

        // Set is_unit_mapped = false for all payments of this voucher
        await manager.update(
          VoucherPayment,
          { voucherId: blocking.voucherId },
          { isUnitMapped: false },
        );

        // Update blocking status to RELEASED
        blocking.releasedBy = user?.dbId ?? user?.id;
        blocking.status = BlockingStatus.RELEASED;
        await manager.save(VoucherUnitBlocking, blocking);

        // Soft delete the blocking record
        await manager.softDelete(VoucherUnitBlocking, { id });
      });

      return {
        statusCode: SUCCESS,
        message: 'Blocking request released successfully',
        data: {
          id: blocking.id,
        },
      };
    } catch (e) {
      logger.error(`Error releasing blocking request ${id}`, e);
      logsAndErrorHandling('InventoryUnitService - releaseBlockingRequest', e, {
        id,
      });
    }
  }

  private assertUserCanApprove(campaign: EoiCampaign, userId: number) {
    const isApprover =
      campaign?.unitApproverId === userId ||
      (campaign?.additionalApprovers || []).includes(userId);

    if (!isApprover) {
      throw new BadRequestException(
        'You are not authorized to approve or reject this request',
      );
    }
  }

  /**
   * `GET /inventory-unit/:id`
   * Fetches inventory unit details by ID, including campaign name and active blocking details if any.
   */
  async getInventoryUnitById(id: string): Promise<any> {
    logger.info(`Fetching inventory unit by id: ${id}`);
    try {
      const inv = await this.inventoryRepo
        .createQueryBuilder('inventory')
        .leftJoinAndSelect('inventory.campaign', 'campaign')
        .leftJoinAndSelect(
          'inventory.blockings',
          'blocking',
          'blocking.deleted_at IS NULL',
        )
        .leftJoinAndSelect('blocking.voucher', 'voucher')
        .where('inventory.id = :id', { id })
        .orderBy('blocking.created_at', 'DESC')
        .getOne();

      if (!inv) {
        throw new NotFoundException('Inventory unit not found');
      }

      const activeBlocking = inv?.blockings?.[0] || null;
      return {
        message: 'Inventory unit fetched successfully.',
        data: {
          ...this.toInventoryUnitPayload(inv, activeBlocking),
        },
      };
    } catch (e) {
      logger.error('Error occurred while fetching inventory unit by id');
      logsAndErrorHandling('InventoryUnitService - getInventoryUnitById', e, {
        id,
      });
    }
  }

  async updateInventoryUnit(
    id: string,
    updateDto: UpdateInventoryUnitDto,
  ): Promise<any> {
    logger.info(`updateInventoryUnit service called for id: ${id}`);
    try {
      const inventoryUnit = await this.inventoryRepo.findOne({
        where: { id },
      });

      if (!inventoryUnit) {
        throw new NotFoundException('Inventory unit not found');
      }
      if (
        inventoryUnit.isMapped &&
        updateDto.status === InventoryUnitStatusEnum.AVAILABLE
      ) {
        throw new BadRequestException('Inventory Unit already mapped');
      }

      //status update
      if (updateDto.status) {
        inventoryUnit.status = updateDto.status;
      }
      await this.inventoryRepo.save(inventoryUnit);
      logger.info(`Inventory status updated successfully for id: ${id}`);
      return {
        statusCode: SUCCESS,
        message: 'Inventory status updated successfully',
        data: inventoryUnit,
      };
    } catch (error) {
      logger.error('Failed to update inventory unit:', error);

      logsAndErrorHandling(
        'InventoryUnitService - updateInventoryUnit',
        error,
        { id, updateDto },
      );
    }
  }

  private toInventoryUnitPayload(
    inv: ProjectInventoryUnit,
    blocking?: VoucherUnitBlocking,
  ) {
    let showAgreementValue = inv.campaign?.showAgreementValue ?? false;
    if (inv?.campaign?.stage === EoiCampaignStageType.PRE_FILL)
      showAgreementValue = false; // Override to hide agreement value in pre-fill stage irrespective of campaign level setting
    const payload: any = {
      id: inv.id,
      towerId: inv.towerId,
      unitId: inv.unitId,
      towerName: inv.towerName,
      floor: inv.floor,
      unitNumber: inv.unitNumber,
      series: inv.series,
      configuration: inv.configuration,
      facing: inv.facing,
      carParkType: inv.carParkType,
      numberOfCarParks: inv.numberOfCarParks,
      areaSba: inv.areaSba,
      status: inv.status,
      campaignId: inv.campaignId,
      campaignName: inv.campaign?.campaignName,
      timerExtension: inv.campaign?.timerExtension,
      unitBlockDuration: inv.campaign?.unitBlockDuration,
      isMapped: inv.isMapped,
      carpetArea: inv.carpetArea,
      agreementValue: showAgreementValue
        ? inv.agreementValue
        : 'To be revealed',
    };

    if (blocking) {
      const applicant = blocking?.voucher.applicant1;
      const mobileFromNested =
        (applicant?.personalDetails?.countryCode ?? '') +
          (applicant?.personalDetails?.contactNumber ?? '') || null;
      const customerName =
        applicant?.personalDetails?.firstName +
          ' ' +
          applicant?.personalDetails?.lastName || null;

      payload.blocking = {
        id: blocking.id,
        uniqueReferenceId: blocking.uniqueReferenceId,
        amountPaid: blocking.amountPaid,
        thresholdAmount: blocking.thresholdAmount,
        paymentMode: blocking.paymentMode,
        status: blocking.status,
        unitBlockExpiry: blocking.unitBlockExpiry,
        approvalExpiry: blocking.approvalExpiry,
        approvedBy: blocking.approvedBy,
        approvedAt: blocking.approvedAt,
        rejectedReason: blocking.rejectedReason,
        createdAt: blocking.createdAt,
      };

      payload.voucher = {
        id: blocking.voucher?.id,
        label: `${customerName} | ${blocking?.voucher.uniqueReferenceId} | ${maskMobileNumber(applicant?.personalDetails?.contactNumber ?? '')}`,
        voucherId: blocking?.voucher?.voucherId,
        uniqueReferenceId: blocking?.voucher?.uniqueReferenceId,
        preEoiId: blocking?.voucher?.preEoiId,
        stdEoiId: blocking?.voucher?.stdEoiId,
        paidVoucherId: blocking?.voucher?.paidVoucherId,
        voucherFormStatus: blocking?.voucher?.voucherFormStatus,
        formPhase: blocking?.voucher?.formPhase,
        paymentStatus: blocking?.voucher?.paymentStatus,
        noOfApplicants: blocking?.voucher?.noOfApplicants,
        customerName: customerName,
        mobile: (mobileFromNested && String(mobileFromNested).trim()) || null,
        email: applicant?.personalDetails?.emailAddress || null,
        amountPaid: blocking?.voucher?.paymentDetails?.totalAmountPaid || 0,
      };
    }

    return payload;
  }

  private async getDistinctValues(
    field: string,
    campaignId: number,
    towerName?: string[],
    floor?: string[],
  ): Promise<string[]> {
    const query = this.inventoryRepo
      .createQueryBuilder('inventory')
      .select(`DISTINCT inventory.${field}`, field)
      .where('inventory.campaignId = :campaignId', { campaignId })
      .andWhere('inventory.deletedAt IS NULL');

    if (towerName?.length) {
      query.andWhere('inventory.towerName IN (:...towerName)', {
        towerName,
      });
    }

    if (floor?.length) {
      query.andWhere('inventory.floor IN (:...floor)', { floor });
    }

    const results = await query.getRawMany();
    return results.map((r) => r[field]).filter(Boolean);
  }

  private transformToNameValuePairs(
    values: string[],
  ): Array<{ name: string; value: string }> {
    return values.map((value) => ({
      name: value,
      value: value,
    }));
  }

  async getInventoryDropdowns(queryDto: InventoryDropdownsDto): Promise<any> {
    logger.info('Fetching inventory dropdowns');
    try {
      const { campaignId, towerName, floor } = queryDto;

      // Case 1: Only campaignId - return distinct tower names
      if (!towerName?.length) {
        const towers = await this.getDistinctValues('towerName', campaignId);
        return {
          message: 'Tower names fetched successfully',
          data: { towers: this.transformToNameValuePairs(towers) },
        };
      }

      // Case 2: campaignId + towerName (no floor) - return configurations, facings, series, floors (filtered), and all towers
      // Case 3: campaignId + towerName + floor - return configurations, facings, series (filtered), all towers, and all floors
      const promises: Promise<string[]>[] = [
        this.getDistinctValues('configuration', campaignId, towerName, floor),
        this.getDistinctValues('facing', campaignId, towerName, floor),
        this.getDistinctValues('series', campaignId, towerName, floor),
        // Always fetch all towers for the campaign and floors for the campaign and selected tower
        this.getDistinctValues('towerName', campaignId),
        this.getDistinctValues('floor', campaignId, towerName),
      ];

      const [configurations, facings, series, allTowers, floors] =
        await Promise.all(promises);

      const responseData: any = {
        towers: this.transformToNameValuePairs(allTowers),
        configurations: this.transformToNameValuePairs(configurations),
        facings: this.transformToNameValuePairs(facings),
        series: this.transformToNameValuePairs(series),
        floors: this.transformToNameValuePairs(floors),
      };

      return {
        message: 'Dropdown values fetched successfully',
        data: responseData,
      };
    } catch (e) {
      logger.error('Error occurred while fetching inventory dropdowns');
      logsAndErrorHandling('InventoryService - getInventoryDropdowns', e);
    }
  }

  async sampleExcel() {
    return {
      message: 'Sample File fetched successfully',
      data: {
        s3Path: 'inventory_units/inventory_unit_sample.xlsx',
      },
    };
  }

  async bulkInsert(
    user: any,
    inventoryUnitDto: InventoryUnitFileDto,
  ): Promise<any> {
    try {
      const { key, fileName, campaignId } = inventoryUnitDto;

      // Step 1: Validate File Type (only .xlsx files allowed)
      if (!key.endsWith('.xlsx')) {
        throw new BadRequestException(
          `Only .xlsx files are allowed. ${fileName} have different extension`,
        );
      }

      // Step 2: Check campaign
      const campaign = await this.eoiCampaignRepository.findOne({
        where: { id: campaignId },
      });
      if (!campaign) {
        throw new NotFoundException('Campaign not found with the provided ID');
      }

      // Step 3: Fetch File
      const fileBuffer = await this.awsService.fetchFileFromS3(key);
      if (!fileBuffer) {
        throw new BadRequestException(`File not found : ${fileName}`);
      }

      const fileColumns: ExcelColumnDefinition[] = [
        { key: 'towerId', label: 'Tower Id', required: false, type: 'string' },
        { key: 'unitId', label: 'Unit Id', required: false, type: 'string' },
        {
          key: 'towerName',
          label: 'Tower Name',
          required: true,
          type: 'string',
        },
        { key: 'floor', label: 'Floor', required: true, type: 'string' },
        {
          key: 'unitNumber',
          label: 'Unit Number',
          required: true,
          type: 'string',
        },
        { key: 'series', label: 'Series', required: false, type: 'string' },
        {
          key: 'configuration',
          label: 'Unit Type',
          required: true,
          type: 'string',
        },
        { key: 'facing', label: 'Facing', required: false, type: 'string' },
        {
          key: 'carParkType',
          label: 'Car Park Type',
          required: false,
          type: 'string',
        },
        {
          key: 'numberOfCarParks',
          label: 'No. Of Car Parks',
          required: false,
          type: 'number',
        },
        { key: 'areaSba', label: 'SBA Sq.ft', required: true, type: 'number' },
        {
          key: 'carpetArea',
          label: 'Carpet Area Sq.ft',
          required: false,
          type: 'number',
        },
        {
          key: 'agreementValue',
          label: 'Agreement Value',
          required: false,
          type: 'number',
        },
        { key: 'status', label: 'Status', required: true, type: 'string' },
      ];

      const validationErrors = await validateExcelFile(fileBuffer, fileColumns);
      if (validationErrors.length > 0) {
        throw new BadRequestException(
          validationErrors.map((e, i) => `Error ${i + 1}: ${e}`).join(', '),
        );
      }

      // Step 4: Parse + Normalize
      const rawData = await parseExcelFile(fileBuffer);
      const normalizedRows = normalizeData(rawData, fileColumns);

      // Step 5: Existing inventory
      const unitNumbers = normalizedRows.map((r) => r.unitNumber);

      const existingInventories = await this.inventoryRepo.find({
        where: {
          unitNumber: In(unitNumbers),
        },
      });

      const inventoryByUnitNumber = new Map(
        existingInventories.map((inv) => [inv.unitNumber, inv]),
      );

      // Step 6: Mapping
      const inventoryIds = existingInventories.map((inv) => inv.id);

      const mappings = await this.voucherUnitMappingRepository.find({
        where: {
          inventoryUnitId: In(inventoryIds),
        },
      });

      const mappedInventoryIds = new Set(
        mappings.map((m) => m.inventoryUnitId),
      );

      // Step 7: Classify inventory rows into insert, full update, and partial update operations
      const { toInsert, toUpdateFull, toUpdatePartial, skippedCount } =
        this.prepareInventoryData(
          normalizedRows, // normalized inventory data (parsed from Excel)
          inventoryByUnitNumber, // map of unitNumber → existing inventory
          mappedInventoryIds, // set of inventory IDs already mapped
          campaignId,
        );

      if (toInsert.length) {
        await this.inventoryRepo.insert(toInsert);
      }

      //  Full update (bulk save)
      if (toUpdateFull.length) {
        await this.inventoryRepo.save(toUpdateFull);
      }

      //  Partial update (one by one)
      if (toUpdatePartial.length) {
        await this.inventoryRepo.save(toUpdatePartial);
      }
      const inserted = toInsert.length;
      const updated = toUpdateFull.length + toUpdatePartial.length;

      return {
        message: `Upload successful. [Inserted: ${inserted}, Updated: ${updated}]- Refresh the data to view the changes {EOI > Inventory}`,
        data: {
          totalRecords: normalizedRows.length,
          inserted,
          updated,
          skippedCount,
        },
      };
    } catch (error) {
      logger.error(
        `Inventory unit upload failed: ${error.message || 'Unknown error'}`,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Inventory unit upload failed: ${error.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Initiates unit blocking for customer mapping with time-based blocking.
   * Blocks the unit temporarily, starts a countdown, and determines if approval is needed based on payment.
   *
   * @param dto - Contains campaignId, inventoryUnitId, uniqueReferenceId, optional amountPaid and paymentMode.
   * @param user - Current user context (for audit trail)
   * @returns Success payload with blocking details and timer info.
   * @throws {NotFoundException} When unit or campaign not found.
   * @throws {BadRequestException} When unit is not available or already blocked/mapped.
   */
  async blockInventoryUnit(
    dto: BlockInventoryUnitDto,
    user?: any,
  ): Promise<any> {
    logger.info('blockInventoryUnit called', { dto });
    try {
      const { campaignId, inventoryUnitId, voucherId } = dto;
      return await this.voucherFormRepository.manager.transaction(
        async (manager) => {
          return await this.performUnitBlocking(
            manager,
            campaignId,
            inventoryUnitId,
            voucherId,
            user,
          );
        },
      );
    } catch (error) {
      logger.error('Error in blockInventoryUnit:', error);
      return logsAndErrorHandling(
        'InventoryUnitService - blockInventoryUnit',
        error,
        {
          dto,
        },
      );
    }
  }

  /**
   * Updates payment details specifically for unit mapping.
   * Validates if the new payment meets the campaign threshold before updating.
   */
  async updatePaymentForUnitMapping(
    dto: UpdateMappingPaymentDto,
    user?: any,
  ): Promise<any> {
    const { voucherId, blockingId, inventoryUnitId, paymentDetails } = dto;

    try {
      const blocking = await this.blockingRepo.findOne({
        where: {
          id: blockingId,
          status: BlockingStatus.BLOCKED,
          unitBlockExpiry: MoreThan(new Date()),
        },
        relations: ['campaign', 'voucher'],
      });

      if (!blocking) {
        throw new NotFoundException(
          'Blocking record not found or block has expired',
        );
      }

      if (blocking.voucher?.id !== voucherId) {
        throw new BadRequestException(
          'Voucher ID mismatch with blocking record',
        );
      }

      const existingPayments = await this.voucherPaymentRepository.find({
        where: {
          voucherId: blocking.voucher.id,
          status: In([
            PaymentTxStatusEnum.UNVERIFIED,
            PaymentTxStatusEnum.VERIFIED,
          ]),
        },
      });

      const { mergedPayments, newPaidAmount } =
        this.prepareMergedOfflinePayments(
          existingPayments,
          paymentDetails?.payments || [],
        );

      if (paymentDetails) {
        paymentDetails.payments = mergedPayments;
      }

      const existingPaidAmount = existingPayments.reduce(
        (acc, curr) => acc + (Number(curr.paidAmount) || 0),
        0,
      );

      const totalAmountPaid = existingPaidAmount + newPaidAmount;
      const thresholdAmount = blocking.campaign?.thresholdAmount || 0;

      if (totalAmountPaid < thresholdAmount) {
        throw new BadRequestException(
          `Payment does not meet the required threshold. Required: ${thresholdAmount}, Current: ${totalAmountPaid}`,
        );
      }

      if (paymentDetails) {
        await this.voucherFormsService.updatePaymentDetails(
          blocking.voucher.voucherId,
          paymentDetails,
          user,
        );
      }

      return {
        statusCode: SUCCESS,
        message: 'Blocking unit request submitted successfully.',
        data: {
          voucherId,
          blockingId,
          inventoryUnitId,
          totalAmountPaid,
          thresholdAmount,
        },
      };
    } catch (error) {
      logger.error('Error in updatePaymentForUnitMapping:', error);
      return logsAndErrorHandling(
        'InventoryUnitService - updatePaymentForUnitMapping',
        error,
        { voucherId, blockingId, inventoryUnitId, paymentDetails },
      );
    }
  }

  private prepareMergedOfflinePayments(
    existingPayments: VoucherPayment[],
    incomingPayments: VoucherPaymentsDto[],
  ): {
    mergedPayments: VoucherPaymentsDto[];
    newPaidAmount: number;
  } {
    // Step 1: filter offline
    const offlinePayments = existingPayments.filter(
      (p) => p.paymentMode !== PaymentModeEnum.GATEWAY,
    );

    // Step 2: map DB → DTO
    const mappedExisting: VoucherPaymentsDto[] = offlinePayments.map((p) => ({
      id: p.id,
      paidAmount: Number(p.paidAmount) || 0,
      paymentMode: p.paymentMode,
      date: p.date ? p.date.toISOString().split('T')[0] : undefined,
      status: p.status,
      paymentDetails: p.paymentDetails || undefined,
      paymentProof: p.receiptImage ? [p.receiptImage] : [],
      chequeDepositSlip: p.paymentDetails?.chequeDepositSlip || undefined,
    }));

    // Step 3: build key set for dedupe
    const getKey = (payment: VoucherPaymentsDto) =>
      payment.paymentDetails?.transactionNumber ||
      payment.paymentDetails?.chequeNumber ||
      String(payment.id);

    const existingKeys = new Set(mappedExisting.map(getKey).filter(Boolean));

    // Step 4: filter incoming (remove duplicates)
    const newOnlyPayments = incomingPayments.filter((p) => {
      const key = getKey(p);
      return key && !existingKeys.has(key);
    });

    // Step 5: merge
    const mergedPayments = [...mappedExisting, ...newOnlyPayments].sort(
      (a, b) =>
        new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime(),
    );

    // Step 6: calculate newPaidAmount
    const newPaidAmount = newOnlyPayments.reduce(
      (acc, curr) => acc + (Number(curr.paidAmount) || 0),
      0,
    );

    return {
      mergedPayments,
      newPaidAmount,
    };
  }

  /**
   * Performs the unit blocking logic within a transaction.
   * Fetches payment data from voucher_payments and handles all validations.
   */
  private async performUnitBlocking(
    manager: any,
    campaignId: number,
    inventoryUnitId: string,
    voucherId: number,
    user?: any,
  ): Promise<any> {
    const {
      campaign,
      voucher,
      inventoryUnit,
      thresholdAmount,
      unitBlockDuration,
      timerExtension,
    } = await this.validateBlockingPrerequisites(
      manager,
      campaignId,
      inventoryUnitId,
      voucherId,
    );

    return this.executeUnitBlocking({
      manager,
      campaign,
      voucher,
      inventoryUnit,
      thresholdAmount,
      unitBlockDuration,
      timerExtension,
      user,
    });
  }

  /**
   * Validates prerequisites for unit blocking: campaign, voucher, inventory unit, and existing blockings.
   */
  private async validateBlockingPrerequisites(
    manager: any,
    campaignId: number,
    inventoryUnitId: string,
    voucherId: number,
  ): Promise<{
    campaign: EoiCampaign;
    voucher: VoucherForm;
    inventoryUnit: ProjectInventoryUnit;
    thresholdAmount: number;
    unitBlockDuration: number;
    timerExtension: number;
    approvalWindowHours: number;
  }> {
    // Configurable defaults (will be overridden from campaign settings once loaded)
    let unitBlockDuration = 10;
    let timerExtension = 5;
    let approvalWindowHours = 8;

    // Find campaign first (needed for config)
    const campaign = await manager.findOne(EoiCampaign, {
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const thresholdAmount = campaign.thresholdAmount || 0;
    unitBlockDuration = campaign.unitBlockDuration || unitBlockDuration;
    timerExtension = campaign.timerExtension || timerExtension;
    approvalWindowHours = campaign.approvalWindowHours || approvalWindowHours;
    const eoiType = campaign.eoiType || [];

    if (
      !thresholdAmount ||
      !unitBlockDuration ||
      !eoiType.includes(EOITypeEnum.PREFERENTIAL)
    ) {
      throw new BadRequestException(
        'Campaign is not configured properly for unit blocking. Please contact administrator.',
      );
    }
    // Find and validate voucher (fail fast on invalid voucher/campaign)
    const voucher = await this.joinVoucherCampaignAndMappedUnit(
      manager.createQueryBuilder(VoucherForm, 'voucher'),
    )
      .where('voucher.id = :voucherId', {
        voucherId,
      })
      .andWhere('voucher.isDeleted = false')
      .select([
        'voucher.id',
        'voucher.voucherId',
        'voucher.uniqueReferenceId',
        'voucher.opportunityId',
        'campaign.id',
        'campaign.unitSourceType',
        'mappedUnit.id',
      ])
      .getOne();

    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    this.throwIfVoucherNotInCampaign(voucher, campaignId);
    this.throwIfVoucherAlreadyMapped(voucher);

    // Find and validate inventory unit
    const inventoryUnit = await manager.findOne(ProjectInventoryUnit, {
      where: { id: inventoryUnitId, campaignId },
    });

    if (!inventoryUnit) {
      throw new NotFoundException('Inventory unit not found for this campaign');
    }

    if (inventoryUnit.status !== InventoryUnitStatusEnum.AVAILABLE) {
      throw new BadRequestException(
        `Inventory unit is not available. Current status: ${inventoryUnit.status}`,
      );
    }

    if (inventoryUnit.isMapped) {
      throw new BadRequestException('Inventory unit is already mapped');
    }

    // Check for existing pending blocking
    const existingBlocking = await manager.findOne(VoucherUnitBlocking, {
      where: { inventoryUnitId, status: BlockingStatus.PENDING },
    });

    if (existingBlocking) {
      throw new BadRequestException(
        'Unit is already blocked for another customer',
      );
    }

    return {
      campaign,
      voucher,
      inventoryUnit,
      thresholdAmount,
      unitBlockDuration,
      timerExtension,
      approvalWindowHours,
    };
  }

  /**
   * Executes the unit blocking.
   * Blocks the unit for a particular time.
   */
  private async executeUnitBlocking(
    params: ExecuteUnitBlockingParams,
  ): Promise<any> {
    const {
      manager,
      campaign,
      voucher,
      inventoryUnit,
      thresholdAmount,
      unitBlockDuration,
      timerExtension,
      user,
    } = params;
    const unitBlockExpiry = new Date();
    unitBlockExpiry.setMinutes(
      unitBlockExpiry.getMinutes() + unitBlockDuration,
    );

    const blocking = await manager.save(VoucherUnitBlocking, {
      campaignId: campaign.id,
      inventoryUnitId: inventoryUnit.id,
      voucherId: voucher.id,
      uniqueReferenceId: voucher.uniqueReferenceId,
      thresholdAmount,
      status: BlockingStatus.BLOCKED,
      unitBlockExpiry,
      blockingInitiatedBy: user?.dbId ?? user?.id,
      blockingInitiatedAt: new Date(),
    });

    inventoryUnit.status = InventoryUnitStatusEnum.BLOCKED_BY_RM;
    await manager.save(ProjectInventoryUnit, inventoryUnit);

    return {
      statusCode: SUCCESS,
      message: `Your ${unitBlockDuration}-minute timer has started. Please complete the payment within this time to proceed with unit mapping.`,
      data: {
        id: blocking.id,
        inventoryUnitId: inventoryUnit.id,
        uniqueReferenceId: voucher.uniqueReferenceId,
        unitBlockExpiry,
        timerDurationMinutes: unitBlockDuration,
        timerExtension,
      },
      blockingRecord: blocking,
    };
  }

  /**
   * `campaign` + `mappedUnit` joins used by `mapUnitToVoucher` voucher lookup.
   */
  private joinVoucherCampaignAndMappedUnit(
    qb: SelectQueryBuilder<VoucherForm>,
  ): SelectQueryBuilder<VoucherForm> {
    return qb
      .leftJoin('voucher.campaign', 'campaign')
      .leftJoin('voucher.mappedUnit', 'mappedUnit');
  }

  /**
   * Ensures the voucher has no row in `voucher_unit_mappings` yet.
   */
  private throwIfVoucherAlreadyMapped(voucher: VoucherForm): void {
    if (voucher.mappedUnit) {
      throw new BadRequestException('This voucher is already mapped to a unit');
    }
  }

  /**
   * Ensures the loaded voucher belongs to the campaign the client is mapping under.
   */
  private throwIfVoucherNotInCampaign(
    voucher: VoucherForm,
    campaignId: number,
  ): void {
    if (voucher.campaign?.id !== campaignId) {
      throw new BadRequestException(
        'Voucher does not belong to the specified campaign',
      );
    }
  }

  private prepareInventoryData(
    inventoryData: ProjectInventoryUnit[],
    inventoryByUnitNumber: Map<string, ProjectInventoryUnit>,
    mappedInventoryIds: Set<string>,
    campaignId: number,
  ) {
    const toInsert = [];
    const toUpdateFull = [];
    const toUpdatePartial = [];
    const skipped = [];

    for (const row of inventoryData) {
      const existing = inventoryByUnitNumber.get(row.unitNumber);

      if (!existing) {
        toInsert.push(this.buildInsert(row, campaignId));
        continue;
      }

      const isMapped = mappedInventoryIds.has(existing.id);

      //  Case 2: Same unitNumber but DIFFERENT campaign → SKIP
      if (existing.campaignId !== campaignId) {
        skipped.push({
          unitNumber: row.unitNumber,
          existingCampaignId: existing.campaignId,
          incomingCampaignId: campaignId,
        });
        continue;
      }

      //  Same unitNumber + SAME campaign → UPDATE
      if (!isMapped) {
        toUpdateFull.push(this.buildFullUpdate(row, existing.id));
        continue;
      }

      toUpdatePartial.push({
        ...existing,
        series: row.series ?? null,
        facing: row.facing ?? null,
        carParkType: row.carParkType ?? null,
        numberOfCarParks: row.numberOfCarParks ?? null,
        carpetArea: row.carpetArea ?? null,
        agreementValue: row.agreementValue ?? null,
      });
    }

    return {
      toInsert,
      toUpdateFull,
      toUpdatePartial,
      skippedCount: skipped.length,
    };
  }

  private buildInsert(row: ProjectInventoryUnit, campaignId: number) {
    return {
      campaignId,
      towerId: row.towerId,
      unitId: row.unitId,
      towerName: row.towerName,
      floor: row.floor,
      unitNumber: row.unitNumber,
      series: row.series,
      configuration: row.configuration,
      facing: row.facing,
      carParkType: row.carParkType,
      numberOfCarParks: row.numberOfCarParks,
      areaSba: row.areaSba,
      status: row.status,
      carpetArea: row.carpetArea,
      agreementValue: row.agreementValue,
    };
  }

  private buildFullUpdate(row: ProjectInventoryUnit, id: string) {
    return {
      id,
      towerId: row.towerId ?? null,
      unitId: row.unitId ?? null,
      towerName: row.towerName,
      floor: row.floor,
      unitNumber: row.unitNumber,
      series: row.series ?? null,
      configuration: row.configuration,
      facing: row.facing ?? null,
      carParkType: row.carParkType ?? null,
      numberOfCarParks: row.numberOfCarParks ?? null,
      areaSba: row.areaSba,
      status: row.status,
      carpetArea: row.carpetArea ?? null,
      agreementValue: row.agreementValue ?? null,
    };
  }

  async exportInventory(user: any, query: InventoryListDto): Promise<any> {
    try {
      const exportFilter = { ...query };
      delete exportFilter.page;
      delete exportFilter.limit;

      const inventoryResult = await this.getInventoryList(
        user,
        exportFilter,
        true,
      );
      const inventoryList = inventoryResult?.data?.result ?? [];

      if (!inventoryList || inventoryList.length === 0) {
        return {
          message: 'No inventory found to export',
          data: [],
        };
      }
      const workbook = new ExcelJS.Workbook();
      buildInventoryExcelSheet(workbook, { inventory: inventoryList });
      const buffer = await workbook.xlsx.writeBuffer();

      const timeStamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const s3Key = `exports/inventory/inventory-${timeStamp}.xlsx`;

      const stream = new PassThrough();
      stream.end(buffer);

      await this.awsService.uploadToS3(s3Key, stream, true);
      return {
        message: 'Inventory exported successfully',
        data: { filePath: s3Key },
      };
    } catch (error) {
      logger.error('Inventory export failed:', error);
      logsAndErrorHandling('inventoryService - exportInventory', error, {
        query,
      });
    }
  }

  async verifyTokenAndProcessAction(token: string): Promise<any> {
    logger.info(`Verifying JWT token and processing action`);
    try {
      if (!token) {
        throw new BadRequestException('Token is required');
      }

      const secret = this.configService.get<string>('JWT_SECRET');
      let payload: any;
      try {
        payload = jwt.verify(token, secret);
      } catch (err) {
        throw new BadRequestException('Invalid or expired token');
      }

      const { blockingId, approverId, action, jti } = payload;

      if (!jti || !blockingId || !action) {
        throw new BadRequestException('Invalid token payload');
      }
      let whereCondition: any = { id: blockingId, approveJti: jti };
      if (action === EmailActionsEnum.REJECT) {
        whereCondition = { id: blockingId, rejectJti: jti };
      }
      const blocking = await this.blockingRepo.findOne({
        where: whereCondition,
        relations: [
          'campaign',
          'inventoryUnit',
          'mapping',
          'voucher',
          'blockingRM',
        ],
      });

      if (!blocking) {
        throw new BadRequestException('Invalid token or blocking not found');
      }

      if (blocking.isTokenUsed) {
        throw new BadRequestException('Token has already been used');
      }

      if (blocking.status !== BlockingStatus.PENDING) {
        throw new BadRequestException('Approval request is no longer pending');
      }

      const isValidAction =
        action === EmailActionsEnum.APPROVE ||
        action === EmailActionsEnum.REJECT;
      if (!isValidAction) {
        throw new BadRequestException('Invalid action specified');
      }

      await this.blockingRepo.manager.transaction(async (manager) => {
        blocking.isTokenUsed = true;
        blocking.approvalSource =
          action === 'Approve' ? 'EMAIL_LINK_APPROVAL' : 'EMAIL_LINK_REJECTION';
        blocking.approvedAt = new Date();
        blocking.approvedBy = approverId
          ? String(approverId)
          : 'Email Approver';

        if (action === EmailActionsEnum.APPROVE) {
          blocking.status = BlockingStatus.APPROVED;
          await manager.save(VoucherUnitBlocking, blocking);

          if (blocking.mapping) {
            blocking.mapping.status = MappingStatus.APPROVED;
            await manager.save(VoucherUnitMapping, blocking.mapping);
          }
        } else if (action === EmailActionsEnum.REJECT) {
          blocking.status = BlockingStatus.REJECTED;
          blocking.rejectedReason = 'Rejected via email link';
          await manager.save(VoucherUnitBlocking, blocking);

          if (blocking.mapping) {
            await manager.remove(VoucherUnitMapping, blocking.mapping);
          }

          // Set is_unit_mapped = false for all payments of this voucher
          await manager.update(
            VoucherPayment,
            { voucherId: blocking.voucherId },
            { isUnitMapped: false },
          );

          if (blocking.inventoryUnit) {
            blocking.inventoryUnit.isMapped = false;
            blocking.inventoryUnit.status = InventoryUnitStatusEnum.AVAILABLE;
            await manager.save(ProjectInventoryUnit, blocking.inventoryUnit);
          }

          // Soft delete the blocking record
          await manager.softDelete(VoucherUnitBlocking, { id: blockingId });
        }
      });

      const customerName =
        blocking?.voucher?.applicant1?.personalDetails?.firstName +
        ' ' +
        blocking?.voucher?.applicant1?.personalDetails?.lastName;

      const status =
        action === EmailActionsEnum.APPROVE
          ? MappingStatus.APPROVED
          : MappingStatus.REJECTED;
      // Emit email event (non-blocking)
      this.eventEmitter.emit(
        EventMessagesEnum.COMPOSE_EMAIL,
        new ComposeEmailEvent(
          ComposeEmailsEnum.UNIT_APPROVE_REJECT,
          {
            RM_NAME: blocking.blockingRM?.name,
            STATUS: status,
            CUSTOMER_NAME: customerName,
            PRID: safeString(blocking?.voucher?.uniqueReferenceId),
            UNIT_NUMBER: blocking?.inventoryUnit?.unitNumber,
            TOWER: blocking?.inventoryUnit?.towerName,
            REJECTION_BLOCK: '',
          },
          BRAND_PURAVANKARA,
          { to: blocking?.blockingRM?.email },
        ),
      );

      return {
        statusCode: SUCCESS,
        message: `Action ${action} processed successfully`,
        data: { id: blocking.id, action },
      };
    } catch (error) {
      logger.error(`Error processing link action`, error);
      throw error;
    }
  }
}
