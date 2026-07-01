import React from 'react';
import { toast } from 'sonner';

import { Box, Stack, Button, Tooltip, Typography } from '@mui/material';

import { QRCodeGenerator } from 'src/components/qr-code-generator';

import copyIcon from '../../../../../public/assets/icons/copyIcon.svg';
import openIcon from '../../../../../public/assets/icons/OpenIcon.svg';
import shareIcon from '../../../../../public/assets/icons/shareicon.svg';

interface LinkActionBarProps {
    title: string;
    bookingError?: boolean;
    showQRCode?: boolean;
    getUrl: () => string;
    handleOpen: () => void;
    handleShare?: () => void;
    copyMessageFn?: () => void;
    hideShare?: boolean;
}

const LinkActionBar = ({
  title,
  bookingError = false,
  showQRCode = false,
  getUrl,
  handleOpen,
  handleShare,
  copyMessageFn,
  hideShare = false,
} : LinkActionBarProps) => {
  const buttonBaseStyle = {
    flex: { xs: 1, sm: 'none' },
    minWidth: { xs: 'auto', sm: '48px' },
    height: '36px',
    padding: '6px',
    opacity: bookingError ? 0.5 : 1,
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    '&.Mui-disabled': {
      color: '#9E9E9E',
      borderColor: '#E0E0E0',
      backgroundColor: '#F5F5F5',
      opacity: 1,
      cursor: 'not-allowed',
    },
  };
  const qrCodeUrl = getUrl();
  const handleCopy = () => {
    const urlToCopy = getUrl();
    navigator.clipboard.writeText(urlToCopy);

    const message = copyMessageFn ? copyMessageFn() : `${title} URL copied to clipboard`;
    toast.success(message || "Copied to clipboard");
  };

  return (
    <Box>
      {(qrCodeUrl && showQRCode) && (
        <QRCodeGenerator
          value={qrCodeUrl}
          size={150}
          sx={{ mb: 2 }}
        />
      )}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 600, textAlign: 'left' }}
          color={bookingError ? 'text.disabled' : 'text.primary'}
        >
          {title}
        </Typography>

        <Stack direction="row" spacing={1}>
          {/* Copy Button */}
          <Tooltip title="Copy URL">
            <Button
              variant="outlined"
              size="small"
              disabled={bookingError}
              sx={buttonBaseStyle}
              onClick={handleCopy}
            >
              <Box component="img" src={copyIcon} alt="Copy" sx={{ width: 20, height: 20, opacity: bookingError ? 0.5 : 1 }} />
            </Button>
          </Tooltip>

          {/* Open Button */}
          <Tooltip title="Open in new tab">
            <Button
              variant="outlined"
              size="small"
              disabled={bookingError}
              color="primary"
              sx={buttonBaseStyle}
              onClick={handleOpen}
            >
              <Box component="img" src={openIcon} alt="Open" sx={{ width: 20, height: 20, opacity: bookingError ? 0.5 : 1 }} />
            </Button>
          </Tooltip>

          {/* Optional Share Button */}
          {!hideShare && (
            <Tooltip title={`Share ${title}`}>
              <Button
                variant="outlined"
                size="small"
                disabled={bookingError}
                sx={buttonBaseStyle}
                onClick={handleShare}
              >
                <Box component="img" src={shareIcon} alt="Share" sx={{ width: 20, height: 20, opacity: bookingError ? 0.5 : 1 }} />
              </Button>
            </Tooltip>
          )}
        </Stack>
      </Stack>
    </Box>
  );
};

export default LinkActionBar;
