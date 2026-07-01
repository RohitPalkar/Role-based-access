import { forwardRef } from 'react';

import { TextField, type TextFieldProps } from '@mui/material';

export const MuiPhoneInput = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let cleaned = e.target.value.replaceAll(/\s+/g, '');

      if (cleaned.startsWith('+91')) {
        cleaned = cleaned.slice(0, 13);
      } else {
        cleaned = cleaned.slice(0, 16);
      }

      e.target.value = cleaned;
      onChange?.(e);
    };

    return (
      <TextField
        {...props}
        inputRef={ref}
        variant="outlined"
        size="medium"
        fullWidth
        onChange={handleChange}
      />
    );
  }
);
