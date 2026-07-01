import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { formatNumberWithCommas } from 'src/utils/helper';

import uiText from 'src/locales/langs/en/common.json';

import { EOICards } from 'src/sections/common-module/eoi-dashboard/components/eoi-dashboard-cards/eoi-cards';

import { BatchIdTypeStatTile } from './components/tinted-accent-stat-card';
import {
  BATCH_ID_TYPE_ACCENT_HEX,
  BATCH_MANAGER_ID_TYPE_UI,
  type BatchIdBreakdownRow,
  BATCH_MANAGER_ID_TYPE_ORDER,
  type BatchManagerIdBreakdownModel,
  BATCH_MANAGER_ID_TYPE_TO_BREAKDOWN_FIELD,
} from './utils/batch-manager-shared';

// ----------------------------------------------------------------------

export type { BatchIdBreakdownRow, BatchManagerIdBreakdownModel } from './utils/batch-manager-shared';

// ----------------------------------------------------------------------

function IdTypeBlock({
  title,
  accent,
  fp,
  pp,
}: Readonly<{ title: string; accent: string; fp: number; pp: number }>) {
  return (
    <BatchIdTypeStatTile
      title={title}
      accent={accent}
      fullyPaid={fp}
      partiallyPaid={pp}
    />
  );
}

function TypologyTypeBlock({
  typology,
}: Readonly<{
  typology: BatchManagerIdBreakdownModel['typology'];
}>) {
  return (
    <BatchIdTypeStatTile
      title="Typology"
      accent="#FF7700"
      fullyPaid={0}
      partiallyPaid={0}
      items={typology.map((item) => ({
        label: item.name,
        value: item.count,
      }))}
      showTypology
    />
  );
}

function RecordBreakdownCard({
  row,
  typology,
  emphasized,
}: Readonly<{
  row: BatchIdBreakdownRow;
  typology?: BatchManagerIdBreakdownModel['typology'];
  /** Stronger header for the “All Records” summary card. */
  emphasized?: boolean;
}>) {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <EOICards
        title=""
        amount={0}
        type="batchRecordBreakdown"
        gradientColor={false}
        isActive={Boolean(emphasized)}
        showRupeeSymbol={false}
        useShortForm={false}
        borderBottom={false}
      >
        <Stack spacing={2} sx={{ flex: 1 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
            sx={{ flexWrap: 'wrap', rowGap: 1 }}
          >
            <Typography
              sx={{
                fontFamily: 'Poppins',
                fontWeight: 700,
                fontSize: emphasized ? { xs: '1.2rem', md: '1.35rem' } : '1.125rem',
              }}
            >
              {row.label}
            </Typography>
            <Stack direction="row" alignItems="baseline" spacing={1} flexWrap="wrap">
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Poppins', fontWeight: 500 }}>
                {uiText.batchManager.breakdown.totalLabel}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'Poppins',
                  fontWeight: 800,
                  fontSize: emphasized ? { xs: '1.5rem', md: '1.75rem' } : '1.35rem',
                  color: '#1A407D',
                  lineHeight: 1.1,
                }}
              >
                {formatNumberWithCommas(row.rowTotal)}
              </Typography>
            </Stack>
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ flex: 1 }}>
            {BATCH_MANAGER_ID_TYPE_ORDER.map((key) => {
              const rowProp = BATCH_MANAGER_ID_TYPE_TO_BREAKDOWN_FIELD[key];
              const cell = row[rowProp];
              return (
                <IdTypeBlock
                  key={key}
                  title={BATCH_MANAGER_ID_TYPE_UI[key].breakdownTitle}
                  accent={BATCH_ID_TYPE_ACCENT_HEX[key]}
                  fp={cell.fp}
                  pp={cell.pp}
                />
              );
            })}
            {emphasized && typology ? (
              <TypologyTypeBlock typology={typology} />
            ) : null}
          </Stack>
        </Stack>
      </EOICards>
    </Box>
  );
}

export type BatchManagerIdBreakdownProps = {
  model: BatchManagerIdBreakdownModel;
};

export function BatchManagerIdBreakdown({
  model,
}: Readonly<BatchManagerIdBreakdownProps>) {
  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <RecordBreakdownCard row={model?.allRecords} typology={model.typology} emphasized />
        </Grid>
        {model?.rows.map((r) => (
          <Grid key={r.label} item xs={12} md={6}>
            <RecordBreakdownCard row={r} />
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
