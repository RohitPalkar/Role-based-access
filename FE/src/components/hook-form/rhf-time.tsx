import type { Dayjs } from 'dayjs';
import type { TimeView } from '@mui/x-date-pickers/models';

import dayjs from 'dayjs';
import { Controller } from 'react-hook-form';
import customParseFormat from 'dayjs/plugin/customParseFormat';

import { Box } from '@mui/material';
import TextField from '@mui/material/TextField';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DesktopTimePicker } from '@mui/x-date-pickers/DesktopTimePicker';
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';

dayjs.extend(customParseFormat);

type RHFTimePickerProps = Readonly<{
  name: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
  showClear?: boolean;
  ampm?: boolean;
  /** Hide the floating outline label (use when the table already has a column header). */
  hideLabel?: boolean;
  /** Same-day clock bound for the picker (MUI `DesktopTimePicker`); omit when unset. */
  minTime?: Dayjs | null;
  maxTime?: Dayjs | null;
  /** Anchor empty picker state to a calendar day (pair with a date field). */
  referenceDate?: Dayjs | null;
  shouldDisableTime?: (timeValue: Dayjs, view: TimeView) => boolean;
  /**
   * Called with `HH:mm` when the value is **accepted** (picker OK) or the input **blurs** —
   * not on every intermediate `onChange` while the clock is open. Use for controlled parents
   * (e.g. batch preview) that should not re-render on every drag tick.
   */
  onCommittedChange?: (hhmm: string) => void;
}>;

/** Parses stored picker values (`HH:mm` or `h:mm A`) to a Dayjs clock on the adapter’s default date. */
export function parseRhfTimePickerClock(value: unknown): Dayjs | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }
  const s = String(value);
  const d = dayjs(s, 'HH:mm', true);
  if (d.isValid()) {
    return d;
  }
  const d2 = dayjs(s, 'h:mm A', true);
  return d2.isValid() ? d2 : null;
}

export function RHFTimePicker({
  name,
  label,
  required = false,
  disabled = false,
  showClear = false,
  ampm = true,
  hideLabel = false,
  minTime = null,
  maxTime = null,
  referenceDate = null,
  shouldDisableTime,
  onCommittedChange,
}: RHFTimePickerProps) {
  const labelNode = (
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
      {required ? (
        <Box component="span" sx={{ color: 'error.main' }}>
          *
        </Box>
      ) : null}
    </Box>
  );

  const ariaForHiddenLabel = required ? `${label} (required)` : label;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Controller
        name={name}
        defaultValue=""
        render={({ field, fieldState: { error } }) => {
          const parsedValue = parseRhfTimePickerClock(field.value);
          const currentValue =
            parsedValue && referenceDate?.isValid()
              ? referenceDate
                  .hour(parsedValue.hour())
                  .minute(parsedValue.minute())
                  .second(0)
                  .millisecond(0)
              : parsedValue;

          const handleChange = (newValue: Dayjs | null) => {
            const formatted = newValue ? newValue.format('HH:mm') : '';
            field.onChange(formatted);

            // 🔥 trigger immediate update
            if (onCommittedChange) {
              onCommittedChange(formatted);
            }
          };

          const emitCommitted = (newValue: Dayjs | null) => {
            if (!onCommittedChange) {
              return;
            }
            const hhmm = newValue ? newValue.format('HH:mm') : '';
            onCommittedChange(hhmm);
          };

          const handleAccept = (newValue: Dayjs | null) => {
            handleChange(newValue);
            emitCommitted(newValue);
          };

          return (
            <DesktopTimePicker
              ampm={ampm}
              ampmInClock={false}
              disabled={disabled}
              name={field.name}
              slots={{ textField: TextField }}
              orientation="landscape"
              label={hideLabel ? undefined : labelNode}
              value={currentValue}
              onChange={handleChange}
              onAccept={handleAccept}
              minTime={minTime ?? undefined}
              maxTime={maxTime ?? undefined}
              referenceDate={referenceDate ?? undefined}
              shouldDisableTime={shouldDisableTime}
              disableIgnoringDatePartForTimeValidation={Boolean(minTime || maxTime)}
              format={ampm ? 'hh:mm A' : 'HH:mm'}
              views={['hours', 'minutes']}
              viewRenderers={{
                hours: renderTimeViewClock,
                minutes: renderTimeViewClock,
              }}
              slotProps={{
                toolbar: { hidden: false },
                textField: {
                  fullWidth: true,
                  hiddenLabel: hideLabel,
                  /** X Date Pickers forwards `label` onto TextField; clear it when using column headers only. */
                  ...(hideLabel ? { label: undefined } : {}),
                  onBlur: () => {
                    field.onBlur();
                    if (onCommittedChange) {
                      const raw = field.value;
                      const s = typeof raw === 'string' || typeof raw === 'number' ? String(raw) : '';
                      onCommittedChange(s);
                    }
                  },
                  error: !!error,
                  helperText: error?.message != null ? String(error.message) : '',
                  inputProps: {
                    readOnly: true,
                    ...(hideLabel ? { 'aria-label': ariaForHiddenLabel } : {}),
                  },
                  InputLabelProps: hideLabel
                    ? { shrink: true, sx: { display: 'none', height: 0, width: 0, overflow: 'hidden' } }
                    : undefined,
                  sx: {
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    '& input': {
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      userSelect: 'none',
                    },
                    ...(hideLabel
                      ? {
                          '& .MuiInputLabel-root': { display: 'none' },
                          '& .MuiOutlinedInput-notchedOutline legend': { maxWidth: 0 },
                        }
                      : {}),
                  },
                },
                actionBar: {
                  ...(showClear ? { actions: ['clear', 'accept'] as const } : {}),
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
              }}
            />
          );
        }}
      />
    </LocalizationProvider>
  );
}
