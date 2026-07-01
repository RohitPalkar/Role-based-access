import * as Yup from 'yup';
import { toast } from 'sonner';
import { useMemo, useState, useEffect } from 'react';
import { yupResolver } from '@hookform/resolvers/yup';
import { useForm, Controller, FormProvider } from 'react-hook-form';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { formatDateIST } from 'src/utils/helper';

import uiText from 'src/locales/langs/en/common.json';
import { addBatchSlotsAction, fetchBatchSlotSummaryAction } from 'src/redux/actions/common-module/batch-manager-actions';

import { Field } from 'src/components/hook-form';
import { ConfirmDialog } from 'src/components/custom-dialog';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';

import { calculateBatchRequirements } from '../utils/batchCalculation';


type Props = {
  open: boolean;
  onClose: () => void;
  batchId?: string;
  onRefresh?: () => void;
};

type FormValues = {
  recordPerBatch: string;
  durationMinutes: string;
  date: string;
  batchCount: string;
};

const AddBatchSchema = Yup.object().shape({
  recordPerBatch: Yup.string().required(`${uiText.common.formFields.recordsPerBatch} is required`),
  durationMinutes: Yup.string().required(`${uiText.common.formFields.duration} is required`),
  date: Yup.string().required('Date is required'),
  batchCount: Yup.string().required(`${uiText.common.formFields.batchCount} is required`),
});

