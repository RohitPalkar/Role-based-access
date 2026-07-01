import dayjs from 'dayjs';
import * as Yup from 'yup';
import { toast } from 'sonner';
import { yupResolver } from '@hookform/resolvers/yup';
import { useRef, useMemo, useState, useEffect } from 'react';
import {
  useForm,
  useWatch,
  Controller,
  FormProvider,
  type Resolver,
  useFieldArray,
} from 'react-hook-form';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Accordion from '@mui/material/Accordion';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import FormControlLabel from '@mui/material/FormControlLabel';

import { Iconify } from 'src/components/iconify';
import { Field, parseRhfTimePickerClock } from 'src/components/hook-form';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';

import uiText from '../../../locales/langs/en/common.json';
import { BatchPlanSummaryCard } from './components/batch-plan-summary-card';
import {
  BATCH_ID_TYPE_OPTIONS,
  type BatchIdBreakdownRow,
  calculateBatchPlanSummary,
  formatScheduleTimeForCopy,
} from './utils/batch-manager-shared';

// ----------------------------------------------------------------------

const SCHEDULE_TIME_CONNECTOR = uiText.batchManager.configuration.scheduleTimeConnector;
const batchCfgVal = uiText.batchManager.configuration.validation;

export const DEFAULT_SCHEDULE_START_TIME = '09:00';
export const DEFAULT_SCHEDULE_END_TIME = '18:00';

/** Human-readable time for helper copy (driven by default schedule constants). */
// Removed: formatScheduleTimeForCopy moved to shared utils.

const DEFAULT_SCHEDULE_WINDOW_DISPLAY = `${formatScheduleTimeForCopy(DEFAULT_SCHEDULE_START_TIME)}${SCHEDULE_TIME_CONNECTOR}${formatScheduleTimeForCopy(DEFAULT_SCHEDULE_END_TIME)}`;

/** Normalize to `HH:mm` so defaults match even if the picker stored a 12h string. */
function clockHmOrDefault(raw: string | undefined, fallbackHm: string): string {
  const trimmed = raw?.trim();
  const parsed = parseRhfTimePickerClock(trimmed && trimmed.length > 0 ? trimmed : fallbackHm);
  return parsed?.isValid() ? parsed.format('HH:mm') : fallbackHm;
}

export type BatchDayScheduleRow = {
  date: string;
  startTime: string;
  endTime: string;
};

export type BatchManagerConfigurationFormValues = {
  idTypes: (string | number)[];
  batchName: string;
  startDate: string;
  endDate: string;
  sameTimeForAllDates: boolean;
  sharedStartTime: string;
  sharedEndTime: string;
  schedule: BatchDayScheduleRow[];
  durationMinutes: string;
  recordsPerBatch: string;
  openBatchBefore: string;
};

const BATCH_PANEL_CARD_SX = {
  width: '100%',
  borderRadius: '16px',
  overflow: 'hidden',
  backgroundColor: '#fff',
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
  color: '#1C252E',
  p: { xs: 2, md: 3 },
} as const;

const batchStageOptionLabelSx = {
  '& .MuiFormControlLabel-label': {
    fontFamily: 'Poppins',
    fontWeight: 600,
    fontSize: '14px',
    lineHeight: '22px',
    color: '#637381',
  },
} as const;

function buildInclusiveDateList(startDate: string, endDate: string): string[] {
  const start = dayjs(startDate, 'YYYY-MM-DD', true);
  const end = dayjs(endDate, 'YYYY-MM-DD', true);
  if (!start.isValid() || !end.isValid() || start.isAfter(end, 'day')) {
    return [];
  }
  const startDay = start.startOf('day');
  const endDay = end.startOf('day');
  const dayCount = endDay.diff(startDay, 'day') + 1;
  return Array.from({ length: dayCount }, (_, i) => startDay.add(i, 'day').format('YYYY-MM-DD'));
}

