import React from 'react';

import {
  Grid,
  Paper,
  Stack,
  Radio,
  FormLabel,
  TextField,
  RadioGroup,
  FormControl,
  FormControlLabel,
} from '@mui/material';

import { VoucherAmountType } from 'src/utils/constant';

interface EOIAmountBlockProps {
  title: string;
  amountTypeFieldName: string;
  amountFieldName: string;
  initialsFieldName: string;
  counterFieldName: string;
  amountLabel: string;
  amountPlaceholder: string;
  initialsLabel: string;
  initialsPlaceholder: string;
  counterLabel: string;
  counterPlaceholder: string;
  finalLabel: string;
  formik: any;
  fields: any;
  disabled?: boolean;
}

const EOIAmountBlock = ({
  title,
  amountTypeFieldName,
  amountFieldName,
  initialsFieldName,
  counterFieldName,
  amountLabel,
  amountPlaceholder,
  initialsLabel,
  initialsPlaceholder,
  counterLabel,
  counterPlaceholder,
  finalLabel,
  formik,
  fields,
  disabled = false,
}: EOIAmountBlockProps) => {
  const selectedType = formik.values[amountTypeFieldName];
  const isFixed = selectedType === VoucherAmountType.FIXED;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        border: '1px solid #e0e0e0',
        borderRadius: 2,
      }}
    >
      <Stack spacing={3}>
        {/* ================= FIRST ROW: TYPE + AMOUNT ================= */}
        <Grid container spacing={3} alignItems="flex-start">
          {/* Amount Type */}
          <Grid item xs={12} md={6}>
            <FormControl component="fieldset" fullWidth>
              <FormLabel
                component="legend"
                sx={{
                  fontWeight: 600,
                  fontSize: '14px',
                  color: '#1C252E',
                  mb: 1,
                }}
              >
                {title} Amount Type{' '}
                <span style={{ color: '#FF0000' }}>*</span>
              </FormLabel>

              <RadioGroup
                row
                name={amountTypeFieldName}
                value={selectedType}
                onChange={(e) =>
                  formik.setFieldValue(
                    amountTypeFieldName,
                    e.target.value
                  )
                }
              >
                {fields.voucherAmountType.options.map((option: string) => (
                  <FormControlLabel
                    key={option}
                    value={option}
                    control={
                      <Radio
                        disabled={disabled}
                        sx={{
                          color: '#637381',
                          '&.Mui-checked': {
                            color: '#1A407D',
                          },
                        }}
                      />
                    }
                    label={option}
                  />
                ))}
              </RadioGroup>
            </FormControl>
          </Grid>

          {/* Amount Field */}
          <Grid item xs={12} md={6}>
            {isFixed && (
              <TextField
                fullWidth
                label={
                  <>
                    {amountLabel}{' '}
                    <span style={{ color: '#FF0000' }}>*</span>
                  </>
                }
                name={amountFieldName}
                value={
                  formik.values[amountFieldName]
                    ? Number(
                        formik.values[amountFieldName]
                      ).toLocaleString('en-IN')
                    : ''
                }
                onChange={(e) => {
                  const value = e.target.value
                    .replaceAll(/\D/g, '')
                    .slice(0, 10);
                  formik.setFieldValue(amountFieldName, value);
                }}
                onBlur={formik.handleBlur}
                error={
                  formik.touched[amountFieldName] &&
                  Boolean(formik.errors[amountFieldName])
                }
                helperText={
                  formik.touched[amountFieldName] &&
                  (formik.errors[amountFieldName] as string)
                }
                placeholder={amountPlaceholder}
                disabled={disabled}
                inputProps={{
                  inputMode: 'numeric',
                }}
              />
            )}
          </Grid>
        </Grid>

        {/* ================= SECOND ROW: INITIALS + COUNTER ================= */}
        <Grid container spacing={2}>
          {/* Initials */}
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label={
                <>
                  {initialsLabel}{' '}
                  <span style={{ color: '#FF0000' }}>*</span>
                </>
              }
              name={initialsFieldName}
              value={formik.values[initialsFieldName]}
              onChange={(e) =>
                formik.setFieldValue(
                  initialsFieldName,
                  e.target.value
                    .toUpperCase()
                    .replaceAll(/[^A-Z0-9-]/g, '')
                    .slice(0, 50)
                )
              }
              onBlur={formik.handleBlur}
              error={
                formik.touched[initialsFieldName] &&
                Boolean(formik.errors[initialsFieldName])
              }
              helperText={
                formik.touched[initialsFieldName] &&
                (formik.errors[initialsFieldName] as string)
              }
              placeholder={initialsPlaceholder}
              disabled={disabled}
            />
          </Grid>

          {/* Counter */}
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label={
                <>
                  {counterLabel}{' '}
                  <span style={{ color: '#FF0000' }}>*</span>
                </>
              }
              name={counterFieldName}
              value={formik.values[counterFieldName]}
              onChange={(e) =>
                formik.setFieldValue(
                  counterFieldName,
                  e.target.value.replaceAll(/\D/g, '')
                )
              }
              onBlur={formik.handleBlur}
              error={
                formik.touched[counterFieldName] &&
                Boolean(formik.errors[counterFieldName])
              }
              helperText={
                formik.touched[counterFieldName] &&
                (formik.errors[counterFieldName] as string)
              }
              placeholder={counterPlaceholder}
              disabled={disabled}
            />
          </Grid>

          {/* Final ID */}
          <Grid item xs={12} sm={5}>
            <TextField
              fullWidth
              disabled
              sx={{ backgroundColor: '#f0f0f0' }}
              label={finalLabel}
              value={
                formik.values[initialsFieldName] &&
                formik.values[counterFieldName]
                  ? `${formik.values[initialsFieldName]}-${formik.values[counterFieldName]}`
                  : ''
              }
            />
          </Grid>
        </Grid>
      </Stack>
    </Paper>
  );
};

export default EOIAmountBlock;
