import type { Dayjs } from 'dayjs';
import type { SubmitHandler } from 'react-hook-form';
import type { IomMyTeamRowItem } from 'src/sections/common-module/internal-office-memo/iom-config';

import dayjs from 'dayjs';
import { z as zod } from 'zod';
import { useRef, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';

import { Grid ,
  Radio,
  Button,
  Typography,
  RadioGroup,
  FormControl,
  FormHelperText,
  FormControlLabel,
} from '@mui/material';

import { MyTeamStatus } from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';

import { Form, Field } from 'src/components/hook-form';
import { ConfirmDialog } from 'src/components/custom-dialog';

// ----------------------------------------------------------------------

const copy = uiText.internalOfficeMemo.myTeam.markAvailability;

const DISPLAY_DATE_TIME_FORMATS = ['DD MMM YYYY hh:mm A', 'DD MMM YYYY h:mm A'] as const;

const EMPTY_VALUES = {
  availabilityStatus: MyTeamStatus.AVAILABLE,
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
};

const markAvailabilitySchema = zod
  .object({
    availabilityStatus: zod.string().min(1, { message: `${copy.availabilityStatus} is required` }),
    startDate: zod.string().optional(),
    startTime: zod.string().optional(),
    endDate: zod.string().optional(),
    endTime: zod.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.availabilityStatus !== MyTeamStatus.UNAVAILABLE) {
      return;
    }

    if (!values.startDate?.trim()) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        message: `${copy.startDate} is required`,
        path: ['startDate'],
      });
    }

    if (!values.startTime?.trim()) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        message: `${copy.startTime} is required`,
        path: ['startTime'],
      });
    }

    if (!values.endDate?.trim()) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        message: `${copy.endDate} is required`,
        path: ['endDate'],
      });
    }

    if (!values.endTime?.trim()) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        message: `${copy.endTime} is required`,
        path: ['endTime'],
      });
    }

    const { startDate, startTime, endDate, endTime } = values;
    if (!startDate || !startTime || !endDate || !endTime) {
      return;
    }

    const start = dayjs(`${startDate} ${startTime}`, 'YYYY-MM-DD HH:mm', true);
    const end = dayjs(`${endDate} ${endTime}`, 'YYYY-MM-DD HH:mm', true);
    const earliestSelectable = getEarliestSelectableTime();

    if (start.isValid() && start.isSame(earliestSelectable, 'day') && start.isBefore(earliestSelectable)) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        message: `${copy.startTime} must be at least 1 minute from now`,
        path: ['startTime'],
      });
    }

    if (end.isValid() && end.isSame(earliestSelectable, 'day') && end.isBefore(earliestSelectable)) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        message: `${copy.endTime} must be at least 1 minute from now`,
        path: ['endTime'],
      });
    }

    if (start.isValid() && end.isValid() && !end.isAfter(start)) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        message: copy.endAfterStart,
        path: ['endDate'],
      });
    }
  });

export type MarkAvailabilityFormValues = zod.infer<typeof markAvailabilitySchema>;

type Props = Readonly<{
  open: boolean;
  row: IomMyTeamRowItem | null;
  onClose: () => void;
  onSubmit: (values: MarkAvailabilityFormValues, row: IomMyTeamRowItem) => void;
  isSubmitting?: boolean;
}>;

function parseRowDateTime(value?: string) {
  if (!value || value === '-') {
    return null;
  }

  const isoParsed = dayjs(value);
  if (isoParsed.isValid()) {
    return {
      date: isoParsed.format('YYYY-MM-DD'),
      time: isoParsed.format('HH:mm'),
    };
  }

  const parsed = DISPLAY_DATE_TIME_FORMATS.map((format) => dayjs(value, format, true)).find((date) =>
    date.isValid()
  );

  if (!parsed) {
    return null;
  }

  return {
    date: parsed.format('YYYY-MM-DD'),
    time: parsed.format('HH:mm'),
  };
}

function parseFormDate(dateStr?: string): Dayjs | null {
  if (!dateStr) {
    return null;
  }

  const date = dayjs(dateStr, 'YYYY-MM-DD', true);

  return date.isValid() ? date : null;
}

function getEarliestSelectableTime() {
  return dayjs().startOf('minute').add(1, 'minute');
}

function getTimePickerContext(dateStr?: string): { referenceDate: Dayjs | null; minTime: Dayjs | null } {
  const date = parseFormDate(dateStr);

  if (!date) {
    return { referenceDate: null, minTime: null };
  }

  const earliest = getEarliestSelectableTime();

  if (date.isSame(earliest, 'day')) {
    const anchored = date
      .hour(earliest.hour())
      .minute(earliest.minute())
      .second(0)
      .millisecond(0);

    return { referenceDate: anchored, minTime: anchored };
  }

  return { referenceDate: date.startOf('day'), minTime: null };
}

function getDefaultValues(row: IomMyTeamRowItem | null): MarkAvailabilityFormValues {
  const from = parseRowDateTime(row?.unavailableFrom);
  const to = parseRowDateTime(row?.unavailableTo);
  const isUnavailable = row?.statusLabel === MyTeamStatus.UNAVAILABLE;

  return {
    availabilityStatus: isUnavailable ? MyTeamStatus.UNAVAILABLE : MyTeamStatus.AVAILABLE,
    startDate: isUnavailable ? from?.date ?? '' : '',
    startTime: isUnavailable ? from?.time ?? '' : '',
    endDate: isUnavailable ? to?.date ?? '' : '',
    endTime: isUnavailable ? to?.time ?? '' : '',
  };
}

