import type { FormikProps } from 'formik';

import React, { useEffect } from 'react';

import { Grid, Typography, FormHelperText } from '@mui/material';

import {
  PointsAdjustmentType,
  POINTS_ADJUSTMENT_OTHER,
  POINTS_ADJUSTMENT_OPTIONS,
} from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';

import { FormikTextField } from 'src/components/formik-textfield/formik-textfield';
import FormikAutocomplete, {
  type OptionType,
} from 'src/components/formik-autocomplete/FormikAutocomplete';

import { parsePointsRatio } from '../iom-form-utils';

const { view, generateIOM } = uiText.internalOfficeMemo;

type Props = {
  formik: FormikProps<any>;
  isEditable?: boolean;
  isEdited?: boolean;
  editedTooltip?: string;
  options?: OptionType[];
};

// `referralSplitType` values for which the Points Adjustment Type dropdown is
// locked. Empty / `other` from the API leave the dropdown editable so the user
// can pick a different option.
const FIXED_SPLIT_TYPES = new Set<string>([
  PointsAdjustmentType.ONE_ONE,
  PointsAdjustmentType.TWO_ZERO,
  PointsAdjustmentType.ZERO_TWO,
]);

const PointsAdjustmentTypeField = ({
  formik,
  isEditable = true,
  isEdited = false,
  editedTooltip,
  options,
}: Props) => {
  // Lock the dropdown only when the API returned one of the fixed split types
  // (`1:1` / `2:0` / `0:2`). Empty or `other` from the API leaves the dropdown
  // editable (still subject to the parent form's `isEditable` gating). Read
  // from `formik.initialValues` so the flag reacts to `enableReinitialize`
  // when the IOM details arrive.
  const originalSplitType: string = formik.initialValues?.originalReferralSplitType ?? '';
  const isLockedByApi = FIXED_SPLIT_TYPES.has(originalSplitType);
  const currentAdjustmentType = formik.values.pointsAdjustmentType;
  const isOtherSelected = currentAdjustmentType === POINTS_ADJUSTMENT_OTHER;
  const isDeviation = Boolean(formik.values.isDeviation);
  const isReadOnly = isLockedByApi || !isEditable;
  const ratioInputsDisabled = isReadOnly || !isOtherSelected || isDeviation;
  const showRatioInputs = (!isReadOnly || Boolean(currentAdjustmentType)) && !isDeviation;

  // The ratio inputs are intentionally narrow (`xs={2}`) so the inline
  // `helperText` does not fit. We surface validation messages via a single
  // full-width `FormHelperText` rendered below the row instead.
  //
  // Cross-field errors (forbidden 1:1/2:0/0:2 combos and sum != 2) are shown
  // as soon as Yup reports them — including on page-load hydrate — because
  // they describe an already-invalid state of the data the user is viewing.
  // All other errors (required / range / two-decimals) keep the standard
  // `touched && error` gate so empty fields don't flash on mount.
  const referrerErr = formik.errors.pointsRatioReferrer;
  const refereeErr = formik.errors.pointsRatioReferee;
  const crossFieldMessages: ReadonlySet<string> = new Set([
    generateIOM.validation.pointsRatioDuplicate,
    generateIOM.validation.pointsRatioSum,
  ]);
  const isCrossFieldMessage = (err: unknown): err is string =>
    typeof err === 'string' && crossFieldMessages.has(err);

  const crossFieldErrorMessage = isCrossFieldMessage(referrerErr)
    ? referrerErr
    : isCrossFieldMessage(refereeErr)
      ? refereeErr
      : '';

  const standardReferrerError =
    formik.touched.pointsRatioReferrer &&
    typeof referrerErr === 'string' &&
    !crossFieldMessages.has(referrerErr)
      ? referrerErr
      : '';
  const standardRefereeError =
    formik.touched.pointsRatioReferee &&
    typeof refereeErr === 'string' &&
    !crossFieldMessages.has(refereeErr)
      ? refereeErr
      : '';

  const ratioErrorMessage = crossFieldErrorMessage || standardReferrerError || standardRefereeError;

  /**
   * For fixed options (1:1 / 2:0 / 0:2) the ratio inputs are visible but disabled
   * and prefilled from the split values. For Other they are user-editable.
   */
  useEffect(() => {
    if (!currentAdjustmentType) return;
    if (currentAdjustmentType === PointsAdjustmentType.OTHER) return;

    const [referrer, referee] = parsePointsRatio(currentAdjustmentType);
    if (formik.values.pointsRatioReferrer !== referrer) {
      formik.setFieldValue('pointsRatioReferrer', referrer);
    }
    if (formik.values.pointsRatioReferee !== referee) {
      formik.setFieldValue('pointsRatioReferee', referee);
    }
    // We deliberately only respond to changes in the adjustment type.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAdjustmentType]);

  const handleAdjustmentTypeChange = (value: string | number | (string | number)[] | null) => {
    if (value === POINTS_ADJUSTMENT_OTHER) {
      if (formik.values.pointsRatioReferrer === '' || formik.values.pointsRatioReferrer == null) {
        formik.setFieldValue('pointsRatioReferrer', '');
      }
      if (formik.values.pointsRatioReferee === '' || formik.values.pointsRatioReferee == null) {
        formik.setFieldValue('pointsRatioReferee', '');
      }
    }
  };

  const adjustmentTypeField = (
    <FormikAutocomplete
      name="pointsAdjustmentType"
      label={view.pointsAdjustmentType}
      options={options?.length ? options : POINTS_ADJUSTMENT_OPTIONS}
      formik={formik}
      required
      disabled={isReadOnly}
      externalOnChange={handleAdjustmentTypeChange}
    />
  );

  return (
    <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
      <Grid container spacing={2} alignItems="flex-end">
        <Grid item xs={showRatioInputs ? 7 : 12}>
          {adjustmentTypeField}
        </Grid>
        {showRatioInputs && (
          <>
            <Grid item xs={2}>
              <FormikTextField
                name="pointsRatioReferrer"
                label={generateIOM.labels.pointsRatio}
                formik={formik}
                noGrid
                disabled={ratioInputsDisabled}
                inputProps={{ style: { textAlign: 'center' } }}
                hideHelperText
              />
            </Grid>
            <Grid item sx={{ width: 'auto', display: 'flex', alignItems: 'center', pb: 2 }}>
              <Typography sx={{ fontWeight: 600, color: 'text.secondary' }}>:</Typography>
            </Grid>
            <Grid item xs={2}>
              <FormikTextField
                name="pointsRatioReferee"
                formik={formik}
                noGrid
                disabled={ratioInputsDisabled}
                inputProps={{ style: { textAlign: 'center' } }}
                hideHelperText
              />
            </Grid>
            {ratioErrorMessage && (
              <Grid item xs={12} sx={{ pt: '0 !important' }}>
                <FormHelperText error sx={{ mx: 1.75 }}>
                  {ratioErrorMessage}
                </FormHelperText>
              </Grid>
            )}
          </>
        )}
      </Grid>
    </Grid>
  );
};

export default PointsAdjustmentTypeField;
