import React, { useRef, useState, useEffect, useCallback } from 'react';

import {
  Box,
  Link,
  Button,
  Dialog,
  useTheme,
  TextField,
  Typography,
  DialogTitle,
  DialogContent,
  useMediaQuery,
  FormHelperText,
} from '@mui/material';

import { interpolate } from 'src/utils/helper';

import uiText from 'src/locales/langs/en/common.json';


// ----------------------------------------------------------------------

type OtpDialogProps = {
  open: boolean;
  onClose?: () => void;
  onVerify: (otp: string) => void;
  onResend: () => void;

  otpLength?: number;
  resendCooldownSeconds?: number;

  title?: string;
  description?: string;
  submitButtonText?: string;

  showHeadCount?: boolean;
  headCount?: string;
  onHeadCountChange?: (value: string) => void;

  errorMessage?: string;

  isBlocked?: boolean;
  blockedMessage?: string;

  securityNote?: string;
  securityNoteIconSrc?: string;
};

// ----------------------------------------------------------------------

const DEFAULT_OTP_LENGTH = 6;
const DEFAULT_COOLDOWN = 60;

const PRIMARY_COLOR = 'rgba(26, 64, 125, 1)';

const DEFAULT_BLOCKED_MSG = uiText.batchViewRecords.otpDialog.blockedMessage;

// ----------------------------------------------------------------------

const createEmptyOtp = (length: number) =>
  new Array(length).fill('');

const createOtpKeys = (length: number) =>
  Array.from({ length }, () => crypto.randomUUID());

// ----------------------------------------------------------------------

