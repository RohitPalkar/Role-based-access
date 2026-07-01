import type { AutocompleteProps, AutocompleteRenderOptionState } from '@mui/material/Autocomplete';

import React from 'react';
import { getIn } from 'formik';

import { Chip, Checkbox, TextField, IconButton, Autocomplete, InputAdornment } from '@mui/material';

/**
 * Represents an option in the autocomplete dropdown.
 */
export interface OptionType {
  /** The display label of the option */
  label: string;
  /** The unique value of the option (can be string or number) */
  value: string | number;
}

/**
 * Props accepted by FormikAutocomplete component
 */
interface FormikAutocompleteProps {
  /** Name of the field in Formik. Supports nested keys like 'campaign.name' */
  name: string;
  /** Label displayed above the input field */
  label?: string;
  /** Marks the field as required and shows a red asterisk */
  required?: boolean;
  /** Array of options to display in the dropdown */
  options: OptionType[];
  /** Formik instance returned from useFormik or Formik render props */
  formik: any;
  /** Enables multiple selection if true */
  multiple?: boolean;
  /** Maximum number of tags to display when multiple is true */
  limitTags?: number;
  /** Placeholder text displayed inside the input */
  placeholder?: string;
  /** Custom external onChange to perform side effects */
  externalOnChange?: (value: string | number | (string | number)[] | null) => void;
  /** To catch Name if not matching ID from BE */
  fallbackLabel?: string;
  /** Show clear (X) button and handle clear action */
  onClear?: () => void;
  /** Disable clear button */
  clearIconDisabled?: boolean;
}

type Props = FormikAutocompleteProps &
  Omit<
    AutocompleteProps<OptionType, boolean, false, false>,
    'renderInput' | 'options' | 'value' | 'onChange' | 'multiple'
  >;

/**
 * FormikAutocomplete
 *
 * A reusable Autocomplete component integrated with Formik.
 * Supports single and multiple selection, checkbox chips, limited tag display,
 * nested Formik paths, storing only the value(s) in Formik state, and an optional external onChange callback.
 *
 * ## Example Usage
 *
 * ### Single select
 *
 * <FormikAutocomplete
 *   name="campaign.type"
 *   label="Campaign Type"
 *   options={[
 *     { label: "Email", value: "email" },
 *     { label: "SMS", value: "sms" }
 *   ]}
 *   placeholder="Select campaign type"
 *   formik={formik}
 * />
 *
 * Formik values after selection:
 *
 * {
 *   "campaign": {
 *     "type": "email"
 *   }
 * }
 *
 * ### Multiple select
 *
 * <FormikAutocomplete
 *   name="user.skills"
 *   label="Skills"
 *   multiple
 *   limitTags={3}
 *   options={[
 *     { label: "React", value: "react" },
 *     { label: "Node", value: "node" },
 *     { label: "TypeScript", value: "ts" }
 *   ]}
 *   placeholder="Select skills"
 *   formik={formik}
 * />
 *
 * Formik values after selection:
 *
 * {
 *   "user": {
 *     "skills": ["react", "ts"]
 *   }
 * }
 *
 * ### With externalOnChange
 *
 * <FormikAutocomplete
 *   name="category"
 *   label="Category"
 *   options={[
 *     { label: "Tech", value: "tech" },
 *     { label: "Finance", value: "fin" }
 *   ]}
 *   placeholder="Select category"
 *   formik={formik}
 *   externalOnChange={(value) => console.log("Selected value:", value)}
 * />
 *
 */

const FormikAutocomplete: React.FC<Props> = ({
  name,
  label,
  required = false,
  options,
  formik,
  multiple = false,
  limitTags = 2,
  placeholder,
  externalOnChange,
  fallbackLabel,
  onClear,
  clearIconDisabled,
  ...autocompleteProps
}) => {
  const touched = getIn(formik?.touched, name);
  const error = touched && Boolean(getIn(formik?.errors, name));
  const helperText = touched ? getIn(formik?.errors, name) : '';

  const formikValue = getIn(formik?.values, name);

  const selectedOptions = multiple
  ? options?.filter((opt) => formikValue?.includes?.(opt?.value))
  : (() => {
      const matched = options?.find((opt) => opt?.value === formikValue);

      if (matched) return matched;

      // 🔑 fallback: ID exists but not in options
      if (formikValue && fallbackLabel) {
        return {
          value: formikValue,
          label: fallbackLabel,
        };
      }

      return null;
    })();

  const renderLabel = label ? (
    <span>
      {label} {required && <span style={{ color: 'red' }}>*</span>}
    </span>
  ) : undefined;

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
          const values = Array.isArray(val) ? val?.map?.((v) => v?.value) : [];
          formik?.setFieldValue?.(name, values);
          externalOnChange?.(values);
        } else {
          const value = val && !Array.isArray(val) ? val?.value : '';
          formik?.setFieldValue?.(name, value);
          externalOnChange?.(value || null);
        }
      }}
      filterOptions={(opts, { inputValue }) => {
        const trimmed = inputValue?.trim()?.toLowerCase();

        return opts?.filter((option) =>
          option?.label?.toLowerCase()?.includes(trimmed)
        );
      }}
      onBlur={() => formik?.setFieldTouched?.(name, true)}
      renderTags={(selected: OptionType[], getTagProps) =>
        selected?.map?.((option: OptionType, index: number) => (
          <Chip
            {...getTagProps({ index })}
            key={option?.value}
            label={option?.label}
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
      renderOption={(optionProps, option: OptionType, state: AutocompleteRenderOptionState) => (
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
                '&.Mui-checked': {
                  color: '#1A407D',
                },
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
          placeholder={placeholder}
          error={error}
          helperText={helperText}
          sx={{
            '& .MuiInputBase-input': {
              fontSize: '14px',
            },
          }}
          inputProps={{
            ...params.inputProps,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
              const trimmed = e.target.value?.replace(/^\s+/, '');
              e.target.value = trimmed;
              params?.inputProps?.onChange?.(e);
            },
          }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {onClear && formikValue && !multiple ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        // Clear Formik value
                        formik?.setFieldValue?.(name, multiple ? [] : '');
                        formik?.setFieldTouched?.(name, false, false);

                        // Optional side-effect
                        onClear?.();
                      }}
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
      {...autocompleteProps}
    />
  );
};

export default FormikAutocomplete;
