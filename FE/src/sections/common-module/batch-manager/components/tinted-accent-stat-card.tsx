import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { formatNumberWithCommas } from 'src/utils/helper';

import uiText from 'src/locales/langs/en/common.json';

// ----------------------------------------------------------------------

const SHELL_PADDING = '24px 20px 24px 24px';

export type TintedAccentStatCardProps = {
  children: ReactNode;
  /** Corner wash uses this color in the same gradient as EOICards (`opacity: 0.12`). */
  accentColor: string;
  isActive?: boolean;
  /** Outline when `isActive` is false. */
  inactiveBorderColor?: string;
  onClick?: () => void;
};

/**
 * Metric tile with tinted face + soft rotated corner accent (no EOICards metric layout).
 * For batch ID breakdown and similar dashboards only.
 */
export function TintedAccentStatCard({
  children,
  accentColor,
  isActive = false,
  inactiveBorderColor = '#E8EAED',
  onClick,
}: Readonly<TintedAccentStatCardProps>) {
  const border = isActive ? `2px solid ${accentColor}` : `1px solid ${inactiveBorderColor}`;

  return (
    <Card
      onClick={onClick}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        padding: SHELL_PADDING,
        borderRadius: '16px',
        overflow: 'hidden',
        backgroundColor: '#fff',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        color: '#1C252E',
        border,
      }}
    >
      {/* Match EOICards: soft white → accent wash at low opacity (not a solid tint blob). */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: '-40px',
          right: '-100px',
          width: '160px',
          height: '160px',
          borderRadius: `calc(3 * var(--shape-borderRadius))`,
          transform: 'rotate(130deg)',
          background: `linear-gradient(180deg, #fff 0%, ${accentColor} 100%)`,
          opacity: 0.12,
          pointerEvents: 'none',
        }}
      />
      <Box sx={{ position: 'relative', zIndex: 1 }}>{children}</Box>
    </Card>
  );
}

// ----------------------------------------------------------------------

function MetricPair({
  label,
  value,
  align = 'left',
}: Readonly<{ label: string; value: number; align?: 'left' | 'right' }>) {
  const isRight = align === 'right';

  return (
    <Stack spacing={0.25} alignItems={isRight ? 'flex-end' : 'flex-start'} sx={{ minWidth: 0, maxWidth: '48%' }}>
      <Typography
        variant="caption"
        sx={{
          fontFamily: 'Poppins',
          fontWeight: 500,
          color: 'text.secondary',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          fontSize: 11,
          textAlign: isRight ? 'right' : 'left',
          width: '100%',
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: 'Poppins',
          fontWeight: 700,
          fontSize: { xs: '1.125rem', sm: '1.25rem' },
          lineHeight: 1.2,
          color: '#1C252E',
          textAlign: isRight ? 'right' : 'left',
          width: '100%',
        }}
      >
        {formatNumberWithCommas(value)}
      </Typography>
    </Stack>
  );
}

export type BatchIdTypeStatTileProps = {
  title: string;
  accent: string;
  fullyPaid: number;
  partiallyPaid: number;
  items?: {
    label: string;
    value: string | number;
  }[];
  showTypology?: boolean
};

/**
 * One Preferential / Standard / Vouchers tile: tinted shell, corner accent, category header,
 * and Fully paid / Partially paid counts — all inside a single card (not a separate card per row).
 */
export function BatchIdTypeStatTile({
  title,
  accent,
  fullyPaid,
  partiallyPaid,
  items,
  showTypology = false,
}: Readonly<BatchIdTypeStatTileProps>) {
  const categoryTotal = fullyPaid + partiallyPaid;
  const idStatLabels = uiText.batchManager.idTypeStatTile;
  const typologyTotal = items?.reduce(
    (total, item) => total + Number(item.value),
    0
  );

  return (
    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <TintedAccentStatCard accentColor={accent}>
        <Stack direction="column" spacing={1.5} sx={{ width: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ gap: 1.5 }}>
            <Typography
              sx={{
                fontFamily: 'Poppins',
                fontWeight: 600,
                fontSize: '13px',
                color: '#1C252E',
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                minWidth: 0,
              }}
            >
              <Box
                component="span"
                sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: accent, flexShrink: 0 }}
              />
              {title}
            </Typography>
            <Typography
              sx={{
                fontFamily: 'Poppins',
                fontWeight: 700,
                fontSize: '14px',
                color: '#1C252E',
                flexShrink: 0,
              }}
            >
              {showTypology ? typologyTotal : formatNumberWithCommas(categoryTotal)}
            </Typography>
          </Stack>
          {showTypology ? (
            <Stack
              direction="row"
              spacing={2}
              justifyContent="space-between"
              flexWrap="wrap"
            >
              {items?.map((item) => (
                <Box
                  key={item.label}
                  textAlign="center"
                >
                  <Typography
                    sx={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#637381',
                      fontFamily: 'Poppins',
                    }}
                  >
                    {item.label}
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: '18px',
                      fontWeight: 700,
                      fontFamily: 'Poppins',
                      color: '#1C252E',
                    }}
                  >
                    {formatNumberWithCommas(Number(item.value))}
                  </Typography>
                </Box>
              ))}
            </Stack>
          ) : (
            <Stack
              direction="row"
              alignItems="flex-start"
              justifyContent="space-between"
              sx={{ width: 1, flex: 1, columnGap: 2, pt: 0.25 }}
            >
              <MetricPair label={idStatLabels.fullyPaid} value={fullyPaid} align="left" />
              <MetricPair label={idStatLabels.partiallyPaid} value={partiallyPaid} align="right" />
            </Stack>
          )}
        </Stack>
      </TintedAccentStatCard>
    </Box>
  );
}
