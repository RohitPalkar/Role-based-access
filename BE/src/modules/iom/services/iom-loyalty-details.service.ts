import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Projects } from 'src/entities';
import { PineLabsApiName } from 'src/modules/pine-labs/enums/pine-labs-api-name.enum';
import { PineLabsExecutorService } from 'src/modules/pine-labs/pine-labs-executor.service';
import { PineLabsExecutorResult } from 'src/modules/pine-labs/interfaces/pine-labs.interface';
import { PinelabCustomerService } from 'src/modules/pine-labs/services/pinelab-customer.service';
import { normalizeMobileForLookup } from 'src/modules/pine-labs/utils/normalize-mobile.util';

import { Iom } from '../entities/iom.entity';
import { IomErrorCodeEnum } from '../enums/iom-error-code.enum';
import {
  computeBrokerageSplit,
  pickStringField,
} from '../helpers/iom-pdf-template.mapper';
import { resolveBrandIdFromIom } from '../helpers/resolve-brand-from-iom.helper';
import { mapExtendedParticipantFields } from '../helpers/loyalty-participant.mapper';
import {
  AuthenticatedUser,
  IomValidationService,
} from './iom-validation.service';
import { throwIomError } from '../utils/iom-error.util';
import {
  EMPTY_LOYALTY_ADDRESS,
  LoyaltyDetailsResponse,
  LoyaltyParticipantDetails,
} from '../types/loyalty-details.interface';

interface VerifyParticipantInput {
  storedPinelabCustomerId: string | null;
  mobileNumber: string | null;
  iomName: string | null;
  iomAddress: string | null;
}

interface VerifyParticipantResult {
  pinelabCustomerId: string | null;
  isProfileDataMatching: boolean;
  shouldCreatePinelabProfile: boolean;
}

const EMPTY_PARTICIPANT: LoyaltyParticipantDetails = {
  customerName: null,
  mobileNumber: null,
  projectName: null,
  unitNumber: null,
  pinelabCustomerId: null,
  isProfileDataMatching: false,
  shouldCreatePinelabProfile: false,
  firstName: null,
  lastName: null,
  sfdcId: null,
  gender: null,
  email: null,
  address: { ...EMPTY_LOYALTY_ADDRESS },
  projectName2: null,
  unitNo2: null,
};

@Injectable()
export class IomLoyaltyDetailsService {
  private readonly logger = new Logger(IomLoyaltyDetailsService.name);

  constructor(
    @InjectRepository(Iom)
    private readonly iomRepo: Repository<Iom>,
    @InjectRepository(Projects)
    private readonly projectsRepo: Repository<Projects>,
    private readonly validator: IomValidationService,
    private readonly pineLabsExecutor: PineLabsExecutorService,
    private readonly pinelabCustomerService: PinelabCustomerService,
  ) {}

