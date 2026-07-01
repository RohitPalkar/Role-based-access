import type { ReactNode } from 'react';
import type { SelectProps } from '@mui/material/Select';
import type { FormControlProps } from '@mui/material/FormControl';

import React from 'react';

import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { Box, Typography } from '@mui/material';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import OutlinedInput from '@mui/material/OutlinedInput';

// ----------------------------------------------------------------------

export interface ISingleSelectOption {
  readonly value: string | number;
  readonly label: string;
  readonly disabled?: boolean;
  readonly icon?: ReactNode;
}

interface SingleSelectDropdownProps extends Omit<SelectProps, 'input'> {
  readonly label: string;
  readonly options: ISingleSelectOption[];
  readonly formControlProps?: FormControlProps;
  readonly placeholder?: string;
}

export function SingleSelectDropdown({
  label,
  options,
  value,
  onChange,
  formControlProps,
  placeholder,
  ...selectProps
}: SingleSelectDropdownProps) {
  const hasValue = value !== null && value !== undefined && value !== '';
  const inputId = `select-${label.toLowerCase().replaceAll(/\s+/g, '-')}`;

  return (
    <FormControl {...formControlProps}>
      <InputLabel
        htmlFor={inputId}
        shrink={hasValue || !!placeholder}
        sx={{
          color: 'black',
          '&.Mui-focused': {
            color: 'black',
          },
          '&.MuiInputLabel-shrink': {
            color: 'black',
          },
        }}
      >
        {label}
      </InputLabel>
      <Select
        {...selectProps}
        value={value ?? ''}
        onChange={onChange}
        input={<OutlinedInput label={label} id={inputId} notched={hasValue || !!placeholder} />}
        displayEmpty={!!placeholder}
        renderValue={(selected) => {
          if ((!selected || selected === '') && placeholder) {
            return <span style={{ color: '#9e9e9e', fontSize: '14px' }}>{placeholder}</span>;
          }
          const selectedOption = options.find((option) => option.value === selected);
          return selectedOption?.label || '';
        }}
      >
        {placeholder && (
          <MenuItem value="" disabled>
            <span style={{ color: '#9e9e9e' }}>{placeholder}</span>
          </MenuItem>
        )}
      {options.map((option) => (
  <MenuItem key={option.value} value={option.value}>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      {option.icon && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: "#1A407D"
          }}
        >
          {option.icon}
        </Box>
      )}
      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
        {option.label}
      </Typography>
    </Box>
  </MenuItem>
))}

      </Select>
    </FormControl>
  );
}
