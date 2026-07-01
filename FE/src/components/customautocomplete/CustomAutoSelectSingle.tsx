/* eslint-disable react/prop-types */
import type { AutocompleteRenderInputParams } from '@mui/material';

import { TextField, IconButton, Typography, Autocomplete, InputAdornment } from '@mui/material';

import { Iconify } from '../iconify';

interface AutoCompleteProps {
  options: { userName: string; userId: string }[]; // Options contain both userName and userId
  value: { userName: string; userId: string } | undefined; // Value is an object with userName and userId or undefined
  inputValue: string; // Current value in the input box
  onChange: (event: React.SyntheticEvent, newValue: { userName: string; userId: string } | undefined) => void;
  onInputChange: (event: React.SyntheticEvent, newInputValue: string) => void;
  onClear?: () => void; // Optional clear handler
  label?: string;
  placeholder?: string;
  noOptionsText?: string;
  disableClearable?: boolean; // Option to disable the clear button
  loading?: boolean; // Loading state
  error?: boolean; // Error state
  helperText?: string | false; // Helper text for errors
  required?: boolean; // Required field indicator
  officeUseLabel?: string;
  customSx?: boolean;
}

const CustomAutoSelectSingle: React.FC<AutoCompleteProps> = ({
  options,
  value,
  inputValue,
  onChange,
  onInputChange,
  onClear,
  label,
  placeholder,
  noOptionsText = "No options",
  disableClearable = false,
  loading = false,
  error = false,
  helperText,
  required = false,
  officeUseLabel,
  customSx = false,
}) => {
  const handleClear = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onClear) {
      onClear();
    } else {
      onChange({} as React.SyntheticEvent, undefined);
    }
  };

  return (
    <Autocomplete
      fullWidth
      clearOnBlur={false}
      selectOnFocus
      handleHomeEndKeys
      disableClearable
      loading={loading}
      sx={{
        minHeight: '44px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '400',
        color: '#1C252E',
        '& .MuiOutlinedInput-root': {
          minHeight: '44px',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: error ? '#d32f2f' : '#D0D5DD',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: error ? '#d32f2f' : '#919EAB',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: error ? '#d32f2f' : '#1976d2',
          },
          '& .MuiInputBase-input': {
            cursor: 'text !important',
            pointerEvents: 'auto !important',
            ...(customSx && { padding: '4px' }),
          },
        },
        '& .MuiAutocomplete-clearIndicator': {
          color: '#667085',
          '&:hover': {
            color: '#344054',
            backgroundColor: 'rgba(52, 64, 84, 0.08)',
          },
        },
        '& .MuiAutocomplete-popupIndicator': {
          color: '#667085',
          '&:hover': {
            color: '#344054',
            backgroundColor: 'rgba(52, 64, 84, 0.08)',
          },
        },
      }}
      value={value}
      options={options}
      onChange={onChange}
      inputValue={inputValue}
      onInputChange={onInputChange}
      getOptionLabel={(option) => option?.userName || ''} // Display userName in the dropdown
      isOptionEqualToValue={(option, val) => option?.userId === val?.userId}
      filterOptions={(opts) => opts} // Disable client-side filtering since we do server-side search
      noOptionsText={noOptionsText}
      renderInput={(params: AutocompleteRenderInputParams) => (
        <>
        {officeUseLabel ? (
          <Typography sx={{ fontSize: '14px', fontWeight: 600, mb: 1 }}>
            {officeUseLabel}&nbsp;
            {required && (
                <span style={{ color: '#d32f2f'}}>*</span>
            )}
          </Typography>
        ) : null}
        <TextField
          {...params}
          label={officeUseLabel ? undefined : (
            <>
              {label}
              {label && required && (
                <span style={{ color: '#d32f2f', marginLeft: '2px' }}>*</span>
              )}
            </>
          )}
          placeholder={placeholder}
          variant="outlined"
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            readOnly: false, // Ensure input is always editable
            endAdornment: (
              <>
                {!disableClearable && value && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={handleClear}
                      sx={{ 
                        mr: 0.5,
                        color: '#667085',
                        '&:hover': {
                          color: '#344054',
                          backgroundColor: 'rgba(52, 64, 84, 0.08)',
                        },
                      }}
                      aria-label={`Clear ${label}`}
                    >
                      <Iconify icon="eva:close-fill" width={16} height={16} />
                    </IconButton>
                  </InputAdornment>
                )}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
          sx={{
            "& .MuiInputBase-input": {
              fontSize: "14px", // Font size for selected item inside input
            },
          }}
        />
        </>
      )}
      renderOption={(props, option) => (
        <li {...props} key={option?.userId}> {/* Use userId for the key */}
          <span style={{ fontSize: '14px', fontWeight: '400', color: '#1C252E' }}>
            {option?.userName}
          </span>
        </li>
      )}
    />
  );
};

export default CustomAutoSelectSingle;