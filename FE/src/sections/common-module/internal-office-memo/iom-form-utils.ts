import type { OptionType } from 'src/components/formik-autocomplete/FormikAutocomplete';

import * as Yup from 'yup';

import { PointsAdjustmentType, POINTS_ADJUSTMENT_OPTIONS } from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';

import type {
  IomEditedFlags,
  IomSubmitAction,
  SubmitIomPayload,
  IomDetailsResponse,
  SubmitIomPatchPayload,
} from './iom-config';

const { generateIOM } = uiText.internalOfficeMemo;

/**
 * Extracts the `adjustmentType` options from the `iomDropdowns` redux slice.
 * The backend may return either a single `{ type, items }` object (single-type
 * request) or an array of such objects (multi-type request). Falls back to the
 * static `POINTS_ADJUSTMENT_OPTIONS` when the data is unavailable.
 */
export const getAdjustmentTypeOptions = (iomDropdowns: unknown): OptionType[] => {
  const pickItems = (entry: any): OptionType[] | null =>
    entry && entry.type === 'adjustmentType' && Array.isArray(entry.items) ? entry.items : null;

  if (Array.isArray(iomDropdowns)) {
    const found = iomDropdowns
      .map(pickItems)
      .find((items) => Array.isArray(items) && items.length);
    if (found?.length) return found;
  } else if (iomDropdowns && typeof iomDropdowns === 'object') {
    const single = pickItems(iomDropdowns);
    if (single?.length) return single;
    const nested = (iomDropdowns as any).adjustmentType;
    if (Array.isArray(nested) && nested.length) return nested as OptionType[];
  }

  return POINTS_ADJUSTMENT_OPTIONS;
};

export interface IomFormValues {
  referrer: {
    customerName: string;
    projectName: string;
    projectLocation: string;
    unitNo: string;
    bpCode: string;
    bookingDate: string;
  };
  referee: {
    customerName: string;
    projectName: string;
    projectLocation: string;
    unitNo: string;
    bpCode: string;
    bookingDate: string;
  };
  basicSalePrice: number | '';
  brokeragePercent: number | '';
  brokerageAmount: number | '';
  pointsAdjustmentType: string;
  /**
   * Raw `referralSplitType` value as returned by the API for this IOM. Used by
   * the dropdown to decide whether the Points Adjustment Type is locked
   * (`"1:1"` / `"2:0"` / `"0:2"`) or editable (empty / `"other"`).
   */
  originalReferralSplitType: string;
  pointsRatioReferrer: number | '';
  pointsRatioReferee: number | '';
  pointsToReferrer: number | '';
  pointsReferrerAmount: number | '';
  pointsToReferee: number | '';
  pointsRefereeAmount: number | '';
  approvalProof: string | null;
  isDeviation: boolean;
}

const numberOrEmpty = (value: unknown): number | '' => {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  return Number.isFinite(num) ? num : '';
};

/** Splits a ratio like "1:1" into [referrer, referee] numbers. Falls back to [0, 0]. */
export const parsePointsRatio = (ratio: string | null | undefined): [number, number] => {
  if (!ratio || typeof ratio !== 'string') return [0, 0];
  const parts = ratio.split(':').map((p) => Number(p.trim()));
  if (parts.length !== 2 || parts.some((n) => !Number.isFinite(n))) {
    return [0, 0];
  }
  return [parts[0], parts[1]];
};

