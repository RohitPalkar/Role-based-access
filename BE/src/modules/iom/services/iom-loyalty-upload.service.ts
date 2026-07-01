import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { PineLabsApiName } from 'src/modules/pine-labs/enums/pine-labs-api-name.enum';
import { PineLabsExecutorService } from 'src/modules/pine-labs/pine-labs-executor.service';
import { PineLabsExecutorResult } from 'src/modules/pine-labs/interfaces/pine-labs.interface';
import { PinelabCustomerService } from 'src/modules/pine-labs/services/pinelab-customer.service';
import { normalizeMobileForLookup } from 'src/modules/pine-labs/utils/normalize-mobile.util';

import {
  UploadLoyaltyPointsDto,
  LoyaltyPointsUploadActionEnum,
} from '../dto/upload-loyalty-points.dto';
import { Iom } from '../entities/iom.entity';
import { LoyaltyPointsReleaseTypeEnum } from '../enums/iom.enums';
import { IomErrorCodeEnum } from '../enums/iom-error-code.enum';
import { pickStringField } from '../helpers/iom-pdf-template.mapper';
import { resolveBrandIdFromIom } from '../helpers/resolve-brand-from-iom.helper';
import { LoyaltyPointsUploadResponse } from '../types/loyalty-upload.interface';
import { throwIomError } from '../utils/iom-error.util';
import {
  AuthenticatedUser,
  IomValidationService,
} from './iom-validation.service';

@Injectable()
export class IomLoyaltyUploadService {
  private readonly logger = new Logger(IomLoyaltyUploadService.name);

  constructor(
    @InjectRepository(Iom)
    private readonly iomRepo: Repository<Iom>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly validator: IomValidationService,
    private readonly pineLabsExecutor: PineLabsExecutorService,
    private readonly pinelabCustomerService: PinelabCustomerService,
  ) {}

  async uploadLoyaltyPoints(
    user: AuthenticatedUser,
    iomId: number,
    dto: UploadLoyaltyPointsDto,
  ): Promise<LoyaltyPointsUploadResponse> {
    const iom = await this.loadIomOrThrow(iomId);
    await this.validator.assertProjectAccess(user, iom.projectId);

    this.assertValidStateTransition(
      dto.loyaltyPointsReleaseType,
      iom.loyaltyPointClassification,
    );

    if (!this.hasReferrer(iom)) {
      throwIomError(
        IomErrorCodeEnum.LOYALTY_UPLOAD_PREREQUISITE_MISSING,
        { iomId },
        'A referrer is required before uploading loyalty points.',
      );
    }

    const brandId = resolveBrandIdFromIom(iom);
    const refereePinelabId = await this.resolvePinelabCustomerIdForUpload(
      brandId,
      iom.customerMobile,
      'referee',
      iom.id,
    );
    const referrerPinelabId = await this.resolvePinelabCustomerIdForUpload(
      brandId,
      iom.referrerMobile,
      'referrer',
      iom.id,
    );

    const pineApi = this.resolvePinelabApi(dto.loyaltyPointsReleaseType);
    const referenceId = iom.iomNo ?? String(iom.id);

    await this.invokePinelabForParticipant(
      pineApi,
      refereePinelabId,
      dto.loyaltyPointsReleaseType === LoyaltyPointsUploadActionEnum.REDEEMABLE
        ? iom.refereePoints
        : undefined,
      referenceId,
    );
    await this.invokePinelabForParticipant(
      pineApi,
      referrerPinelabId,
      dto.loyaltyPointsReleaseType === LoyaltyPointsUploadActionEnum.REDEEMABLE
        ? iom.referrerPoints
        : undefined,
      referenceId,
    );

    const persistedState =
      dto.loyaltyPointsReleaseType as unknown as LoyaltyPointsReleaseTypeEnum;
    await this.dataSource.transaction(async (manager) => {
      await manager
        .getRepository(Iom)
        .update({ id: iom.id }, { loyaltyPointClassification: persistedState });
    });

    const isRedeem =
      dto.loyaltyPointsReleaseType === LoyaltyPointsUploadActionEnum.REDEEMABLE;

    return {
      iomId: String(iom.id),
      loyaltyPointsReleaseType: dto.loyaltyPointsReleaseType,
      loyaltyPointsReleaseStatus: isRedeem ? 'REDEEMED' : 'ELIGIBLE',
      message: isRedeem
        ? 'Loyalty points redeemed successfully for referee and referrer.'
        : 'Loyalty points marked eligible successfully for referee and referrer.',
    };
  }