export function AddBatchModal({ open, onClose, batchId, onRefresh }: Readonly<Props>) {
  const dispatch = useAppDispatch();
  const { batchSlotSummaryData, loading: summaryLoading } = useAppSelector((state) => state.batchManager);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch summary when modal opens
  useEffect(() => {
    if (open && batchId) {
      dispatch(fetchBatchSlotSummaryAction(batchId))
        .unwrap()
        .catch((error) => {
          console.error('Add batch modal: summary fetch failed', error);
          toast.error(uiText.batchManager.addBatchModal.toastSummaryFailed);
        });
    }
  }, [open, batchId, dispatch]);

  // Generate date options from available dates that can add more slots
  const dateOptions = useMemo(() => {
    if (!batchSlotSummaryData?.availableDates) return [];
    return batchSlotSummaryData.availableDates
      .filter((date: any) => date.canAddMoreSlots)
      .map((date: any) => ({
        label: formatDateIST(date.date, { hideTime: true }),
        value: date.date
      }))
  }, [batchSlotSummaryData]);


  // Get summary data from Redux
  const summary = useMemo(() => ({
    totalRecords: batchSlotSummaryData?.totalRecords || 0,
    alreadyBatched: batchSlotSummaryData?.alreadyBatched || 0,
    remainingRecords: batchSlotSummaryData?.remainingRecords || 0,
  }), [batchSlotSummaryData]);

  const methods = useForm<FormValues>({
    resolver: yupResolver(AddBatchSchema),
    defaultValues: {
      recordPerBatch: '',
      durationMinutes: '',
      date: '',
      batchCount: '1',
    },
    mode: 'onChange',
  });

  const { watch, handleSubmit, setValue, reset, control } = methods;

  const formValues = watch();

  const calc = useMemo(
    () =>
      calculateBatchRequirements({
        totalRecords: summary.totalRecords,
        alreadyBatched: summary.alreadyBatched,
        recordPerBatch: Number(formValues.recordPerBatch) || 1,
        durationMinutes: Number(formValues.durationMinutes) || 1,
        startTimeHours: 9, // Using default 9 AM
        endTimeHours: 18, // Using default 6 PM
      }),
    [summary.totalRecords, summary.alreadyBatched, formValues.recordPerBatch, formValues.durationMinutes]
  );

  useEffect(() => {
    if (String(calc.batchesRequired) !== formValues.batchCount && !calc.exceedsCapacity) {
      setValue('batchCount', String(calc.batchesRequired));
    }
  }, [calc.batchesRequired, calc.exceedsCapacity, formValues.batchCount, setValue]);

  useEffect(() => {
    if (batchSlotSummaryData) {
      reset({
        recordPerBatch: String(batchSlotSummaryData?.capacityPerSlot || ''),
        durationMinutes: String(batchSlotSummaryData?.slotDuration || ''),
        date: '',
        batchCount: '1',
      });
    }
  }, [batchSlotSummaryData, reset]);

  const onSubmit = async (data: FormValues) => {
    if (calc.exceedsCapacity) {
      toast.error(uiText.batchManager.addBatchModal.toastExceedsSlots);
      return;
    }
    if (!batchId) {
      toast.error('Batch ID is required');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const payload = {
        batchId,
        date: data.date,
        numberOfSlots: Number(data.batchCount),
        slotDuration: Number(data.durationMinutes),
        capacityPerSlot: Number(data.recordPerBatch),
      };
      
      
      await dispatch(addBatchSlotsAction(payload)).unwrap();
      toast.success(uiText.batchManager.addBatchModal.toastCreateSuccess);
      onRefresh?.();
      onClose();
    } catch (error: any) {
      console.error('Add batch modal: create failed', error);
      toast.error(error.message || uiText.batchManager.addBatchModal.toastCreateFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const { remainingRecords } = calc;
  const noRemaining = remainingRecords === 0;

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title={uiText.batchManager.addBatchModal.title}
      content={
        <FormProvider {...methods}>
          <Box component="form" id="add-batch-form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 2, textAlign: 'left' }}>
            <Stack spacing={3}>
              {/* Read-only Summary */}
              <Box sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 1, position: 'relative' }}>
                {summaryLoading && (
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'rgba(255,255,255,0.7)', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      {uiText.batchManager.addBatchModal.loadingSummary}
                    </Typography>
                  </Box>
                )}
                <Typography variant="subtitle2" gutterBottom>
                  {uiText.batchManager.addBatchModal.summaryTitle}
                </Typography>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    {uiText.batchManager.addBatchModal.totalRecords}
                  </Typography>
                  <Typography variant="subtitle2">{summary.totalRecords}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    {uiText.batchManager.addBatchModal.alreadyBatched}
                  </Typography>
                  <Typography variant="subtitle2">{summary.alreadyBatched}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ mt: 1, pt: 1, borderTop: '1px dashed grey' }}>
                  <Typography variant="body2" fontWeight="bold">
                    {uiText.batchManager.addBatchModal.remainingRecords}
                  </Typography>
                  <Typography variant="subtitle2" color="primary.main">{summary.remainingRecords}</Typography>
                </Stack>
              </Box>

              {noRemaining && (
                <Alert severity="info">{uiText.batchManager.addBatchModal.allBatchedInfo}</Alert>
              )}

              <Box>
                <Controller
                  name="date"
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <ControlledAutocomplete
                      label="Select Date"
                      options={dateOptions}
                      value={field.value}
                      onChange={(val) => field.onChange(val)}
                      placeholder="Choose a date"
                      required
                      disabled={noRemaining}
                      error={!!error}
                      helperText={error?.message || (dateOptions.length === 0 ? 'No available dates to add slots' : '')}
                    />
                  )}
                />
              </Box>

              <Stack direction="row" spacing={2}>
                <Field.Text
                  name="durationMinutes"
                  label={uiText.common.formFields.duration}
                  placeholder={uiText.common.formFields.enterDuration}
                  disabled={noRemaining}
                  InputProps={{
                    endAdornment: formValues.durationMinutes ? (
                      <InputAdornment position="end">{uiText.common.formFields.minutes}</InputAdornment>
                    ) : null,
                  }}
                  inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                />
                <Field.Text
                  name="recordPerBatch"
                  label={uiText.common.formFields.recordsPerBatch}
                  placeholder={uiText.common.formFields.enterRecordsPerBatch}
                  disabled={noRemaining}
                  inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                />
              </Stack>

              <Field.Text
                name="batchCount"
                label={uiText.common.formFields.batchCount}
                disabled={noRemaining}
                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                helperText={
                  calc.exceedsCapacity
                    ? uiText.batchManager.addBatchModal.helperExceedsCapacity.replace(
                      '{{max}}',
                      String(calc.totalSlots)
                    )
                    : uiText.batchManager.addBatchModal.helperBatchSlots
                      .replace('{{batches}}', String(calc.batchesRequired))
                }
              />
            </Stack>
          </Box>
        </FormProvider>
      }
      action={
        <Button
          variant="contained"
          type="submit"
          form="add-batch-form"
          disabled={noRemaining || calc.exceedsCapacity || isSubmitting || summaryLoading}
          sx={{
            backgroundColor: '#0F1869',
            color: 'white',
            borderRadius: '10px',
            fontSize: '15px',
            fontWeight: '600',
            height: '48px',
            minWidth: { xs: '120px', lg: '204px' },
            '&:hover': {
              backgroundColor: '#1E2B8D',
            },
          }}
        >
          {isSubmitting
            ? uiText.batchManager.addBatchModal.creating
            : uiText.batchManager.addBatchModal.createBatches}
        </Button>
      }
      showCloseButton
      showCancel
      cancelLabel={uiText.button.cancel}
      onCancel={onClose}
    />
  );
}