/** Maps the API details to Formik initial values (single source of truth). */
export const mapDetailsToFormValues = (details: IomDetailsResponse | null): IomFormValues => {
  if (!details) {
    return {
      referrer: {
        customerName: '',
        projectName: '',
        projectLocation: '',
        unitNo: '',
        bpCode: '',
        bookingDate: '',
      },
      referee: {
        customerName: '',
        projectName: '',
        projectLocation: '',
        unitNo: '',
        bpCode: '',
        bookingDate: '',
      },
      basicSalePrice: '',
      brokeragePercent: '',
      brokerageAmount: '',
      pointsAdjustmentType: '',
      originalReferralSplitType: '',
      pointsRatioReferrer: '',
      pointsRatioReferee: '',
      pointsToReferrer: '',
      pointsReferrerAmount: '',
      pointsToReferee: '',
      pointsRefereeAmount: '',
      approvalProof: null,
      isDeviation: false,
    };
  }

  const payment = details.payment_details;
  const adjustmentType = payment.points_adjustment_type ?? '';
  const isOther = adjustmentType === PointsAdjustmentType.OTHER;

  let ratioReferrer: number | '' = '';
  let ratioReferee: number | '' = '';

  if (isOther) {
    ratioReferrer = numberOrEmpty(payment.pts_to_referer);
    ratioReferee = numberOrEmpty(payment.pts_to_referee);
  } else if (adjustmentType) {
    const [r, e] = parsePointsRatio(adjustmentType);
    ratioReferrer = r;
    ratioReferee = e;
  }

  return {
    referrer: {
      customerName: details.referer_details?.customer_name ?? '',
      projectName: details.referer_details?.project_name ?? '',
      projectLocation: details.referer_details?.project_location ?? '',
      unitNo: details.referer_details?.unit_number ?? '',
      bpCode: details.referer_details?.bp_code ?? '',
      bookingDate: details.referer_details?.booking_date ?? '',
    },
    referee: {
      customerName: details.referee_details?.customer_name ?? '',
      projectName: details.referee_details?.project_name ?? '',
      projectLocation: details.referee_details?.project_location ?? '',
      unitNo: details.referee_details?.unit_number ?? '',
      bpCode: details.referee_details?.bp_code ?? '',
      bookingDate: details.referee_details?.booking_date ?? '',
    },
    basicSalePrice: numberOrEmpty(payment.basic_sale_price),
    brokeragePercent: numberOrEmpty(payment.brokerage),
    brokerageAmount: numberOrEmpty(payment.brokerage_amt),
    pointsAdjustmentType: adjustmentType,
    originalReferralSplitType: payment.original_referral_split_type ?? '',
    pointsRatioReferrer: ratioReferrer,
    pointsRatioReferee: ratioReferee,
    pointsToReferrer: numberOrEmpty(payment.pts_to_referer),
    pointsReferrerAmount: numberOrEmpty(payment.pts_referer_amount),
    pointsToReferee: numberOrEmpty(payment.pts_to_referee),
    pointsRefereeAmount: numberOrEmpty(payment.pts_referee_amount),
    approvalProof: payment.approval_proof_url ?? null,
    isDeviation: Boolean(payment.is_deviation),
  };
};

/** brokerageAmount = basicSalePrice * (brokeragePercent / 100). */
export const computeBrokerageAmount = (
  basicSalePrice: number | string | '',
  brokeragePercent: number | string | ''
): number => {
  const bsp = Number(basicSalePrice);
  const bp = Number(brokeragePercent);
  if (!Number.isFinite(bsp) || !Number.isFinite(bp)) return 0;
  return (bsp * bp) / 100;
};

export interface PointsAmounts {
  pointsToReferrer: number;
  pointsToReferee: number;
  pointsReferrerAmount: number;
  pointsReferreeAmount: number;
}

/**
 * Computes points distribution from brokerage amount and selected ratio.
 *
 * - For fixed types (`1:1`, `2:0`, `0:2`) the ratio is parsed from the
 *   adjustment type string.
 * - For `Other`, the explicit referrer / referee ratio inputs are used.
 *
 * Per the sample (240000 brokerage with 1:1 → 120000 / 120000), the amount
 * for each side is `brokerageAmount * (ratio / 2)`.
 */
export const computePointsAmounts = (
  brokerageAmount: number,
  adjustmentType: string,
  ratioReferrer: number | string | '',
  ratioReferee: number | string | ''
): PointsAmounts => {
  let pointsToReferrer = 0;
  let pointsToReferee = 0;

  if (adjustmentType === PointsAdjustmentType.OTHER) {
    pointsToReferrer = Number(ratioReferrer) || 0;
    pointsToReferee = Number(ratioReferee) || 0;
  } else if (adjustmentType) {
    const [r, e] = parsePointsRatio(adjustmentType);
    pointsToReferrer = r;
    pointsToReferee = e;
  }

  const brokerage = Number(brokerageAmount) || 0;

  return {
    pointsToReferrer,
    pointsToReferee,
    pointsReferrerAmount: brokerage * (pointsToReferrer / 2),
    pointsReferreeAmount: brokerage * (pointsToReferee / 2),
  };
};

