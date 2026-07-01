import type { FormikProps } from 'formik';
import type { FormValues } from 'src/pages/crm/dashboard/agreement-eSignature-edit';

import React from 'react';
import { FieldArray } from 'formik';

import { RemoveCircleOutline } from '@mui/icons-material';
import {
  Box,
  Grid,
  TextField,
  Typography,
  IconButton,
  Autocomplete,
  FormHelperText,
} from '@mui/material';

import { useAppSelector } from 'src/hooks/use-redux';

import { FormikTextField } from 'src/components/formik-textfield/formik-textfield';
import { agreementSanitizedChange } from 'src/components/formik-textfield/agreement-sanitized-change';

interface Props {
  formik: FormikProps<FormValues>;
}

const InternalInviteesFieldArray: React.FC<Props> = ({ formik }) => {
  const { internalOptions } = useAppSelector((state) => state.agreements);
  const nameError =
    (formik?.errors?.internalInvitees as any)?.[0]?.name &&
    (formik?.touched?.internalInvitees as any)?.[0]?.name
      ? (formik?.errors?.internalInvitees as any)?.[0]?.name
      : '';

  return (
    <FieldArray
      name="internalInvitees"
      render={(arrayHelpers) => (
        <Box
          sx={{
            border: '1px solid rgba(26, 64, 125, 0.1)',
            borderRadius: '10px',
            p: { xs: 2, sm: 3, md: 4 },
            mb: 3,
            width: '100%',
          }}
        >
          <Typography sx={{ fontSize: '16px', fontWeight: '600', mb: 2 }}>
            Internal Signatory
          </Typography>

          {formik?.values?.internalInvitees?.map((invitee, index) => (
            <Grid container spacing={2} key={index} alignItems="center" mb={2}>
              {/* Remove button */}
              {formik?.values?.internalInvitees?.length > 1 && (
                <Grid item xs={12} sm={1}>
                  <IconButton color="error" onClick={() => arrayHelpers?.remove(index)}>
                    <RemoveCircleOutline />
                  </IconButton>
                </Grid>
              )}

              {/* Name Autocomplete */}
              <Grid item xs={12} sm={formik?.values?.internalInvitees?.length > 1 ? 3 : 4}>
                <Autocomplete
                  options={internalOptions || []}
                  getOptionLabel={(option) => option?.name || ''}
                  value={
                    internalOptions?.find(
                      (opt) => opt?.id === formik.values.internalInvitees[index]?.id
                    ) || null
                  }
                  onChange={(_, newValue) => {
                    if (newValue) {
                      formik.setFieldValue(`internalInvitees[${index}].id`, newValue.id);
                      formik.setFieldValue(`internalInvitees[${index}].name`, newValue.name);
                      formik.setFieldValue(`internalInvitees[${index}].email`, newValue.email);
                      formik.setFieldValue(
                        `internalInvitees[${index}].phone`,
                        newValue.contactNumber
                      );
                      formik.setFieldValue(
                        `internalInvitees[${index}].countryCode`,
                        '+91' // or parse from number if required
                      );
                    } else {
                      // Reset if cleared
                      formik.setFieldValue(`internalInvitees[${index}].id`, '');
                      formik.setFieldValue(`internalInvitees[${index}].name`, '');
                      formik.setFieldValue(`internalInvitees[${index}].email`, '');
                      formik.setFieldValue(`internalInvitees[${index}].phone`, '');
                      formik.setFieldValue(`internalInvitees[${index}].countryCode`, '+91');
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Name"
                      required
                      placeholder="Select Internal Signatory"
                      className="requiredField custom-input"
                    />
                  )}
                />
                {nameError && (
                  <FormHelperText error sx={{ mt: 0 }}>
                    {nameError}
                  </FormHelperText>
                )}
              </Grid>

              {/* Email */}
              <Grid item xs={12} sm={4}>
                <FormikTextField
                  formik={formik}
                  name={`internalInvitees[${index}].email`}
                  label="Email ID"
                  placeholder="Enter email id"
                  textFieldType="email"
                  required
                  disabled
                  noGrid
                />
              </Grid>

              {/* Phone */}
              <Grid item xs={12} sm={4}>
                <FormikTextField
                  formik={formik}
                  name={`internalInvitees[${index}].phone`}
                  label="Phone Number"
                  placeholder="Enter Phone Number"
                  onChange={agreementSanitizedChange(
                    formik,
                    `internalInvitees[${index}].phone`,
                    'numeric'
                  )}
                  required
                  disabled
                  noGrid
                />
              </Grid>
            </Grid>
          ))}
        </Box>
      )}
    />
  );
};

export default InternalInviteesFieldArray;
