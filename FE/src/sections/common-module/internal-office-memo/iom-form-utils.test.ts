import { it, expect, describe } from 'vitest';

import { IomStatus, PointsAdjustmentType } from 'src/utils/constant';

import { IOM_DETAILS_SAMPLE } from './iom-config';
import {
  parsePointsRatio,
  buildSubmitPayload,
  mergeIomEditedFlags,
  computePointsAmounts,
  buildIomUpdatePayload,
  computeIomEditedFlags,
  mapDetailsToFormValues,
  computeBrokerageAmount,
  buildPreviewIomDetails,
  isApprovalProofRequired,
  buildIomValidationSchema,
} from './iom-form-utils';

describe('iom-form-utils', () => {
  describe('parsePointsRatio', () => {
    it('parses a fixed ratio like 1:1', () => {
      expect(parsePointsRatio('1:1')).toEqual([1, 1]);
    });

    it('parses 2:0 and 0:2', () => {
      expect(parsePointsRatio('2:0')).toEqual([2, 0]);
      expect(parsePointsRatio('0:2')).toEqual([0, 2]);
    });

    it('returns [0, 0] for invalid input', () => {
      expect(parsePointsRatio(null)).toEqual([0, 0]);
      expect(parsePointsRatio('')).toEqual([0, 0]);
      expect(parsePointsRatio('abc')).toEqual([0, 0]);
      expect(parsePointsRatio('1:2:3')).toEqual([0, 0]);
    });
  });

  describe('computeBrokerageAmount', () => {
    it('multiplies basicSalePrice by brokeragePercent / 100', () => {
      expect(computeBrokerageAmount(12000000, 2)).toBe(240000);
      expect(computeBrokerageAmount(10000, 5)).toBe(500);
    });

    it('returns 0 for empty inputs', () => {
      expect(computeBrokerageAmount('', '')).toBe(0);
      expect(computeBrokerageAmount(100, '')).toBe(0);
    });
  });

  describe('computePointsAmounts', () => {
    it('splits brokerage 50/50 for 1:1', () => {
      const result = computePointsAmounts(240000, PointsAdjustmentType.ONE_ONE, '', '');
      expect(result).toEqual({
        pointsToReferrer: 1,
        pointsToReferee: 1,
        pointsReferrerAmount: 120000,
        pointsReferreeAmount: 120000,
      });
    });

    it('routes everything to referrer for 2:0', () => {
      const result = computePointsAmounts(240000, PointsAdjustmentType.TWO_ZERO, '', '');
      expect(result.pointsReferrerAmount).toBe(240000);
      expect(result.pointsReferreeAmount).toBe(0);
    });

    it('routes everything to referee for 0:2', () => {
      const result = computePointsAmounts(240000, PointsAdjustmentType.ZERO_TWO, '', '');
      expect(result.pointsReferrerAmount).toBe(0);
      expect(result.pointsReferreeAmount).toBe(240000);
    });

    it('uses explicit ratio inputs for Other (e.g. 1.5 : 0.5)', () => {
      const result = computePointsAmounts(240000, PointsAdjustmentType.OTHER, 1.5, 0.5);
      expect(result.pointsToReferrer).toBe(1.5);
      expect(result.pointsToReferee).toBe(0.5);
      expect(result.pointsReferrerAmount).toBe(180000);
      expect(result.pointsReferreeAmount).toBe(60000);
    });
  });

  describe('mapDetailsToFormValues', () => {
    it('returns blank values when details are null', () => {
      const values = mapDetailsToFormValues(null);
      expect(values.basicSalePrice).toBe('');
      expect(values.pointsAdjustmentType).toBe('');
      expect(values.referrer.customerName).toBe('');
    });

    it('seeds form values from the API sample', () => {
      const values = mapDetailsToFormValues(IOM_DETAILS_SAMPLE);
      expect(values.referrer.customerName).toBe('Ganesh G');
      expect(values.referee.customerName).toBe('John Doe');
      expect(values.basicSalePrice).toBe(12000000);
      expect(values.brokeragePercent).toBe(2);
      expect(values.pointsAdjustmentType).toBe(PointsAdjustmentType.ONE_ONE);
      expect(values.pointsRatioReferrer).toBe(1);
      expect(values.pointsRatioReferee).toBe(1);
      expect(values.originalReferralSplitType).toBe(PointsAdjustmentType.ONE_ONE);
    });

    it('populates originalReferralSplitType from payment.original_referral_split_type', () => {
      const values = mapDetailsToFormValues({
        ...IOM_DETAILS_SAMPLE,
        payment_details: {
          ...IOM_DETAILS_SAMPLE.payment_details,
          original_referral_split_type: 'other',
        },
      });
      expect(values.originalReferralSplitType).toBe('other');
    });

    it('leaves originalReferralSplitType empty when API did not provide one', () => {
      const values = mapDetailsToFormValues({
        ...IOM_DETAILS_SAMPLE,
        payment_details: {
          ...IOM_DETAILS_SAMPLE.payment_details,
          original_referral_split_type: null,
        },
      });
      expect(values.originalReferralSplitType).toBe('');
    });

    it('uses pts_to_referer/referee directly when type is Other', () => {
      const details = {
        ...IOM_DETAILS_SAMPLE,
        payment_details: {
          ...IOM_DETAILS_SAMPLE.payment_details,
          points_adjustment_type: PointsAdjustmentType.OTHER,
          pts_to_referer: 1.5,
          pts_to_referee: 0.5,
        },
      };
      const values = mapDetailsToFormValues(details);
      expect(values.pointsRatioReferrer).toBe(1.5);
      expect(values.pointsRatioReferee).toBe(0.5);
    });

    it('seeds isDeviation from payment.is_deviation flag', () => {
      const values = mapDetailsToFormValues({
        ...IOM_DETAILS_SAMPLE,
        payment_details: {
          ...IOM_DETAILS_SAMPLE.payment_details,
          is_deviation: true,
        },
      });
      expect(values.isDeviation).toBe(true);
    });
  });

  describe('computeIomEditedFlags', () => {
    it('returns all-false flags when current values match the originals', () => {
      const original = mapDetailsToFormValues(IOM_DETAILS_SAMPLE);
      expect(computeIomEditedFlags(original, original)).toEqual({
        basicSalePrice: false,
        brokerage: false,
        pointsAdjustmentType: false,
      });
    });

    it('flags only the fields whose values diverge from the originals', () => {
      const original = mapDetailsToFormValues(IOM_DETAILS_SAMPLE);
      const edited = {
        ...original,
        basicSalePrice: 13000000 as const,
        pointsAdjustmentType: PointsAdjustmentType.TWO_ZERO,
      };
      expect(computeIomEditedFlags(edited, original)).toEqual({
        basicSalePrice: true,
        brokerage: false,
        pointsAdjustmentType: true,
      });
    });

    it('does not flag computed fields like pointsReferrerAmount', () => {
      const original = mapDetailsToFormValues(IOM_DETAILS_SAMPLE);
      const edited = { ...original, pointsReferrerAmount: 999999 as const };
      const flags = computeIomEditedFlags(edited, original);
      expect(flags.basicSalePrice).toBe(false);
      expect(flags.brokerage).toBe(false);
      expect(flags.pointsAdjustmentType).toBe(false);
    });
  });

  describe('mergeIomEditedFlags', () => {
    const cleanSession = {
      basicSalePrice: false,
      brokerage: false,
      pointsAdjustmentType: false,
    };

    it('returns all-false when both session diff and server flags are clean', () => {
      expect(mergeIomEditedFlags(cleanSession, IOM_DETAILS_SAMPLE)).toEqual(cleanSession);
    });

    it('returns all-false when details is null and session diff is clean', () => {
      expect(mergeIomEditedFlags(cleanSession, null)).toEqual(cleanSession);
    });

    it('reflects server-only edited flags when the session diff is clean', () => {
      const base = {
        ...IOM_DETAILS_SAMPLE,
        payment_details: {
          ...IOM_DETAILS_SAMPLE.payment_details,
          is_basic_sale_price_edited: true,
          is_brokerage_edited: true,
          is_points_adjustment_edited: true,
        },
      };
      expect(mergeIomEditedFlags(cleanSession, base)).toEqual({
        basicSalePrice: true,
        brokerage: true,
        pointsAdjustmentType: true,
      });
    });

    it('reflects session-only edited flags when the server is clean', () => {
      const sessionFlags = {
        basicSalePrice: true,
        brokerage: false,
        pointsAdjustmentType: true,
      };
      expect(mergeIomEditedFlags(sessionFlags, IOM_DETAILS_SAMPLE)).toEqual(sessionFlags);
    });

    it('ORs server and session flags together', () => {
      const sessionFlags = {
        basicSalePrice: true,
        brokerage: false,
        pointsAdjustmentType: false,
      };
      const base = {
        ...IOM_DETAILS_SAMPLE,
        payment_details: {
          ...IOM_DETAILS_SAMPLE.payment_details,
          is_brokerage_edited: true,
        },
      };
      expect(mergeIomEditedFlags(sessionFlags, base)).toEqual({
        basicSalePrice: true,
        brokerage: true,
        pointsAdjustmentType: false,
      });
    });
  });

  describe('isApprovalProofRequired', () => {
    const initialValues = mapDetailsToFormValues(IOM_DETAILS_SAMPLE);

    it('returns false when nothing is edited and adjustment type is 1:1', () => {
      expect(
        isApprovalProofRequired(
          {
            brokeragePercent: initialValues.brokeragePercent,
            pointsAdjustmentType: PointsAdjustmentType.ONE_ONE,
            isDeviation: false,
          },
          initialValues
        )
      ).toBe(false);
    });

    it('returns false when only basicSalePrice differs (BSP no longer triggers proof)', () => {
      expect(
        isApprovalProofRequired(
          {
            brokeragePercent: initialValues.brokeragePercent,
            pointsAdjustmentType: PointsAdjustmentType.ONE_ONE,
            isDeviation: false,
          },
          initialValues,
          { is_brokerage_edited: false }
        )
      ).toBe(false);
    });

    it('returns true when brokeragePercent differs from original', () => {
      expect(
        isApprovalProofRequired(
          {
            brokeragePercent: 3,
            pointsAdjustmentType: PointsAdjustmentType.ONE_ONE,
            isDeviation: false,
          },
          initialValues
        )
      ).toBe(true);
    });

    it('returns true when server flags brokerage as edited even if values match', () => {
      expect(
        isApprovalProofRequired(
          {
            brokeragePercent: initialValues.brokeragePercent,
            pointsAdjustmentType: PointsAdjustmentType.ONE_ONE,
            isDeviation: false,
          },
          initialValues,
          { is_brokerage_edited: true }
        )
      ).toBe(true);
    });

    it('returns true when adjustment type is 2:0', () => {
      expect(
        isApprovalProofRequired(
          {
            brokeragePercent: initialValues.brokeragePercent,
            pointsAdjustmentType: PointsAdjustmentType.TWO_ZERO,
            isDeviation: false,
          },
          initialValues
        )
      ).toBe(true);
    });

    it('returns true when adjustment type is 0:2', () => {
      expect(
        isApprovalProofRequired(
          {
            brokeragePercent: initialValues.brokeragePercent,
            pointsAdjustmentType: PointsAdjustmentType.ZERO_TWO,
            isDeviation: false,
          },
          initialValues
        )
      ).toBe(true);
    });

    it('returns true when Other is selected and isDeviation is false', () => {
      expect(
        isApprovalProofRequired(
          {
            brokeragePercent: initialValues.brokeragePercent,
            pointsAdjustmentType: PointsAdjustmentType.OTHER,
            isDeviation: false,
          },
          initialValues
        )
      ).toBe(true);
    });

    it('returns true when Other is selected even with isDeviation=true (any non-1:1 split requires proof)', () => {
      expect(
        isApprovalProofRequired(
          {
            brokeragePercent: initialValues.brokeragePercent,
            pointsAdjustmentType: PointsAdjustmentType.OTHER,
            isDeviation: true,
          },
          initialValues
        )
      ).toBe(true);
    });

    it('returns true when brokerage edited even if Other is selected with deviation', () => {
      expect(
        isApprovalProofRequired(
          {
            brokeragePercent: 3,
            pointsAdjustmentType: PointsAdjustmentType.OTHER,
            isDeviation: true,
          },
          initialValues
        )
      ).toBe(true);
    });
  });

  describe('buildSubmitPayload', () => {
    it('builds a flat payload for fixed ratios with default action draft, deviation false and edited flags false', () => {
      const values = mapDetailsToFormValues(IOM_DETAILS_SAMPLE);
      const payload = buildSubmitPayload(values, 'IOM-123');
      expect(payload).toEqual({
        iomId: 'IOM-123',
        basicSalePrice: 12000000,
        brokeragePercent: 2,
        pointsAdjustmentType: PointsAdjustmentType.ONE_ONE,
        pointsRatio: { referrer: 1, referee: 1 },
        approvalProofUrl: null,
        action: 'draft',
        deviation: false,
        isBasicSalePriceEdited: false,
        isBrokerageEdited: false,
        isPointsAdjustmentEdited: false,
      });
    });

    it('forwards edited flags into the payload using mock keys', () => {
      const values = mapDetailsToFormValues(IOM_DETAILS_SAMPLE);
      const payload = buildSubmitPayload(values, 'IOM-123', 'submit', {
        basicSalePrice: true,
        brokerage: false,
        pointsAdjustmentType: true,
      });
      expect(payload.isBasicSalePriceEdited).toBe(true);
      expect(payload.isBrokerageEdited).toBe(false);
      expect(payload.isPointsAdjustmentEdited).toBe(true);
      expect(payload.action).toBe('submit');
    });

    it('includes approval proof URL when Other is selected', () => {
      const values = mapDetailsToFormValues({
        ...IOM_DETAILS_SAMPLE,
        status: IomStatus.IOM_TO_BE_CREATED,
        payment_details: {
          ...IOM_DETAILS_SAMPLE.payment_details,
          points_adjustment_type: PointsAdjustmentType.OTHER,
          pts_to_referer: 1.5,
          pts_to_referee: 0.5,
          approval_proof_url: 'https://example.com/proof.pdf',
        },
      });
      const payload = buildSubmitPayload(values, 'IOM-X');
      expect(payload.pointsAdjustmentType).toBe(PointsAdjustmentType.OTHER);
      expect(payload.pointsRatio).toEqual({ referrer: 1.5, referee: 0.5 });
      expect(payload.approvalProofUrl).toBe('https://example.com/proof.pdf');
      expect(payload.action).toBe('draft');
    });

    it('sets action submit when requested', () => {
      const values = mapDetailsToFormValues(IOM_DETAILS_SAMPLE);
      const payload = buildSubmitPayload(values, 'IOM-123', 'submit');
      expect(payload.action).toBe('submit');
    });

    it('forwards deviation flag from form values', () => {
      const values = mapDetailsToFormValues({
        ...IOM_DETAILS_SAMPLE,
        payment_details: {
          ...IOM_DETAILS_SAMPLE.payment_details,
          points_adjustment_type: PointsAdjustmentType.OTHER,
          is_deviation: true,
        },
      });
      const payload = buildSubmitPayload(values, 'IOM-123', 'submit');
      expect(payload.deviation).toBe(true);
    });
  });

  describe('buildIomUpdatePayload', () => {
    it('builds the PATCH payload with default false edit flags, action submit and empty edit reason', () => {
      const values = mapDetailsToFormValues(IOM_DETAILS_SAMPLE);
      const payload = buildIomUpdatePayload(values);
      expect(payload).toEqual({
        salePriceEdited: false,
        brokeragePercentageEdited: false,
        referralPointsRatioEdited: false,
        salePrice: 12000000,
        brokeragePercentage: 2,
        referralPointsRatio: '1:1',
        totalBrokerageAmount: 240000,
        referrerPoints: 120000,
        refereePoints: 120000,
        referrerRatio: 1,
        refereeRatio: 1,
        referralPointsEditReason: '',
        action: 'submit',
        deviation: false,
      });
    });

    it('always includes referralPointsEditReason (set from the approval proof file path)', () => {
      const values = mapDetailsToFormValues({
        ...IOM_DETAILS_SAMPLE,
        payment_details: {
          ...IOM_DETAILS_SAMPLE.payment_details,
          basic_sale_price: 9000000,
          points_adjustment_type: PointsAdjustmentType.ZERO_TWO,
          pts_to_referer: 0,
          pts_to_referee: 2,
          pts_referer_amount: 0,
          pts_referee_amount: 180000,
          brokerage_amt: '180000',
          approval_proof_url: 'uploads/proof.pdf',
        },
      });
      const payload = buildIomUpdatePayload(values, {
        basicSalePrice: false,
        brokerage: false,
        pointsAdjustmentType: true,
      });
      expect(payload).toEqual({
        salePriceEdited: false,
        brokeragePercentageEdited: false,
        referralPointsRatioEdited: true,
        salePrice: 9000000,
        brokeragePercentage: 2,
        referralPointsRatio: '0:2',
        totalBrokerageAmount: 180000,
        referrerPoints: 0,
        refereePoints: 180000,
        referrerRatio: 0,
        refereeRatio: 2,
        referralPointsEditReason: 'uploads/proof.pdf',
        action: 'submit',
        deviation: false,
      });
    });

    it('sends "other" ratio + zeroed points + null ratio %s when Brokerage adjustment (deviation) is checked', () => {
      const values = mapDetailsToFormValues({
        ...IOM_DETAILS_SAMPLE,
        payment_details: {
          ...IOM_DETAILS_SAMPLE.payment_details,
          points_adjustment_type: PointsAdjustmentType.OTHER,
          pts_to_referer: 1.5,
          pts_to_referee: 0.5,
          pts_referer_amount: 180000,
          pts_referee_amount: 60000,
          is_deviation: true,
        },
      });
      const payload = buildIomUpdatePayload(values, {}, undefined, 'draft');
      expect(payload.action).toBe('draft');
      expect(payload.deviation).toBe(true);
      expect(payload.referralPointsRatio).toBe('other');
      expect(payload.referrerPoints).toBe(0);
      expect(payload.refereePoints).toBe(0);
      expect(payload.referrerRatio).toBeNull();
      expect(payload.refereeRatio).toBeNull();
    });

    it('defaults referralPointsEditReason to empty string when no approval proof is present', () => {
      const values = mapDetailsToFormValues(IOM_DETAILS_SAMPLE);
      const payload = buildIomUpdatePayload(values, { pointsAdjustmentType: true });
      expect(payload.referralPointsRatioEdited).toBe(true);
      expect(payload.referralPointsEditReason).toBe('');
    });

    it('sends `referralPointsRatio: "other"` plus computed per-side amounts and ratio %s for Other (no deviation)', () => {
      const values = mapDetailsToFormValues({
        ...IOM_DETAILS_SAMPLE,
        status: IomStatus.IOM_TO_BE_CREATED,
        payment_details: {
          ...IOM_DETAILS_SAMPLE.payment_details,
          points_adjustment_type: PointsAdjustmentType.OTHER,
          pts_to_referer: 1.5,
          pts_to_referee: 0.5,
          pts_referer_amount: 270000,
          pts_referee_amount: 90000,
          brokerage_amt: '360000',
        },
      });
      const payload = buildIomUpdatePayload(values);
      expect(payload.referralPointsRatio).toBe('other');
      expect(payload.referrerPoints).toBe(270000);
      expect(payload.refereePoints).toBe(90000);
      expect(payload.referrerRatio).toBe(1.5);
      expect(payload.refereeRatio).toBe(0.5);
      expect(payload.deviation).toBe(false);
      expect(payload.referralPointsRatioEdited).toBe(true);
    });

    it('flags referralPointsRatioEdited true when Other is selected without deviation even if the dropdown value was not changed', () => {
      const values = mapDetailsToFormValues({
        ...IOM_DETAILS_SAMPLE,
        payment_details: {
          ...IOM_DETAILS_SAMPLE.payment_details,
          points_adjustment_type: PointsAdjustmentType.OTHER,
          original_referral_split_type: 'other',
          pts_to_referer: 1.25,
          pts_to_referee: 0.75,
          pts_referer_amount: 150000,
          pts_referee_amount: 90000,
          is_deviation: false,
          is_points_adjustment_edited: false,
        },
      });
      const payload = buildIomUpdatePayload(values);
      expect(payload.referralPointsRatio).toBe('other');
      expect(payload.deviation).toBe(false);
      expect(payload.referralPointsRatioEdited).toBe(true);
    });

    it('sends fixed split ratio %s for 2:0', () => {
      const values = mapDetailsToFormValues({
        ...IOM_DETAILS_SAMPLE,
        payment_details: {
          ...IOM_DETAILS_SAMPLE.payment_details,
          points_adjustment_type: PointsAdjustmentType.TWO_ZERO,
          pts_to_referer: 2,
          pts_to_referee: 0,
          pts_referer_amount: 240000,
          pts_referee_amount: 0,
        },
      });
      const payload = buildIomUpdatePayload(values);
      expect(payload.referralPointsRatio).toBe('2:0');
      expect(payload.referrerRatio).toBe(2);
      expect(payload.refereeRatio).toBe(0);
    });
  });

  describe('buildPreviewIomDetails', () => {
    it('returns an empty-shaped IomDetailsResponse when base is null', () => {
      const values = mapDetailsToFormValues(null);
      const preview = buildPreviewIomDetails(values, null);
      expect(preview.iom_id).toBe('');
      expect(preview.referer_details.customer_name).toBe('');
      expect(preview.payment_details.basic_sale_price).toBe(0);
      expect(preview.payment_details.approval_proof_url).toBeNull();
    });

    it('overlays edited fixed-ratio values and flips the edited flags', () => {
      const original = mapDetailsToFormValues(IOM_DETAILS_SAMPLE);
      const edited = {
        ...original,
        basicSalePrice: 13000000 as const,
        brokerageAmount: 260000 as const,
        pointsReferrerAmount: 130000 as const,
        pointsRefereeAmount: 130000 as const,
      };
      const preview = buildPreviewIomDetails(edited, IOM_DETAILS_SAMPLE);
      expect(preview.referer_details.customer_name).toBe('Ganesh G');
      expect(preview.referee_details.customer_name).toBe('John Doe');
      expect(preview.payment_details.basic_sale_price).toBe(13000000);
      expect(preview.payment_details.brokerage_amt).toBe('260000');
      expect(preview.payment_details.pts_referer_amount).toBe(130000);
      expect(preview.payment_details.is_basic_sale_price_edited).toBe(true);
      expect(preview.payment_details.is_brokerage_edited).toBe(false);
      expect(preview.payment_details.is_points_adjustment_edited).toBe(false);
    });

    it('ORs persisted server edited flags with the in-session diff', () => {
      const base = {
        ...IOM_DETAILS_SAMPLE,
        payment_details: {
          ...IOM_DETAILS_SAMPLE.payment_details,
          is_points_adjustment_edited: true,
        },
      };
      const original = mapDetailsToFormValues(base);
      const edited = { ...original, brokeragePercent: 3 as const };
      const preview = buildPreviewIomDetails(edited, base);
      expect(preview.payment_details.is_brokerage_edited).toBe(true);
      expect(preview.payment_details.is_points_adjustment_edited).toBe(true);
      expect(preview.payment_details.is_basic_sale_price_edited).toBe(false);
    });

    it('persists the isDeviation flag from form values onto payment_details', () => {
      const original = mapDetailsToFormValues(IOM_DETAILS_SAMPLE);
      const edited = { ...original, isDeviation: true };
      const preview = buildPreviewIomDetails(edited, IOM_DETAILS_SAMPLE);
      expect(preview.payment_details.is_deviation).toBe(true);
    });

    it('carries Other-ratio values and the approval proof URL through to the snapshot', () => {
      const base = {
        ...IOM_DETAILS_SAMPLE,
        status: IomStatus.IOM_TO_BE_CREATED,
        payment_details: {
          ...IOM_DETAILS_SAMPLE.payment_details,
          points_adjustment_type: PointsAdjustmentType.OTHER,
          pts_to_referer: 1.5,
          pts_to_referee: 0.5,
          approval_proof_url: 'https://example.com/proof.pdf',
        },
      };
      const values = mapDetailsToFormValues(base);
      const preview = buildPreviewIomDetails(values, base);
      expect(preview.payment_details.points_adjustment_type).toBe(PointsAdjustmentType.OTHER);
      expect(preview.payment_details.pts_to_referer).toBe(1.5);
      expect(preview.payment_details.pts_to_referee).toBe(0.5);
      expect(preview.payment_details.approval_proof_url).toBe('https://example.com/proof.pdf');
    });

    it('preserves original_referral_split_type from the base details', () => {
      const base = {
        ...IOM_DETAILS_SAMPLE,
        payment_details: {
          ...IOM_DETAILS_SAMPLE.payment_details,
          original_referral_split_type: 'other',
          points_adjustment_type: PointsAdjustmentType.OTHER,
        },
      };
      const values = mapDetailsToFormValues(base);
      const preview = buildPreviewIomDetails(values, base);
      expect(preview.payment_details.original_referral_split_type).toBe('other');
    });
  });

  describe('buildIomValidationSchema (Other points ratio)', () => {
    const initialValues = mapDetailsToFormValues(IOM_DETAILS_SAMPLE);
    const schema = buildIomValidationSchema(initialValues);

    const baseOtherValues = {
      ...initialValues,
      basicSalePrice: 12000000,
      brokeragePercent: 2,
      pointsAdjustmentType: PointsAdjustmentType.OTHER,
      isDeviation: false,
      approvalProof: 'proof.pdf',
    };

    const validateAt = async (values: any, path: 'pointsRatioReferrer' | 'pointsRatioReferee') => {
      try {
        await schema.validateAt(path, values);
        return null;
      } catch (err: any) {
        return err?.message as string;
      }
    };

    it('accepts a valid 1.5:0.5 split', async () => {
      const values = { ...baseOtherValues, pointsRatioReferrer: 1.5, pointsRatioReferee: 0.5 };
      expect(await validateAt(values, 'pointsRatioReferrer')).toBeNull();
      expect(await validateAt(values, 'pointsRatioReferee')).toBeNull();
    });

    it('accepts a valid 1.25:0.75 split (two decimal places)', async () => {
      const values = { ...baseOtherValues, pointsRatioReferrer: 1.25, pointsRatioReferee: 0.75 };
      expect(await validateAt(values, 'pointsRatioReferrer')).toBeNull();
      expect(await validateAt(values, 'pointsRatioReferee')).toBeNull();
    });

    it('rejects a sum below 2 with the sum-equals-two message', async () => {
      const values = { ...baseOtherValues, pointsRatioReferrer: 1, pointsRatioReferee: 0.5 };
      const message = await validateAt(values, 'pointsRatioReferee');
      expect(message).toBe(
        'Points Ratio sum must equal 2 (e.g. 1.5:0.5, 1.25:0.75)'
      );
    });

    it('rejects a sum above 2 with the sum-equals-two message', async () => {
      const values = { ...baseOtherValues, pointsRatioReferrer: 2, pointsRatioReferee: 1 };
      const message = await validateAt(values, 'pointsRatioReferee');
      expect(message).toBe(
        'Points Ratio sum must equal 2 (e.g. 1.5:0.5, 1.25:0.75)'
      );
    });

    it('still flags 1:1 as a dropdown combo (not a sum violation)', async () => {
      const values = { ...baseOtherValues, pointsRatioReferrer: 1, pointsRatioReferee: 1 };
      const message = await validateAt(values, 'pointsRatioReferee');
      expect(message).toBe('Use the dropdown for 1:1, 2:0, 0:2');
    });

    it('skips ratio validation when isDeviation is true', async () => {
      const values = {
        ...baseOtherValues,
        isDeviation: true,
        pointsRatioReferrer: null,
        pointsRatioReferee: null,
      };
      expect(await validateAt(values, 'pointsRatioReferrer')).toBeNull();
      expect(await validateAt(values, 'pointsRatioReferee')).toBeNull();
    });
  });
});