export function OtpDialog({
  open,
  onClose,
  onVerify,
  onResend,

  otpLength = DEFAULT_OTP_LENGTH,
  resendCooldownSeconds = DEFAULT_COOLDOWN,

  title = 'Verify your identity',
  description,

  submitButtonText = 'Verify',

  showHeadCount = false,
  headCount = '',
  onHeadCountChange,

  errorMessage,

  isBlocked = false,
  blockedMessage = DEFAULT_BLOCKED_MSG,

  securityNote,
  securityNoteIconSrc,
}: Readonly<OtpDialogProps>) {
  const theme = useTheme();

  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { otpDialog } = uiText.batchViewRecords
  const [otp, setOtp] = useState<string[]>(() =>
    createEmptyOtp(otpLength)
  );

  const [timer, setTimer] = useState(resendCooldownSeconds);

  const [otpKeys] = useState(() =>
    createOtpKeys(otpLength)
  );

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // ----------------------------------------------------------------------

  const focusInput = (index: number) => {
    inputsRef.current[index]?.focus();
  };

  // ----------------------------------------------------------------------

  useEffect(() => {
    if (!open) return undefined;

    setOtp(createEmptyOtp(otpLength));
    setTimer(resendCooldownSeconds);

    const timeoutId = setTimeout(() => {
      focusInput(0);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [open, otpLength, resendCooldownSeconds]);

  // ----------------------------------------------------------------------

  useEffect(() => {
    if (timer <= 0) return undefined;

    const intervalId = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timer]);

  // ----------------------------------------------------------------------

  const handleChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    setOtp((prev) => {
      const updatedOtp = [...prev];

      updatedOtp[index] = value;

      return updatedOtp;
    });

    if (value && index < otpLength - 1) {
      focusInput(index + 1);
    }
  };

  // ----------------------------------------------------------------------

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    index: number
  ) => {
    if (e.key !== 'Backspace' || otp[index] || index === 0) {
      return;
    }

    setOtp((prev) => {
      const updatedOtp = [...prev];

      updatedOtp[index - 1] = '';

      return updatedOtp;
    });

    focusInput(index - 1);
  };

  // ----------------------------------------------------------------------

  const handlePaste = (
    e: React.ClipboardEvent<HTMLDivElement>,
    startIndex: number
  ) => {
    e.preventDefault();

    const pastedValue = e.clipboardData.getData('text').trim();

    if (!/^\d+$/.test(pastedValue)) return;

    const pastedDigits = pastedValue
      .slice(0, otpLength - startIndex)
      .split('');

    setOtp((prev) => {
      const updatedOtp = [...prev];

      pastedDigits.forEach((digit, offset) => {
        updatedOtp[startIndex + offset] = digit;
      });

      return updatedOtp;
    });

    const nextFocusIndex = startIndex + pastedDigits.length;

    if (nextFocusIndex < otpLength) {
      focusInput(nextFocusIndex);
    }
  };

  // ----------------------------------------------------------------------

  const handleVerify = useCallback(() => {
    onVerify(otp.join(''));
  }, [onVerify, otp]);

  // ----------------------------------------------------------------------

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isBlocked) {
        handleVerify();
      }
    };

    globalThis.addEventListener('keydown', onKeyDown);

    return () => {
      globalThis.removeEventListener('keydown', onKeyDown);
    };
  }, [isBlocked, handleVerify]);

  // ----------------------------------------------------------------------

  const handleResendClick = () => {
    onResend();

    setTimer(resendCooldownSeconds);
  };

  // ----------------------------------------------------------------------

  const handleDialogClose = (
    _event: object,
    reason: string
  ) => {
    if (reason !== 'backdropClick') {
      onClose?.();
    }
  };

  // ----------------------------------------------------------------------

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      PaperProps={{
        sx: {
          width: isMobile ? '90%' : '440px',
          maxWidth: isMobile ? '90%' : '440px',
          borderRadius: '16px',
          padding: isMobile ? '16px' : '24px',
        },
      }}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
          },
        },
      }}
    >
      {/* ---------------------------------------------------------------------- */}
      {/* Title */}
      {/* ---------------------------------------------------------------------- */}

      <DialogTitle
        sx={{
          m: 0,
          p: 0,
          mb: 2,
          textAlign: 'center',
        }}
      >
        <Typography
          sx={{
            fontSize: '20px',
            fontWeight: 700,
          }}
        >
          {title}
        </Typography>

        {description && (
          <Typography
            sx={{
              mt: 2,
              fontSize: '14px',
              lineHeight: 1.6,
              color: '#6B7280',
              textAlign: 'center',
              fontWeight: 400,
            }}
          >
            {description}
          </Typography>
        )}
      </DialogTitle>

      {/* ---------------------------------------------------------------------- */}
      {/* Content */}
      {/* ---------------------------------------------------------------------- */}

      <DialogContent
        sx={{
          textAlign: 'center',
          padding: '0px 8px',
        }}
      >
        {/* ---------------------------------------------------------------------- */}
        {/* OTP Inputs */}
        {/* ---------------------------------------------------------------------- */}

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: isMobile ? '8px' : '12px',
            mb: 3,
          }}
        >
          {otp.map((digit, index) => (
            <TextField
              key={otpKeys[index]}
              inputRef={(element: HTMLInputElement | null) => {
                inputsRef.current[index] = element;
              }}
              value={digit}
              onChange={(e) =>
                handleChange(e.target.value, index)
              }
              onKeyDown={(e) => handleKeyDown(e, index)}
              onPaste={(e) => handlePaste(e, index)}
              inputProps={{
                maxLength: 1,
                style: {
                  textAlign: 'center',
                  fontSize: 20,
                  fontWeight: 500,
                },
              }}
              variant="outlined"
              sx={{
                width: isMobile ? '42px' : '56px',
                height: isMobile ? '48px' : '62px',

                '& .MuiOutlinedInput-root': {
                  height: '100%',
                  borderRadius: '12px',

                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#D1D5DB',
                  },

                  '&.Mui-focused .MuiOutlinedInput-notchedOutline':
                    {
                      borderColor: PRIMARY_COLOR,
                    },
                },
              }}
            />
          ))}
        </Box>

        {/* ---------------------------------------------------------------------- */}
        {/* Head Count */}
        {/* ---------------------------------------------------------------------- */}

        {showHeadCount && (
          <TextField
            fullWidth
            label={otpDialog.headCountLabel}
            type="number"
            placeholder={otpDialog.headCountPlaceholder}
            value={headCount}
            onChange={(e) =>
              onHeadCountChange?.(e.target.value)
            }
            sx={{
              mb: 4,
            }}
          />
        )}

        {/* ---------------------------------------------------------------------- */}
        {/* Submit Button */}
        {/* ---------------------------------------------------------------------- */}

        <Button
          variant="contained"
          fullWidth
          disabled={isBlocked}
          onClick={handleVerify}
          sx={{
            color: '#ffffff',
            padding: '14px',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: 600,
            textTransform: 'none',
            backgroundColor: isBlocked
              ? '#ccc'
              : PRIMARY_COLOR,

            '&:hover': {
              backgroundColor: isBlocked
                ? '#ccc'
                : PRIMARY_COLOR,
            },
          }}
        >
          {submitButtonText}
        </Button>

        {/* Error message */}

        {errorMessage && (
          <Typography
            sx={{
              my: 2,
              color: 'red',
              fontSize: '12px',
            }}
          >
            {errorMessage}
          </Typography>
        )}

        {/* ---------------------------------------------------------------------- */}
        {/* Blocked helper */}
        {/* ---------------------------------------------------------------------- */}

        {isBlocked && !errorMessage && (
          <FormHelperText
            error
            sx={{
              mt: 1,
              fontSize: '12px',
              textAlign: 'center',
            }}
          >
            {blockedMessage}
          </FormHelperText>
        )}

        {/* ---------------------------------------------------------------------- */}
        {/* Resend Section */}
        {/* ---------------------------------------------------------------------- */}

        <Typography
          sx={{
            mt: 4,
            fontSize: '14px',
            color: '#111827',
            fontWeight: 400
          }}
        >
         {otpDialog.didNotReceiveCode}{' '}

          {timer > 0 ? (
            <span
              style={{
                color: PRIMARY_COLOR,
                fontWeight: 600,
              }}
            >
              {interpolate(otpDialog.resendCodeIn, { timer: String(timer) })}
            </span>
          ) : (
            <Link
              component="button"
              onClick={handleResendClick}
              sx={{
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 600,
                color: PRIMARY_COLOR,
                textDecoration: 'none',
              }}
            >
              {otpDialog.resendCode}
            </Link>
          )}
        </Typography>

        {/* ---------------------------------------------------------------------- */}
        {/* Security Note */}
        {/* ---------------------------------------------------------------------- */}

        {securityNote && (
          <Box
            sx={{
              display: 'flex',
              mt: 3,
              p: 1,
              borderRadius: '8px',
              justifyContent: 'start',
              alignItems: 'center',
              backgroundColor: '#fff3cd',
              color: '#856404',
            }}
          >
            {securityNoteIconSrc && (
              <img
                src={securityNoteIconSrc}
                alt="security"
                style={{
                  width: '16px',
                  height: '16px',
                  marginRight: '5px',
                }}
              />
            )}

            <Typography sx={{ fontSize: '10px' }}>
              {securityNote}
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}