/**
 * Computes the per-field "edited" flags by comparing the current form values to the
 * original API values for the only three fields that the business needs to track:
 * `basicSalePrice`, `brokeragePercent`, `pointsAdjustmentType`.
 */
export const computeIomEditedFlags = (
  values: IomFormValues,
  initialValues: IomFormValues
): Required<IomEditedFlags> => ({
  basicSalePrice: String(values.basicSalePrice) !== String(initialValues.basicSalePrice),
  brokerage: String(values.brokeragePercent) !== String(initialValues.brokeragePercent),
  pointsAdjustmentType: values.pointsAdjustmentType !== initialValues.pointsAdjustmentType,
});

/**
 * OR's the in-session edited flags (current values vs original API values) with the
 * persisted server flags on `details.payment_details`. Used by the UI so the "Edited"
 * tag lights up whenever EITHER the backend already considers the field edited OR the
 * user just changed it in this session.
 *
 * The PATCH submit payload deliberately keeps using the pure session diff
 * (`computeIomEditedFlags`) so the backend only sees what THIS user changed now.
 */
export const mergeIomEditedFlags = (
  sessionFlags: Required<IomEditedFlags>,
  details: IomDetailsResponse | null
): Required<IomEditedFlags> => ({
  basicSalePrice:
    sessionFlags.basicSalePrice ||
    Boolean(details?.payment_details?.is_basic_sale_price_edited),
  brokerage:
    sessionFlags.brokerage || Boolean(details?.payment_details?.is_brokerage_edited),
  pointsAdjustmentType:
    sessionFlags.pointsAdjustmentType ||
    Boolean(details?.payment_details?.is_points_adjustment_edited),
});

/**
 * Approval proof is required when the user has edited `brokeragePercent`
 * (compared to the original API value OR according to the server-persisted
 * edit flag), OR when the points adjustment is anything other than the
 * default `1:1` split (i.e. `2:0`, `0:2`, or `Other` — with or without the
 * brokerage-adjustment deviation flag).
 */
export const isApprovalProofRequired = (
  values: Pick<IomFormValues, 'brokeragePercent' | 'pointsAdjustmentType' | 'isDeviation'>,
  initialValues: Pick<IomFormValues, 'brokeragePercent'>,
  paymentDetails?: {
    is_brokerage_edited?: boolean;
  } | null
): boolean => {
  const brokerageEdited =
    String(values.brokeragePercent) !== String(initialValues.brokeragePercent) ||
    Boolean(paymentDetails?.is_brokerage_edited);
  const type = values.pointsAdjustmentType;
  const isNonDefaultSplit = Boolean(type) && type !== PointsAdjustmentType.ONE_ONE;
  return brokerageEdited || isNonDefaultSplit;
};

/**
 * Builds the PATCH `/iom/{id}` payload used by CRM / CRM TL when submitting
 * an IOM for approval. The new endpoint expects a flat shape with edit-tracking
 * flags, the ratio as a "referrer:referee" string, and computed totals /
 * per-side amounts.
 *
 * The optional `editReason` is included only when the points ratio was edited.
 */
