// components/phase/PhaseEditPopover.tsx

import dayjs from 'dayjs';
import React, { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';

import Box from '@mui/material/Box';
import Radio from '@mui/material/Radio';
import Button from '@mui/material/Button';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { getMinMaxDateForFilter } from 'src/utils/helper';

import { Field } from 'src/components/hook-form';
import { CustomPopover } from 'src/components/custom-popover';

type Props = Readonly<{
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onApply: () => void;
  skipLaunch: boolean;
  sustenanceDate: string | null;
  launchStartDate: string | null;
  launchEndDate: string | null;
  onSkipLaunchChange: (checked: boolean) => void;
  onSustenanceDateChange: (date: string | null) => void;
  onLaunchStartDateChange: (date: string | null) => void;
  onLaunchEndDateChange: (date: string | null) => void;
}>;

export function PhaseEditPopover({
  open,
  anchorEl,
  onClose,
  onApply,
  skipLaunch,
  sustenanceDate,
  launchStartDate,
  launchEndDate,
  onSkipLaunchChange,
  onSustenanceDateChange,
  onLaunchStartDateChange,
  onLaunchEndDateChange,
}: Props) {
  const { startYearDate, endYearDate } = getMinMaxDateForFilter();

  // Set up form with default values and validation
  const methods = useForm({
    defaultValues: {
      sustenanceDate: sustenanceDate || null,
      launchStartDate: launchStartDate || null,
      launchEndDate: launchEndDate || null,
    },

    mode: 'onChange', // Enable real-time validation
  });

  const {
    watch,
    setValue,
    formState: { errors },
  } = methods;
  const watchedSustenanceDate = watch('sustenanceDate');
  const watchedLaunchStartDate = watch('launchStartDate');
  const watchedLaunchEndDate = watch('launchEndDate');

  // Update form when props change
useEffect(() => {
  setValue('sustenanceDate', sustenanceDate || null);
  setValue('launchStartDate', launchStartDate || null);
  setValue('launchEndDate', launchEndDate || null);
}, [sustenanceDate, launchStartDate, launchEndDate, setValue]);


 useEffect(() => {
  if (watchedSustenanceDate !== sustenanceDate) {
    onSustenanceDateChange(watchedSustenanceDate || null);
  }
}, [watchedSustenanceDate, sustenanceDate, onSustenanceDateChange]);

useEffect(() => {
  if (watchedLaunchStartDate !== launchStartDate) {
    onLaunchStartDateChange(watchedLaunchStartDate || null);
  }
}, [watchedLaunchStartDate, launchStartDate, onLaunchStartDateChange]);

useEffect(() => {
  if (watchedLaunchEndDate !== launchEndDate) {
    onLaunchEndDateChange(watchedLaunchEndDate || null);
  }
}, [watchedLaunchEndDate, launchEndDate, onLaunchEndDateChange]);

  // Custom validation logic
const isFormValid = () => {
  if (skipLaunch) {
    return !!watchedSustenanceDate;
  }

  const hasLaunchRange = !!watchedLaunchStartDate && !!watchedLaunchEndDate;

  return hasLaunchRange;
};

  // Handle apply with validation
  const handleApply = () => {
    if (isFormValid()) {
      onApply();
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <FormProvider {...methods}>
        <CustomPopover
          open={open}
          anchorEl={anchorEl}
          onClose={onClose}
          slotProps={{ arrow: { placement: 'top-center' } }}
        >
          <Box sx={{ p: 2, width: { xs: '100%', sm: 380 } }}>
            <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
              Edit Launch Phase
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>

              <RadioGroup
                value={skipLaunch ? 'skip' : 'not-skip'}
                onChange={(e) => onSkipLaunchChange(e.target.value === 'skip')}
                name="skipLaunch"
                row
              >
                <FormControlLabel
                  value="not-skip"
                  control={<Radio />}
                  label="Edit Launch Period"
                />
                <FormControlLabel
                  value="skip"
                  control={<Radio />}
                  label="Skip Launch Phase"
                />
              </RadioGroup>
            </FormControl>

            {/* Launch Date Range - Show only when launch is not skipped */}
            {!skipLaunch && (
              <>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                  Launch Duration
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <Field.Date
                    name="launchStartDate"
                    minDate={startYearDate}
                    maxDate={endYearDate}
                    label="Launch Start Date"
                    required
                  />
                  {errors.launchStartDate && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1 }}>
                      {errors.launchStartDate.message}
                    </Typography>
                  )}
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <Field.Date
                    name="launchEndDate"
                    minDate={watchedLaunchStartDate ? dayjs(watchedLaunchStartDate) : startYearDate}
                    maxDate={endYearDate}
                    label="Launch End Date"
                    required
                  />
                  {errors.launchEndDate && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1 }}>
                      {errors.launchEndDate.message}
                    </Typography>
                  )}
                </FormControl>
              </>
            )}
            {skipLaunch && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <Field.Date
                  name="sustenanceDate"
                  minDate={startYearDate}
                  maxDate={endYearDate}
                  label="Sustenance Date"
                  required={skipLaunch}
                />
                {errors.sustenanceDate && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1 }}>
                    {errors.sustenanceDate.message}
                  </Typography>
                )}
              </FormControl>
            )}

            <Button
              variant="contained"
              size="large"
              sx={{
                width: '100%',
                margin: 'auto',
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': {
                  backgroundColor: '#174a9d',
                },
                '&.Mui-disabled': {
                  backgroundColor: 'grey.300 !important',
                  color: 'grey.500 !important',
                },
              }}
              onClick={handleApply}
              disabled={!isFormValid()}
            >
              Apply
            </Button>
          </Box>
        </CustomPopover>
      </FormProvider>
    </LocalizationProvider>
  );
}
