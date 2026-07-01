import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import uiText from 'src/locales/langs/en/common.json';

import { Iconify } from 'src/components/iconify';

import {
  BATCH_PLAN_STATUS,
  type BatchPlanStatus,
  BATCH_PLAN_STATUS_COLOR,
} from '../utils/batch-manager-constants';

import type { BatchIdBreakdownRow } from '../utils/batch-manager-shared';

/** `batchManager` gains nested groups in `common.json`; widen so new keys type-check before IDE JSON refresh. */
type BatchManagerLocale = typeof uiText.batchManager & {
  planSummary: Record<string, string>;
};

const batchManagerLocale = uiText.batchManager as BatchManagerLocale;

// ----------------------------------------------------------------------

/** Plan summary palette — navy header (ID chip style), slate labels, gray helper. */
const S = {
  navy: '#1A407D',
  navyDeep: '#151d68',
  onNavy: '#FFFFFF',
  onNavyMuted: 'rgba(255, 255, 255, 0.85)',
  label: '#374151',
  ink: '#212B36',
  muted: '#637381',
  surface: '#F4F6F8',
  line: 'rgba(26, 35, 126, 0.14)',
  lineSoft: 'rgba(55, 65, 81, 0.12)',
  shadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
  tileShadow: '0 2px 8px rgba(26, 35, 126, 0.06)',
  radiusTile: '8px',
} as const;

/** Shared with parent (e.g. Preview CTA) so accent stays in sync. */
export const batchPlanSummaryAccent = {
  navy: S.navy,
  navyDeep: S.navyDeep,
  onNavy: S.onNavy,
  radiusTile: S.radiusTile,
} as const;

export type BatchPlanSummaryData = {
  /**
   * Batches implied for the **selected ID lines** (`ceil(required ÷ capacity per slot)`), never more than
   * `scheduleTimeSlotCount`. When there is no requirement row, equals `scheduleTimeSlotCount`.
   */
  slotCount: number;
  /** Time windows from dates + working hours + slot duration (upper bound on the schedule). */
  scheduleTimeSlotCount: number;
  capacity: number;
  requiredTotal: number;
  dayCount: number | null;
};

export type BatchPlanSummaryCardProps = {
  planValid: boolean;
  planSummary: BatchPlanSummaryData | null;
  startDate: string;
  endDate: string;
  durationMinutes: string;
  recordsPerBatch: string;
  sameTimeForAllDates: boolean;
  sharedStartTime: string;
  sharedEndTime: string;
  schedule?: { date: string; startTime: string; endTime: string }[];
  breakdownScopeRow?: BatchIdBreakdownRow;
  /** Same formatter as batch configuration (12h display). */
  formatScheduleTime: (isoTime: string) => string;
};

type FilledProps = {
  planSummary: BatchPlanSummaryData;
  startDate: string;
  endDate: string;
  durationMinutes: string;
  recordsPerBatch: string;
  sameTimeForAllDates: boolean;
  sharedStartTime: string;
  sharedEndTime: string;
  schedule?: { date: string; startTime: string; endTime: string }[];
  breakdownScopeRow?: BatchIdBreakdownRow;
  formatScheduleTime: (isoTime: string) => string;
};

