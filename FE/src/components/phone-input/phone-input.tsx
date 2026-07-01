import type { RootState } from 'src/redux/store';
import type { TextFieldProps } from '@mui/material/TextField';
import type { Value, Country } from 'react-phone-number-input/input';

import { parsePhoneNumber } from 'react-phone-number-input';
import PhoneNumberInput from 'react-phone-number-input/input';
import { useMemo, useState, useEffect, forwardRef, useCallback, startTransition } from 'react';

import Box from '@mui/material/Box';
import { Typography } from '@mui/material';
import { Info } from '@mui/icons-material';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import { inputBaseClasses } from '@mui/material/InputBase';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { fetchCountries } from 'src/redux/actions/country-list-actions';

import { Iconify } from '../iconify';
import { CountryListPopover } from './list-popover';

import type { PhoneInputProps } from './types';

// ----------------------------------------------------------------------

export function PhoneInput({
  sx,
  size,
  value,
  label,
  onChange,
  placeholder,
  disableSelect,
  showDialCode = true,
  variant = 'outlined',
  country: inputCountryCode,
  disabled = false,
  required = false,
  highlight = false,
  highlightText,
  ...other
}: PhoneInputProps & { required?: boolean; highlight?: boolean;
  highlightText?: string }) {
  const dispatch = useAppDispatch();
  const { countryList } = useAppSelector((state: RootState) => state.countries);

  // ✅ avoid parsing on every keystroke
  const [selectedCountry, setSelectedCountry] = useState<Country | undefined>(inputCountryCode);
  const [searchCountry, setSearchCountry] = useState('');

  useEffect(() => {
    dispatch(fetchCountries());
  }, [dispatch]);

  const countryOptions =
    countryList?.map((country) => ({
      code: country?.isoCode,
      label: country?.countryName,
      phone: country?.countryCode,
    })) ?? [];

  
  const hasLabel = !!label;

  // ✅ clear handler
  const handleClear = useCallback(() => {
    onChange('' as Value);
  }, [onChange]);

  // ✅ only update when full number becomes valid
  useEffect(() => {
    try {
      if (value && value.length > 3) {
        const phoneNumber = parsePhoneNumber(value);
        if (phoneNumber?.country && phoneNumber.country !== selectedCountry) {
          setSelectedCountry(phoneNumber.country as Country);
        }
      }
    } catch {
      // ignore invalid partial numbers
    }
  }, [value, selectedCountry]);

  const handleClickCountry = (inputValue: Country) => {
    startTransition(() => {
      setSelectedCountry(inputValue);
    });
  };

  const handleSearchCountry = (inputValue: string) => {
    setSearchCountry(inputValue);
  };

  const dialCodeText = showDialCode
    ? getDialCodeString(value, countryOptions, selectedCountry)
    : null;

  return (
    <Box
      sx={[
        {
          '--popover-button-mr': '12px',
          '--popover-button-height': '22px',
          '--popover-button-width': variant === 'standard' ? '48px' : '60px',
          position: 'relative',
          ...(!disableSelect && {
            [`& .${inputBaseClasses.input}`]: {
              pl: 'calc(var(--popover-button-width) + var(--popover-button-mr))',
            },
          }),
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {!disableSelect && (
        <CountryListPopover
          countries={countryOptions}
          searchCountry={searchCountry}
          countryCode={selectedCountry}
          onClickCountry={handleClickCountry}
          onSearchCountry={handleSearchCountry}
          sx={{
            pl: variant === 'standard' ? 0 : 1.5,
            ml: '5px',
            ...(variant === 'standard' && hasLabel && { mt: size === 'small' ? '14px' : '20px' }),
            ...((variant === 'filled' || variant === 'outlined') && {
              mt: size === 'small' ? '8px' : '16px',
            }),
            ...(variant === 'filled' && hasLabel && { mt: size === 'small' ? '21px' : '25px' }),
            ...(disabled && {
              pointerEvents: 'none',
              opacity: 0.6,
            }),
          }}
          dialCodeText={dialCodeText}
        />
      )}

      <PhoneNumberInput
        size={size}
        value={value}
        variant={variant}
        onChange={onChange}
        hiddenLabel={!label}
        country={selectedCountry}
        inputComponent={CustomInput}
        disabled={disabled}
        placeholder={placeholder ?? 'Contact Number'}
        label={
          label ? (
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              {label}
              {required && (
                <Box component="span" sx={{ color: 'error.main' }}>
                  *
                </Box>
              )}
            </Box>
          ) : null
        }
        InputLabelProps={{
          shrink: true,
        }}
        InputProps={{
          sx: {
            ...(highlight && {
              backgroundColor: '#FFAB0029',

              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#FFAB00',
                borderWidth: '1.5px',
              },

              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#FFAB00',
              },
            }),
            // add padding so text/placeholder starts after dial code
            [`& .${inputBaseClasses.input}`]: {
              p: '16px 40px', // adjust based on dial code width
              fontSize: '14px',
              ml: 2,
            },
          },
          selectedCountry,
          startAdornment: dialCodeText ? (
            <InputAdornment
              position="start"
              sx={{
                alignItems: 'center',
                '& span': {
                  display: 'inline-block',
                  textAlign: 'center',
                  fontSize: '14px',
                },
              }}
            >
              <Box
                component="span"
                sx={{ color: 'text.secondary', fontWeight: 500, visibility: 'hidden' }}
              >
                {dialCodeText}
              </Box>
            </InputAdornment>
          ) : undefined,
          endAdornment: !disabled && value && (
            <InputAdornment position="end">
              <IconButton size="small" edge="end" onClick={handleClear}>
                <Iconify width={14} icon="mingcute:close-line" />
              </IconButton>
            </InputAdornment>
          ),
        }}
        {...other}
      />
      {highlight && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            mt: '6px',
            color: '#7A4100',
          }}
        >
          <Info sx={{ fontSize: 16 }} />
          <Typography
            sx={{
              fontSize: '12px',
              fontWeight: 500,
              lineHeight: '16px',
              color: '#7A4100',
            }}
          >
            {highlightText}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

// ----------------------------------------------------------------------

interface CustomInputProps extends Omit<TextFieldProps, 'InputProps'> {
  InputProps?: TextFieldProps['InputProps'] & {
    selectedCountry?: string;
  };
}

const CustomInput = forwardRef<HTMLInputElement, CustomInputProps>(
  ({ value, InputProps, ...rest }, ref) => {
    const val = useMemo(() => {
      if (typeof value !== 'string') return value;

      let cleaned = value.replaceAll(/[\s-]+/g, '');
      const country = InputProps?.selectedCountry ?? 'IN';

      if (country === 'IN' && cleaned.length > 10 && cleaned.startsWith('0')) {
        cleaned = cleaned.slice(1);
      }
      return cleaned;
    }, [value, InputProps?.selectedCountry]);

    return <TextField {...rest} InputProps={InputProps} inputRef={ref} value={val ?? ''} />;
  }
);

// ----------------------------------------------------------------------

function getDialCodeString(
  inputValue: string,
  countryOptions: { code: string; label: string; phone: string }[],
  country?: Country
): string | null {
  try {
    const phoneNumber = inputValue ? parsePhoneNumber(inputValue) : undefined;
    if (phoneNumber?.countryCallingCode) {
      return `+${phoneNumber.countryCallingCode}`;
    }
  } catch {
    // ignore invalid input
  }
  if (country) {
    const found = countryOptions?.find((c) => c?.code === country);
    if (found?.phone) {
      return `+${found.phone}`;
    }
  }
  return null;
}
