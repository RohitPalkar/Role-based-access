import type { CardProps } from '@mui/material/Card';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import { Tooltip, Typography } from '@mui/material';

import { truncateString } from 'src/utils/helper';

import { CONFIG } from 'src/config-global';
import { bgGradient } from 'src/theme/styles';

import { Iconify } from 'src/components/iconify';
import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title: string;
  initials: string;
  total: number;
  period: string;
  color?: { light: string; dark: string };
  icon: React.ReactNode;
};

export function HighestRevenueSummary({
  icon,
  title,
  total,
  period,
  initials,
  color,
  sx,
  ...other
}: Props) {
  const theme = useTheme();
  // Set color based on period
  const cardColor = period === 'Quarterly' ? { light: '#61F3F3', dark: '#006C9C' } : color;
  // Set text color based on period
  const textColor = period === 'Quarterly' ? '#004450' : theme.palette.text.primary;
  const renderTrending = (
    <Box
      sx={{
        top: 16,
        gap: 0.5,
        right: 16,
        display: 'flex',
        position: 'absolute',
        alignItems: 'center',
      }}
    >
      <Box component="span" sx={{ typography: 'subtitle2' }}>
        {period}
      </Box>
    </Box>
  );

  return (
    <Card
      sx={{
        ...bgGradient({
          color: `135deg, ${cardColor?.light}, ${cardColor?.dark}`,
        }),
        p: 2,
        boxShadow: 'none',
        position: 'relative',
        color: textColor,
        backgroundColor: 'common.white',
        minHeight: '156px',
        ...sx,
      }}
      {...other}
    >
      {renderTrending}

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
        }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 112 }}>
          <Box
            sx={{
              background: '#fff',
              borderRadius: 4,
              p: 1,
              width: '40px',
              height: '40px',
              mb: 2,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            {initials}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Box sx={{ mb: 1, typography: 'subtitle2', minHeight: { md: 23 } }}>
                {title || ''}
              </Box>
              <Box
                sx={{
                  typography: 'h4',
                  display: 'flex',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap', // ✅ Enables wrapping when needed
                  // gap: 1, // ✅ Adds spacing between elements
                }}
              >
                {' '}
                <Iconify icon="healthicons:rupee" sx={{ height: '38px', width: '30px' }} />
                <Tooltip title={total} arrow enterTouchDelay={0}>
                  <Typography variant="h4">{truncateString(total.toString(), 6)}</Typography>
                </Tooltip>
                <Typography variant="h4" sx={{ ml: 1 }}>
                  {total !== 0 ? 'Cr' : ''}
                </Typography>
                <Typography variant="h4" sx={{ ml: 1 }}>
                  Sold
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                width: 40,
                height: 40,
                mb: 0,
                background: '#005511',
                borderRadius: 5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ml: 1,
              }}
            >
              {icon}
            </Box>
          </Box>
        </Box>
      </Box>

      <SvgColor
        src={`${CONFIG.site.basePath}/assets/background/shape-square.svg`}
        sx={{
          top: 0,
          left: -20,
          width: 240,
          zIndex: -1,
          height: 240,
          opacity: 0.24,
          position: 'absolute',
          color: `${color}.main`,
        }}
      />
    </Card>
  );
}