  async getLoyaltyDetails(
    user: AuthenticatedUser,
    iomId: number,
  ): Promise<LoyaltyDetailsResponse> {
    const iom = await this.loadIomOrThrow(iomId);
    await this.validator.assertProjectAccess(user, iom.projectId);

    const brandId = resolveBrandIdFromIom(iom);

    const customerDetails = (iom.customerDetails ?? {}) as Record<
      string,
      unknown
    >;
    const referrerDetails = (iom.referrerDetails ?? {}) as Record<
      string,
      unknown
    >;

    const hasReferrer = this.hasReferrer(iom);

    const refereeCustomerName =
      pickStringField(customerDetails, 'name', 'customerName', 'fullName') ??
      null;

    const refereeStored =
      await this.pinelabCustomerService.findByBrandAndMobile(
        brandId,
        iom.customerMobile,
      );
    const referrerStored = hasReferrer
      ? await this.pinelabCustomerService.findByBrandAndMobile(
          brandId,
          iom.referrerMobile,
        )
      : null;

    const [refereeVerification, referrerVerification] = await Promise.all([
      this.verifyParticipant({
        storedPinelabCustomerId: refereeStored?.pinelabCustomerId ?? null,
        mobileNumber: iom.customerMobile,
        iomName: refereeCustomerName,
        iomAddress: this.buildAddressFromDetails(customerDetails),
      }),
      hasReferrer
        ? this.verifyParticipant({
            storedPinelabCustomerId: referrerStored?.pinelabCustomerId ?? null,
            mobileNumber: iom.referrerMobile,
            iomName: pickStringField(
              referrerDetails,
              'name',
              'customerName',
              'fullName',
            ),
            iomAddress: this.buildAddressFromDetails(referrerDetails),
          })
        : Promise.resolve<VerifyParticipantResult>({
            pinelabCustomerId: null,
            isProfileDataMatching: false,
            shouldCreatePinelabProfile: false,
          }),
    ]);

    if (refereeVerification.pinelabCustomerId) {
      await this.pinelabCustomerService.upsertCustomerId(
        brandId,
        iom.customerMobile,
        refereeVerification.pinelabCustomerId,
      );
    }
    if (hasReferrer && referrerVerification.pinelabCustomerId) {
      await this.pinelabCustomerService.upsertCustomerId(
        brandId,
        iom.referrerMobile,
        referrerVerification.pinelabCustomerId,
      );
    }

    const { referrerAmount, refereeAmount } = computeBrokerageSplit(iom);
    const referrerProjectName = hasReferrer
      ? await this.resolveReferrerProjectName(
          pickStringField(referrerDetails, 'projectId', 'project_id'),
        )
      : null;

    const refereeExtended = mapExtendedParticipantFields(customerDetails, [
      iom.bpCode,
      iom.booking?.customerCode ?? null,
    ]);
    const referrerExtended = hasReferrer
      ? mapExtendedParticipantFields(referrerDetails)
      : null;

    const refereeUnitNumber =
      iom.unitNumber ??
      iom.booking?.propertyNumber ??
      pickStringField(customerDetails, 'unitNo', 'unit_no');

    return {
      refereeDetails: {
        customerName: refereeCustomerName,
        mobileNumber: iom.customerMobile ?? null,
        projectName: iom.project?.name ?? null,
        unitNumber: refereeUnitNumber,
        pinelabCustomerId: this.resolveDisplayedPinelabCustomerId(
          refereeVerification,
          refereeStored?.pinelabCustomerId ?? null,
        ),
        isProfileDataMatching: refereeVerification.isProfileDataMatching,
        shouldCreatePinelabProfile:
          refereeVerification.shouldCreatePinelabProfile,
        ...refereeExtended,
        projectName2: referrerProjectName,
        unitNo2: pickStringField(referrerDetails, 'unitNo', 'unit_no'),
      },
      referrerDetails: hasReferrer
        ? {
            customerName: pickStringField(
              referrerDetails,
              'name',
              'customerName',
              'fullName',
            ),
            mobileNumber: iom.referrerMobile ?? null,
            projectName: referrerProjectName,
            unitNumber: pickStringField(referrerDetails, 'unitNo', 'unit_no'),
            pinelabCustomerId: this.resolveDisplayedPinelabCustomerId(
              referrerVerification,
              referrerStored?.pinelabCustomerId ?? null,
            ),
            isProfileDataMatching: referrerVerification.isProfileDataMatching,
            shouldCreatePinelabProfile:
              referrerVerification.shouldCreatePinelabProfile,
            ...referrerExtended!,
            projectName2: iom.project?.name ?? null,
            unitNo2: refereeUnitNumber,
          }
        : { ...EMPTY_PARTICIPANT },
      paymentDetails: {
        saleValue: iom.salePrice,
        brokeragePercentage: Number(iom.brokeragePercentage),
        brokerageAmount: iom.totalBrokerageAmount,
        loyaltyPointsAdjustment: iom.referralPointsAdjustment ?? 0,
        pointsForReferee: iom.refereePoints,
        pointsForReferrer: iom.referrerPoints,
        refereePayoutAmount: refereeAmount,
        referrerPayoutAmount: referrerAmount,
      },
    };
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

  private resolveDisplayedPinelabCustomerId(
    verification: VerifyParticipantResult,
    storedPinelabCustomerId: string | null,
  ): string | null {
    if (verification.shouldCreatePinelabProfile) {
      return null;
    }
    return verification.pinelabCustomerId ?? storedPinelabCustomerId;
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

  private async verifyParticipant(
    input: VerifyParticipantInput,
  ): Promise<VerifyParticipantResult> {
    const { storedPinelabCustomerId, mobileNumber } = input;

    if (!storedPinelabCustomerId?.trim() && !mobileNumber?.trim()) {
      return {
        pinelabCustomerId: null,
        isProfileDataMatching: false,
        shouldCreatePinelabProfile: false,
      };
    }

    return this.verifyParticipantViaPinelab(input);
  }

  private async verifyParticipantViaPinelab(
    input: VerifyParticipantInput,
  ): Promise<VerifyParticipantResult> {
    const { storedPinelabCustomerId, mobileNumber, iomName, iomAddress } =
      input;

    const fetchPayload: Record<string, unknown> = {};
    if (storedPinelabCustomerId?.trim()) {
      fetchPayload.customerId = storedPinelabCustomerId.trim();
    } else if (mobileNumber?.trim()) {
      const normalized = normalizeMobileForLookup(mobileNumber);
      if (!normalized) {
        return {
          pinelabCustomerId: null,
          isProfileDataMatching: false,
          shouldCreatePinelabProfile: false,
        };
      }
      fetchPayload.mobileNumber = normalized;
    }

    const result = await this.pineLabsExecutor.execute(
      PineLabsApiName.CUSTOMER_FETCH,
      fetchPayload,
    );

    if (!result.success) {
      if (this.isCustomerNotFound(result)) {
        return {
          pinelabCustomerId: null,
          isProfileDataMatching: false,
          shouldCreatePinelabProfile: true,
        };
      }
      this.throwPinelabIntegrationError(result);
    }

    const customer = this.extractCustomerRecord(result.data);
    if (!customer) {
      return {
        pinelabCustomerId: null,
        isProfileDataMatching: false,
        shouldCreatePinelabProfile: true,
      };
    }

    const pinelabCustomerId = this.extractCustomerId(customer);
    const pinelabName = this.extractCustomerName(customer);
    const pinelabMobile = this.extractCustomerMobile(customer);
    const pinelabAddress = this.extractCustomerAddress(customer);

    const nameMatches = this.fieldsMatch(
      iomName,
      pinelabName,
      this.normalizeName,
    );
    const mobileMatches = this.fieldsMatch(
      mobileNumber,
      pinelabMobile,
      this.normalizeMobile,
    );
    const addressMatches = this.fieldsMatch(
      iomAddress,
      pinelabAddress,
      this.normalizeAddress,
    );

    const isProfileDataMatching =
      nameMatches && mobileMatches && addressMatches;

    return {
      pinelabCustomerId,
      isProfileDataMatching,
      shouldCreatePinelabProfile: false,
    };
  }

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

  private buildAddressFromDetails(
    details: Record<string, unknown>,
  ): string | null {
    const parts = [
      pickStringField(
        details,
        'address',
        'fullAddress',
        'full_address',
        'addressLine1',
        'address_line1',
      ),
      pickStringField(details, 'city'),
      pickStringField(details, 'state'),
      pickStringField(details, 'pincode', 'pinCode', 'postalCode', 'zip'),
    ].filter((part): part is string => Boolean(part));

    return parts.length > 0 ? parts.join(', ') : null;
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

  private throwPinelabIntegrationError(result: PineLabsExecutorResult): never {
    throw new HttpException(
      {
        code: 'PINELAB_INTEGRATION_ERROR',
        message: 'Unable to verify Pinelab customer profile at this time.',
        correlationId: result.correlationId,
      },
      result.error?.statusCode === 503
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.BAD_GATEWAY,
    );
  }

  private extractCustomerRecord(data: unknown): Record<string, unknown> | null {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return null;
    }
    const record = data as Record<string, unknown>;
    if (record.customer && typeof record.customer === 'object') {
      return record.customer as Record<string, unknown>;
    }
    return record;
  }

  private extractCustomerId(customer: Record<string, unknown>): string | null {
    return pickStringField(customer, 'customerId', 'customer_id', 'id');
  }

  private extractCustomerName(
    customer: Record<string, unknown>,
  ): string | null {
    const direct = pickStringField(
      customer,
      'name',
      'customerName',
      'fullName',
      'full_name',
    );
    if (direct) return direct;

    const first = pickStringField(customer, 'firstName', 'first_name');
    const last = pickStringField(customer, 'lastName', 'last_name');
    const combined = [first, last].filter(Boolean).join(' ').trim();
    return combined || null;
  }

  private extractCustomerMobile(
    customer: Record<string, unknown>,
  ): string | null {
    return pickStringField(
      customer,
      'mobile',
      'mobileNumber',
      'mobile_number',
      'phone',
      'phoneNumber',
      'phone_number',
    );
  }

  private extractCustomerAddress(
    customer: Record<string, unknown>,
  ): string | null {
    const direct = pickStringField(
      customer,
      'address',
      'fullAddress',
      'full_address',
    );
    if (direct) return direct;
    return this.buildAddressFromDetails(customer);
  }

  private normalizeName(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private normalizeMobile(value: string): string {
    return value.replace(/\D/g, '');
  }

  private normalizeAddress(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private fieldsMatch(
    iomValue: string | null,
    pinelabValue: string | null,
    normalizer: (value: string) => string,
  ): boolean {
    if (!iomValue?.trim() || !pinelabValue?.trim()) {
      return false;
    }
    return normalizer(iomValue) === normalizer(pinelabValue);
  }
}
