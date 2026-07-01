import type { ReactNode } from 'react';

import { Box, Card, Typography } from '@mui/material';

import { formatNumberWithCommas, convertNumberToShortForm } from 'src/utils/helper';

interface EoiCardProps {
  title: string;
  amount: number;
  subtitle?: string;
  subtitleAmount?: any;
  gradientColor?: any;
  isActive: boolean;
  onClick?: () => void;
  type: string;
  showRupeeSymbol?: boolean;
  borderBottom?: boolean;
  useShortForm?: boolean;
  /** When set, renders the same card shell (padding, shadow, border) without the corner gradient — metrics title/amount layout is skipped. */
  children?: ReactNode;
}

export function EOICards({
  title,
  amount,
  subtitle,
  subtitleAmount,
  gradientColor,
  isActive,
  onClick,
  type,
  showRupeeSymbol = true,
  borderBottom = true,
  useShortForm = true,
  children,
}: Readonly<EoiCardProps>) {
  const shellBorder = isActive ? `2px solid ${gradientColor}` : '2px solid white';

  const plainShellBorder = isActive ? `2px solid ${gradientColor}` : '1px solid #E8EAED';

  const gradientDecor = (
    <Box
      sx={{
        position: 'absolute',
        top: '-40px',
        right: '-100px',
        width: '160px',
        height: '160px',
        borderRadius: `calc(3 * var(--shape-borderRadius))`,
        transform: 'rotate(130deg)',
        background: `linear-gradient(180deg, #fff 0%, ${gradientColor} 100%)`,
        opacity: 0.12,
        pointerEvents: 'none',
      }}
    />
  );

  if (children != null) {
    return (
      <Card
        onClick={onClick}
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          padding: '24px 20px 24px 24px',
          borderRadius: '16px',
          overflow: 'hidden',
          backgroundColor: '#fff',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
          color: '#1C252E',
          border: plainShellBorder,
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>{children}</Box>
      </Card>
    );
  }

  return (
    <Card
      onClick={onClick}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        padding: '24px 20px 24px 24px',
        borderRadius: '16px',
        overflow: 'hidden',
        backgroundColor: '#fff',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        color: '#1C252E',
        border: shellBorder,
      }}
    >
      <Box sx={{ position: 'relative' }}>
        {gradientDecor}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Typography
            variant="h3"
            sx={{
              fontFamily: 'Poppins',
              fontWeight: 700,
              fontSize: '28px !important',
              lineHeight: '48px',
              alignItems: 'center',
              display: 'flex',
            }}
          >
            {String(amount) !== '-'
              ? `${showRupeeSymbol ? '₹' : ''} ${
                  useShortForm ? convertNumberToShortForm(amount) : formatNumberWithCommas(amount)
                }`
              : amount}{' '}
            {type === 'vouchersCollected' && 'Units'}
          </Typography>
          <Typography
            sx={{
              fontFamily: 'Poppins',
              fontWeight: 600,
              fontSize: '14px',
              lineHeight: '22px',
              borderBottom: borderBottom ? '1px dashed #DADADA' : 'none',
              paddingBottom: '3px',
              color: '#637381',
            }}
          >
            {title}
          </Typography>

          {subtitle && (
            <div style={{ display: 'flex', flexDirection: 'row', gap: '4px', marginTop: '4px' }}>
              <Typography
                sx={{
                  fontFamily: 'Poppins',
                  fontWeight: 600,
                  fontSize: '14px',
                  lineHeight: '22px',
                }}
              >
                {subtitle}
              </Typography>
            </div>
          )}
        </div>
      </Box>
    </Card>
  );
}
