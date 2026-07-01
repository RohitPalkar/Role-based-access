import type { CancelTokenSource } from 'axios';
import type { Path, Control, FieldValues } from 'react-hook-form';
import type { TextFieldProps as MuiTextFieldProps } from '@mui/material';

import axios from 'axios';
import { Controller } from 'react-hook-form';
import React, { useRef, useState, useEffect, useCallback } from 'react';

import LocationOnIcon from '@mui/icons-material/LocationOn';
import {
  Box,
  TextField,
  FormLabel,
  Typography,
  FormControl,
  Autocomplete,
  CircularProgress,
} from '@mui/material';

import { decryptText } from 'src/utils/encryption';

export interface SuggestionOption {
  description: string;
  placeId: string;
}

export interface AddressDetails {
  areaName?: string;
  city?: string;
  state?: string;
  country?: string;
  pinCode?: string;
  [key: string]: any;
}

interface GoogleMapsAutocompleteProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  onSelect?: (details: AddressDetails) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  variant?: MuiTextFieldProps['variant'];
  TextFieldProps?: Partial<MuiTextFieldProps>;
}

const RHFGoogleMapsAutocomplete = <T extends FieldValues>({
  name,
  control,
  onSelect,
  label = '',
  required = false,
  disabled = false,
  placeholder = '',
  variant = 'outlined',
  TextFieldProps = {},
}: GoogleMapsAutocompleteProps<T>) => {
  const [options, setOptions] = useState<SuggestionOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelSource = useRef<CancelTokenSource | null>(null);

  const fetchSuggestions = useCallback(async (val: string) => {
    if (!val?.trim()) {
      setOptions([]);
      setOpen(false);
      return;
    }

    cancelSource.current?.cancel?.();
    cancelSource.current = axios.CancelToken.source();

    setLoading(true);
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_SERVER_URL}/google/autocomplete`, {
        params: { input: val },
        cancelToken: cancelSource.current.token,
      });
      const decrypted = await decryptText(data?.response?.data);
      let suggestions: SuggestionOption[] =
        typeof decrypted === 'string' ? JSON.parse(decrypted) : decrypted;

      // Guarantee array
      if (!Array.isArray(suggestions)) {
        suggestions = [];
      }

      setOptions(suggestions);
      setOpen(suggestions.length > 0);
    } catch {
      setOptions([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelect = useCallback(
    async (option: SuggestionOption | null, onChange: (value: any) => void) => {
      if (!option?.placeId) {
        onChange('');
        setInputValue('');
        return;
      }

      setLoading(true);
      try {
        const { data } = await axios.get(
          `${import.meta.env.VITE_SERVER_URL}/google/address-details/${option.placeId}`
        );
        const decrypted = await decryptText(data?.response?.data);
        // safe parse
        let details: AddressDetails =
          typeof decrypted === 'string' ? JSON.parse(decrypted) : decrypted;
        if (!details || typeof details !== 'object') {
          details = {};
        }

        const areaName = details?.areaName || option.description;

        setInputValue(areaName);
        onChange(areaName);
        onSelect?.(details);
        setOpen(false);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    },
    [onSelect]
  );

  const handleInputChange = useCallback(
    (_: React.SyntheticEvent, val: string, reason: 'input' | 'reset' | 'clear') => {
      if (reason === 'input') {
        setInputValue(val);

        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        if (!val) {
          setOptions([]);
          setOpen(false);
          return;
        }

        debounceTimer.current = setTimeout(() => fetchSuggestions(val), 400);
      } else if (reason === 'clear') {
        setInputValue('');
        setOptions([]);
        setOpen(false);
      }
    },
    [fetchSuggestions]
  );

  const handleBlur = useCallback(
    (onChange: (value: any) => void) => {
      if (!inputValue?.trim()) return;

      onChange(inputValue);
      setOpen(false);
    },
    [inputValue]
  );


  useEffect(() => () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      cancelSource.current?.cancel?.();
    },
    []
  );

  return (
    <FormControl fullWidth>
      {label && (
        <FormLabel htmlFor={name} sx={{ color: '#1C252E', fontWeight: 600, mb: 0.5 }}>
          {label}
          {required && <span className="asteriskColor"> *</span>}
        </FormLabel>
      )}

      <Controller
        name={name}
        control={control}
        render={({ field: { value, onChange, ref }, fieldState: { error } }) => (
          <Autocomplete
            fullWidth
            freeSolo
            open={open}
            onOpen={() => setOpen(options.length > 0)}
            onClose={() => setOpen(false)}
            options={options}
            loading={loading}
            getOptionLabel={(option) =>
              typeof option === 'string' ? option : option?.description || ''
            }
            filterOptions={(x) => x}
            popupIcon={null}
            noOptionsText=""
            disabled={disabled}
            value={value || null}
            inputValue={inputValue || value || ''}
            onInputChange={handleInputChange}
            onChange={(_, selectedOption) => {
              if (typeof selectedOption === 'string' || !selectedOption) return;
              handleSelect(selectedOption, onChange);
            }}
            onBlur={() => handleBlur(onChange)}
            renderInput={(params) => (
              <TextField
                {...params}
                inputRef={ref}
                placeholder={placeholder}
                variant={variant}
                disabled={disabled}
                error={!!error}
                helperText={error?.message}
                {...TextFieldProps}
                InputProps={{
                  ...params.InputProps,
                  ...TextFieldProps.InputProps,
                  endAdornment: (
                    <>
                      {loading ? <CircularProgress size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <Box
                component="li"
                {...props}
                key={option.placeId}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: '1px solid #eee',
                  py: 1,
                  px: 1.5,
                  '&:last-child': { borderBottom: 'none' },
                }}
              >
                <LocationOnIcon sx={{ mr: 1, color: 'gray' }} />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {option.description}
                </Typography>
              </Box>
            )}
          />
        )}
      />
    </FormControl>
  );
};

export default RHFGoogleMapsAutocomplete;
