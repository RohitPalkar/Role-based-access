import React from 'react';

import { InputBase, Typography } from '@mui/material';

interface ReusableInputBaseProps {
  fieldName: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  error?: string | false;
  touched?: boolean;
  maxLength?: number;
  sx?: object;
  sanitize?: boolean; // Optional: enable or disable sanitization
  [key: string]: any; 
  disabled?:boolean;// For any additional props (like from formik.getFieldProps)
}

const ReusableInputBase: React.FC<ReusableInputBaseProps> = ({
  fieldName,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  touched,
  maxLength = 100,
  sx = {},
  sanitize = true,
  disabled=false,
  ...props
}) => {
  // Remove conflicting props from spread (in case Formik props contain "name")
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { fieldName: _ignoredName, ...restProps } = props;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = sanitize ? e.target.value.replaceAll(/[^a-zA-Z0-9\s]/g, '') : e.target.value;

    // Properly trigger formik's onChange handler
    onChange?.({
      ...e,
      target: { ...e.target, name: fieldName, value: newValue },
    });
  };

  return (
    <>
      <InputBase
        fullWidth
        disabled={disabled}
        name={fieldName}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        inputProps={{ maxLength }}
        sx={{
          pl: 1.5,
          height: 44,
          borderRadius: 1,
          border: '1px solid #D0D5DD',
          mt: 1,
          bgcolor: disabled ? '#f7f7f9' : '',
          fontSize: 14,
          '& input': { fontSize: 14 },
          ...sx,
        }}
        {...restProps}
      />

      {touched && error && (
        <Typography sx={{ color: 'red', fontSize: 12, mt: 0.5 }}>{error}</Typography>
      )}
    </>
  );
};

export default ReusableInputBase;
