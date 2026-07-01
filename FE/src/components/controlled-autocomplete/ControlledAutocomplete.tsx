import type { AutocompleteProps, AutocompleteRenderOptionState } from '@mui/material/Autocomplete';

import React from 'react';

import { Chip, Checkbox, TextField, Autocomplete } from '@mui/material';

/**
 * Represents an option in the Autocomplete dropdown.
 */
export interface OptionType {
  /** Display label of the option */
  label: string;
  /** Unique value of the option (string or number) */
  value: string | number;
}

/**
 * Props accepted by ControlledAutocomplete component.
 */
export interface ControlledAutocompleteProps {
  /** Label displayed above the input */
  label?: string;
  /** Marks the field as required and shows a red asterisk */
  required?: boolean;
  /** Array of options to display */
  options: OptionType[];
  /** Selected value(s) for the Autocomplete */
  value: string | number | (string | number)[] | null;
  /** Callback triggered when value changes */
  onChange: (value: string | number | (string | number)[] | null) => void;
  /** Enables multiple selection */
  multiple?: boolean;
  /** Maximum number of tags to display when multiple is true */
  limitTags?: number;
  /** Placeholder text displayed inside the input */
  placeholder?: string;
  /** Whether to show an error state */
  error?: boolean;
  /** Helper text displayed below the input */
  helperText?: string;
}

/**
 * ControlledAutocomplete
 *
 * A reusable, controlled Autocomplete component using MUI.
 * Supports single and multiple selection, checkbox chips, limited tags,
 * error handling, and full control via `value` and `onChange`.
 *
 * @example
 * // Single select
 * <ControlledAutocomplete
 *   label="Campaign Type"
 *   options={[
 *     { label: 'Email', value: 'email' },
 *     { label: 'SMS', value: 'sms' }
 *   ]}
 *   value={campaignType}
 *   onChange={(val) => setCampaignType(val)}
 *   placeholder="Select campaign type"
 * />
 *
 * @example
 * // Multiple select with limit tags
 * <ControlledAutocomplete
 *   label="Skills"
 *   options={[
 *     { label: 'React', value: 'react' },
 *     { label: 'Node', value: 'node' },
 *     { label: 'TypeScript', value: 'ts' }
 *   ]}
 *   value={skills}
 *   onChange={(val) => setSkills(val)}
 *   multiple
 *   limitTags={3}
 *   placeholder="Select skills"
 * />
 *
 * @example
 * // With error state
 * <ControlledAutocomplete
 *   label="Category"
 *   options={[
 *     { label: 'Tech', value: 'tech' },
 *     { label: 'Finance', value: 'fin' }
 *   ]}
 *   value={category}
 *   onChange={(val) => setCategory(val)}
 *   error={!!categoryError}
 *   helperText={categoryError}
 *   placeholder="Select category"
 * />
 */
const ControlledAutocomplete: React.FC<
  ControlledAutocompleteProps &
    Omit<
      AutocompleteProps<OptionType, boolean, false, false>,
      'renderInput' | 'options' | 'value' | 'onChange' | 'multiple'
    >
> = ({
  label,
  required = false,
  options,
  value,
  onChange,
  multiple = false,
  limitTags = 2,
  placeholder,
  error = false,
  helperText = '',
  ...autocompleteProps
}) => {
  const renderLabel = label ? (
    <span>
      {label} {required && <span style={{ color: 'red' }}>*</span>}
    </span>
  ) : undefined;

  const selectedOptions = multiple
    ? options.filter((opt) => Array.isArray(value) && value.includes(opt.value))
    : options.find((opt) => opt.value === value) || null;

  return (
    <Autocomplete<OptionType, true | false, false, false>
      multiple={multiple}
      options={options ?? []}
      disableCloseOnSelect={multiple}
      limitTags={multiple ? limitTags : undefined}
      getOptionLabel={(o) => o?.label ?? ''}
      isOptionEqualToValue={(option, val) => option?.value === val?.value}
      value={selectedOptions as any}
      onChange={(_, val: OptionType | OptionType[] | null) => {
        if (multiple) {
          const values = Array.isArray(val) ? val.map((v) => v.value) : [];
          onChange(values);
        } else {
          const singleValue = val && !Array.isArray(val) ? val.value : null;
          onChange(singleValue);
        }
      }}
      renderTags={(selected: OptionType[], getTagProps) =>
        selected.map((option, index) => (
          <Chip
            {...getTagProps({ index })}
            key={option.value}
            label={option.label}
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
      renderOption={(optionProps, option, state: AutocompleteRenderOptionState) => (
        <li
          {...optionProps}
          key={option?.value}
          style={{
            backgroundColor: 'transparent',
            fontSize: '14px',
            fontWeight: '400',
            color: '#1C252E',
            ...optionProps?.style,
          }}
        >
          {multiple && (
            <Checkbox
              checked={state?.selected}
              size="small"
              sx={{
                mr: 1,
                color: '#667085',
                '&.Mui-checked': { color: '#1A407D' },
              }}
            />
          )}
          {option?.label}
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={renderLabel}
          placeholder={multiple && Array.isArray(value) && value.length > 0 ? '' : placeholder}
          error={error}
          helperText={helperText}
          sx={{ '& .MuiInputBase-input': { fontSize: '14px' } }}
        />
      )}
      {...autocompleteProps}
    />
  );
};

export default ControlledAutocomplete;