function mergeScheduleWithDates(dates: string[], previous: BatchDayScheduleRow[]): BatchDayScheduleRow[] {
  const prevByDate = new Map(
    previous.map((row) => [row.date, { startTime: row.startTime, endTime: row.endTime }])
  );
  return dates.map((date) => {
    const prev = prevByDate.get(date);
    return {
      date,
      startTime: prev?.startTime ?? DEFAULT_SCHEDULE_START_TIME,
      endTime: prev?.endTime ?? DEFAULT_SCHEDULE_END_TIME,
    };
  });
}

function applySharedTimesToRows(
  rows: BatchDayScheduleRow[],
  start: string,
  end: string
): BatchDayScheduleRow[] {
  return rows.map((row) => ({
    ...row,
    startTime: start,
    endTime: end,
  }));
}

const positiveIntString = (label: string) =>
  Yup.string()
    .trim()
    .required(`${label} is required`)
    .matches(/^\d+$/, `${label} must be a whole number`)
    .test('min1', `${label} must be at least 1`, (v) => v ? Number(v) >= 1 : false);

const batchConfigurationSchema = Yup.object({
  idTypes: Yup.array()
    .of(Yup.mixed<string | number>().required())
    .min(1, batchCfgVal.idTypesMin)
    .required(batchCfgVal.idTypesMin),
  batchName: Yup.string().trim().required(batchCfgVal.batchNameRequired),
  startDate: Yup.string()
    .trim()
    .required(batchCfgVal.startDateRequired)
    .test('start-not-in-past', batchCfgVal.startDateNotPast, (startVal) => {
      if (!startVal?.trim()) {
        return true;
      }
      const start = dayjs(startVal, 'YYYY-MM-DD', true);
      if (!start.isValid()) {
        return true;
      }
      const today = dayjs().startOf('day');
      return !start.isBefore(today, 'day');
    }),
  endDate: Yup.string()
    .trim()
    .required(batchCfgVal.endDateRequired)
    .test('end-not-in-past', batchCfgVal.endDateNotPast, (endVal) => {
      if (!endVal?.trim()) {
        return true;
      }
      const end = dayjs(endVal, 'YYYY-MM-DD', true);
      if (!end.isValid()) {
        return true;
      }
      const today = dayjs().startOf('day');
      return !end.isBefore(today, 'day');
    })
    .test(
      'end-on-or-after-start',
      batchCfgVal.endOnOrAfterStart,
      function testEndOnOrAfterStart(endVal) {
        const startVal = this.parent.startDate as string | undefined;
        if (!startVal?.trim() || !endVal?.trim()) {
          return true;
        }
        const start = dayjs(startVal, 'YYYY-MM-DD', true);
        const end = dayjs(endVal, 'YYYY-MM-DD', true);
        if (!start.isValid() || !end.isValid()) {
          return true;
        }
        return !end.isBefore(start, 'day');
      }
    ),
  sameTimeForAllDates: Yup.boolean().required(),
  sharedStartTime: Yup.string().when('sameTimeForAllDates', ([same], schema) =>
    same
      ? schema.trim().required(`${uiText.common.formFields.startTime} is required`)
      : schema.notRequired()
  ),
  sharedEndTime: Yup.string().when('sameTimeForAllDates', ([same], schema) =>
    same
      ? schema.trim().required(`${uiText.common.formFields.endTime} is required`)
      : schema.notRequired()
  ),
  schedule: Yup.array()
    .of(
      Yup.object({
        date: Yup.string().required(),
        startTime: Yup.string().required(),
        endTime: Yup.string().required(),
      })
    )
    .test('schedule-rows', function validateBatchScheduleRows(rows) {
      const parent = this.parent as BatchManagerConfigurationFormValues;
      if (!rows?.length) {
        return this.createError({ message: batchCfgVal.scheduleNeedDates });
      }
      if (parent.sameTimeForAllDates) {
        return true;
      }
      const missing = rows.some((r) => !r.startTime?.trim() || !r.endTime?.trim());
      if (missing) {
        return this.createError({ message: batchCfgVal.scheduleTimesPerDate });
      }
      return true;
    }),
  durationMinutes: positiveIntString(uiText.common.formFields.duration),
  recordsPerBatch: positiveIntString(uiText.common.formFields.recordsPerBatch),
  openBatchBefore: Yup.string()
    .trim()
    .test(
      'is-valid-number',
      `${uiText.common.formFields.openBatchBefore} must be a whole number`,
      (val) => !val || /^\d+$/.test(val)
    ),
});

