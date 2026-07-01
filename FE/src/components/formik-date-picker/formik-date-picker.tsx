import type { Dayjs } from 'dayjs';
import type { FormikProps } from 'formik';

import React from 'react';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

import { Box } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';

dayjs.extend(customParseFormat);

type FormikDatePickerProps = Readonly<{
  name: string;
  label: string;
  formik: FormikProps<any>;
  defaultValue?: Dayjs | null;
  minDate?: any;
  maxDate?: any;
  required?: boolean;
  disabled?: boolean;
  showClear?: boolean;
  placeholder?: string;
}>;

const FormikDatePicker = ({
  name,
  label,
  formik,
  defaultValue = null,
  minDate,
  maxDate,
  required = false,
  disabled = false,
  showClear = false,
  placeholder,
}: FormikDatePickerProps) => {
  const value = formik.values[name];

  const currentValue: Dayjs | null = value && dayjs(value).isValid() ? dayjs(value) : defaultValue;

  const error =
    formik.touched[name] && typeof formik.errors[name] === 'string' ? formik.errors[name] : '';

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DesktopDatePicker
        disabled={disabled}
        label={
          <Box
            component="span"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              cursor: disabled ? 'not-allowed' : 'default',
            }}
          >
            {label}

            {required && (
              <Box component="span" sx={{ color: 'error.main' }}>
                *
              </Box>
            )}
          </Box>
        }
        value={currentValue}
        format="DD/MM/YYYY"
        minDate={minDate}
        maxDate={maxDate}
        onChange={(date, context) => {
          if (context?.validationError === null || !context) {
            formik.setFieldValue(name, date ? date.format('YYYY-MM-DD') : '');
          }
        }}
        onAccept={(date) => {
          formik.setFieldValue(name, date ? date.format('YYYY-MM-DD') : '');
        }}
        onClose={() => {
          formik.setFieldTouched(name, true);
        }}
        showDaysOutsideCurrentMonth
        fixedWeekNumber={6}
        slotProps={{
          textField: {
            fullWidth: true,
            error: !!error,
            helperText: error,
            ...(placeholder === undefined ? {} : { placeholder }),
            inputProps: {
              readOnly: true,
            },
            sx: {
              cursor: disabled ? 'not-allowed' : 'pointer',
              '& input': {
                cursor: disabled ? 'not-allowed' : 'pointer',
                userSelect: 'none',
              },
            },
          },
          actionBar: {
            actions: showClear ? ['clear'] : [],
            sx: {
              '& .MuiButton-text': {
                backgroundColor: '#1A407D !important',
                color: '#fff',
                '&:hover': {
                  backgroundColor: '#1A407D',
                },
              },
            },
          },
          day: {
            sx: {
              '&.MuiPickersDay-dayOutsideMonth': {
                color: 'text.disabled',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              },
            },
          },
        }}
      />
    </LocalizationProvider>
  );
};

export default FormikDatePicker;