export const buildIomUpdatePayload = (
  values: IomFormValues,
  editedFlags: IomEditedFlags = {},
  _editReason?: string,
  action: IomSubmitAction = 'submit'
): SubmitIomPatchPayload => {
  const adjustmentType =
    (values.pointsAdjustmentType as PointsAdjustmentType) || PointsAdjustmentType.ONE_ONE;
  const isOther = adjustmentType === PointsAdjustmentType.OTHER;
  const isDeviation = Boolean(values.isDeviation);

  // `referralPointsRatioEdited` is true when EITHER the Points Adjustment Type
  // dropdown was edited in this session (or already flagged on the server) OR
  // the user is on the `Other` branch without the brokerage-adjustment
  // deviation. In the latter case the ratio is always user-supplied (it can't
  // be derived from the type string the way `1:1` / `2:0` / `0:2` can), so it
  // counts as edited regardless of whether the dropdown VALUE itself changed.
  const referralPointsRatioEdited =
    Boolean(editedFlags.pointsAdjustmentType) || (isOther && !isDeviation);

  // For the fixed split types (`1:1` / `2:0` / `0:2`) the ratio is sent
  // verbatim; for the `Other` branch (with or without the brokerage-adjustment
  // deviation) the backend expects the literal string `"other"`.
  const referralPointsRatio = isOther
    ? 'other'
    : `${parsePointsRatio(adjustmentType)[0]}:${parsePointsRatio(adjustmentType)[1]}`;

  // When `Other` is combined with the brokerage-adjustment deviation, the
  // per-side amounts are explicitly zeroed; otherwise we send the computed
  // amounts from the form.
  const referrerPoints =
    isOther && isDeviation ? 0 : Number(values.pointsReferrerAmount) || 0;
  const refereePoints =
    isOther && isDeviation ? 0 : Number(values.pointsRefereeAmount) || 0;

  // Per-side ratio %s. For fixed splits (`1:1` / `2:0` / `0:2`) they come from
  // the adjustment type string; for `Other` we forward the user-entered ratio
  // inputs; for `Other` + brokerage-adjustment deviation we send `null` on
  // both sides per the API contract.
  let referrerRatio: number | null;
  let refereeRatio: number | null;
  if (isOther && isDeviation) {
    referrerRatio = null;
    refereeRatio = null;
  } else if (isOther) {
    referrerRatio = Number(values.pointsRatioReferrer) || 0;
    refereeRatio = Number(values.pointsRatioReferee) || 0;
  } else {
    const [r, e] = parsePointsRatio(adjustmentType);
    referrerRatio = r;
    refereeRatio = e;
  }

  return {
    salePriceEdited: Boolean(editedFlags.basicSalePrice),
    brokeragePercentageEdited: Boolean(editedFlags.brokerage),
    referralPointsRatioEdited,
    salePrice: Number(values.basicSalePrice) || 0,
    brokeragePercentage: Number(values.brokeragePercent) || 0,
    referralPointsRatio,
    totalBrokerageAmount: Number(values.brokerageAmount) || 0,
    referrerPoints,
    refereePoints,
    referrerRatio,
    refereeRatio,
    // Backend reuses `referralPointsEditReason` to persist the Approval Proof
    // file path. Always include the field so the backend can clear it when
    // the proof was removed.
    referralPointsEditReason: values.approvalProof ?? '',
    action,
    deviation: isDeviation,
  };
};

/**
 * Builds a fully-formed `IomDetailsResponse` by overlaying the current form
 * values on top of the server `base`. Used by `generate-iom-view` to hand a
 * preview snapshot to `iom-details-view` without round-tripping through the API.
 *
 * The `is_*_edited` flags are the OR of the current-session diff
 * (`computeIomEditedFlags`) and the persisted server flags on `base`, so the
 * preview shows "Edited" whenever EITHER the backend already considers the
 * field edited OR the user just changed it in this session.
 *
 * When `base` is null (e.g. brand-new IOM with no server payload yet), empty
 * party / signatory placeholders are returned with the form values applied.
 */
