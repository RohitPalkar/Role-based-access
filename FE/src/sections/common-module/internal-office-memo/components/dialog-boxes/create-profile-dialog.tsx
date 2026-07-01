import type { AddressDetails } from 'src/components/google-maps-autocomplete/RHFGoogleMapsAutocomplete';

import * as yup from 'yup';
import { useFormik } from 'formik';
import React, { useEffect } from 'react';

import { Box, Grid, Button } from '@mui/material';

import uiText from 'src/locales/langs/en/common.json';

import { Field } from 'src/components/hook-form';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { FormikTextField } from 'src/components/formik-textfield/formik-textfield';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';
import GoogleMapsAutocomplete from 'src/components/google-maps-autocomplete/GoogleMapsAutocomplete';

// ----------------------------------------------------------------------

const copy = uiText.internalOfficeMemo.addLoyaltyPoints.createProfile;

const genderOptions = [
  { label: copy.gender.male, value: 'Male' },
  { label: copy.gender.female, value: 'Female' },
  { label: copy.gender.other, value: 'Other' },
];

const validationSchema = yup.object({
  firstName: yup.string()
    .trim()
    .required(copy.validation.firstNameRequired),
  lastName: yup.string()
    .trim()
    .required(copy.validation.lastNameRequired),
  sfdcId: yup.string(),
  gender: yup.string().nullable(),
  emailId: yup.string()
    .trim()
    .email(copy.validation.invalidEmail)
    .required(copy.validation.emailRequired),
  address1: yup.string().trim(),
  address2: yup.string().trim(),
  pinCode: yup
    .string()
    .trim()
    .test(
      'pinCode',
      copy.validation.invalidPinCode,
      (value) => !value || /^\d{6}$/.test(value)
    ),
  location: yup.string().trim(),
  projectName: yup.string()
    .trim()
    .required(copy.validation.projectNameRequired),
  unitNo: yup.string()
    .trim()
    .required(copy.validation.unitNoRequired),
});

type Props = Readonly<{
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  type: 'referrer' | 'referee';
}>;

const CreateProfileDialog = ({
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
  type,
}: Props) => {
  const isReferrer = type === 'referrer';

  const formik = useFormik({
    initialValues: {
      firstName: '',
      lastName: '',
      sfdcId: '',
      gender: null as string | null,
      countryCode: '+91',
      mobileNo: '',
      emailId: '',
      address1: '',
      address2: '',
      pinCode: '',
      location: '',
      projectName: '',
      unitNo: '',
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: (values) => {
      console.log(values);

      onSubmit();
    },
  });

  useEffect(() => {
    if (open) {
      formik.resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Clear other address fields if Address 1 is cleared
  useEffect(() => {
    if (!formik.values.address1?.trim()) {
      formik.setFieldValue('address2', '');
      formik.setFieldValue('pinCode', '');
      formik.setFieldValue('location', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.address1]);

  const handlePlaceChanged = (data: AddressDetails) => {
    formik.setFieldValue('address1', data.areaName || '');
    formik.setFieldValue('pinCode', data.pinCode || '');
  };

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      showCloseButton
      showDivider
      leftAlignTitle
      isLarge
      titlePadding="24px"
      title={isReferrer ? copy.createReferrerTitle : copy.createRefereeTitle}
      cancelLabel={uiText.button.cancel}
      content={
        <Box component="form" onSubmit={formik.handleSubmit}>
          <Grid container spacing={2}>
            <FormikTextField
              name="firstName"
              label={copy.labels.firstName}
              required
              formik={formik}
              placeholder={copy.placeholders.firstName}
            />
            <FormikTextField
              name="lastName"
              label={copy.labels.lastName}
              required
              formik={formik}
              placeholder={copy.placeholders.lastName}
            />
            <FormikTextField
              name="sfdcId"
              label={copy.labels.sfdcId}
              formik={formik}
              placeholder={copy.placeholders.sfdcId}
            />
            <Grid item xs={12} md={6}>
              <ControlledAutocomplete
                label={copy.labels.gender}
                options={genderOptions}
                value={formik.values.gender}
                onChange={(value) => formik.setFieldValue('gender', value)}
                placeholder={copy.select}
                required={false}
                error={Boolean(formik.touched.gender && formik.errors.gender)}
                helperText={formik.touched.gender ? formik.errors.gender : ''}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Field.Phone
                name="mobileNo"
                countryCodeName="countryCode"
                formik={formik}
                label={copy.labels.mobileNo}
                placeholder={copy.placeholders.mobileNo}
                country="IN"
                disabled
              />
            </Grid>
            <FormikTextField
              name="emailId"
              label={copy.labels.emailId}
              required
              formik={formik}
              placeholder={copy.placeholders.emailId}
            />
            <Grid item xs={12} md={6}>
              <GoogleMapsAutocomplete
                name="address1"
                formik={formik}
                label={copy.labels.address}
                variant="outlined"
                TextFieldProps={{
                  className: 'custom-input',
                }}
                onSelect={handlePlaceChanged}
              />
            </Grid>
            <FormikTextField
              name="address2"
              label={copy.labels.address2}
              formik={formik}
              placeholder={copy.placeholders.address2}
            />
            <FormikTextField
              name="pinCode"
              label={copy.labels.pinCode}
              formik={formik}
              placeholder={copy.placeholders.pinCode}
              inputProps={{
                maxLength: 6,
                inputMode: 'numeric',
              }}
              onChange={(e) =>
                formik.setFieldValue(
                  'pinCode',
                  e.target.value.replace(/\D/g, '')
                )
              }
            />
            <FormikTextField
              name="location"
              label={copy.labels.location}
              formik={formik}
              placeholder={copy.placeholders.location}
            />
            <FormikTextField
              name="projectName"
              label={copy.labels.projectName}
              required
              formik={formik}
              placeholder={copy.placeholders.projectName}
            />
            <FormikTextField
              name="unitNo"
              label={copy.labels.unitNo}
              required
              formik={formik}
              placeholder={copy.placeholders.unitNo}
            />
          </Grid>
        </Box>
      }
      action={
        <Button
          variant="contained"
          className="primaryBtn"
          disabled={isSubmitting}
          onClick={formik.submitForm}
          sx={{
            minWidth: { xs: '120px', lg: '204px' },
            height: '48px',
          }}
        >
          {copy.submit}
        </Button>
      }
    />
  );
};

export default CreateProfileDialog;