  private async resolvePinelabCustomerIdForUpload(
    brandId: number,
    mobile: string | null | undefined,
    participant: 'referee' | 'referrer',
    iomId: number,
  ): Promise<string> {
    const normalized = normalizeMobileForLookup(mobile);
    if (!normalized) {
      throwIomError(
        IomErrorCodeEnum.LOYALTY_UPLOAD_PREREQUISITE_MISSING,
        { iomId, participant },
        `${participant} mobile number is required before uploading loyalty points.`,
      );
    }

    const stored = await this.pinelabCustomerService.findByBrandAndMobile(
      brandId,
      mobile,
    );
    if (stored?.pinelabCustomerId?.trim()) {
      return stored.pinelabCustomerId.trim();
    }

    const fetchPayload: Record<string, unknown> = { mobileNumber: normalized };
    const result = await this.pineLabsExecutor.execute(
      PineLabsApiName.CUSTOMER_FETCH,
      fetchPayload,
    );

    if (!result.success) {
      if (this.isCustomerNotFound(result)) {
        throwIomError(
          IomErrorCodeEnum.LOYALTY_UPLOAD_PREREQUISITE_MISSING,
          { iomId, participant },
          `${participant} Pinelab customer ID is required before uploading loyalty points.`,
        );
      }
      this.throwPinelabUploadError(result);
    }

    const customerId = this.extractCustomerIdFromFetch(result.data);
    if (!customerId) {
      throwIomError(
        IomErrorCodeEnum.LOYALTY_UPLOAD_PREREQUISITE_MISSING,
        { iomId, participant },
        `${participant} Pinelab customer ID is required before uploading loyalty points.`,
      );
    }

    await this.pinelabCustomerService.upsertCustomerId(
      brandId,
      mobile,
      customerId,
    );
    return customerId;
  }

  private extractCustomerIdFromFetch(data: unknown): string | null {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return null;
    }
    const record = data as Record<string, unknown>;
    const customer =
      record.customer && typeof record.customer === 'object'
        ? (record.customer as Record<string, unknown>)
        : record;
    return pickStringField(customer, 'customerId', 'customer_id', 'id');
  }

  private isCustomerNotFound(result: PineLabsExecutorResult): boolean {
    const message = (result.error?.message ?? '').toLowerCase();
    const code = (result.error?.code ?? '').toLowerCase();
    return (
      result.error?.statusCode === 404 ||
      code.includes('not_found') ||
      code.includes('notfound') ||
      message.includes('not found') ||
      message.includes('customer not found') ||
      message.includes('no customer')
    );
  }

  private resolvePinelabApi(
    action: LoyaltyPointsUploadActionEnum,
  ): PineLabsApiName.MARK_ELIGIBLE | PineLabsApiName.REDEEM_POINTS {
    return action === LoyaltyPointsUploadActionEnum.ELIGIBLE
      ? PineLabsApiName.MARK_ELIGIBLE
      : PineLabsApiName.REDEEM_POINTS;
  }

  private assertValidStateTransition(
    requested: LoyaltyPointsUploadActionEnum,
    current: string | null,
  ): void {
    if (requested === LoyaltyPointsUploadActionEnum.ELIGIBLE) {
      if (
        current === LoyaltyPointsReleaseTypeEnum.ELIGIBLE ||
        current === LoyaltyPointsReleaseTypeEnum.REDEEMABLE
      ) {
        throwIomError(
          IomErrorCodeEnum.INVALID_STATUS_FOR_ACTION,
          { action: requested, currentState: current },
          'Loyalty points are already marked eligible or redeemed for this IOM.',
        );
      }
      return;
    }

    if (current === LoyaltyPointsReleaseTypeEnum.REDEEMABLE) {
      throwIomError(
        IomErrorCodeEnum.INVALID_STATUS_FOR_ACTION,
        { action: requested, currentState: current },
        'Loyalty points have already been redeemed for this IOM.',
      );
    }
  }

  private async invokePinelabForParticipant(
    api: PineLabsApiName.MARK_ELIGIBLE | PineLabsApiName.REDEEM_POINTS,
    customerId: string,
    points?: number,
    referenceId?: string,
  ): Promise<void> {
    const payload: Record<string, unknown> = { customerId };

    if (api === PineLabsApiName.REDEEM_POINTS) {
      payload.points = points;
      if (referenceId) {
        payload.referenceId = referenceId;
      }
    }

    const result = await this.pineLabsExecutor.execute(api, payload);

    if (!result.success) {
      this.logger.warn(
        `Pinelab ${api} failed for customerId=${customerId}: ${result.error?.message ?? 'unknown error'}`,
      );
      this.throwPinelabUploadError(result);
    }
  }

  private throwPinelabUploadError(result: PineLabsExecutorResult): never {
    throw new HttpException(
      {
        code: 'PINELAB_UPLOAD_FAILED',
        message:
          'Unable to upload loyalty points to Pinelab at this time. Please try again later.',
        correlationId: result.correlationId,
      },
      result.error?.statusCode === 503
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.BAD_GATEWAY,
    );
  }

  private async loadIomOrThrow(id: number): Promise<Iom> {
    const iom = await this.iomRepo
      .createQueryBuilder('iom')
      .leftJoinAndSelect('iom.project', 'project')
      .leftJoinAndSelect('iom.booking', 'booking')
      .where('iom.id = :id', { id })
      .andWhere('iom.deletedAt IS NULL')
      .getOne();

    if (!iom) {
      throwIomError(IomErrorCodeEnum.IOM_NOT_FOUND, { iomId: id });
    }
    return iom as Iom;
  }

  private hasReferrer(iom: Iom): boolean {
    if (iom.referrerMobile?.trim()) {
      return true;
    }
    const details = iom.referrerDetails;
    if (!details || typeof details !== 'object') {
      return false;
    }
    return Object.keys(details).length > 0;
  }
}