export const buildPreviewIomDetails = (
  values: IomFormValues,
  base: IomDetailsResponse | null
): IomDetailsResponse => {
  const initialValues = mapDetailsToFormValues(base);
  const editedFlags = mergeIomEditedFlags(
    computeIomEditedFlags(values, initialValues),
    base
  );

  const emptyParty = {
    customer_name: '',
    project_name: '',
    project_location: '',
    unit_number: '',
    bp_code: '',
    booking_date: '',
  };

  const fallback: IomDetailsResponse = {
    iom_id: '',
    referer_details: { ...emptyParty },
    referee_details: { ...emptyParty },
    payment_details: {
      basic_sale_price: 0,
      brokerage: '0',
      brokerage_amt: '0',
      total_amt: '0',
      points_adjustment_type: null,
      pts_to_referer: 0,
      pts_to_referee: 0,
      pts_referer_amount: 0,
      pts_referee_amount: 0,
      approval_proof_url: null,
    },
    sap_source: '',
    sfdc_source: '',
    agreement_date: '',
    refer_paid: 0,
    referee_paid: 0,
  };

  const source = base ?? fallback;

  return {
    ...source,
    referer_details: { ...source.referer_details },
    referee_details: { ...source.referee_details },
    payment_details: {
      ...source.payment_details,
      basic_sale_price: Number(values.basicSalePrice) || 0,
      brokerage: String(values.brokeragePercent ?? ''),
      brokerage_amt: String(Number(values.brokerageAmount) || 0),
      points_adjustment_type: values.pointsAdjustmentType || null,
      original_referral_split_type:
        values.originalReferralSplitType ||
        source.payment_details.original_referral_split_type ||
        null,
      pts_to_referer: Number(values.pointsToReferrer) || 0,
      pts_to_referee: Number(values.pointsToReferee) || 0,
      pts_referer_amount: Number(values.pointsReferrerAmount) || 0,
      pts_referee_amount: Number(values.pointsRefereeAmount) || 0,
      approval_proof_url: values.approvalProof ?? null,
      is_basic_sale_price_edited: editedFlags.basicSalePrice,
      is_brokerage_edited: editedFlags.brokerage,
      is_points_adjustment_edited: editedFlags.pointsAdjustmentType,
      is_deviation: Boolean(values.isDeviation),
    },
  };
};

/**
 * Builds the Yup schema used by the Generate IOM view. Lives in form-utils so
 * it can be unit-tested without dragging in the React component graph.
 */
export const buildIomValidationSchema = (
  initialValues: IomFormValues,
  paymentDetails?: {
    is_basic_sale_price_edited?: boolean;
    is_brokerage_edited?: boolean;
  } | null
) =>
  Yup.object({
    basicSalePrice: Yup.number()
      .typeError(generateIOM.validation.basicSalePriceRequired)
      .required(generateIOM.validation.basicSalePriceRequired)
      .moreThan(0, generateIOM.validation.basicSalePricePositive),
    brokeragePercent: Yup.number()
      .typeError(generateIOM.validation.brokerageRequired)
      .required(generateIOM.validation.brokerageRequired)
      .min(0, generateIOM.validation.brokerageRange)
      .max(5, generateIOM.validation.brokerageRange),
    pointsAdjustmentType: Yup.string().required(generateIOM.validation.adjustmentTypeRequired),
    pointsRatioReferrer: Yup.number()
      .nullable()
      .when(['pointsAdjustmentType', 'isDeviation'], ([type, deviation], schema) =>
        type === PointsAdjustmentType.OTHER && !deviation
          ? schema
              .typeError(generateIOM.validation.pointsRatioRequired)
              .required(generateIOM.validation.pointsRatioRequired)
              .min(0, generateIOM.validation.pointsRatioRange)
              .max(5, generateIOM.validation.pointsRatioRange)
              .test(
                'two-decimals',
                generateIOM.validation.pointsRatioRange,
                (value) => value == null || /^\d+(\.\d{1,2})?$/.test(String(value))
              )
              // The cross-field tests below mirror those on `pointsRatioReferee`
              // so the combo / sum error attaches to BOTH ratio fields (red
              // border + helper text triggered on changes to either input).
              // `this.parent.pointsRatioReferee` is used instead of declaring
              // a `.when([..., 'pointsRatioReferee'])` dependency because that
              // would create a cyclic schema dependency with the existing
              // `pointsRatioReferee` `.when([..., 'pointsRatioReferrer'])`.
              // Formik's `validateOnChange` re-runs every field's schema on
              // any change, so the lookup stays reactive.
              .test(
                'not-dropdown-combo',
                generateIOM.validation.pointsRatioDuplicate,
                function notDropdownComboReferrer(value) {
                  const referee = (this.parent as { pointsRatioReferee?: number | '' } | undefined)
                    ?.pointsRatioReferee;
                  if (value == null || referee == null || referee === '') return true;
                  const r = Number(value);
                  const e = Number(referee);
                  if (!Number.isFinite(r) || !Number.isFinite(e)) return true;
                  return !((r === 1 && e === 1) || (r === 2 && e === 0) || (r === 0 && e === 2));
                }
              )
              .test(
                'sum-equals-two',
                generateIOM.validation.pointsRatioSum,
                function sumEqualsTwoReferrer(value) {
                  const referee = (this.parent as { pointsRatioReferee?: number | '' } | undefined)
                    ?.pointsRatioReferee;
                  if (value == null || referee == null || referee === '') return true;
                  const r = Number(value);
                  const e = Number(referee);
                  if (!Number.isFinite(r) || !Number.isFinite(e)) return true;
                  return Math.abs(r + e - 2) < 0.01;
                }
              )
          : schema.notRequired()
      ),
    pointsRatioReferee: Yup.number()
      .nullable()
      .when(
        ['pointsAdjustmentType', 'isDeviation', 'pointsRatioReferrer'],
        ([type, deviation, referrer], schema) =>
          type === PointsAdjustmentType.OTHER && !deviation
            ? schema
                .typeError(generateIOM.validation.pointsRatioRequired)
                .required(generateIOM.validation.pointsRatioRequired)
                .min(0, generateIOM.validation.pointsRatioRange)
                .max(5, generateIOM.validation.pointsRatioRange)
                .test(
                  'two-decimals',
                  generateIOM.validation.pointsRatioRange,
                  (value) => value == null || /^\d+(\.\d{1,2})?$/.test(String(value))
                )
                .test(
                  'not-dropdown-combo',
                  generateIOM.validation.pointsRatioDuplicate,
                  (value) => {
                    if (value == null || referrer == null || referrer === '') return true;
                    const r = Number(referrer);
                    const e = Number(value);
                    if (!Number.isFinite(r) || !Number.isFinite(e)) return true;
                    return !((r === 1 && e === 1) || (r === 2 && e === 0) || (r === 0 && e === 2));
                  }
                )
                .test(
                  'sum-equals-two',
                  generateIOM.validation.pointsRatioSum,
                  (value) => {
                    if (value == null || referrer == null || referrer === '') return true;
                    const r = Number(referrer);
                    const e = Number(value);
                    if (!Number.isFinite(r) || !Number.isFinite(e)) return true;
                    return Math.abs(r + e - 2) < 0.01;
                  }
                )
            : schema.notRequired()
      ),
    approvalProof: Yup.string()
      .nullable()
      .when(
        ['brokeragePercent', 'pointsAdjustmentType', 'isDeviation'],
        ([brokeragePercent, pointsAdjustmentType, isDeviation], schema) =>
          isApprovalProofRequired(
            {
              brokeragePercent,
              pointsAdjustmentType,
              isDeviation,
            },
            initialValues,
            paymentDetails
          )
            ? schema
                .required(generateIOM.validation.approvalProofRequired)
                .test('non-empty', generateIOM.validation.approvalProofRequired, (value) =>
                  Boolean(value && String(value).trim())
                )
            : schema.notRequired()
      ),
  });

