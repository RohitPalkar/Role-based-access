import {
  HttpException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { logger } from 'src/logger/logger';
import {
  VoucherPaymentStatus,
  VoucherFormType,
  VoucherChronologyEnum,
  EOITypeEnum,
  QueueTypeEnum,
  VoucherFormStatusEnum,
  ReasonActorEnum,
  DisplayQueueIdEnum,
  VoucherIdFieldNameEnum,
} from '../enums/eoi-form.enums';
import { VoucherForm } from '../modules/eoi_manager/voucher_forms/entities/voucher_form.entity';
import { MASKING_CHARACTER, MASKED_QUEUE_ID } from 'src/config/constants';
import {
  generateQueueCode,
  generateUniqueReferenceId,
} from 'src/utils/generateRandomNumber';
import {
  PaymentModeEnum,
  PaymentMethodEnum,
  PaymentTxStatusEnum,
} from 'src/enums/payment-status.enum';
import { EoiCampaign } from 'src/entities';
import { VoucherAmountType } from 'src/enums/eoi-form.enums';
import { safeString } from './stringHelper';

export function getVoucherFormUrl(
  voucherId: string,
  configOptions: {
    eoiFormUrl: string;
    voucherFormUrl: string;
    nodeEnv: string;
    formType: string;
  },
): string {
  try {
    const { voucherFormUrl } = configOptions;
    return `${voucherFormUrl}/${voucherId}`;
  } catch (error) {
    logger.error(`Failed to get ${configOptions?.formType} form URL:`, error);
    if (error instanceof HttpException) throw error;
    throw new InternalServerErrorException(
      `Failed to get ${configOptions?.formType} form URL: ${error?.message}`,
    );
  }
}

export function generateVoucherFormUrl(
  voucherId: any,
  configOptions: any,
): string {
  return getVoucherFormUrl(voucherId, configOptions);
}

/**
 * Shared helper function to calculate payment metrics.
 * Centralizes all payment calculations to avoid duplication across services.
 *
 * @param transactions - Array of transactions
 * @param amountPayable - Total amount payable
 * @returns Object containing calculated payment metrics
 */
export function calculatePaymentMetrics(
  transactions: any[],
  amountPayable: number,
  options?: { useRealizedForVerified?: boolean },
): {
  totalPaidAmount: number;
  validPaidAmount: number;
  verifiedAmount: number;
  unverifiedAmount: number;
  isFullyPaidForQueueId: boolean;
  isFullyPaidForStatus: boolean;
  isAllVerified: boolean;
  realizedAmount: number;
} {
  // Single-pass optimization: calculate all metrics in one reduce operation
  const { totalPaidAmount, verifiedAmount, realizedAmount } =
    transactions.reduce(
      (acc, tx) => {
        const amount = Number(tx.paidAmount || 0);

        // Count all paid amounts (verified + unverified)
        if (
          tx.status === PaymentTxStatusEnum.VERIFIED ||
          tx.status === PaymentTxStatusEnum.UNVERIFIED
        ) {
          acc.totalPaidAmount += amount;
        }

        // Count only verified amounts and online payments
        if (options?.useRealizedForVerified) {
          if (tx.status === PaymentTxStatusEnum.VERIFIED) {
            acc.verifiedAmount += amount;
          }
        } else if (
          tx.status === PaymentTxStatusEnum.VERIFIED ||
          (tx.status === PaymentTxStatusEnum.UNVERIFIED &&
            tx.paymentMode === PaymentModeEnum.GATEWAY)
        ) {
          acc.verifiedAmount += amount;
        }

        if (tx.status === PaymentTxStatusEnum.VERIFIED) {
          acc.realizedAmount += amount;
        }

        return acc;
      },
      { totalPaidAmount: 0, verifiedAmount: 0, realizedAmount: 0 },
    );

  // Checks if payment mode is cheque then it should be either less than or equal to 3 months old or tomorrow.
  let validPaidAmount = totalPaidAmount;
  for (const tx of transactions) {
    if (
      tx.paymentMode === PaymentModeEnum.OFFLINE &&
      tx.paymentDetails?.method === PaymentMethodEnum.CHEQUE_DD
    ) {
      const txDate = new Date(tx.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const txDateOnly = new Date(txDate);
      txDateOnly.setHours(0, 0, 0, 0);

      // Check if tx.date is today, tomorrow, or within last 3 months
      const isToday = txDateOnly.getTime() === today.getTime();
      const isTomorrow = txDateOnly.getTime() === tomorrow.getTime();
      const isWithinLast3Months = txDateOnly >= threeMonthsAgo;

      if (!isToday && !isTomorrow && !isWithinLast3Months) {
        validPaidAmount = validPaidAmount - Number(tx.paidAmount || 0);
      }
    }
  }

  const unverifiedAmount = amountPayable - verifiedAmount;
  const isFullyPaidForQueueId = validPaidAmount >= amountPayable; // Checks Verified as well as Unverified transactions to generate queue id
  const isFullyPaidForStatus = totalPaidAmount >= amountPayable; // Checks Verified as well as Unverified transactions to update payment status
  const isAllVerified = unverifiedAmount === 0 || unverifiedAmount < 0; // Checks only Verified transactions

  return {
    totalPaidAmount,
    validPaidAmount,
    verifiedAmount,
    unverifiedAmount,
    isFullyPaidForQueueId,
    isFullyPaidForStatus,
    isAllVerified,
    realizedAmount,
  };
}

/**
 * Shared helper function to determine payment status.
 * Centralizes payment status logic to avoid duplication across services.
 *
 * @param paymentMetrics - Calculated payment metrics
 * @returns Appropriate payment status
 */
export function determinePaymentStatus(paymentMetrics: {
  totalPaidAmount: number;
  isFullyPaidForStatus: boolean;
}): VoucherPaymentStatus {
  if (
    paymentMetrics.totalPaidAmount === 0 ||
    paymentMetrics.totalPaidAmount < 0
  ) {
    return VoucherPaymentStatus.PENDING;
  } else if (paymentMetrics.isFullyPaidForStatus) {
    return VoucherPaymentStatus.PAID;
  } else {
    return VoucherPaymentStatus.PARTIALLY_PAID;
  }
}

/**
 * Shared helper function to validate transaction amounts.
 * Ensures all transaction amounts are positive and reasonable.
 *
 * @param transactions - Array of transactions to validate
 * @throws BadRequestException when transaction amounts are invalid
 */
export function validateTransactionAmounts(transactions: any[]): void {
  for (const tx of transactions) {
    const paidAmount = tx.paidAmount || tx.paid_amount;

    if (!paidAmount || paidAmount <= 0) {
      throw new BadRequestException(
        `Invalid transaction amount: ${paidAmount}. Amount must be positive.`,
      );
    }

    // Additional validation: reasonable amount limit (e.g., 1 crore = 10,000,000)
    if (paidAmount > 10000000) {
      throw new BadRequestException(
        `Transaction amount ${paidAmount} exceeds reasonable limit.`,
      );
    }
  }
}

/**
 * Utility function to determine if queue ID should be generated.
 * Centralizes queue ID generation conditions to avoid duplication.
 *
 * @param voucherForm - The voucher form entity
 * @param paymentMetrics - Calculated payment metrics
 * @returns True if queue ID should be generated
 */
export const shouldGenerateQueueId = (
  voucherForm: VoucherForm,
  paymentMetrics: {
    isFullyPaidForQueueId: boolean;
    isAllVerified: boolean;
  },
): boolean => {
  return voucherForm.campaign.queueAfterVerified
    ? voucherForm.campaign?.id &&
        paymentMetrics.isFullyPaidForQueueId &&
        paymentMetrics.isAllVerified
    : voucherForm.campaign?.id && paymentMetrics.isFullyPaidForQueueId;
};

/**
 * Determines the appropriate chronology for a voucher form based on its current state
 * @param voucherForm - The voucher form entity
 * @returns The appropriate chronology value
 */
export const determineVoucherChronology = (
  voucherForm: VoucherForm,
): VoucherChronologyEnum => {
  const { formPhase, cancelledAt } = voucherForm;

  // Check if voucher is cancelled
  if (cancelledAt) {
    if (formPhase === VoucherFormType.VOUCHER) {
      return VoucherChronologyEnum.V_C; // Voucher form phase to Cancelled
    } else {
      if (voucherForm.paidVoucherId) {
        return VoucherChronologyEnum.V_E_C; // Voucher to EOI to cancelled
      }
      return VoucherChronologyEnum.E_C; // EOI phase to cancelled
    }
  }

  // Check form phase and status
  if (formPhase === VoucherFormType.VOUCHER) {
    return VoucherChronologyEnum.V; // Voucher form Phase
  } else if (formPhase === VoucherFormType.EOI) {
    // Check if this was converted from voucher
    if (voucherForm.paidVoucherId) {
      return VoucherChronologyEnum.V_E; // Voucher form phase to EOI phase
    } else {
      return VoucherChronologyEnum.E; // EOI phase
    }
  }

  // Default fallback
  return VoucherChronologyEnum.V;
};

/**
 * Masks a mobile number by showing first digit and last 4 digits
 * @param mobileNumber - The mobile number to mask
 * @returns Masked mobile number (e.g., "8123456789" -> "8*****6789")
 */
export const maskMobileNumber = (
  mobileNumber: string | null | undefined,
): string | null => {
  if (!mobileNumber || mobileNumber.length < 5) {
    return mobileNumber;
  }

  const firstDigit = mobileNumber[0];
  const lastFourDigits = mobileNumber.slice(-4);
  const middleStars = MASKING_CHARACTER.repeat(
    Math.max(1, mobileNumber.length - 5),
  );

  return `${firstDigit}${middleStars}${lastFourDigits}`;
};

/**
 * Masks an email address by showing first 3 characters and domain
 * @param email - The email address to mask
 * @returns Masked email address (e.g., "charlie@gmail.com" -> "cha*******@gmail.com")
 */
export const maskEmailAddress = (
  email: string | null | undefined,
): string | null => {
  if (!email?.includes('@')) {
    return email;
  }

  const [localPart, domain] = email.split('@');

  if (localPart.length <= 3) {
    return `${localPart[0]}${MASKING_CHARACTER.repeat(localPart.length - 1)}@${domain}`;
  }

  const firstThree = localPart.substring(0, 3);
  const stars = MASKING_CHARACTER.repeat(Math.max(4, localPart.length - 3));

  return `${firstThree}${stars}@${domain}`;
};

/**
 * Queue generation result interface
 */
export interface QueueGenerationResult {
  queueId: string;
  voucherQueueIssuedAt: Date | null;
  eoiQueueIssuedAt: Date | null;
  voucherSequenceId: string | null;
  standardSequenceId: string | null;
  preferentialSequenceId: string | null;
}

/**
 * Queue generation strategy result interface
 */
export interface QueueGenerationStrategyResult {
  generatedQueueId: string;
  queueType: string;
  sequenceIdField: keyof VoucherForm;
}

/**
 * Queue ID generator function type
 */
export type QueueIdGenerator = (
  campaignId: number,
  queueType: QueueTypeEnum,
) => Promise<{ queueId: string }>;

/**
 * Generates and assigns queue ID based on form phase and EOI type.
 * This is a pure function that can be used across all services.
 *
 * @param voucherForm - The voucher form entity to update
 * @param voucherId - The voucher ID for logging purposes
 * @param generateQueueIdFn - Function to generate queue ID (injected dependency)
 * @returns Queue generation result or null if no generation needed
 */
export async function generateAndAssignQueueId(
  voucherForm: VoucherForm,
  voucherId: string,
  generateQueueIdFn: QueueIdGenerator,
): Promise<QueueGenerationResult | null> {
  try {
    const { campaign, formPhase, eoiDetails } = voucherForm;

    // Skip if no campaign
    if (!campaign?.id) {
      logger.info(
        `Skipping queue ID generation for voucher: ${voucherId}. No campaign found.`,
      );
      return null;
    }

    // Determine queue generation strategy based on form phase
    const queueGenerationResult = await determineQueueGenerationStrategy(
      voucherForm,
      voucherId,
      formPhase,
      eoiDetails,
      campaign.id,
      generateQueueIdFn,
    );

    if (!queueGenerationResult) {
      return null; // No queue ID generation needed
    }

    // Assign the generated queue ID and sequence ID
    return assignQueueIdToVoucher(voucherForm, queueGenerationResult);
  } catch (error) {
    logger.error(
      `Failed to generate queue ID for voucher: ${voucherId}`,
      error,
    );
    // Continue with form completion even if queue ID generation fails
    return null;
  }
}

/**
 * Determines the appropriate queue generation strategy based on form phase and EOI type.
 *
 * @param voucherForm - The voucher form entity
 * @param voucherId - The voucher ID for logging
 * @param formPhase - The current form phase
 * @param eoiDetails - EOI details if applicable
 * @param campaignId - The campaign ID
 * @param generateQueueIdFn - Function to generate queue ID
 * @returns Queue generation result or null if no generation needed
 */
async function determineQueueGenerationStrategy(
  voucherForm: VoucherForm,
  voucherId: string,
  formPhase: VoucherFormType,
  eoiDetails: any,
  campaignId: number,
  generateQueueIdFn: QueueIdGenerator,
): Promise<QueueGenerationStrategyResult | null> {
  if (formPhase === VoucherFormType.VOUCHER && !voucherForm.voucherSequenceId) {
    return await generateVoucherQueueId(
      campaignId,
      voucherId,
      generateQueueIdFn,
    );
  }

  if (
    formPhase === VoucherFormType.EOI &&
    eoiDetails?.eoiType &&
    eoiDetails?.eoiType !== EOITypeEnum.VOUCHER
  ) {
    return await generateEoiQueueId(
      voucherForm,
      voucherId,
      eoiDetails,
      campaignId,
      generateQueueIdFn,
    );
  }

  logger.info(
    `Skipping queue ID generation for voucher: ${voucherId}. Form Phase: ${formPhase}, EOI Type: ${eoiDetails?.eoiType}`,
  );
  return null;
}

/**
 * Generates VQI queue ID for voucher phase.
 *
 * @param campaignId - The campaign ID
 * @param voucherId - The voucher ID for logging
 * @param generateQueueIdFn - Function to generate queue ID
 * @returns Queue generation result
 */
async function generateVoucherQueueId(
  campaignId: number,
  voucherId: string,
  generateQueueIdFn: QueueIdGenerator,
): Promise<QueueGenerationStrategyResult> {
  const { queueId: vqiQueueId } = await generateQueueIdFn(
    campaignId,
    QueueTypeEnum.VQI,
  );

  logger.info(
    `Successfully generated VQI queue ID: ${vqiQueueId} for voucher: ${voucherId}`,
  );

  return {
    generatedQueueId: vqiQueueId,
    queueType: QueueTypeEnum.VQI,
    sequenceIdField: 'voucherSequenceId',
  };
}

/**
 * Generates EOI queue ID based on EOI type (Standard or Preferential).
 *
 * @param voucherForm - The voucher form entity
 * @param voucherId - The voucher ID for logging
 * @param eoiDetails - EOI details containing the EOI type
 * @param campaignId - The campaign ID
 * @param generateQueueIdFn - Function to generate queue ID
 * @returns Queue generation result or null if already exists
 */
async function generateEoiQueueId(
  voucherForm: VoucherForm,
  voucherId: string,
  eoiDetails: any,
  campaignId: number,
  generateQueueIdFn: QueueIdGenerator,
): Promise<QueueGenerationStrategyResult | null> {
  const isStandard = eoiDetails.eoiType === EOITypeEnum.STANDARD;
  const eoiType = isStandard ? EOITypeEnum.STANDARD : EOITypeEnum.PREFERENTIAL;

  // Check if queue ID already exists for this EOI type
  if (isEoiQueueIdAlreadyExists(voucherForm, isStandard, voucherId)) {
    return null;
  }

  const queueType = isStandard ? QueueTypeEnum.STD : QueueTypeEnum.PRE;
  const { queueId: eoiQueueId } = await generateQueueIdFn(
    campaignId,
    queueType,
  );

  logger.info(
    `Successfully generated ${eoiType} EOI queue ID: ${eoiQueueId} for voucher: ${voucherId}`,
  );

  return {
    generatedQueueId: eoiQueueId,
    queueType,
    sequenceIdField: isStandard
      ? 'standardSequenceId'
      : 'preferentialSequenceId',
  };
}

/**
 * Checks if EOI queue ID already exists for the given EOI type.
 *
 * @param voucherForm - The voucher form entity
 * @param isStandard - Whether this is a standard EOI type
 * @param voucherId - The voucher ID for logging
 * @returns True if queue ID already exists
 */
function isEoiQueueIdAlreadyExists(
  voucherForm: VoucherForm,
  isStandard: boolean,
  voucherId: string,
): boolean {
  if (isStandard && voucherForm.standardSequenceId) {
    logger.info(
      `Skipping Standard EOI queue ID generation for voucher: ${voucherId}. Already has standardSequenceId: ${voucherForm.standardSequenceId}`,
    );
    return true;
  }

  if (!isStandard && voucherForm.preferentialSequenceId) {
    logger.info(
      `Skipping Preferential EOI queue ID generation for voucher: ${voucherId}. Already has preferentialSequenceId: ${voucherForm.preferentialSequenceId}`,
    );
    return true;
  }

  return false;
}

/**
 * Assigns the generated queue ID to the voucher form and returns the result.
 *
 * @param voucherForm - The voucher form entity to update
 * @param queueResult - The queue generation result
 * @returns The assignment result with all relevant fields
 */
function assignQueueIdToVoucher(
  voucherForm: VoucherForm,
  queueResult: QueueGenerationStrategyResult,
): QueueGenerationResult {
  const { generatedQueueId, queueType, sequenceIdField } = queueResult;

  // Assign the generated queue ID and sequence ID
  voucherForm.queueId = generateQueueCode(
    queueType?.slice(0, 1),
    generatedQueueId,
  );
  (voucherForm as any)[sequenceIdField] = generatedQueueId;

  // Set appropriate issued date based on queue type
  if (queueType === QueueTypeEnum.VQI) {
    voucherForm.voucherQueueIssuedAt = new Date();
  } else {
    voucherForm.eoiQueueIssuedAt = new Date();
  }

  return {
    queueId: voucherForm.queueId,
    voucherQueueIssuedAt: voucherForm.voucherQueueIssuedAt,
    eoiQueueIssuedAt: voucherForm.eoiQueueIssuedAt,
    voucherSequenceId: voucherForm.voucherSequenceId,
    standardSequenceId: voucherForm.standardSequenceId,
    preferentialSequenceId: voucherForm.preferentialSequenceId,
  };
}

/**
 * Build cancellation update fields and resulting chronology.
 * Centralizes shared logic between requestCancellation and cancelEOI flows.
 */
export function buildCancellationUpdate(
  voucherForm: VoucherForm,
  options: {
    status: VoucherFormStatusEnum;
    cancelReason: string;
    cancelledBy?: number | null;
    reasonActor?: ReasonActorEnum;
  },
): {
  updateFields: Partial<VoucherForm>;
  newChronology: VoucherChronologyEnum;
} {
  const existingReasons = ((voucherForm as any)?.cancelReason || {}) as Record<
    string,
    any
  >;
  const reasonActor = options.reasonActor || ReasonActorEnum.CUSTOMER;
  const reasonKey =
    reasonActor === ReasonActorEnum.RM ? 'rmReason' : 'customerReason';
  const newCancelReason = {
    ...existingReasons,
    [reasonKey]: options.cancelReason,
  };

  const baseUpdate: Partial<VoucherForm> = {
    voucherFormStatus: options.status,
    cancelReason: newCancelReason as any,
    cancelledAt: new Date(),
  };

  if (options.cancelledBy) {
    (baseUpdate as any).cancelledBy = options.cancelledBy;
  }

  const updatedPreview: VoucherForm = {
    ...voucherForm,
    ...baseUpdate,
  } as VoucherForm;

  const newChronology = determineVoucherChronology(updatedPreview);
  return {
    updateFields: { ...baseUpdate, chronology: newChronology },
    newChronology,
  };
}

/**
 * Determines the voucher queue ID to display based on campaign display settings and payment status.
 * Handles three display modes: ONLINE, ALL, and NONE (default).
 *
 * @param voucherForm - The voucher form entity with campaign and queueId
 * @param paymentMetrics - Payment metrics containing verification and payment status flags
 * @param financeStatus - The finance status of the voucher (string)
 * @returns The queue ID to display (may be masked, original, or null)
 */
export function determineVoucherQueueId(
  voucherForm: VoucherForm,
  paymentMetrics: {
    isAllVerified: boolean;
    isFullyPaidForQueueId: boolean;
  },
  financeStatus: string,
): string | null {
  const displayQueueId = voucherForm?.campaign?.displayQueueId;
  const queueId = voucherForm.queueId;

  // ONLINE mode: Show queue ID only when all payments are verified
  if (displayQueueId === DisplayQueueIdEnum.ONLINE) {
    if (paymentMetrics.isAllVerified) {
      return queueId;
    }
    // If queueId exists but not all verified, mask it
    return queueId ? MASKED_QUEUE_ID : null;
  }

  // ALL mode: Show queue ID only when fully paid
  if (displayQueueId === DisplayQueueIdEnum.ALL) {
    if (paymentMetrics.isFullyPaidForQueueId) {
      return queueId;
    }
    // If queueId exists but not fully paid, mask it
    return queueId ? MASKED_QUEUE_ID : null;
  }

  // NONE mode (default): Mask queue ID if finance status is unverified
  if (financeStatus === PaymentTxStatusEnum.UNVERIFIED) {
    return queueId ? MASKED_QUEUE_ID : null;
  }

  // Otherwise, return the queueId as-is or null
  return queueId || null;
}

/**
 * Converts a number to short form (Cr, L, K format)
 * @param num - The number to convert (can be number or string)
 * @returns Formatted string (e.g., "1.50 Cr", "25.00 L", "5.00 K", or "-" for null/undefined/empty)
 */
export function convertNumberToShortForm(num: number | string): string {
  if (num === null || num === undefined || num === '') return '-';

  const value = typeof num === 'string' ? Number.parseFloat(num) : num;

  if (value >= 1e7) return `${(value / 1e7).toFixed(2)} Cr`;

  if (value >= 1e5) return `${(value / 1e5).toFixed(2)} L`;

  if (value >= 1e3) return `${(value / 1e3).toFixed(2)} K`;

  return value.toString();
}

/**
 * Helper function to generate paid voucher ID/EOI ID and increment campaign counter.
 * Creates unique IDs based on voucher phase:
 * - VOUCHER phase: generates paidVoucherId using voucherIdInitials and voucherIdCounter
 * - EOI phase (STANDARD): generates stdEoiId using stdEoiInitials and stdEoiCounter
 * - EOI phase (PREFERENTIAL): generates preEoiId using preEoiInitials and preEoiCounter
 * Also increments the appropriate counter on the campaign entity.
 *
 * @param voucherForm - The voucher form entity containing phase and EOI type information
 * @param campaign - The campaign entity containing counter information
 * @returns Object with field name and generated ID value
 */
export function generatePaidVoucherId(
  voucherForm: VoucherForm,
  campaign: EoiCampaign,
): { fieldName: VoucherIdFieldNameEnum; value: string } {
  if (voucherForm.formPhase === VoucherFormType.EOI) {
    const eoiType = voucherForm.eoiDetails?.eoiType;

    if (eoiType === EOITypeEnum.STANDARD) {
      campaign.stdEoiCounter = (campaign.stdEoiCounter || 0) + 1;
      const stdEoiId = generateUniqueReferenceId(
        campaign.stdEoiInitials,
        campaign.stdEoiCounter,
      );
      return { fieldName: VoucherIdFieldNameEnum.STD_EOI_ID, value: stdEoiId };
    }

    if (eoiType === EOITypeEnum.PREFERENTIAL) {
      campaign.preEoiCounter = (campaign.preEoiCounter || 0) + 1;
      const preEoiId = generateUniqueReferenceId(
        campaign.preEoiInitials,
        campaign.preEoiCounter,
      );
      return { fieldName: VoucherIdFieldNameEnum.PRE_EOI_ID, value: preEoiId };
    }
  }

  campaign.voucherIdCounter = (campaign.voucherIdCounter || 0) + 1;
  const paidVoucherId = generateUniqueReferenceId(
    campaign.voucherIdInitials,
    campaign.voucherIdCounter,
  );
  return {
    fieldName: VoucherIdFieldNameEnum.PAID_VOUCHER_ID,
    value: paidVoucherId,
  };
}

/**
 * Helper function to check if a voucher ID should be generated based on payment status and existing IDs.
 *
 * @param voucherForm - The voucher form entity
 * @param isFullyPaid - Whether the voucher is fully paid (from payment metrics or payment status)
 * @returns True if ID should be generated, false otherwise
 */
export function shouldGenerateVoucherId(
  voucherForm: VoucherForm,
  isFullyPaid: boolean,
): boolean {
  if (!isFullyPaid) {
    return false;
  }

  return (
    (voucherForm.formPhase === VoucherFormType.VOUCHER &&
      !voucherForm.paidVoucherId) ||
    (voucherForm.formPhase === VoucherFormType.EOI &&
      voucherForm.eoiDetails?.eoiType === EOITypeEnum.STANDARD &&
      !voucherForm.stdEoiId) ||
    (voucherForm.formPhase === VoucherFormType.EOI &&
      voucherForm.eoiDetails?.eoiType === EOITypeEnum.PREFERENTIAL &&
      !voucherForm.preEoiId)
  );
}

/**
 * Helper function to generate, assign, and process voucher/EOI ID.
 * This function handles the common logic for ID generation across different services:
 * - Generates the appropriate ID (paidVoucherId, stdEoiId, or preEoiId)
 * - Assigns it to the voucher form
 * - Sends email notification (via callback)
 * - Sets the appropriate issued date
 *
 * @param voucherForm - The voucher form entity
 * @param campaign - The campaign entity
 * @param sendEmailCallback - Optional callback function to send email notification
 * @returns True if ID was generated and assigned, false otherwise
 */
export function generateAndAssignVoucherId(
  voucherForm: VoucherForm,
  campaign: EoiCampaign,
  sendEmailCallback?: (
    voucherForm: VoucherForm,
    id: string,
  ) => Promise<void> | void,
): boolean {
  const { fieldName, value } = generatePaidVoucherId(voucherForm, campaign);

  // Assign the generated ID to the appropriate field
  if (fieldName === VoucherIdFieldNameEnum.PAID_VOUCHER_ID) {
    voucherForm.paidVoucherId = value;
  } else if (fieldName === VoucherIdFieldNameEnum.STD_EOI_ID) {
    voucherForm.stdEoiId = value;
  } else if (fieldName === VoucherIdFieldNameEnum.PRE_EOI_ID) {
    voucherForm.preEoiId = value;
  }

  // Send email notification if callback is provided
  if (value && sendEmailCallback) {
    try {
      const result = sendEmailCallback(voucherForm, value);
      if (result instanceof Promise) {
        result.catch((error) => {
          logger.error('Failed to send voucher ID assignment email', error);
        });
      }
    } catch (error) {
      logger.error('Failed to send voucher ID assignment email', error);
    }
  }

  // Set the appropriate issued date
  if (voucherForm.formPhase === VoucherFormType.VOUCHER) {
    voucherForm.voucherIssuedAt = new Date();
  } else if (
    voucherForm.formPhase === VoucherFormType.EOI &&
    voucherForm.eoiDetails?.eoiType === EOITypeEnum.STANDARD
  ) {
    voucherForm.stdEoiIssuedAt = new Date();
  } else if (
    voucherForm.formPhase === VoucherFormType.EOI &&
    voucherForm.eoiDetails?.eoiType === EOITypeEnum.PREFERENTIAL
  ) {
    voucherForm.preEoiIssuedAt = new Date();
  }

  return true;
}

/**
 * Returns the correct Terms & Conditions content based on the current form phase.
 * Shared helper so both voucher-forms and EOI management can use the same logic.
 */
export function getTermsAndCondition(
  formPhase: VoucherFormType | undefined,
  campaign: EoiCampaign | null | undefined,
): string | null {
  return formPhase === VoucherFormType.EOI
    ? (campaign?.eoiTermsAndCondition ?? null)
    : (campaign?.voucherTermsAndCondition ?? null);
}

/**
 * Validates that payments have unique transactionNumber and chequeNumber values.
 * Throws BadRequestException if duplicates are found.
 *
 * @param payments - Array of payment objects
 * @throws BadRequestException when duplicate transactionNumber or chequeNumber is found
 */
/**
 * Extracts gateway payment IDs from existing gateway transactions
 */
function extractGatewayPaymentIds(existingGatewayTx: any[]): Set<string> {
  const gatewayPaymentIds = new Set<string>();
  if (!existingGatewayTx || existingGatewayTx.length === 0) {
    return gatewayPaymentIds;
  }

  for (const gatewayTx of existingGatewayTx) {
    const gatewayPaymentId = gatewayTx.paymentDetails?.gatewayPaymentId?.trim();
    if (gatewayPaymentId) {
      gatewayPaymentIds.add(gatewayPaymentId);
    }
  }
  return gatewayPaymentIds;
}

/**
 * Validates a transaction number for duplicates and conflicts
 */
function validateTransactionNumber(
  transactionNumber: string,
  seenNumbers: Map<string, number>,
  existingGatewayPaymentIds: Set<string>,
  index: number,
): void {
  if (
    seenNumbers.has(transactionNumber) ||
    existingGatewayPaymentIds.has(transactionNumber)
  ) {
    throw new BadRequestException(
      `Duplicate Transaction ID detected. Enter unique ID`,
    );
  }
  seenNumbers.set(transactionNumber, index);
}

/**
 * Validates a cheque number for duplicates and conflicts
 */
function validateChequeNumber(
  chequeNumber: string,
  seenNumbers: Map<string, number>,
  existingGatewayPaymentIds: Set<string>,
  index: number,
): void {
  if (
    seenNumbers.has(chequeNumber) ||
    existingGatewayPaymentIds.has(chequeNumber)
  ) {
    throw new BadRequestException(
      `Duplicate Transaction ID detected. Enter unique ID`,
    );
  }
  seenNumbers.set(chequeNumber, index);
}

export function validatePaymentUniqueness(
  payments: any[],
  existingGatewayTx: any[] = [],
): void {
  if (!payments || payments.length === 0) {
    return;
  }

  const seenTransactionNumbers = new Map<string, number>();
  const seenChequeNumbers = new Map<string, number>();
  const existingGatewayPaymentIds = extractGatewayPaymentIds(existingGatewayTx);

  for (let i = 0; i < payments.length; i++) {
    const payment = payments[i];
    const paymentDetails = payment.paymentDetails || {};
    const transactionNumber = paymentDetails.transactionNumber?.trim();
    const chequeNumber = paymentDetails.chequeNumber?.trim();

    if (transactionNumber) {
      validateTransactionNumber(
        transactionNumber,
        seenTransactionNumbers,
        existingGatewayPaymentIds,
        i,
      );
    }

    if (chequeNumber) {
      validateChequeNumber(
        chequeNumber,
        seenChequeNumbers,
        existingGatewayPaymentIds,
        i,
      );
    }
  }
}

// ─── PE-476: Tier-based threshold ID assignment ─────────────────────────────
// Wired from: VoucherFormsService.applyPostPaymentBusinessRules, PaymentsService.recalculateVoucherAfterPayment,
// EoiManagementService.prepareVoucherUpdate. Entry points: PATCH /vouchers/update-payment-details,
// payment webhooks → markPaymentSuccess, PATCH /eoi-management/update-voucher-details.

export interface TierThresholds {
  voucher: number | null;
  standard: number | null;
  preferential: number | null;
}

export interface ExistingIds {
  paidVoucherId: string | null;
  stdEoiId: string | null;
  preEoiId: string | null;
}

export const TIER_CONFIG = [
  {
    tier: VoucherIdFieldNameEnum.PRE_EOI_ID,
    thresholdKey: 'preferential' as const,
    existingKey: 'preEoiId' as const,
    requiredPhase: VoucherFormType.EOI,
    queueType: QueueTypeEnum.PRE,
    sequenceField: 'preferentialSequenceId' as const,
    issuedAtField: 'preEoiIssuedAt' as const,
    counterField: 'preEoiCounter' as const,
    initialsField: 'preEoiInitials' as const,
  },
  {
    tier: VoucherIdFieldNameEnum.STD_EOI_ID,
    thresholdKey: 'standard' as const,
    existingKey: 'stdEoiId' as const,
    requiredPhase: VoucherFormType.EOI,
    queueType: QueueTypeEnum.STD,
    sequenceField: 'standardSequenceId' as const,
    issuedAtField: 'stdEoiIssuedAt' as const,
    counterField: 'stdEoiCounter' as const,
    initialsField: 'stdEoiInitials' as const,
  },
  {
    tier: VoucherIdFieldNameEnum.PAID_VOUCHER_ID,
    thresholdKey: 'voucher' as const,
    existingKey: 'paidVoucherId' as const,
    requiredPhase: VoucherFormType.VOUCHER,
    queueType: QueueTypeEnum.VQI,
    sequenceField: 'voucherSequenceId' as const,
    issuedAtField: 'voucherIssuedAt' as const,
    counterField: 'voucherIdCounter' as const,
    initialsField: 'voucherIdInitials' as const,
  },
] as const;

const TIER_RANK: Record<VoucherIdFieldNameEnum, number> = {
  [VoucherIdFieldNameEnum.PAID_VOUCHER_ID]: 1,
  [VoucherIdFieldNameEnum.STD_EOI_ID]: 2,
  [VoucherIdFieldNameEnum.PRE_EOI_ID]: 3,
};

/**
 * Resolves the effective threshold amounts for each tier from a campaign,
 * handling both Fixed and BHK Wise amount types.
 *
 * For BHK Wise: matches voucherForm.eoiDetails.typology against
 * campaign.inventoryDetails[].type to find the per-BHK amounts.
 */
export function resolveThresholds(
  campaign: EoiCampaign,
  voucherForm: VoucherForm,
  unitType?: string,
): TierThresholds {
  let typology = voucherForm.eoiDetails?.typology;
  if (unitType) typology = unitType; // Override with provided unitType if given (used in EOI management where typology is not on voucherForm)

  const inventoryRow = typology
    ? campaign.inventoryDetails?.find((row) => row.type === typology)
    : null;

  return {
    voucher: resolveOneThreshold(
      campaign.voucherAmountType,
      campaign.voucherAmount,
      inventoryRow?.voucherAmt,
    ),
    standard: resolveOneThreshold(
      campaign.stdEoiAmountType,
      campaign.stdEoiAmount,
      inventoryRow?.standardEOIAmt,
    ),
    preferential: resolveOneThreshold(
      campaign.preEoiAmountType,
      campaign.preEoiAmount,
      inventoryRow?.preferentialEOIAmt,
    ),
  };
}

function resolveOneThreshold(
  amountType: string | null | undefined,
  fixedAmount: number | null | undefined,
  bhkAmount: number | null | undefined,
): number | null {
  if (!amountType) return fixedAmount ? Number(fixedAmount) : null;
  if (amountType === VoucherAmountType.BHK_WISE) {
    return bhkAmount !== null && bhkAmount !== undefined
      ? Number(bhkAmount)
      : null;
  }
  return fixedAmount !== null && fixedAmount !== undefined
    ? Number(fixedAmount)
    : null;
}

/**
 * Gates std/pre ID assignment against `campaign.eoiType` (DB: `eoi_type`).
 *
 * In practice: only **Standard** and/or **Preferential** should appear — clients should not send
 * Voucher here (even if the enum allows it). When `phase` is voucher-only, `eoiType` is **null**;
 * once EOI is in `phase`, this array should be set and lists which EOI flavours are on offer.
 *
 * Null/empty → we don't filter (legacy rows / defensive); otherwise Std tier needs Standard,
 * Pref tier needs Preferential.
 */
function isCampaignOfferingEoiTier(
  tier: VoucherIdFieldNameEnum,
  campaignEoiTypes: EOITypeEnum[] | null | undefined,
): boolean {
  if (tier === VoucherIdFieldNameEnum.PAID_VOUCHER_ID) {
    return true;
  }
  if (!campaignEoiTypes || campaignEoiTypes.length === 0) {
    return true;
  }
  if (tier === VoucherIdFieldNameEnum.STD_EOI_ID) {
    return campaignEoiTypes.includes(EOITypeEnum.STANDARD);
  }
  if (tier === VoucherIdFieldNameEnum.PRE_EOI_ID) {
    return campaignEoiTypes.includes(EOITypeEnum.PREFERENTIAL);
  }
  return true;
}

function getHighestExistingTierRank(existingIds: ExistingIds): number {
  return Math.max(
    existingIds.paidVoucherId
      ? TIER_RANK[VoucherIdFieldNameEnum.PAID_VOUCHER_ID]
      : 0,
    existingIds.stdEoiId ? TIER_RANK[VoucherIdFieldNameEnum.STD_EOI_ID] : 0,
    existingIds.preEoiId ? TIER_RANK[VoucherIdFieldNameEnum.PRE_EOI_ID] : 0,
  );
}

function isTierPhaseLive(
  requiredPhase: VoucherFormType,
  livePhases: VoucherFormType[],
): boolean {
  if (requiredPhase === VoucherFormType.VOUCHER) {
    return (
      livePhases.includes(VoucherFormType.VOUCHER) ||
      livePhases.includes(VoucherFormType.EOI)
    );
  }
  return livePhases.includes(VoucherFormType.EOI);
}

function canAssignTierForEvent(
  config: (typeof TIER_CONFIG)[number],
  thresholds: TierThresholds,
  cumulativePaid: number,
  existingIds: ExistingIds,
  livePhases: VoucherFormType[],
  campaignEoiTypes?: EOITypeEnum[] | null,
): boolean {
  const threshold = thresholds[config.thresholdKey];
  if (threshold == null) return false;
  if (cumulativePaid < threshold) return false;
  if (!isTierPhaseLive(config.requiredPhase, livePhases)) return false;
  return isCampaignOfferingEoiTier(config.tier, campaignEoiTypes);
}

export function mergeEoiDetailsWithoutDowngrade(
  existingEoiDetails: Record<string, any> | null | undefined,
  incomingEoiDetails: Record<string, any> | null | undefined,
): Record<string, any> {
  const mergedEoiDetails = {
    ...(existingEoiDetails || {}),
    ...(incomingEoiDetails || {}),
  };

  const currentEoiType = existingEoiDetails?.eoiType as EOITypeEnum | undefined;
  const mergedEoiType = mergedEoiDetails?.eoiType as EOITypeEnum | undefined;
  const currentRank = currentEoiType
    ? (EOI_TYPE_RANK[currentEoiType] ?? -1)
    : -1;
  const mergedRank = mergedEoiType ? (EOI_TYPE_RANK[mergedEoiType] ?? -1) : -1;

  if (mergedRank < currentRank) {
    mergedEoiDetails.eoiType = currentEoiType;
  }

  return mergedEoiDetails;
}

/**
 * Determines which single ID (if any) should be assigned for this payment event.
 * Returns the highest newly-crossed threshold whose phase is live, or null.
 */
export function computeIdToAssign(
  thresholds: TierThresholds,
  cumulativePaid: number,
  existingIds: ExistingIds,
  livePhases: VoucherFormType[],
  campaignEoiTypes?: EOITypeEnum[] | null,
): (typeof TIER_CONFIG)[number] | null {
  const highestExistingTierRank = getHighestExistingTierRank(existingIds);

  // TIER_CONFIG is ordered Pref → Std → Voucher, so first hit = highest tier we still owe this event.
  for (const config of TIER_CONFIG) {
    const configRank = TIER_RANK[config.tier];
    // Once a higher tier already exists on record, lower tiers remain permanently skipped.
    if (configRank < highestExistingTierRank) continue;
    // Do not re-generate a tier ID that already exists.
    if (existingIds[config.existingKey]) continue;
    if (
      !canAssignTierForEvent(
        config,
        thresholds,
        cumulativePaid,
        existingIds,
        livePhases,
        campaignEoiTypes,
      )
    ) {
      continue;
    }

    return config;
  }
  return null;
}

/**
 * Reconciles already-assigned tier IDs against current paid eligibility.
 * Used by update-transaction flows where status changes can drop a voucher below
 * previously assigned tiers (Rejected/Not Realized).
 *
 * - Clears IDs/sequences for tiers above the currently eligible one
 * - Clears queueId when no tier remains eligible
 */
export function reconcileTierIdsForCurrentEligibility(
  voucherForm: VoucherForm,
  campaign: EoiCampaign,
  validPaidAmount: number,
): { eligibleTier: VoucherIdFieldNameEnum | null; idsCleared: boolean } {
  const thresholds = resolveThresholds(campaign, voucherForm);
  const existingIds: ExistingIds = {
    paidVoucherId: voucherForm.paidVoucherId || null,
    stdEoiId: voucherForm.stdEoiId || null,
    preEoiId: voucherForm.preEoiId || null,
  };
  const livePhases = campaign.phase || [];

  let eligibleTier: VoucherIdFieldNameEnum | null = null;
  for (const config of TIER_CONFIG) {
    if (
      canAssignTierForEvent(
        config,
        thresholds,
        validPaidAmount,
        existingIds,
        livePhases,
        campaign.eoiType,
      )
    ) {
      eligibleTier = config.tier;
      break;
    }
  }

  const eligibleRank = eligibleTier ? TIER_RANK[eligibleTier] : 0;
  let idsCleared = false;

  for (const config of TIER_CONFIG) {
    const rank = TIER_RANK[config.tier];
    if (rank <= eligibleRank) continue;

    const idField = config.existingKey as keyof VoucherForm;
    const sequenceField = config.sequenceField as keyof VoucherForm;
    const issuedAtField = config.issuedAtField as keyof VoucherForm;

    if (voucherForm[idField]) {
      (voucherForm as any)[idField] = null;
      idsCleared = true;
    }
    if (voucherForm[sequenceField]) {
      (voucherForm as any)[sequenceField] = null;
      idsCleared = true;
    }
    if (voucherForm[issuedAtField]) {
      (voucherForm as any)[issuedAtField] = null;
      idsCleared = true;
    }
  }

  if (!eligibleTier) {
    voucherForm.queueId = null;
    voucherForm.voucherQueueIssuedAt = null;
    voucherForm.eoiQueueIssuedAt = null;
  }

  return { eligibleTier, idsCleared };
}

/**
 * Applies amountPayable from the assigned tier threshold and recomputes metrics.
 * Shared by RM/customer/gateway flows after `resolveAndAssignTieredId`.
 *
 * @returns Recomputed metrics when `tierConfig` exists; otherwise `null`.
 */
export function applyAssignedTierThresholdAmountAndRecomputeMetrics(
  voucherForm: VoucherForm,
  campaign: EoiCampaign,
  tierConfig: { thresholdKey: keyof TierThresholds } | null,
  transactions: any[],
  options?: { useRealizedForVerified?: boolean },
): ReturnType<typeof calculatePaymentMetrics> | null {
  if (!tierConfig) return null;

  if (!voucherForm.paymentDetails) {
    voucherForm.paymentDetails = {
      amountPayable: 0,
      totalAmountPaid: 0,
    };
  }

  const thresholds = resolveThresholds(campaign, voucherForm);
  const nextAmountPayable = Math.max(
    Number(voucherForm.paymentDetails?.amountPayable ?? 0),
    Number(thresholds[tierConfig.thresholdKey] ?? 0),
  );
  voucherForm.paymentDetails = {
    ...voucherForm.paymentDetails,
    amountPayable: Number(nextAmountPayable),
  };

  const recomputedMetrics = calculatePaymentMetrics(
    transactions,
    Number(voucherForm.paymentDetails?.amountPayable || 0),
    options,
  );
  voucherForm.paymentDetails.totalAmountPaid =
    recomputedMetrics.totalPaidAmount;
  return recomputedMetrics;
}

/**
 * When a new tier ID is assigned after payment, force the form back to
 * "Form Submitted" so MIS/CRM can re-verify the updated financial state.
 */
export function markFormSubmittedOnTierChange(
  voucherForm: VoucherForm,
  tierConfig: any,
): void {
  if (!tierConfig) return;

  const isTierChange =
    tierConfig.tier === 'stdEoiId' || tierConfig.tier === 'preEoiId';

  const isAllowedStatus =
    voucherForm.voucherFormStatus === VoucherFormStatusEnum.ACTIVE;

  if (
    isTierChange &&
    isAllowedStatus &&
    voucherForm.voucherFormStatus !== VoucherFormStatusEnum.UNVERIFIED
  ) {
    voucherForm.voucherFormStatus = VoucherFormStatusEnum.UNVERIFIED;
    voucherForm.submittedAt = new Date();
  }
}

const TIER_TO_EOI_TYPE: Record<string, EOITypeEnum> = {
  [VoucherIdFieldNameEnum.PAID_VOUCHER_ID]: EOITypeEnum.VOUCHER,
  [VoucherIdFieldNameEnum.STD_EOI_ID]: EOITypeEnum.STANDARD,
  [VoucherIdFieldNameEnum.PRE_EOI_ID]: EOITypeEnum.PREFERENTIAL,
};

const EOI_TYPE_RANK: Record<string, number> = {
  [EOITypeEnum.VOUCHER]: 0,
  [EOITypeEnum.STANDARD]: 1,
  [EOITypeEnum.PREFERENTIAL]: 2,
};

/**
 * Upgrades eoiDetails.eoiType if the assigned tier maps to a higher type
 * than the current value. Never downgrades.
 */
function upgradeEoiType(
  voucherForm: VoucherForm,
  assignedTier: VoucherIdFieldNameEnum,
): void {
  const targetType = TIER_TO_EOI_TYPE[assignedTier];
  if (!targetType) return;

  const currentType = voucherForm.eoiDetails?.eoiType;
  const currentRank = currentType ? (EOI_TYPE_RANK[currentType] ?? -1) : -1;
  const targetRank = EOI_TYPE_RANK[targetType] ?? -1;

  if (targetRank > currentRank && voucherForm.eoiDetails) {
    voucherForm.eoiDetails.eoiType = targetType;
  }
}

/**
 * Determines the minimum EOI type that the assigned tier must meet
 * for chronology to be set/updated. Returns true if the assigned
 * tier is >= the customer's selected eoiType.
 */
function shouldUpdateChronology(
  assignedTier: VoucherIdFieldNameEnum,
  selectedEoiType: string | undefined,
): boolean {
  if (!selectedEoiType || selectedEoiType === EOITypeEnum.VOUCHER) {
    return true;
  }
  if (selectedEoiType === EOITypeEnum.STANDARD) {
    return (
      assignedTier === VoucherIdFieldNameEnum.STD_EOI_ID ||
      assignedTier === VoucherIdFieldNameEnum.PRE_EOI_ID
    );
  }
  if (selectedEoiType === EOITypeEnum.PREFERENTIAL) {
    return assignedTier === VoucherIdFieldNameEnum.PRE_EOI_ID;
  }
  return true;
}

/**
 * All-in-one: resolves thresholds, determines the tier, generates & assigns
 * the ID, upgrades formPhase, updates chronology, and returns the tier config
 * so the caller can also generate the matching queue ID.
 *
 * Returns the matched tier config if an ID was assigned, or null.
 */
export async function resolveAndAssignTieredId(
  voucherForm: VoucherForm,
  campaign: EoiCampaign,
  validPaidAmount: number,
  sendEmailCallback?: (
    voucherForm: VoucherForm,
    id: string,
  ) => Promise<void> | void,
  // Optional callback to atomically allocate the next counter via DB (prevents duplicate IDs under concurrency)
  allocateCounterCallback?: (
    counterField: keyof EoiCampaign,
  ) => Promise<number> | number,
): Promise<(typeof TIER_CONFIG)[number] | null> {
  // Thresholds are resolved dynamically (fixed vs BHK-wise) for this voucher/campaign combo.
  const thresholds = resolveThresholds(campaign, voucherForm);
  const existingIds: ExistingIds = {
    paidVoucherId: safeString(voucherForm.paidVoucherId, null),
    stdEoiId: safeString(voucherForm.stdEoiId, null),
    preEoiId: safeString(voucherForm.preEoiId, null),
  };
  // Only live phases are eligible right now; non-live tiers are intentionally ignored.
  const livePhases = campaign.phase || [];

  // Picks exactly one tier: the highest newly crossed tier for this payment event.
  const tierConfig = computeIdToAssign(
    thresholds,
    validPaidAmount,
    existingIds,
    livePhases,
    campaign.eoiType,
  );
  if (!tierConfig) return null;

  const counterKey = tierConfig.counterField as keyof EoiCampaign;
  // Use atomic DB increment when callback is provided; fall back to in-memory increment otherwise
  const nextCounter = allocateCounterCallback
    ? await allocateCounterCallback(counterKey)
    : ((campaign as any)[counterKey] || 0) + 1;
  // Sync in-memory campaign object with the allocated counter value
  (campaign as any)[counterKey] = nextCounter;
  const generatedId = generateUniqueReferenceId(
    (campaign as any)[tierConfig.initialsField],
    nextCounter,
  );

  // Store generated tier ID + issuance timestamp on the corresponding fields.
  (voucherForm as any)[tierConfig.existingKey] = generatedId;
  (voucherForm as any)[tierConfig.issuedAtField] = new Date();

  if (
    tierConfig.tier === VoucherIdFieldNameEnum.STD_EOI_ID ||
    tierConfig.tier === VoucherIdFieldNameEnum.PRE_EOI_ID
  ) {
    if (voucherForm.formPhase === VoucherFormType.VOUCHER) {
      voucherForm.formPhase = VoucherFormType.EOI;
    }
  }

  // Keep old selected type for chronology check; upgrade call below may mutate eoiType.
  const selectedEoiType = voucherForm.eoiDetails?.eoiType;
  // eoiType only moves forward (Voucher -> Standard -> Preferential), never backwards.
  upgradeEoiType(voucherForm, tierConfig.tier);

  if (shouldUpdateChronology(tierConfig.tier, selectedEoiType)) {
    voucherForm.chronology = determineVoucherChronology(voucherForm);
  }

  if (generatedId && sendEmailCallback) {
    try {
      // Callback can be sync or async based on caller implementation.
      const result = sendEmailCallback(voucherForm, generatedId);
      if (result instanceof Promise) {
        // Email failure should not fail voucher update; log and continue.
        result.catch((error) => {
          logger.error('Failed to send voucher ID assignment email', error);
        });
      }
    } catch (error) {
      logger.error('Failed to send voucher ID assignment email', error);
    }
  }

  return tierConfig;
}

/**
 * Generates and assigns queue ID based on the tier that was just assigned.
 * Derives queue type from tierConfig instead of formPhase/eoiType.
 */
export async function generateAndAssignTieredQueueId(
  voucherForm: VoucherForm,
  tierConfig: (typeof TIER_CONFIG)[number],
  generateQueueIdFn: QueueIdGenerator,
): Promise<QueueGenerationResult | null> {
  try {
    const campaignId = voucherForm.campaign?.id;
    if (!campaignId) return null;

    const sequenceField = tierConfig.sequenceField as keyof VoucherForm;
    if (voucherForm[sequenceField]) {
      logger.info(
        `Skipping ${tierConfig.queueType} queue ID generation for voucher: ${voucherForm?.voucherId}. Already has ${String(sequenceField)}: ${
          typeof voucherForm?.[sequenceField] === 'object'
            ? JSON.stringify(voucherForm[sequenceField])
            : String(voucherForm?.[sequenceField] || '')
        }`,
      );
      return null;
    }

    const { queueId: generatedQueueId } = await generateQueueIdFn(
      campaignId,
      tierConfig.queueType,
    );

    voucherForm.queueId = generateQueueCode(
      tierConfig.queueType.slice(0, 1),
      generatedQueueId,
    );
    (voucherForm as any)[sequenceField] = generatedQueueId;

    if (tierConfig.queueType === QueueTypeEnum.VQI) {
      voucherForm.voucherQueueIssuedAt = new Date();
    } else {
      voucherForm.eoiQueueIssuedAt = new Date();
    }

    logger.info(
      `Generated ${tierConfig.queueType} queue ID: ${voucherForm.queueId} for voucher: ${voucherForm.voucherId}`,
    );

    return {
      queueId: voucherForm.queueId,
      voucherQueueIssuedAt: voucherForm.voucherQueueIssuedAt,
      eoiQueueIssuedAt: voucherForm.eoiQueueIssuedAt,
      voucherSequenceId: voucherForm.voucherSequenceId,
      standardSequenceId: voucherForm.standardSequenceId,
      preferentialSequenceId: voucherForm.preferentialSequenceId,
    };
  } catch (error) {
    logger.error(
      `Failed to generate ${tierConfig.queueType} queue ID for voucher: ${voucherForm.voucherId}`,
      error,
    );
    return null;
  }
}

// Map TypeORM entity field names to actual DB column names
const COUNTER_COLUMN_MAP: Record<string, string> = {
  voucherIdCounter: 'voucher_id_counter',
  stdEoiCounter: 'std_eoi_counter',
  preEoiCounter: 'pre_eoi_counter',
};

/**
 * Atomically increments a campaign counter column and returns the new value.
 * Uses MySQL LAST_INSERT_ID() trick to guarantee unique counters under concurrency.
 *
 * @param queryRunner - Any object with a `.query()` method (EntityManager or Repository)
 * @param campaignId - The campaign row to increment
 * @param counterField - TypeORM field name (e.g. 'preEoiCounter')
 * @returns The newly allocated counter value, unique to this connection
 */
export async function allocateCampaignTierCounter(
  queryRunner: { query: (sql: string, params?: any[]) => Promise<any> },
  campaignId: number,
  counterField: keyof EoiCampaign,
): Promise<number> {
  const columnName = COUNTER_COLUMN_MAP[counterField as string];
  if (!columnName) {
    throw new BadRequestException(
      `Unsupported campaign counter field: ${String(counterField)}`,
    );
  }

  // Atomic increment: row-level lock held only for the duration of this single UPDATE
  await queryRunner.query(
    `UPDATE eoi_campaigns
     SET ${columnName} = LAST_INSERT_ID(COALESCE(${columnName}, 0) + 1)
     WHERE id = ?`,
    [campaignId],
  );
  // Retrieve the counter value that was just set by this connection
  const result = await queryRunner.query(
    'SELECT LAST_INSERT_ID() AS counterValue',
  );
  return Number(result?.[0]?.counterValue || 0);
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