const defaultValues: BatchManagerConfigurationFormValues = {
  idTypes: [],
  batchName: '',
  startDate: '',
  endDate: '',
  sameTimeForAllDates: false,
  sharedStartTime: DEFAULT_SCHEDULE_START_TIME,
  sharedEndTime: DEFAULT_SCHEDULE_END_TIME,
  schedule: [],
  durationMinutes: '',
  recordsPerBatch: '',
  openBatchBefore: '',
};

export type BatchManagerConfigurationFormProps = {
  onPreview?: (values: BatchManagerConfigurationFormValues) => void;
  /** Called when any configuration field changes (e.g. clear server preview in parent). */
  onConfigurationChange?: () => void;
  /** Called whenever the idTypes (Select ID Types) field value changes. */
  onIdTypesChange?: (idTypes: (string | number)[]) => void;
  /** Breakdown for the selected residency — used so Preview stays off until the plan can hold enough capacity. */
  breakdownScopeRow?: BatchIdBreakdownRow;
  loading?: boolean;
  initialData?: BatchManagerConfigurationFormValues | null;
  /** When false, the primary "Preview Batch" button is disabled (e.g. if typology is required but missing). */
  canPreview?: boolean;
  unmappedCount?: any;
};

function configurationPassesSchema(values: BatchManagerConfigurationFormValues | undefined): boolean {
  if (values == null) {
    return false;
  }
  try {
    batchConfigurationSchema.validateSync(values, { abortEarly: false });
    return true;
  } catch {
    return false;
  }
}

