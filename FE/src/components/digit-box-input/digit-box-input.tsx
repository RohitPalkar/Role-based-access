import React, { useRef, useState, useCallback } from 'react';

import { Box, TextField, FormHelperText } from '@mui/material';

const DEFAULT_LENGTH = 4;
const NUMERIC_REGEX = /^\d*$/;
const NUMERIC_PASTE_REGEX = /^\d+$/;
const PRIMARY_COLOR = 'rgba(26, 64, 125, 1)';

const padDigits = (value: string, length: number): string[] => {
  const sliced = (value || '').slice(0, length).split('');
  while (sliced.length < length) sliced.push('');
  return sliced;
};

const createDigitKeys = (length: number) => Array.from({ length }, () => crypto.randomUUID());

export interface DigitBoxInputProps {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
  label?: string;
  required?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

/**
 * Generic numeric N-digit box input (default length 4). Mirrors OTP dialog box
 * behaviour: numeric-only filter, auto-advance on input, backspace step-back,
 * paste splits across remaining boxes. Controlled via `value` (concatenated
 * digits) and `onChange(next)` returning the concatenated string.
 */
export function DigitBoxInput({
  value,
  onChange,
  length = DEFAULT_LENGTH,
  error = false,
  helperText,
  disabled = false,
  autoFocus = false,
  id,
  label,
  required = false,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: Readonly<DigitBoxInputProps>) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [digitKeys] = useState(() => createDigitKeys(length));

  const digits = padDigits(value, length);

  const focusInput = useCallback((index: number) => {
    inputsRef.current[index]?.focus();
  }, []);

  const emitChange = useCallback(
    (next: string[]) => {
      onChange(next.join(''));
    },
    [onChange]
  );

  const handleChange = (nextValue: string, index: number) => {
    if (!NUMERIC_REGEX.test(nextValue)) return;

    const truncated = nextValue.slice(-1);
    const updated = [...digits];
    updated[index] = truncated;
    emitChange(updated);

    if (truncated && index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, index: number) => {
    if (e.key !== 'Backspace' || digits[index] || index === 0) {
      return;
    }
    const updated = [...digits];
    updated[index - 1] = '';
    emitChange(updated);
    focusInput(index - 1);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>, startIndex: number) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (!NUMERIC_PASTE_REGEX.test(pasted)) return;

    const pastedDigits = pasted.slice(0, length - startIndex).split('');
    const updated = [...digits];
    pastedDigits.forEach((digit, offset) => {
      updated[startIndex + offset] = digit;
    });
    emitChange(updated);

    const nextFocus = Math.min(startIndex + pastedDigits.length, length - 1);
    focusInput(nextFocus);
  };

  const borderColor = error ? '#d32f2f' : '#D1D5DB';
  const focusBorderColor = error ? '#d32f2f' : PRIMARY_COLOR;
  const helperId = id ? `${id}-helper-text` : undefined;
  const describedBy =
    [helperText ? helperId : undefined, ariaDescribedBy].filter(Boolean).join(' ') || undefined;

  return (
    <Box sx={{ position: 'relative' }}>
      {label && (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: '-20px',
            fontSize: '12px',
            fontWeight: 400,
            color: error ? '#d32f2f' : 'rgba(99, 115, 129, 1)',
            pointerEvents: 'none',
          }}
        >
          {label}
          {required && (
            <span style={{ color: 'red', marginLeft: '3.5px' }}>*</span>
          )}
        </Box>
      )}
      <Box id={id} role="group" aria-label={ariaLabel}>
        <Box
          sx={{
            display: 'flex',
            gap: '8px',
          }}
        >
          {digits.map((digit, index) => (
            <TextField
              key={digitKeys[index]}
              inputRef={(element: HTMLInputElement | null) => {
                inputsRef.current[index] = element;
              }}
              value={digit}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onPaste={(e) => handlePaste(e, index)}
              disabled={disabled}
              autoFocus={autoFocus && index === 0}
              error={error}
              inputProps={{
                maxLength: 1,
                inputMode: 'numeric',
                pattern: '[0-9]*',
                'aria-label': ariaLabel ? `${ariaLabel} digit ${index + 1}` : `Digit ${index + 1}`,
                'aria-describedby': describedBy,
                style: {
                  textAlign: 'center',
                  fontSize: 20,
                  fontWeight: 500,
                  padding: '8px 0',
                },
              }}
              variant="outlined"
              sx={{
                width: { xs: '42px', sm: '48px' },
                height: { xs: '48px', sm: '52px' },
                '& .MuiOutlinedInput-root': {
                  height: '100%',
                  borderRadius: '8px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor,
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: focusBorderColor,
                  },
                },
              }}
            />
          ))}
        </Box>
        {helperText && (
          <FormHelperText id={helperId} error={error} sx={{ mt: 0.5, ml: 0 }}>
            {helperText}
          </FormHelperText>
        )}
      </Box>
    </Box>
  );
}

export default DigitBoxInput;
