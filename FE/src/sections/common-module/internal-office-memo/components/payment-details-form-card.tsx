import type { OptionType } from 'src/components/formik-autocomplete/FormikAutocomplete';

import React from 'react';

import { Box, Card, Grid, Checkbox, Typography, FormControlLabel } from '@mui/material';

import { POINTS_ADJUSTMENT_OTHER } from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';

import NewDropzone from 'src/components/dropzone/NewDropzone';
import { FormikTextField } from 'src/components/formik-textfield/formik-textfield';

import PointsAdjustmentTypeField from './points-adjustment-type-field';

const { generateIOM, view } = uiText.internalOfficeMemo;

type EditedFlags = {
  basicSalePrice?: boolean;
  brokerage?: boolean;
  pointsAdjustmentType?: boolean;
};

type Props = {
  formik: any;
  isEditable: boolean;
  isCRM: boolean;
  onDelete: (fieldName: any, index: any, deleteKey?: any) => Promise<void>;
  editedFlags?: EditedFlags;
  adjustmentTypeOptions?: OptionType[];
  isApprovalProofMandatory?: boolean;
};

// const handleViewProof = (url: string | null | undefined) => {
//   if (!url) return;
//   window.open(url, '_blank', 'noopener,noreferrer');
// };

const PaymentDetailsFormCard = ({
  formik,
  isEditable,
  isCRM,
  onDelete,
  editedFlags = {},
  adjustmentTypeOptions,
  isApprovalProofMandatory = false,
}: Props) => {
  const adjustmentType = formik?.values?.pointsAdjustmentType;
  const isOtherSelected = adjustmentType === POINTS_ADJUSTMENT_OTHER;
  const isDeviation = Boolean(formik?.values?.isDeviation);
  // const approvalProofUrl: string | null = formik?.values?.approvalProof || null;
  const showProofDeleteIcon = Boolean(isEditable && isCRM);
  // Force the section visible whenever the API already supplied a proof path
  // (mapped from `iom.referralPointsEditReason` into `formik.values.approvalProof`)
  // so previously uploaded proofs remain visible even when no edit trigger is active.
  const hasExistingProof = Boolean(formik?.values?.approvalProof);
  // Mirror the mandatory rule: brokerage edited OR adjustment type ≠ 1:1.
  // Existing proofs stay visible even when no edit trigger is active.
  const showApprovalProof = isApprovalProofMandatory || hasExistingProof;

  const handleDeviationToggle = (_event: React.SyntheticEvent, checked: boolean) => {
    formik.setFieldValue('isDeviation', checked);
    if (checked) {
      formik.setFieldValue('pointsRatioReferrer', '');
      formik.setFieldValue('pointsRatioReferee', '');
    }
  };

  return (
    <Card sx={{ p: 2 }}>
      <Typography sx={{ fontSize: '16px', fontWeight: 600, mb: 3 }}>
        {view.paymentDetails}
      </Typography>
      <Grid container spacing={2}>
        <FormikTextField
          name="basicSalePrice"
          label={view.basicSalePrice}
          formik={formik}
          required
          disabled={!isEditable}
          formatAsNumber
          isEdited={Boolean(editedFlags.basicSalePrice)}
          editedTooltip={generateIOM.editedTooltip.basicSalePrice}
        />
        <FormikTextField
          name="brokeragePercent"
          label={generateIOM.labels.brokeragePercent}
          formik={formik}
          required
          disabled={!isEditable}
          isEdited={Boolean(editedFlags.brokerage)}
          editedTooltip={generateIOM.editedTooltip.brokerage}
        />
        <FormikTextField
          name="brokerageAmount"
          label={view.brokerageAmount}
          formik={formik}
          required
          disabled
          formatAsNumber
        />
        <PointsAdjustmentTypeField
          formik={formik}
          isEditable={isEditable}
          isEdited={Boolean(editedFlags.pointsAdjustmentType)}
          editedTooltip={generateIOM.editedTooltip.pointsAdjustmentType}
          options={adjustmentTypeOptions}
        />
        {isOtherSelected && (
          <>
            <Grid
              item
              xs={false}
              sm={6}
              md={6}
              lg={6}
              xl={6}
              sx={{ display: { xs: 'none', sm: 'block' }, py: '0 !important' }}
            />
            <Grid item xs={12} sm={6} md={6} lg={6} xl={6} sx={{ py: '0 !important' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="isDeviation"
                    checked={isDeviation}
                    onChange={handleDeviationToggle}
                    disabled={!isEditable}
                  />
                }
                label={generateIOM.deviationCheckboxLabel}
                sx={{ ml: 0 }}
              />
            </Grid>
          </>
        )}
        {!isDeviation && (
          <>
            <FormikTextField
              name="pointsToReferrer"
              label={generateIOM.labels.pointsToReferrer}
              formik={formik}
              disabled
            />
            <FormikTextField
              name="pointsReferrerAmount"
              label={generateIOM.labels.pointsReferrerAmount}
              formik={formik}
              required
              disabled
              formatAsNumber
            />
            <FormikTextField
              name="pointsToReferee"
              label={generateIOM.labels.pointsToReferee}
              formik={formik}
              required
              disabled
            />
            <FormikTextField
              name="pointsRefereeAmount"
              label={generateIOM.labels.pointsRefereeAmount}
              formik={formik}
              required
              disabled
              formatAsNumber
            />
          </>
        )}
        {showApprovalProof && (
          <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <NewDropzone
                  name="approvalProof"
                  file
                  required={isApprovalProofMandatory}
                  showAsterik={isApprovalProofMandatory}
                  fieldName={generateIOM.approvalProof}
                  fileValue={formik?.values?.approvalProof || ''}
                  handleupload={() => {}}
                  handledelete={onDelete}
                  documentType="both"
                  pdfMaxSize10MB
                  isOther={false}
                  path={formik?.values?.approvalProof || ''}
                  id={formik?.values?.approvalProof || ''}
                  formik={formik}
                  uploadText={generateIOM.approvalProof}
                  errorMarginLeft={2}
                  disabled={!showProofDeleteIcon}
                />
                <Typography
                  variant="caption"
                  sx={{ display: 'block', mt: 0.5, ml: 2, color: 'text.secondary' }}
                >
                  {generateIOM.approvalProofHelper}
                </Typography>
              </Box>
              {/* {approvalProofUrl && (
                <Button
                  variant="outlined"
                  size="medium"
                  onClick={() => handleViewProof(approvalProofUrl)}
                  sx={{ mt: 1, whiteSpace: 'nowrap' }}
                >
                  {generateIOM.viewProof}
                </Button>
              )} */}
            </Box>
          </Grid>
        )}
      </Grid>
    </Card>
  );
};

export default PaymentDetailsFormCard;
