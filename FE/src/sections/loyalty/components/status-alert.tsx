import React from 'react';

import { Box, Typography } from '@mui/material';

import errorIcon from 'src/assets/icons/error-icon.svg';
import successIcon from 'src/assets/icons/successCircle.svg';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export type StatusAlertType = 'success' | 'error' | 'warning' | 'info';

const PINE_LABS_PLACEHOLDERS = ['{id}', '{PineLabsID}'] as const;

type Props = {
  type?: StatusAlertType;
  message: string;
  pineLabsId?: string;
};

const ALERT_CONFIG: Record<
  StatusAlertType,
  {
    backgroundColor: string;
    color: string;
    icon: React.ReactNode;
  }
> = {
  success: {
    backgroundColor: '#D3FCD2',
    color: '#065E49',
    icon: <img src={successIcon} alt="success-icon" />,
  },
  error: {
    backgroundColor: '#FFE9D5',
    color: '#7A0916',
    icon: <img src={errorIcon} alt="error-icon" />,
  },
  warning: {
    backgroundColor: '#FFF5CC',
    color: '#7A4100',
    icon: <Iconify icon="solar:danger-triangle-bold" width={24} sx={{ color: '#FFAB00' }} />,
  },
  info: {
    backgroundColor: '#CAFDF5',
    color: '#006C9C',
    icon: <Iconify icon="solar:info-circle-bold" width={24} sx={{ color: '#00B8D9' }} />,
  },
};

const StatusAlert = ({ type = 'success', message, pineLabsId }: Props) => {
  const config = ALERT_CONFIG[type];

  const renderMessage = () => {
    if (!pineLabsId) {
      return message;
    }

    const placeholder = PINE_LABS_PLACEHOLDERS.find((token) => message.includes(token));

    if (!placeholder) {
      return message;
    }

    const parts = message.split(placeholder);

    return (
      <>
        {parts[0]}
        <Box component="span" sx={{ fontWeight: 700 }}>
          {pineLabsId}
        </Box>
        {parts[1]}
      </>
    );
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 2,
        borderRadius: 1,
        backgroundColor: config.backgroundColor,
      }}
    >
      {config.icon}

      <Typography
        sx={{
          fontSize: 14,
          color: config.color,
        }}
      >
        {renderMessage()}
      </Typography>
    </Box>
  );
};

export default StatusAlert;
