import type { FormikProps } from 'formik';
import type { CancelTokenSource } from 'axios';
import type { TextFieldProps as MuiTextFieldProps } from '@mui/material';

import axios from 'axios';
import { getIn } from 'formik';
import React, { useRef, useState, useEffect, useCallback } from 'react';

import LocationOnIcon from '@mui/icons-material/LocationOn';
import { Box, TextField, Typography, Autocomplete, CircularProgress } from '@mui/material';

import { decryptText } from 'src/utils/encryption';

interface SuggestionOption {
  description: string;
  placeId: string;
}

export interface AddressDetails {
  areaName?: string;
  city?: string;
  state?: string;
  country?: string;
  pinCode?: string;
  mapLink?: string;
  [key: string]: any;
}

interface GoogleMapsAutocompleteProps {
  name: string;
  formik: FormikProps<any>;
  onSelect?: (details: AddressDetails) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  variant?: MuiTextFieldProps['variant'];
  TextFieldProps?: Partial<MuiTextFieldProps>;
}

const GoogleMapsAutocomplete: React.FC<GoogleMapsAutocompleteProps> = ({
  name,
  formik,
  onSelect,
  label = '',
  required = false,
  disabled = false,
  placeholder = '',
  variant = 'outlined',
  TextFieldProps = {},
}) => {
  const currentValue: string = getIn(formik.values, name) || '';
  const [options, setOptions] = useState<SuggestionOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(currentValue);
  const [open, setOpen] = useState(false);

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
      const { data } = await axios.get(
        `${import.meta.env?.VITE_SERVER_URL}/google/autocomplete`,
        {
          params: { input: val },
          cancelToken: cancelSource.current.token,
        }
      );

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

  const handleInputChange = useCallback(
    (_event: React.SyntheticEvent, val: string, reason: 'input' | 'clear' | 'reset') => {
      if (reason === 'input') {
        setInputValue(val);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        if (!val?.trim()) {
          setOptions([]);
          setOpen(false);
          formik.setFieldValue(name, '');
          return;
        }

        debounceTimer.current = setTimeout(() => fetchSuggestions(val), 500);
      } else if (reason === 'clear') {
        setInputValue('');
        setOptions([]);
        setOpen(false);
        formik.setFieldValue(name, '');
      }
    },
    [fetchSuggestions, formik, name]
  );

  const handleBlur = useCallback(() => {
    if (inputValue?.trim()) {
      formik.setFieldValue(name, inputValue);
      formik.setFieldTouched(name, true, true);
      setOpen(false);
    }
  }, [formik, inputValue, name]);


  const handleSelect = useCallback(
    async (event: React.SyntheticEvent, newValue: string | SuggestionOption | null) => {
      if (!newValue || typeof newValue === 'string') return;

      setLoading(true);
      try {
        const { data } = await axios.get(
          `${import.meta.env?.VITE_SERVER_URL}/google/address-details/${newValue.placeId}`
        );
        const decrypted = await decryptText(data?.response?.data);
        let details: AddressDetails =
          typeof decrypted === 'string' ? JSON.parse(decrypted) : decrypted;
        if (!details || typeof details !== 'object') details = {};

        const areaName = details?.areaName || newValue?.description;

        setInputValue(areaName);
        formik.setFieldValue(name, areaName);
        onSelect?.(details);
        setOpen(false);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    },
    [formik, name, onSelect]
  );

  useEffect(() => {
    if (formik.values[name] !== inputValue) {
      setInputValue(formik.values[name] || '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values[name]]);

  useEffect(() => () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      cancelSource.current?.cancel?.();
    }, []);


  return (
    <Autocomplete
      fullWidth
      freeSolo
      open={open}
      onOpen={() => setOpen(options.length > 0)}
      onClose={() => setOpen(false)}
      options={options}
      loading={loading}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onChange={(event, value) => handleSelect(event, value)}
      onBlur={handleBlur}
      getOptionLabel={(option) =>
        typeof option === 'string' ? option : option?.description || ''}
      filterOptions={(x) => x}
      noOptionsText=""
      popupIcon={null}
      disabled={disabled}
      value={null} // ✅ Fix for backspace/edit issue
      renderInput={(params) => (
        <TextField
          {...params}
          id={name}
          name={name}
          label={label}
          InputLabelProps={{ required }}
          placeholder={placeholder}
          variant={variant}
          disabled={disabled}
          error={getIn(formik.touched, name) && Boolean(getIn(formik.errors, name))}
          helperText={getIn(formik.touched, name) && getIn(formik.errors, name)}
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
          key={option?.placeId}
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
            {option?.description || ''}
          </Typography>
        </Box>
      )}
    />
  );
};

export default GoogleMapsAutocomplete;