import type { ReactNode } from 'react';

import { useState, useEffect } from 'react';

import { TextField, Autocomplete, CircularProgress } from '@mui/material';

type Option = {
  label: string;
  value: string | number;
};

interface AsyncAutocompleteProps {
  label: string | ReactNode;
  fetchOptions: (input: string) => Promise<Option[]>;
  value: Option | null;
  onChange: (value: Option | null) => void;
  placeholder?: string;
  error?: boolean;
  helperText?: string;
}

export const AsyncAutocomplete = ({
  label,
  fetchOptions,
  value,
  onChange,
  placeholder,
  error,
  helperText,
}: AsyncAutocompleteProps) => {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      if (inputValue) {
        setLoading(true);
        fetchOptions(inputValue)
          .then((data) => setOptions(data))
          .finally(() => setLoading(false));
      } else {
        setOptions([]);
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [inputValue, fetchOptions]);

  return (
    <Autocomplete
      options={options}
      noOptionsText={
        inputValue.trim() === ""
          ? "Start typing to search..."
          : "No options found"
      }
      getOptionLabel={(option) => option.label || ''}
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
      loading={loading}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          InputLabelProps={{ shrink: true }}
          placeholder={placeholder}
          fullWidth
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
};
