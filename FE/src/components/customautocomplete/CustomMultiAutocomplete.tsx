/* eslint-disable react/prop-types */
import type { AutocompleteRenderInputParams } from '@mui/material';

import { Chip, Checkbox, TextField, IconButton, Autocomplete, InputAdornment } from '@mui/material';

interface Option {
  userName: string;
  userId: string;
  empCode?: string;
}

interface MultiAutoCompleteProps {
  options: Option[];
  value: Option[];
  inputValue: string;
  onChange: (event: React.SyntheticEvent, newValue: Option[] | null) => void;
  onInputChange: (event: React.SyntheticEvent, newInputValue: string, reason: string) => void;
  label?: string | React.ReactNode;
  placeholder?: string;
  noOptionsText?: string;
  disableClearable?: boolean; // Option to disable the clear button
  height?: number;
  onClear?: () => void;
  clearIconDisabled?: boolean;
  disabled?: boolean;
}

const CustomMultiAutocomplete: React.FC<MultiAutoCompleteProps> = ({
  options,
  value,
  inputValue,
  onChange,
  onInputChange,
  label,
  placeholder,
  noOptionsText = inputValue ? 'No options' : 'Type to search',
  disableClearable = false,
  height,
  onClear,
  clearIconDisabled,
  disabled,
}) => (
  <Autocomplete
    fullWidth
    multiple
    disableCloseOnSelect
    clearOnBlur={false}
    limitTags={2}
    disabled={disabled}
    selectOnFocus
    handleHomeEndKeys
    disableClearable={disableClearable}
    sx={{
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '400',
      color: '#1C252E',
      '& .MuiOutlinedInput-root': {
        minHeight: height ?? '44px',
        alignItems: 'center',
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
    isOptionEqualToValue={(option, val) =>
      String(option?.userId || '') === String(val?.userId || '')
    }
    filterOptions={(opts) => opts} // Disable client-side filtering since we do server-side search
    noOptionsText={noOptionsText}
    renderTags={(selectedOptions, getTagProps) =>
      selectedOptions.map((option, index) => (
        <Chip
          {...getTagProps({ index })}
          key={option.userId}
          label={option.userName}
          size="small"
          sx={{
            fontSize: '14px',
            backgroundColor: '#1A407D',
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: '#174A9D',
            },
            '& .MuiChip-deleteIcon': {
              fontSize: '18px',
            },
          }}
        />
      ))
    }
    renderInput={(params: AutocompleteRenderInputParams) => (
      <TextField
        {...params}
        label={label}
        placeholder={value?.length > 0 ? '' : placeholder}
        variant="outlined"
        sx={{
          height: '100%',
          '& .MuiInputBase-input': {
            fontSize: '14px', 
          },
          '& .MuiInputLabel-root': {
            fontSize: '14px',
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
                  <IconButton size="small" onClick={onClear} disabled={clearIconDisabled}>
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
    renderOption={(props, option) => {
      const isSelected = value?.some(
        (item) => String(item?.userId) === String(option?.userId)
      );

      return (
        <li
          {...props}
          key={option?.userId}
          style={{
            backgroundColor: 'transparent',
            fontSize: '14px',
            fontWeight: '400',
            color: '#1C252E',
            ...props.style,
          }}
        >
          <Checkbox
            checked={isSelected}
            size="small"
            sx={{
              mr: 1,
              color: '#667085',
              '&.Mui-checked': { color: '#1A407D' },
            }}
          />
          {option?.userName}
        </li>
      )}
    }
  />
);

export default CustomMultiAutocomplete;
