import type { BoxProps } from '@mui/material';

import { QRCodeSVG } from 'qrcode.react';

import { Box, Typography } from '@mui/material';

// ----------------------------------------------------------------------

interface Props extends BoxProps {
  readonly value: string;
  readonly size?: number;
  readonly label?: string;
}

export default function QRCodeGenerator({ value, size = 128, label, sx, ...other }: Props) {
  if (!value) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        borderRadius: 2,
        ...sx,
      }}
      {...other}
    >
      <QRCodeSVG value={value} size={size} />
      {label && (
        <Typography variant="caption" sx={{ mt: 1, textAlign: 'center', color: 'text.secondary' }}>
          {label}
        </Typography>
      )}
    </Box>
  );
}