function InfoTile({
  icon,
  label,
  value,
  subValue,
}: Readonly<{
  icon: string;
  label: string;
  value: string | React.ReactNode;
  subValue?: string | React.ReactNode;
}>) {
  return (
    <Box
      sx={{
        p: 2,
        height: '100%',
        borderRadius: S.radiusTile,
        bgcolor: '#fff',
        border: `1px solid ${S.lineSoft}`,
        boxShadow: S.tileShadow,
        position: 'relative',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Iconify icon={icon} width={20} sx={{ color: S.navy }} />
        <Typography
          variant="caption"
          sx={{
            color: S.label,
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            fontSize: '0.65rem',
          }}
        >
          {label}
        </Typography>
      </Stack>
      <Box sx={{ fontFamily: 'Poppins', fontWeight: 700, color: S.ink, fontSize: '0.95rem', lineHeight: 1.4 }}>
        {value}
      </Box>
      {subValue && (
        <Typography variant="body2" sx={{ mt: 0.5, color: S.muted, fontSize: '0.75rem' }}>
          {subValue}
        </Typography>
      )}
    </Box>
  );
}

// --- Helpers to reduce complexity ---

function getBatchPlanStatus(
  batchesRequired: number,
  provisionForBatches: number
): Readonly<{ status: BatchPlanStatus; extraBatches: number; statusLabel: string }> {
  if (batchesRequired > provisionForBatches) {
    return {
      status: BATCH_PLAN_STATUS.DEFICIT,
      extraBatches: batchesRequired - provisionForBatches,
      statusLabel: BATCH_PLAN_STATUS.DEFICIT,
    };
  }
  if (batchesRequired < provisionForBatches) {
    return {
      status: BATCH_PLAN_STATUS.EXTRA,
      extraBatches: provisionForBatches - batchesRequired,
      statusLabel: 'Extra Batches',
    };
  }
  return {
    status: BATCH_PLAN_STATUS.SUFFICIENT,
    extraBatches: 0,
    statusLabel: 'Sufficient',
  };
}

function getLastBatchDateStr(dayCount: number | null, startDate: string, em: string): string {
  if (dayCount && dayCount > 0 && dayjs(startDate).isValid()) {
    return dayjs(startDate).add(dayCount - 1, 'day').format('D MMM YYYY');
  }
  return em;
}

function getLastBatchTimeStr(
  sameTime: boolean,
  sharedStart: string,
  sharedEnd: string,
  schedule: { startTime: string; endTime: string }[] | undefined,
  format: (t: string) => string
): string {
  if (sameTime) {
    return sharedStart && sharedEnd ? `${format(sharedStart)} – ${format(sharedEnd)}` : '';
  }
  if (schedule && schedule.length > 0) {
    const last = schedule.at(-1);
    if (last) {
      return `${format(last.startTime)} – ${format(last.endTime)}`;
    }
  }
  return '';
}

function DetailRow({
  label,
  value,
  label2,
  value2,
  valueColor,
  value2Color,
}: Readonly<{
  label: string;
  value: string | React.ReactNode;
  label2?: string;
  value2?: string | React.ReactNode;
  valueColor?: string;
  value2Color?: string;
}>) {
  return (
    <Grid container spacing={2} sx={{ py: 1.25, borderBottom: `1px solid ${S.lineSoft}` }}>
      <Grid item xs={6}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" sx={{ color: S.muted, fontWeight: 500 }}>
            {label}
          </Typography>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, color: valueColor || S.ink, textAlign: 'right' }}
          >
            {value}
          </Typography>
        </Stack>
      </Grid>
      <Grid item xs={6}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" sx={{ color: S.muted, fontWeight: 500 }}>
            {label2}
          </Typography>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, color: value2Color || S.ink, textAlign: 'right' }}
          >
            {value2}
          </Typography>
        </Stack>
      </Grid>
    </Grid>
  );
}

