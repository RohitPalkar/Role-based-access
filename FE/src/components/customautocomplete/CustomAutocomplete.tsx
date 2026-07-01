/* eslint-disable react/prop-types */
import type { AutocompleteRenderInputParams } from '@mui/material';

import { TextField, IconButton, Autocomplete, InputAdornment } from '@mui/material';

interface AutoCompleteProps {
  options: { userName: string; userId: string }[]; // Options now contain both userName and userId
  value: { userName: string; userId: string } | null; // Value is an object with userName and userId or null
  inputValue: string; // Current value in the input box
  onChange: (event: React.SyntheticEvent, newValue: { userName: string; userId: string, empCode?: string } | null) => void;
  onInputChange: (event: React.SyntheticEvent, newInputValue: string, reason?: string) => void;
  label?: string | React.ReactNode;
  placeholder?: string;
  noOptionsText?: string;
  disableClearable?: boolean; // Option to disable the clear button
  height?: number;
  onClear?: () => void;
  clearIconDisabled?: boolean;
  disabled?: boolean;
  renderOptionCustom?: (option: any) => React.ReactNode;
  error?: boolean;
  helperText?: React.ReactNode;
}

const CustomAutocomplete: React.FC<AutoCompleteProps> = ({
  options,
  value,
  inputValue,
  onChange,
  onInputChange,
  label,
  placeholder,
  noOptionsText = inputValue ? "No options" : "Type to search",
  disableClearable = false,
  height,
  onClear,
  clearIconDisabled,
  disabled,
  renderOptionCustom,
  error,
  helperText,
}) => (
  <Autocomplete
    fullWidth
    clearOnBlur={false}
    disabled={disabled}
    selectOnFocus
    handleHomeEndKeys
    disableClearable={disableClearable}
    sx={{
      height: height ?? '44px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '400',
      color: '#1C252E',
      '& .MuiOutlinedInput-root': {
        height: '100%',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: '#D0D5DD',
        },
      },
      '& .MuiAutocomplete-clearIndicator': {
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
    isOptionEqualToValue={(option, val) => {
      // Handle empty/null values
      if (!val?.userId) return false;
      if (!option?.userId) return false;
      return option.userId === val.userId;
    }}
    filterOptions={(opts) => opts} // Disable client-side filtering since we do server-side search
    noOptionsText={noOptionsText}
    renderInput={(params: AutocompleteRenderInputParams) => (
      <TextField
        {...params}
        label={label}
        placeholder={placeholder}
        variant="outlined"
        error={error}           
        helperText={helperText}
        sx={{
          height: '100%',
          "& .MuiInputBase-input": {
            fontSize: "14px", // Font size for selected item inside input
          },
          '& .MuiInputBase-input::placeholder': {
            fontSize: '14px',
          },
        }}
        InputProps={{
          ...params.InputProps,
          endAdornment: (
            <>
              {onClear && inputValue ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={onClear}
                    disabled={clearIconDisabled}
                  >
                    X
                  </IconButton>
                </InputAdornment>
              ) : null}
              {params.InputProps.endAdornment}
            </>
          ),
        }}
      />
    )}
    renderOption={(props, option) => (
      <li {...props} key={option?.userId}>
        {renderOptionCustom ? renderOptionCustom(option) : option?.userName}
      </li>
    )}
  />
);

export default CustomAutocomplete;
