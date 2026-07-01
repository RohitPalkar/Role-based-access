import { BadRequestException } from '@nestjs/common';
import { ReraStatusEnum } from 'src/enums/booking-list.enums';

export function isMissing(value: any): boolean {
  return value === undefined || value === null || value === '';
}

// Validate Incentive Slab
export function validateIncentiveSlab(
  slab: any,
  index: number,
  context: { requireLaunch: boolean; requireSustenance: boolean },
): void {
  const idx = index + 1;

  // Launch validations
  if (context.requireLaunch) {
    validateRequiredLaunchSlab(slab, idx);
  } else {
    validateOptionalLaunchSlab(slab, idx);
  }

  // Sustenance validations
  if (context.requireSustenance) {
    validateRequiredSustenanceSlab(slab, idx);
  } else {
    validateOptionalSustenanceSlab(slab, idx);
  }
}

/**
 * Validate Launch part of a slab.
 *
 */
export function validateRequiredLaunchSlab(slab: any, idx: number): void {
  // --- Launch Slab Validation ---
  if (
    isMissing(slab.launchStartRange) ||
    isMissing(slab.launchEndRange) ||
    isMissing(slab.launchIncentivePercentage)
  ) {
    throw new BadRequestException(
      `Slab ${idx}: 'Launch Project > Start Range', 'End Range', and '%' are required.`,
    );
  }

  if (slab.launchEndRange <= slab.launchStartRange) {
    throw new BadRequestException(
      `Slab ${idx}: 'Launch Project > End Range' must be greater than 'Start Range'.`,
    );
  }

  if (
    slab.launchIncentivePercentage < 0 ||
    slab.launchIncentivePercentage > 100
  ) {
    throw new BadRequestException(
      `Slab ${idx}: 'Launch Project > %' must be between 0 and 100.`,
    );
  }
}
export function validateOptionalLaunchSlab(slab: any, idx: number): void {
  // --- Launch Slab Validation ---

  const anyLaunchProvided =
    !isMissing(slab.launchStartRange) ||
    !isMissing(slab.launchEndRange) ||
    !isMissing(slab.launchIncentivePercentage);
  const allLaunchProvided =
    !isMissing(slab.launchStartRange) &&
    !isMissing(slab.launchEndRange) &&
    !isMissing(slab.launchIncentivePercentage);

  if (anyLaunchProvided && !allLaunchProvided) {
    throw new BadRequestException(
      `Slab ${idx}: If any 'Launch Project' field is provided, all fields ('Start Range', 'End Range', and '%') must be filled.`,
    );
  }
}

/**
 * Validate Sustenance part of a slab.
 */
export function validateRequiredSustenanceSlab(slab: any, idx: number): void {
  if (
    isMissing(slab.sustenanceStartRange) ||
    isMissing(slab.sustenanceEndRange) ||
    isMissing(slab.sustenanceIncentivePercentage)
  ) {
    throw new BadRequestException(
      `Slab ${idx}: 'Sustenance Project > Start Range', 'End Range', and '%' are required.`,
    );
  }

  if (slab.sustenanceEndRange <= slab.sustenanceStartRange) {
    throw new BadRequestException(
      `Slab ${idx}: 'Sustenance Project > End Range' must be greater than 'Start Range'.`,
    );
  }

  if (
    slab.sustenanceIncentivePercentage < 0 ||
    slab.sustenanceIncentivePercentage > 100
  ) {
    throw new BadRequestException(
      `Slab ${idx}: 'Sustenance Project > %' must be between 0 and 100.`,
    );
  }
}

export function validateOptionalSustenanceSlab(slab: any, idx: number): void {
  const anyProvided =
    !isMissing(slab.sustenanceStartRange) ||
    !isMissing(slab.sustenanceEndRange) ||
    !isMissing(slab.sustenanceIncentivePercentage);

  const allProvided =
    !isMissing(slab.sustenanceStartRange) &&
    !isMissing(slab.sustenanceEndRange) &&
    !isMissing(slab.sustenanceIncentivePercentage);

  if (anyProvided && !allProvided) {
    throw new BadRequestException(
      `Slab ${idx}: If any 'Sustenance Project' field is provided, all fields ('Start Range', 'End Range', and '%') must be filled.`,
    );
  }
}