export function MarkAvailabilityDialog({
  open,
  row,
  onClose,
  onSubmit,
  isSubmitting = false,
}: Props) {
  const methods = useForm<MarkAvailabilityFormValues>({
    resolver: zodResolver(markAvailabilitySchema),
    mode: 'onChange',
    defaultValues: EMPTY_VALUES,
  });

  const { control, handleSubmit, reset, watch, setValue } = methods;
  const availabilityStatus = watch('availabilityStatus');
  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const isUnavailable = availabilityStatus === MyTeamStatus.UNAVAILABLE;
  const isRowUnavailable = row?.statusLabel === MyTeamStatus.UNAVAILABLE;
  const areDateFieldsLocked = isRowUnavailable;

  const startTimeContext = getTimePickerContext(startDate);
  const endTimeContext = getTimePickerContext(endDate);
  const prevStartDateRef = useRef<string | undefined>();
  const prevEndDateRef = useRef<string | undefined>();

  useEffect(() => {
    if (open) {
      reset(getDefaultValues(row));
      prevStartDateRef.current = undefined;
      prevEndDateRef.current = undefined;
    }
  }, [open, row, reset]);

  useEffect(() => {
    if (areDateFieldsLocked) {
      prevStartDateRef.current = startDate;
      return;
    }

    if (prevStartDateRef.current !== undefined && prevStartDateRef.current !== startDate) {
      setValue('startTime', '');
    }

    prevStartDateRef.current = startDate;
  }, [startDate, areDateFieldsLocked, setValue]);

  useEffect(() => {
    if (areDateFieldsLocked) {
      prevEndDateRef.current = endDate;
      return;
    }

    if (prevEndDateRef.current !== undefined && prevEndDateRef.current !== endDate) {
      setValue('endTime', '');
    }

    prevEndDateRef.current = endDate;
  }, [endDate, areDateFieldsLocked, setValue]);

  useEffect(() => {
    if (availabilityStatus === MyTeamStatus.AVAILABLE && !isRowUnavailable) {
      setValue('startDate', '');
      setValue('startTime', '');
      setValue('endDate', '');
      setValue('endTime', '');
    }
  }, [availabilityStatus, isRowUnavailable, setValue]);

  const handleFormSubmit: SubmitHandler<MarkAvailabilityFormValues> = (values) => {
    if (!row) {
      return;
    }
    onSubmit(values, row);
  };

  const isSubmitDisabled =
    isSubmitting || (isRowUnavailable && availabilityStatus !== MyTeamStatus.AVAILABLE);

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      showCloseButton
      leftAlignTitle
      contentTextAlign="left"
      isMedium
      showDivider
      titlePadding="24px 24px"
      title={copy.title}
      cancelLabel={copy.cancel}
      content={
        <Form methods={methods} onSubmit={handleSubmit(handleFormSubmit)}>
          <Grid container spacing={2} sx={{ textAlign: 'left' }}>
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <Typography sx={{ fontSize: '14px', mb: 1 }}>
                  {copy.availabilityStatus} <span style={{ color: '#FF0000' }}>*</span>
                </Typography>
                <Controller
                  name="availabilityStatus"
                  control={control}
                  render={({ field, fieldState }) => (
                    <>
                      <RadioGroup row {...field} sx={{ ml: 1 }}>
                        <FormControlLabel
                          value={MyTeamStatus.AVAILABLE}
                          control={<Radio />}
                          label={MyTeamStatus.AVAILABLE}
                        />
                        <FormControlLabel
                          value={MyTeamStatus.UNAVAILABLE}
                          control={<Radio />}
                          label={MyTeamStatus.UNAVAILABLE}
                          disabled={isRowUnavailable}
                        />
                      </RadioGroup>
                      {fieldState.error?.message ? (
                        <FormHelperText error>{fieldState.error.message}</FormHelperText>
                      ) : null}
                    </>
                  )}
                />
              </FormControl>
            </Grid>

            {isUnavailable ? (
              <>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <Field.Date
                      name="startDate"
                      label={copy.startDate}
                      required
                      minDate={dayjs().startOf('day')}
                      disabled={areDateFieldsLocked}
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <Field.Time
                      key={startDate || 'start-time'}
                      name="startTime"
                      label={copy.startTime}
                      required
                      referenceDate={startTimeContext.referenceDate}
                      minTime={startTimeContext.minTime}
                      disabled={!startDate || areDateFieldsLocked}
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <Field.Date
                      name="endDate"
                      label={copy.endDate}
                      required
                      minDate={dayjs().startOf('day')}
                      disabled={areDateFieldsLocked}
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <Field.Time
                      key={endDate || 'end-time'}
                      name="endTime"
                      label={copy.endTime}
                      required
                      referenceDate={endTimeContext.referenceDate}
                      minTime={endTimeContext.minTime}
                      disabled={!endDate || areDateFieldsLocked}
                    />
                  </FormControl>
                </Grid>
              </>
            ) : null}
          </Grid>
        </Form>
      }
      action={
        <Button
          variant="contained"
          disabled={isSubmitDisabled}
          onClick={handleSubmit(handleFormSubmit)}
          sx={{
            fontSize: '15px',
            fontWeight: '600',
            color: '#fff',
            background: '#1A407D',
            minWidth: { xs: '120px', lg: '204px' },
            height: '48px',
            margin: 0,
            '&:hover': {
              background: '#1A407D',
              boxShadow: 'none',
            },
          }}
        >
          {copy.submit}
        </Button>
      }
    />
  );
}
