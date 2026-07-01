import type { FormikProps } from 'formik';
import type { GridProps } from '@mui/material';
import type { ProjectOption } from 'src/services/rm-panel/eoi-service';

import React from 'react';

import { Grid, Radio, Divider, RadioGroup, Typography, FormControlLabel } from '@mui/material';

import {
  PRIMARY_SOURCE,
  SHOW_REFERRER_OPTIONS,
  REFERRER_RADIO_OPTIONS,
  SHOW_REFERRAL_AT_EOI_OPTIONS,
} from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';

import { Field } from 'src/components/hook-form';
import { FormikTextField } from 'src/components/formik-textfield/formik-textfield';
import FormikAutocomplete from 'src/components/formik-autocomplete/FormikAutocomplete';

type Props = {
  formik: FormikProps<any>;

  /** Parent controls edit/create */
  isEditable?: boolean;

  /** Dropdown data */
  cpNameOptions?: any[];
  projectOptions?: ProjectOption[];
  campaigns?: any[];

  /** External flags(form payment ref id) */
  isVoucherFetched?: boolean;
  voucherLoading?: boolean;

  /** Callbacks */
  onCpSearch?: (value: string) => void;
  onCpClear?: () => void;
  onVoucherFetch?: () => void;
  onResetReferral?: () => void;
  paymentRefIdclearIconDisabled?: boolean;
  paymentRefIdbuttonDisabled?: boolean;
  gridProps?: GridProps;
};

