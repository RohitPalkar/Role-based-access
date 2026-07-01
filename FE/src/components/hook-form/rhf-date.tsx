import type { Dayjs } from 'dayjs';

import React from 'react';
import dayjs from 'dayjs';
import { Controller } from 'react-hook-form';
import customParseFormat from 'dayjs/plugin/customParseFormat';

import { Box } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';

dayjs.extend(customParseFormat);

type RHFDatePickerProps = Readonly<{
  name: string;
  label: string;
  defaultValue?: Dayjs | null;
  minDate?: any;
  maxDate?: any;
  required?: boolean;
  disabled?: boolean;
  showClear?: boolean;
  placeholder?: string;
}>;

export function RHFDatePicker({
  name,
  label,
  defaultValue = null,
  minDate,
  maxDate,
  required = false,
  disabled = false,
  showClear = false,
  placeholder,
}: RHFDatePickerProps) {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Controller
        name={name}
        defaultValue={defaultValue}
        render={({ field, fieldState: { error } }) => {
          const currentValue: Dayjs | null =
            field.value && dayjs(field.value).isValid() ? dayjs(field.value) : null;

          const handleDateChange = (date: Dayjs | null, context: any) => {
            if (context?.validationError === null || !context) {
              field.onChange(date ? date.format('YYYY-MM-DD') : '');
            }
          };

          return (
            <DesktopDatePicker
              disabled={disabled}
              name={field?.name}
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
              onChange={handleDateChange}
              onAccept={(date) => {
                field.onChange(date ? date.format('YYYY-MM-DD') : '');
              }}
              showDaysOutsideCurrentMonth
              fixedWeekNumber={6}
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !!error,
                  helperText: error ? error.message : '',
                  ...(placeholder === undefined ? {} : { placeholder }),
                  inputProps: {
                    readOnly: true,
                  },

                  //  Make whole field clickable
                  sx: {
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    '& input': {
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      userSelect: 'none', // optional UX improvement
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
          );
        }}
      />
    </LocalizationProvider>
  );
}