function BatchPlanSummaryFilled(props: Readonly<FilledProps>) {
  const {
    planSummary,
    startDate,
    endDate,
    durationMinutes,
    recordsPerBatch,
    sameTimeForAllDates,
    sharedStartTime,
    sharedEndTime,
    schedule,
    formatScheduleTime,
  } = props;

  const ps = batchManagerLocale.planSummary;
  const em = ps.valueEmDash;

  const recordsPerBatchNum = Number(recordsPerBatch) || 1;
  const batchesRequired = Math.ceil(planSummary.requiredTotal / recordsPerBatchNum);
  const provisionForBatches = planSummary.scheduleTimeSlotCount;
  const batchedRecords = planSummary.slotCount * recordsPerBatchNum;

  const { status, extraBatches, statusLabel } = getBatchPlanStatus(batchesRequired, provisionForBatches);

  const eofsInLastBatch =
    planSummary.requiredTotal > 0
      ? planSummary.requiredTotal % recordsPerBatchNum || recordsPerBatchNum
      : 0;

  const lastBatchDateStr =
    planSummary.slotCount > 0 ? getLastBatchDateStr(planSummary.dayCount, startDate, em) : em;

  const lastBatchTimeStr = getLastBatchTimeStr(
    sameTimeForAllDates,
    sharedStartTime,
    sharedEndTime,
    schedule,
    formatScheduleTime
  );

  const lastBatchTimeSuffix = lastBatchTimeStr ? ` - ${lastBatchTimeStr}` : '';
  const lastBatchDisplay = lastBatchDateStr === em ? em : `${lastBatchDateStr}${lastBatchTimeSuffix}`;

  return (
    <Paper
      elevation={0}
      sx={{
        overflow: 'hidden',
        borderRadius: '16px',
        border: `1px solid ${S.line}`,
        boxShadow: S.shadow,
        bgcolor: '#fff',
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 2,
          bgcolor: S.navyDeep,
          borderBottom: `1px solid ${S.navyDeep}`,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: S.radiusTile,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.22)',
            }}
          >
            <Iconify icon="solar:chart-2-bold-duotone" width={26} sx={{ color: S.onNavy }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontFamily: 'Poppins', fontWeight: 700, color: S.onNavy, fontSize: '1rem' }}>
              {ps.planAtGlance}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: S.onNavyMuted, fontSize: '0.7rem' }}>
              {ps.planAtGlanceHint}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ p: 2.5, bgcolor: '#fff' }}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <InfoTile
              icon="solar:calendar-minimalistic-bold-duotone"
              label="Date & Time Range"
              value={
                sameTimeForAllDates ? (
                  <>
                    <Box component="span" sx={{ display: 'block' }}>
                      {dayjs(startDate).isValid() ? dayjs(startDate).format('D MMM YYYY') : em}{' '}
                      - {dayjs(endDate).isValid() ? dayjs(endDate).format('D MMM YYYY') : em}
                    </Box>
                    <Box component="span" sx={{ display: 'block', fontSize: '0.85rem', color: S.muted, fontWeight: 500, mt: 0.5 }}>
                      {formatScheduleTime(sharedStartTime)} – {formatScheduleTime(sharedEndTime)}
                    </Box>
                  </>
                ) : (
                  <Stack spacing={0.5}>
                    {(schedule || []).map((row) => (
                      <Box
                        key={row.date}
                        sx={{
                          fontFamily: 'Poppins',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          color: S.ink,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
                          {dayjs(row.date).isValid() ? dayjs(row.date).format('D MMM YYYY') : em}
                        </Box>
                        <Box component="span" sx={{ color: S.muted }}>-</Box>
                        <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
                          {formatScheduleTime(row.startTime)} – {formatScheduleTime(row.endTime)}
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                )
              }
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <InfoTile
              icon="solar:clock-circle-bold-duotone"
              label="Batch Time"
              value={`${durationMinutes || em} mins`}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <InfoTile
              icon="solar:tuning-2-bold-duotone"
              label="Records per Batch"
              value={recordsPerBatch || em}
            />
          </Grid>
        </Grid>

        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Iconify icon="solar:layers-bold-duotone" width={18} sx={{ color: S.navy }} />
          Plan Execution Details
        </Typography>

        <Box sx={{ px: 2, borderRadius: S.radiusTile, border: `1px solid ${S.lineSoft}`, bgcolor: 'rgba(244, 246, 248, 0.4)' }}>
          <DetailRow label="Total Records" value={planSummary.requiredTotal.toLocaleString()} label2="Batched Records" value2={batchedRecords.toLocaleString()} />
          <DetailRow label="Provision For Batches" value={provisionForBatches.toLocaleString()} label2="Batches Required" value2={batchesRequired.toLocaleString()} />
          <DetailRow label="Last Batch" value={lastBatchDisplay} label2="EOI's in Last Batch" value2={eofsInLastBatch.toLocaleString()} />
          <Grid container spacing={2} sx={{ py: 1.25 }}>
            <Grid item xs={6}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" sx={{ color: S.muted, fontWeight: 500 }}>Status</Typography>
                <Chip label={statusLabel} size="small" sx={{ height: 24, fontSize: '0.7rem', fontWeight: 700, bgcolor: BATCH_PLAN_STATUS_COLOR[status], color: '#fff', borderRadius: '6px', '& .MuiChip-label': { px: 1 } }} />
              </Stack>
            </Grid>
            <Grid item xs={6}>
              {status !== BATCH_PLAN_STATUS.EXTRA && (
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" sx={{ color: S.muted, fontWeight: 500 }}>Extra Batches</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: status === BATCH_PLAN_STATUS.DEFICIT ? '#FF4842' : S.ink }}>
                    {status === BATCH_PLAN_STATUS.SUFFICIENT ? '-' : extraBatches.toLocaleString()}
                  </Typography>
                </Stack>
              )}
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Paper>
  );
}

function BatchPlanSummaryEmpty() {
  const ps = batchManagerLocale.planSummary;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: '16px',
        border: '1px dashed',
        borderColor: S.line,
        bgcolor: S.surface,
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(26, 35, 126, 0.1)',
            border: `1px solid ${S.line}`,
            flexShrink: 0,
          }}
        >
          <Iconify icon="solar:clipboard-list-bold-duotone" width={28} sx={{ color: S.navy }} />
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontFamily: 'Poppins', fontWeight: 700, mb: 0.5, color: S.label }}>
            {ps.emptyTitle}
          </Typography>
          <Typography variant="body2" sx={{ color: S.muted }}>
            {ps.emptyBody}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

export function BatchPlanSummaryCard({
  planValid,
  planSummary,
  startDate,
  endDate,
  durationMinutes,
  recordsPerBatch,
  sameTimeForAllDates,
  sharedStartTime,
  sharedEndTime,
  schedule,
  breakdownScopeRow,
  formatScheduleTime,
}: Readonly<BatchPlanSummaryCardProps>) {
  if (planValid && planSummary) {
    return (
      <BatchPlanSummaryFilled
        planSummary={planSummary}
        startDate={startDate}
        endDate={endDate}
        durationMinutes={durationMinutes}
        recordsPerBatch={recordsPerBatch}
        sameTimeForAllDates={sameTimeForAllDates}
        sharedStartTime={sharedStartTime}
        sharedEndTime={sharedEndTime}
        schedule={schedule}
        breakdownScopeRow={breakdownScopeRow}
        formatScheduleTime={formatScheduleTime}
      />
    );
  }
  return <BatchPlanSummaryEmpty />;
}
