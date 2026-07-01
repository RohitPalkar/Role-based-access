import type { TextFieldProps } from '@mui/material/TextField';

import { Controller, useFormContext } from 'react-hook-form';

import { Box } from '@mui/material';
import TextField from '@mui/material/TextField';

// ----------------------------------------------------------------------

type Props = TextFieldProps & {
  name: string;
};

export function RHFTextField({
  name,
  label,
  helperText,
  type,
  required = false,
  disabled,
  inputProps,
  ...other
}: Props) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {

        let inputVal = field.value;
        if (type === 'number') {
          const isEmpty =
            field.value === 0 ||
            field.value === undefined ||
            field.value === null ||
            field.value === '';

          inputVal = isEmpty ? '' : field.value;
        }

        return (
        <TextField
          sx={{ 
            cursor: disabled ? 'not-allowed' : 'default',
            '& .MuiOutlinedInput-notchedOutline': {
              // Ensure proper outline when no label is present
              ...(label ? {} : { top: 0 }),
              ...(label ? {} : { '& legend': { display: 'none' } })
            }
          }}
          {...field}
          disabled={disabled}
          fullWidth
          type={type}
          label={label ? 
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              {label}
              {required && (
                <Box component="span" sx={{ color: 'error.main' }}>
                  *
                </Box>
              )}
            </Box>
          : null}
          value={inputVal}
          onChange={(event) => {
            let inputValue = event.target.value;
            if (inputValue.startsWith('.')) {
              inputValue = `0${inputValue}`;
            }
            if (type === 'number') {
              field.onChange(inputValue === '' ? undefined : Number(inputValue));
            } else {
              field.onChange(inputValue);
            }
          }}
          error={!!error}
          helperText={helperText ?? error?.message}
          inputProps={{
            autoComplete: 'off',
            ...inputProps,
          }}
          {...other}
        />
  )}}
    />
  );
}