// Project RERA Field Validation
export function validateProjectFinancialFields(
  dto: {
    reraRegularization?: any;
    reraPayable?: any;
    rtmRegularization?: any;
    rtmPayable?: any;
  },
  reraStatuses: ReraStatusEnum[],
): void {
  const uniqueStatuses = new Set(reraStatuses);
  const {
    isOCOnly,
    isNoOnly,
    isMixed,
    anyReraProvided,
    allReraProvided,
    anyRtmProvided,
    allRtmProvided,
  } = getConditionalFlags(uniqueStatuses, dto);
  if (isOCOnly) {
    if (!allRtmProvided) {
      throw new BadRequestException(
        `'RTM/OC Received > Regularisation' and 'Payable' are required when all phases have reraStatus as OC.`,
      );
    }
    if (anyReraProvided && !allReraProvided) {
      throw new BadRequestException(
        `If any 'RERA/Under Construction' field is provided, both 'Regularisation' and 'Payable' must be filled.`,
      );
    }
  }

  if (isNoOnly) {
    if (!allReraProvided) {
      throw new BadRequestException(
        `'RERA/Under Construction > Regularisation' and 'Payable' are required when all phases have reraStatus as No.`,
      );
    }
    if (anyRtmProvided && !allRtmProvided) {
      throw new BadRequestException(
        `If any 'RTM/OC Received' field is provided, both 'Regularisation' and 'Payable' must be filled.`,
      );
    }
  }

  if (isMixed) {
    if (!allReraProvided || !allRtmProvided) {
      throw new BadRequestException(
        `All fields ('RERA/Under Construction' and 'RTM/OC Received') are required when phases have mixed reraStatus (OC and No).`,
      );
    }
  }
}

export function getConditionalFlags(
  uniqueStatuses: Set<ReraStatusEnum>,
  dto: {
    reraRegularization?: any;
    reraPayable?: any;
    rtmRegularization?: any;
    rtmPayable?: any;
  },
): {
  isOCOnly: boolean;
  isNoOnly: boolean;
  isMixed: boolean;
  anyReraProvided: boolean;
  allReraProvided: boolean;
  anyRtmProvided: boolean;
  allRtmProvided: boolean;
} {
  const isOCOnly =
    uniqueStatuses.size === 1 && uniqueStatuses.has(ReraStatusEnum.OC);
  const isNoOnly =
    uniqueStatuses.size === 1 && uniqueStatuses.has(ReraStatusEnum.NO);
  const isMixed = uniqueStatuses.size > 1;

  const anyReraProvided =
    !isMissing(dto.reraRegularization) || !isMissing(dto.reraPayable);
  const allReraProvided =
    !isMissing(dto.reraRegularization) && !isMissing(dto.reraPayable);

  const anyRtmProvided =
    !isMissing(dto.rtmRegularization) || !isMissing(dto.rtmPayable);
  const allRtmProvided =
    !isMissing(dto.rtmRegularization) && !isMissing(dto.rtmPayable);

  return {
    isOCOnly,
    isNoOnly,
    isMixed,
    anyReraProvided,
    allReraProvided,
    anyRtmProvided,
    allRtmProvided,
  };
}

// Slab Continuity Validation
export function validateSlabContinuity(
  slabs: any[],
  context: 'Launch' | 'Sustenance',
): void {
  const startKey =
    context === 'Launch' ? 'launchStartRange' : 'sustenanceStartRange';
  const endKey = context === 'Launch' ? 'launchEndRange' : 'sustenanceEndRange';

  const filtered = slabs.filter(
    (s) => !isMissing(s[startKey]) && !isMissing(s[endKey]),
  );

  const sorted = [...filtered].sort(
    (a, b) => Number(a[startKey]) - Number(b[startKey]),
  );

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const current = sorted[i];

    // Skip comparison if either value is missing or blank
    if (
      (isMissing(current[startKey]) && isMissing(prev[endKey])) ||
      (current[startKey] === 0 && prev[endKey] === 0)
    ) {
      continue;
    }

    if (Number(current[startKey]) === Number(prev[endKey])) {
      throw new BadRequestException(
        `${context} Slab ${i + 1}: '${
          startKey === 'launchStartRange'
            ? 'Launch Project > Start Range'
            : 'Sustenance Project > Start Range'
        }' cannot be the same as the previous slab's '${
          endKey === 'launchEndRange'
            ? 'Launch Project > End Range'
            : 'Sustenance Project > End Range'
        }'.`,
      );
    }
  }
}
