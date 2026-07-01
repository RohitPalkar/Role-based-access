import React, { useState, useEffect } from 'react';

import { Box, TextField, InputAdornment } from '@mui/material';

import { useDebounceMethod } from 'src/utils/helper';

import { Iconify } from 'src/components/iconify';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  minLength?: number; // 👈 NEW
  showMinLengthHint?: boolean; // 👈 NEW
}

const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search…',
  debounceMs = 500,
  size = 'small',
  fullWidth = true,
  minLength = 3,
  showMinLengthHint = true,
}) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

const debouncedOnChange = useDebounceMethod(
  (val: string) => {
    const trimmed = val.trim();

    if (trimmed.length === 0 || trimmed.length >= minLength) {
      onChange(trimmed);
    }
  },
  debounceMs
);


  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const val = event.target.value;
    setLocalValue(val);
    debouncedOnChange(val);
  };

  const showHint =
    showMinLengthHint &&
    localValue.length > 0 &&
    localValue.length < minLength;

  return (
    <Box sx={{ width: '100%' }}>
      <TextField
        value={localValue}
        size={size}
        fullWidth={fullWidth}
        placeholder={placeholder}
        onChange={handleChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          ),
        }}
      />

      {showHint && (
        <Box
          sx={{
            mt: 0.5,
            color: 'text.secondary',
            fontSize: '0.75rem',
          }}
        >
          Please enter at least {minLength} characters to search
        </Box>
      )}
    </Box>
  );
};

export default SearchInput;
