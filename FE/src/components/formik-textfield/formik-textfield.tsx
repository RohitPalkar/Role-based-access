import type { FormikProps } from "formik";
import type { ChangeEventHandler } from "react";
import type { GridProps } from "@mui/material/Grid";
import type { TextFieldProps } from "@mui/material/TextField";

import { getIn } from "formik";

import {
  Box,
  Grid,
  Button,
  Tooltip,
  TextField,
  IconButton,
  InputAdornment,
  CircularProgress,
} from "@mui/material";

import infoIcon from 'src/assets/icons/info-circle-icon.svg';

export type FormikTextFieldProps = {
  name: string;
  label?: string;
  required?: boolean;
  formik: FormikProps<any>;
  disabled?: boolean;
  isButton?: boolean;
  buttonOnClick?: () => void;
  onClear?: () => void;
  buttonTitle?: string;
  buttonDisabled?: boolean;
  clearIconDisabled?: boolean;
  loading?: boolean;
  btnWidth?: string;
  noGrid?: boolean;
  gridProps?: GridProps;
  inputProps?: TextFieldProps["inputProps"];
  InputProps?: TextFieldProps["InputProps"];
  /** Shown inside the input; distinct from `label`. */
  placeholder?: string;
  /** When set, replaces Formik `handleChange` (use for masked/sanitized input). */
  onChange?: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  /** Passed to MUI `TextField` `type` (e.g. `email`). */
  textFieldType?: TextFieldProps["type"];
  formatAsNumber?: boolean;
  /** When true, applies edited highlight styles. Highlighting is fully opt-in; no implicit
   * comparison against Formik `initialValues` is performed. */
  isEdited?: boolean;
  /** Tooltip shown on the info icon when the field is in edited state. */
  editedTooltip?: string;
  /** When true, suppresses the built-in `helperText` so the caller can render
   * the validation message in a custom location (useful for narrow fields). */
  hideHelperText?: boolean;
};

const EDITED_FIELD_HIGHLIGHT_SX = {
  backgroundColor: '#FFAB0029',

  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: '#FFAB00',
    borderWidth: '1px',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: '#FFAB00',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#FFAB00',
  },
} as const;

const EditedFieldInfoIcon = ({ title }: { title: string }) => (
  <Tooltip title={title} arrow placement="top">
    <img src={infoIcon} alt="info" />
  </Tooltip>
);

export const FormikTextField = ({
  name,
  label,
  required,
  formik,
  disabled = false,
  isButton= false,
  buttonOnClick,
  onClear,
  buttonDisabled,
  clearIconDisabled,
  buttonTitle,
  loading,
  btnWidth='auto',
  noGrid = false,
  gridProps,
  inputProps,
  InputProps,
  placeholder,
  onChange: onChangeOverride,
  textFieldType = 'text',
  formatAsNumber= false,
  isEdited,
  editedTooltip,
  hideHelperText = false,
}: FormikTextFieldProps) => {
  const fieldError = getIn(formik.errors, name);
  const isTouched = getIn(formik.touched, name);

  const rawValue = getIn(formik.values, name) ?? '';
  const formattedValue =
    formatAsNumber && rawValue
      ? Number(rawValue).toLocaleString('en-IN')
      : rawValue;

  const isValueEdited = Boolean(isEdited);
  const showEditedIndicator = isValueEdited && Boolean(editedTooltip);

  const showClear = Boolean(onClear && getIn(formik.values, name));
  const endAdornment =
    loading || showClear || showEditedIndicator ? (
      <InputAdornment position="end" sx={{ gap: 0.5, alignItems: 'center' }}>
        {loading ? <CircularProgress size={20} sx={{ color: 'grey.600' }} /> : null}
        {showClear ? (
          <IconButton size="small" onClick={onClear} disabled={clearIconDisabled}>
            X
          </IconButton>
        ) : null}
        {showEditedIndicator && editedTooltip ? (
          <EditedFieldInfoIcon title={editedTooltip} />
        ) : null}
      </InputAdornment>
    ) : undefined;

  const FieldContent = (
    <Box sx={{ ...(isButton && { display: 'flex', alignItems: 'flex-start', gap: 2, ...gridProps?.sx,}) }}>
      <TextField
        fullWidth
        label={label}
        name={name}
        type={textFieldType}
        placeholder={placeholder}
        value={formattedValue}
        onChange={(e) => {
          if (formatAsNumber) {
            const raw = e.target.value.replaceAll(/\D/g, '');
            formik.setFieldValue(name, raw);
          } else if (onChangeOverride) {
            onChangeOverride(e);
          } else {
            formik.handleChange(e);
          }
        }}
        onBlur={formik.handleBlur}
        error={Boolean(isTouched && fieldError)}
        helperText={
          hideHelperText
            ? ''
            : isTouched && typeof fieldError === 'string'
              ? fieldError
              : ''
        }
        InputLabelProps={{ required }}
        className="requiredField custom-input"
        disabled={disabled}
        inputProps={inputProps}
        InputProps={{
          ...InputProps,
          endAdornment,
          sx: {
            ...(isValueEdited ? EDITED_FIELD_HIGHLIGHT_SX : undefined),
            ...InputProps?.sx,
          },
        }}
      />

      {isButton && (
        <Button
          size="large"
          variant="contained"
          sx={{
            py: 3.2,
            width: btnWidth,
            fontSize: '14px',
            ...(buttonDisabled
              ? {}
              : {
                  backgroundColor: '#1A407D',
                  '&:hover': {
                    backgroundColor: '#174A9D',
                  },
                }),
          }}
          onClick={buttonOnClick}
          disabled={buttonDisabled}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : buttonTitle}
        </Button>
      )}
    </Box>
  )
  
  // If noGrid is true, return only the field content
  if (noGrid) {
    return FieldContent;
  }

  // Default behavior (unchanged)
  return (
    <Grid
      item
      xs={12}
      sm={6}
      md={6}
      lg={6}
      xl={6}
       {...gridProps}
    >
      {FieldContent}
    </Grid>
  );
};