const PrimarySourceConditionalFields = ({
  formik,
  isEditable = true,
  cpNameOptions = [],
  projectOptions = [],
  campaigns = [],
  isVoucherFetched = false,
  voucherLoading = false,
  paymentRefIdbuttonDisabled,
  paymentRefIdclearIconDisabled,
  gridProps,
  onCpSearch,
  onCpClear,
  onVoucherFetch,
  onResetReferral,
}: Props) => {
  const { basicDetails } = uiText.EOIJson.createEOI.form;
  const { primarySource } = formik.values;
  const { referrer } = formik.values;
  const isPurvaPrivilege = primarySource === PRIMARY_SOURCE.PurvaPrivilege;
  const referralFormVisible = SHOW_REFERRAL_AT_EOI_OPTIONS.includes(primarySource);
  const disableField = !isEditable;

  const defaultGridLayout = { xs: 12, sm: 6, md: 6, lg: 6, xl: 6 };

  const gridLayout = gridProps || defaultGridLayout;

  return (
    <>
      {/* CHANNEL PARTNER */}
      {primarySource === PRIMARY_SOURCE.ChannelPartner && (
        <Grid item {...gridLayout}>
          <FormikAutocomplete
            label={basicDetails.label.cpName}
            name="channelPartner"
            formik={formik}
            options={cpNameOptions}
            required
            disabled={disableField}
            onInputChange={
              onCpSearch
                ? (_e, value, reason) => {
                    if (reason === 'input') {
                      onCpSearch(value);
                    }

                    if (reason === 'clear') {
                      onCpClear?.();
                    }
                  }
                : undefined
            }
          />
        </Grid>
      )}

      {/* REFERRER SECTION */}
      {SHOW_REFERRER_OPTIONS.includes(primarySource) && (
        <>
          <Grid item xs={12}>
            <Divider sx={{ borderBottom: '1px dashed #DADADA', mt: 1 }} />

            <RadioGroup row name="referrer" value={referrer} onChange={formik.handleChange}>
              <FormControlLabel
                value={REFERRER_RADIO_OPTIONS.BUYING_FOR_SELF}
                control={<Radio disabled={disableField} />}
                label={basicDetails.label.buyingForSelf}
              />

              <FormControlLabel
                value={REFERRER_RADIO_OPTIONS.REFERRED_BY_CUSTOMER}
                control={<Radio disabled={disableField} />}
                label={basicDetails.label.referredByCustomer}
              />

              {isPurvaPrivilege && (
                <FormControlLabel
                  value={REFERRER_RADIO_OPTIONS.REFERRAL_OTHERS}
                  control={<Radio disabled={disableField} />}
                  label={basicDetails.label.referralOthers}
                />
              )}
            </RadioGroup>
          </Grid>

          {/* BUYING / REFERRED */}
          {(referrer === REFERRER_RADIO_OPTIONS.BUYING_FOR_SELF ||
            referrer === REFERRER_RADIO_OPTIONS.REFERRED_BY_CUSTOMER) && (
            <>
              <FormikTextField
                gridProps={gridLayout}
                name="customerName"
                label={basicDetails.label.customerName}
                required
                formik={formik}
                disabled={disableField}
              />

              <Grid item {...gridLayout}>
                <Field.Phone
                  name="customerMobileNumber"
                  countryCodeName="customerCountryCode"
                  country="IN"
                  formik={formik}
                  required
                  disabled={disableField}
                />
              </Grid>

              <FormikTextField
                gridProps={gridLayout}
                name="customerEmail"
                label={basicDetails.label.customerEmail}
                required
                formik={formik}
                disabled={disableField}
              />

              <Grid item {...gridLayout}>
                <FormikAutocomplete
                  label={basicDetails.label.project}
                  name="project"
                  required
                  disabled={disableField}
                  formik={formik}
                  options={projectOptions.map((p) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                />
              </Grid>

              <FormikTextField
                gridProps={gridLayout}
                name="unitNumber"
                label={basicDetails.label.unitNumber}
                required
                formik={formik}
                disabled={disableField}
              />

              {referrer === REFERRER_RADIO_OPTIONS.REFERRED_BY_CUSTOMER && (
                <FormikTextField
                  gridProps={gridLayout}
                  name="referredBy"
                  label={basicDetails.label.referredBy}
                  required
                  formik={formik}
                  disabled={disableField}
                />
              )}
            </>
          )}

          {/* REFERRAL OTHERS */}
          {referrer === REFERRER_RADIO_OPTIONS.REFERRAL_OTHERS && (
            <FormikTextField
              gridProps={gridLayout}
              name="activityName"
              label={basicDetails.label.activityName}
              required
              formik={formik}
              disabled={disableField}
            />
          )}
        </>
      )}

      {/* PURVA CHAMPION */}
      {primarySource === PRIMARY_SOURCE.PurvaChampion && (
        <>
          <Grid item xs={12}>
            <Divider sx={{ borderBottom: '1px dashed #DADADA' }} />
            <Typography variant="body2" mt={2}>
              {basicDetails.purvaChampion}
            </Typography>
          </Grid>

          <FormikTextField
            gridProps={gridLayout}
            name="employeeName"
            label={basicDetails.label.employeeName}
            required
            formik={formik}
            disabled={disableField}
          />

          <FormikTextField
            gridProps={gridLayout}
            name="employeeId"
            label={basicDetails.label.employeeId}
            formik={formik}
            disabled={disableField}
          />
        </>
      )}

      {/* REFERRAL FORM */}
      {referralFormVisible && (
        <>
          <Grid item xs={12}>
            <Divider sx={{ borderBottom: '1px dashed #DADADA', my: 1 }} />
            <Typography sx={{ fontWeight: 600 }}>{basicDetails.referralFormTitle}</Typography>
          </Grid>

          <Grid item {...gridLayout}>
            <FormikAutocomplete
              label={basicDetails.label.campaign}
              name="referralCampaign"
              required
              disabled={disableField || isVoucherFetched}
              formik={formik}
              options={campaigns.map((c) => ({
                value: String(c.value),
                label: c.name,
              }))}
            />
          </Grid>

          <FormikTextField
            gridProps={gridLayout}
            name="uniqueRefId"
            label={basicDetails.label.uniqueRefId}
            required
            formik={formik}
            disabled={disableField || isVoucherFetched || !isEditable || paymentRefIdbuttonDisabled}
            isButton
            buttonOnClick={onVoucherFetch}
            buttonTitle={uiText.button.fetch}
            buttonDisabled={paymentRefIdbuttonDisabled  || !isEditable}
            clearIconDisabled={paymentRefIdclearIconDisabled || !isEditable}
            onClear={onResetReferral}
            loading={voucherLoading}
            btnWidth="150px"
          />

          <FormikTextField
            gridProps={gridLayout}
            name="customerName"
            label={basicDetails.label.customerName}
            required
            formik={formik}
            disabled={disableField || isVoucherFetched}
          />

          <Grid item {...gridLayout}>
            <Field.Phone
              name="customerMobileNumber"
              countryCodeName="customerCountryCode"
              country="IN"
              formik={formik}
              required
              disabled={disableField || isVoucherFetched}
            />
          </Grid>

          <FormikTextField
            gridProps={gridLayout}
            name="customerEmail"
            label={basicDetails.label.customerEmail}
            required
            formik={formik}
            disabled={disableField || isVoucherFetched}
          />
        </>
      )}
    </>
  );
};

export default PrimarySourceConditionalFields;
