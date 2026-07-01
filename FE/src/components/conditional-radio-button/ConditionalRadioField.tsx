import React from "react";

import {
  Radio,
  FormLabel,
  RadioGroup,
  FormControl,
  FormHelperText,
  FormControlLabel,
} from "@mui/material";

interface RadioOption {
  value: string | undefined;
  label: string;
}

interface ConditionalRadioFieldProps {
  name: string;
  label?: string;
  value: string | undefined;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  options: RadioOption[];
  error?: string;
  touched?: boolean;
}

const ConditionalRadioField: React.FC<ConditionalRadioFieldProps> = ({
  name,
  label,
  value,
  onChange,
  required = false,
  options,
  error,
  touched,
}) => (
  <FormControl component="fieldset" error={touched && !!error} required={required}>
    <FormLabel
      component="legend"
      sx={{
        color: "#1C252E",
        fontWeight: 600,
        "&.Mui-focused": { color: "#1C252E" },
        "&.Mui-error": { color: "#d32f2f" },
        "& .MuiFormLabel-asterisk": {
          color: "#d32f2f", // makes the built-in asterisk red
        },
      }}
    >
      {label}
    </FormLabel>

    <RadioGroup row name={name} value={value} onChange={onChange}>
      {options.map((opt) => (
        <FormControlLabel
          key={String(opt.value)}
          value={opt.value}
          control={<Radio />}
          label={opt.label}
        />
      ))}
    </RadioGroup>
    
    {touched && error && (
      <FormHelperText sx={{ color: "#d32f2f", fontSize: "12px", mt: 0.5 }}>
        {error}
      </FormHelperText>
    )}
  </FormControl>
);

export default ConditionalRadioField;