export function BatchManagerConfigurationForm({
  onPreview,
  onConfigurationChange,
  onIdTypesChange,
  breakdownScopeRow,
  loading,
  initialData,
  canPreview = true,
  unmappedCount,
}: Readonly<BatchManagerConfigurationFormProps> = {}) {
  const methods = useForm<BatchManagerConfigurationFormValues>({
    resolver: yupResolver(
      batchConfigurationSchema
    ) as Resolver<BatchManagerConfigurationFormValues>,
    defaultValues,
    mode: 'onTouched',
  });

  const { control, setValue, getValues, trigger, formState, reset } = methods;
  const { errors } = formState;
  const [expandedScheduleDate, setExpandedScheduleDate] = useState<string | false>(false);

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  const { fields, replace } = useFieldArray({ control, name: 'schedule' });

  const watchedStartDate = useWatch({ control, name: 'startDate' });
  const watchedEndDate = useWatch({ control, name: 'endDate' });

  const endDatePickerMin = useMemo(() => {
    const today = dayjs().startOf('day');
    const start = dayjs(watchedStartDate?.trim(), 'YYYY-MM-DD', true);
    if (start.isValid() && !start.isBefore(today, 'day')) {
      return start;
    }
    return today;
  }, [watchedStartDate]);
  const sameTimeForAllDates = useWatch({ control, name: 'sameTimeForAllDates' });
  const sharedStartTime = useWatch({ control, name: 'sharedStartTime' });
  const sharedEndTime = useWatch({ control, name: 'sharedEndTime' });
  const watchedSchedule = useWatch({ control, name: 'schedule' }) as
    | BatchManagerConfigurationFormValues['schedule']
    | undefined;

  const sharedEndMinTime = useMemo(() => {
    const st = parseRhfTimePickerClock(sharedStartTime);
    return st?.isValid() ? st.add(1, 'minute') : null;
  }, [sharedStartTime]);

  const sharedStartMaxTime = useMemo(() => {
    const et = parseRhfTimePickerClock(sharedEndTime);
    return et?.isValid() ? et.subtract(1, 'minute') : null;
  }, [sharedEndTime]);

  const scheduleHelpCopy = useMemo(() => {
    const defStart = DEFAULT_SCHEDULE_START_TIME;
    const defEnd = DEFAULT_SCHEDULE_END_TIME;
    const defDisplay = DEFAULT_SCHEDULE_WINDOW_DISPLAY;
    const variesSuffix = uiText.batchManager.configuration.scheduleWindowVariesSuffix;

    if (sameTimeForAllDates) {
      const st = clockHmOrDefault(sharedStartTime, defStart);
      const et = clockHmOrDefault(sharedEndTime, defEnd);
      const windowDisplay = `${formatScheduleTimeForCopy(st)}${SCHEDULE_TIME_CONNECTOR}${formatScheduleTimeForCopy(et)}`;
      return { windowDisplay };
    }

    const rows = watchedSchedule ?? [];
    if (rows.length === 0) {
      return { windowDisplay: defDisplay };
    }

    const normalized = rows.map((r) => ({
      start: clockHmOrDefault(r?.startTime, defStart),
      end: clockHmOrDefault(r?.endTime, defEnd),
    }));

    const first = normalized[0];
    if (!first) {
      return { windowDisplay: defDisplay };
    }

    const firstDisplay = `${formatScheduleTimeForCopy(first.start)}${SCHEDULE_TIME_CONNECTOR}${formatScheduleTimeForCopy(first.end)}`;
    const allSameWindow = normalized.every((x) => x.start === first.start && x.end === first.end);
    const windowDisplay = allSameWindow ? firstDisplay : `${firstDisplay}${variesSuffix}`;

    return { windowDisplay };
  }, [sameTimeForAllDates, sharedStartTime, sharedEndTime, watchedSchedule]);

  const durationMinutes = useWatch({ control, name: 'durationMinutes' });
  const openBatchBefore = useWatch({ control, name: 'openBatchBefore' });
  const watchedFormValuesRaw = useWatch({ control });
  const watchedFormValues = (watchedFormValuesRaw ?? defaultValues) as BatchManagerConfigurationFormValues;
  const watchedIdTypes = useWatch({ control, name: 'idTypes' }) as (string | number)[];
  const planValid = useMemo(
    () => configurationPassesSchema(watchedFormValues),
    [watchedFormValues]
  );

  // Notify parent whenever idTypes changes
  const watchedIdTypesSerialized = useMemo(() => JSON.stringify(watchedIdTypes ?? []), [watchedIdTypes]);
  const lastIdTypesSerializedRef = useRef<string | null>(null);

  useEffect(() => {
    const serialized = watchedIdTypesSerialized;
    if (lastIdTypesSerializedRef.current === serialized) return;
    lastIdTypesSerializedRef.current = serialized;
    onIdTypesChange?.(watchedIdTypes ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedIdTypesSerialized]);

  const planSummaryEnabled = useMemo(() => {
    const hasDates = Boolean(watchedFormValues.startDate?.trim() && watchedFormValues.endDate?.trim());
    const hasConfig = Boolean(watchedFormValues.durationMinutes?.trim() && watchedFormValues.recordsPerBatch?.trim());
    const hasSchedule = (watchedFormValues.schedule?.length ?? 0) > 0;
    return hasDates && hasConfig && hasSchedule;
  }, [watchedFormValues]);

  const planSummary = useMemo(() => {
    if (!planSummaryEnabled) {
      return null;
    }
    return calculateBatchPlanSummary(watchedFormValues, breakdownScopeRow, unmappedCount);
  }, [breakdownScopeRow, planSummaryEnabled, unmappedCount, watchedFormValues]);



  const previewBlocked = !planValid || !canPreview;

  const previewBlockTooltip = useMemo(() => {
    const cfg = uiText.batchManager.configuration;
    const parts: string[] = [];
    if (!planValid) {
      parts.push(cfg.previewBlockCompleteFields);
    }
    if (!canPreview) {
      parts.push(uiText.batchManager.typologyHelper);
    }
    return parts.join(' · ') || cfg.previewBlockCannotPreview;
  }, [planValid, canPreview]);

  const formValuesSerialized = useMemo(() => JSON.stringify(watchedFormValues), [watchedFormValues]);
  const lastNotifiedSerializedRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastNotifiedSerializedRef.current === null) {
      lastNotifiedSerializedRef.current = formValuesSerialized;
      return;
    }
    if (lastNotifiedSerializedRef.current === formValuesSerialized) {
      return;
    }
    lastNotifiedSerializedRef.current = formValuesSerialized;
    onConfigurationChange?.();
  }, [formValuesSerialized, onConfigurationChange]);

  useEffect(() => {
    const dates = buildInclusiveDateList(watchedStartDate ?? '', watchedEndDate ?? '');
    const previous = getValues('schedule') ?? [];
    const prevKeys = previous.map((r) => r.date).join('|');
    const nextKeys = dates.join('|');
    if (prevKeys === nextKeys) {
      return;
    }
    if (dates.length === 0) {
      if (previous.length > 0) {
        replace([]);
      }
      return;
    }
    const merged = mergeScheduleWithDates(dates, previous);
    const same = getValues('sameTimeForAllDates');
    const st = getValues('sharedStartTime')?.trim() || DEFAULT_SCHEDULE_START_TIME;
    const et = getValues('sharedEndTime')?.trim() || DEFAULT_SCHEDULE_END_TIME;
    if (same) {
      replace(applySharedTimesToRows(merged, st, et));
    } else {
      replace(merged);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- merge when calendar range changes; reads latest form values inside
  }, [watchedStartDate, watchedEndDate, replace, getValues]);

  useEffect(() => {
    if (!sameTimeForAllDates) {
      return;
    }
    const rows = getValues('schedule') ?? [];
    if (rows.length === 0) {
      return;
    }
    const st = sharedStartTime?.trim() || DEFAULT_SCHEDULE_START_TIME;
    const et = sharedEndTime?.trim() || DEFAULT_SCHEDULE_END_TIME;
    const allMatch = rows.every((r) => r.startTime === st && r.endTime === et);
    if (allMatch) {
      return;
    }
    replace(applySharedTimesToRows(rows, st, et));
  }, [
    sameTimeForAllDates,
    sharedStartTime,
    sharedEndTime,
    fields.length,
    watchedStartDate,
    watchedEndDate,
    replace,
    getValues,
  ]);

  useEffect(() => {
    const dates = buildInclusiveDateList(watchedStartDate ?? '', watchedEndDate ?? '');
    if (dates.length === 0) {
      setExpandedScheduleDate(false);
      return;
    }
    setExpandedScheduleDate((prev) =>
      typeof prev === 'string' && dates.includes(prev) ? prev : dates[0]
    );
  }, [watchedStartDate, watchedEndDate]);

  const handlePreviewClick = async () => {
    const valid = await trigger(undefined, { shouldFocus: true });
    if (!valid) {
      toast.error(uiText.batchManager.configuration.toastPreviewInvalid);
      return;
    }
    if (previewBlocked) {
      toast.error(previewBlockTooltip);
      return;
    }
    const previewPayload = getValues();
    onPreview?.(previewPayload);
  };

  const scheduleError =
    errors.schedule && typeof errors.schedule === 'object' && 'message' in errors.schedule
      ? String((errors.schedule as { message?: string }).message ?? '')
      : '';

  return (
    <Card sx={BATCH_PANEL_CARD_SX}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 2 }}>
        <Typography variant="h6" sx={{ fontFamily: 'Poppins', fontWeight: 600 }}>
          {uiText.batchManager.configuration.title}
        </Typography>
        <Tooltip
          title={uiText.batchManager.configuration.idTypeOrderTooltip}
          arrow
          placement="top"
        >
          <IconButton
            size="small"
            edge="end"
            aria-label={uiText.batchManager.configuration.idTypeOrderAriaLabel}
            sx={{ color: 'text.secondary' }}
          >
            <Iconify icon="eva:info-outline" width={20} />
          </IconButton>
        </Tooltip>
      </Box>
      <FormProvider {...methods}>
        <Stack spacing={2}>
          <Grid container spacing={2} alignItems="flex-start">
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, width: 1 }}>
                <Box sx={{ flex: 1, minWidth: 0, width: 1 }}>
                  <Controller
                    name="idTypes"
                    control={control}
                    render={({ field, fieldState }) => (
                      <ControlledAutocomplete
                        label={uiText.common.formFields.selectIdTypes}
                        options={BATCH_ID_TYPE_OPTIONS}
                        value={field.value}
                        onChange={(value) => field.onChange(Array.isArray(value) ? value : [])}
                        onBlur={field.onBlur}
                        multiple
                        limitTags={6}
                        placeholder={uiText.common.formFields.selectIdTypes}
                        required
                        error={Boolean(fieldState.error)}
                        helperText={
                          fieldState.error?.message ??
                          (typeof uiText?.batchManager?.idTypesFpPpHelper === 'string'
                            ? uiText.batchManager.idTypesFpPpHelper
                            : '(Fully Paid - FP Partially Paid - PP)')
                        }
                        fullWidth
                      />
                    )}
                  />
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Field.Text
                name="batchName"
                label={uiText.common.formFields.batchName}
                placeholder={uiText.common.formFields.enterBatchName}
                required
              />
            </Grid>
          </Grid>

          {scheduleError ? (
            <Typography variant="caption" color="error">
              {scheduleError}
            </Typography>
          ) : null}

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Box sx={{ flex: 1, width: 1 }}>
              <Field.Date
                name="startDate"
                label={uiText.common.startDate}
                minDate={dayjs().startOf('day')}
                required
              />
            </Box>
            <Box sx={{ flex: 1, width: 1 }}>
              <Field.Date name="endDate" label={uiText.common.endDate} minDate={endDatePickerMin} required />
            </Box>
          </Stack>

          {fields.length > 0 ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Controller
                name="sameTimeForAllDates"
                control={control}
                render={({ field }) => (
                  <Stack spacing={field.value ? 0 : 2}>
                    <FormControlLabel
                      labelPlacement="start"
                      label={uiText.batchManager.configuration.sameTimeAllDatesLabel}
                      control={
                        <Switch
                          checked={Boolean(field.value)}
                          onChange={(_, checked) => {
                            field.onChange(checked);
                            if (checked) {
                              const sched = getValues('schedule') ?? [];
                              const first = sched[0];
                              const st = first?.startTime ?? DEFAULT_SCHEDULE_START_TIME;
                              const et = first?.endTime ?? DEFAULT_SCHEDULE_END_TIME;
                              setValue('sharedStartTime', st);
                              setValue('sharedEndTime', et);
                              if (sched.length > 0) {
                                replace(applySharedTimesToRows(sched, st, et));
                              }
                            }
                          }}
                          color="primary"
                        />
                      }
                      sx={{
                        ...batchStageOptionLabelSx,
                        ml: 0,
                        mr: 0,
                        mb: 0,
                        width: 'fit-content',
                        maxWidth: '100%',
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        gap: 1.5,
                      }}
                    />
                    {field.value ? (
                      <Stack spacing={1} sx={{ mt: 0, pt: 0 }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 0 }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Field.Time
                              name="sharedStartTime"
                              label={uiText.common.formFields.startTime}
                              required
                              maxTime={sharedStartMaxTime}
                            />
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Field.Time
                              name="sharedEndTime"
                              label={uiText.common.formFields.endTime}
                              required
                              minTime={sharedEndMinTime}
                            />
                          </Box>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Poppins' }}>
                          {uiText.batchManager.configuration.scheduleDefaultWindowIntro}{' '}
                          <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {scheduleHelpCopy.windowDisplay}
                          </Box>
                          {uiText.batchManager.configuration.scheduleDefaultWindowOutro}
                        </Typography>
                      </Stack>
                    ) : (
                      <>
                        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Poppins', mt: 0 }}>
                          {uiText.batchManager.configuration.schedulePerDateIntro}{' '}
                          <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {scheduleHelpCopy.windowDisplay}
                          </Box>{' '}
                          {uiText.batchManager.configuration.schedulePerDateOutro}
                        </Typography>
                        <Stack spacing={1}>
                          {fields.map((row, index) => {
                            const dayRow = watchedSchedule?.[index];
                            const dayStart = parseRhfTimePickerClock(dayRow?.startTime);
                            const dayEnd = parseRhfTimePickerClock(dayRow?.endTime);
                            const dayEndMinTime = dayStart?.isValid() ? dayStart.add(1, 'minute') : null;
                            const dayStartMaxTime = dayEnd?.isValid() ? dayEnd.subtract(1, 'minute') : null;

                            return (
                              <Accordion
                                key={row.id}
                                disableGutters
                                expanded={expandedScheduleDate === row.date}
                                onChange={(_, expanded) => {
                                  setExpandedScheduleDate(expanded ? row.date : false);
                                }}
                                sx={{
                                  borderRadius: '12px !important',
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  '&:before': { display: 'none' },
                                  boxShadow: 'none',
                                }}
                              >
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                  <Typography sx={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '15px' }}>
                                    {row.date && dayjs(row.date, 'YYYY-MM-DD', true).isValid()
                                      ? dayjs(row.date, 'YYYY-MM-DD', true).format('D MMM YYYY')
                                      : '—'}
                                  </Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                  <Grid container spacing={2}>
                                    <Grid item xs={12} md={6}>
                                      <Field.Time
                                        name={`schedule.${index}.startTime`}
                                        label={uiText.common.formFields.startTime}
                                        required
                                        maxTime={dayStartMaxTime}
                                      />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                      <Field.Time
                                        name={`schedule.${index}.endTime`}
                                        label={uiText.common.formFields.endTime}
                                        required
                                        minTime={dayEndMinTime}
                                      />
                                    </Grid>
                                  </Grid>
                                </AccordionDetails>
                              </Accordion>
                            );
                          })}
                        </Stack>
                      </>
                    )}
                  </Stack>
                )}
              />
            </Stack>
          ) : null}

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Field.Text
                name="durationMinutes"
                label={uiText.common.formFields.duration}
                placeholder={uiText.common.formFields.enterDuration}
                required
                InputProps={{
                  endAdornment: durationMinutes ? (
                    <InputAdornment position="end">
                      {uiText.common.formFields.minutes}
                    </InputAdornment>
                  ) : null,
                }}
                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Field.Text
                name="recordsPerBatch"
                label={uiText.common.formFields.recordsPerBatch}
                placeholder={uiText.common.formFields.enterRecordsPerBatch}
                required
                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Field.Text
                name="openBatchBefore"
                label={uiText.common.formFields.openBatchBefore}
                placeholder={uiText.common.formFields.enterOpenBatchBefore}
                InputProps={{
                  endAdornment: openBatchBefore ? (
                    <InputAdornment position="end">
                      {uiText.common.formFields.minutes}
                    </InputAdornment>
                  ) : null, 
                }}
                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
              />
            </Grid>
          </Grid>

          <BatchPlanSummaryCard
            planValid={planSummaryEnabled}
            planSummary={planSummary}
            startDate={watchedFormValues.startDate}
            endDate={watchedFormValues.endDate}
            durationMinutes={watchedFormValues.durationMinutes}
            recordsPerBatch={watchedFormValues.recordsPerBatch}
            sameTimeForAllDates={Boolean(sameTimeForAllDates)}
            sharedStartTime={sharedStartTime ?? ''}
            sharedEndTime={sharedEndTime ?? ''}
            schedule={watchedFormValues.schedule}
            breakdownScopeRow={breakdownScopeRow}
            formatScheduleTime={formatScheduleTimeForCopy}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <span>
              <LoadingButton
                type="button"
                variant="contained"
                color='primary'
                disabled={previewBlocked}
                loading={loading}
                onClick={handlePreviewClick}
                sx={{
                  px: 2.5,
                  py: 1,
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: '#174a9d',
                  },
                }}
              >
                {uiText.batchManager.configuration.runBatch}
              </LoadingButton>
            </span>
          </Box>
        </Stack>
      </FormProvider>
    </Card>
  );
}

export default BatchManagerConfigurationForm;