/** Builds the flat submit payload from current form values. */
export const buildSubmitPayload = (
  values: IomFormValues,
  iomId: string,
  action: IomSubmitAction = 'draft',
  editedFlags: IomEditedFlags = {}
): SubmitIomPayload => {
  const adjustmentType =
    (values.pointsAdjustmentType as PointsAdjustmentType) || PointsAdjustmentType.ONE_ONE;

  const isOther = adjustmentType === PointsAdjustmentType.OTHER;

  let referrerRatio: number;
  let refereeRatio: number;

  if (isOther) {
    referrerRatio = Number(values.pointsRatioReferrer) || 0;
    refereeRatio = Number(values.pointsRatioReferee) || 0;
  } else {
    const [r, e] = parsePointsRatio(adjustmentType);
    referrerRatio = r;
    refereeRatio = e;
  }

  return {
    iomId,
    basicSalePrice: Number(values.basicSalePrice) || 0,
    brokeragePercent: Number(values.brokeragePercent) || 0,
    pointsAdjustmentType: adjustmentType,
    pointsRatio: {
      referrer: referrerRatio,
      referee: refereeRatio,
    },
    approvalProofUrl: isOther ? (values.approvalProof ?? null) : null,
    action,
    deviation: Boolean(values.isDeviation),
    isBasicSalePriceEdited: Boolean(editedFlags.basicSalePrice),
    isBrokerageEdited: Boolean(editedFlags.brokerage),
    isPointsAdjustmentEdited: Boolean(editedFlags.pointsAdjustmentType),
  };
};
