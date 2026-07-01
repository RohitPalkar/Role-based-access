import 'react-phone-number-input/style.css';

import type { FormikProps } from 'formik';

import React from 'react';
import PhoneInput from 'react-phone-number-input';

import { FormLabel, FormControl, FormHelperText } from '@mui/material';

type PhoneInputFieldProps = {
  field: {
    name: string;
    label?: string;
    required?: boolean;
    placeholder?: string;
    readonly?: boolean;
    value?: string;
    nameKey?: string;
    listKey?: string;
    index?: number;
    name1?: string;
    handlePhoneChange: (value: string | undefined, name: string, name1?: string) => void;
  };
  formik: FormikProps<any>;
  isSingleField?: boolean;
};
interface MyFormikTouched {
  [key: string]: Record<number, Record<string, boolean>> | boolean | any;
}

interface MyFormikErrors {
  [key: string]: Record<number, Record<string, string>> | string | any;
}

const PhoneInputField: React.FC<PhoneInputFieldProps> = ({ field, formik, isSingleField }) => {
  const touched = formik.touched as MyFormikTouched;
  const errors = formik.errors as MyFormikErrors;
  
  const showError = field?.listKey
    ? touched?.[field?.listKey]?.[field?.index!]?.[field?.nameKey!] &&
      errors?.[field?.listKey]?.[field?.index!]?.[field?.nameKey!]
    : touched?.[field?.name] && errors?.[field?.name];

  const resolvedValue =
  field.value ??
  (isSingleField
    ? `${formik?.values?.[field?.name1!]}${formik?.values?.[field?.name]}`
    : formik?.values?.[field?.name]);

  return (
    <FormControl fullWidth>
      <FormLabel
        className="form-label"
        htmlFor={field?.name}
        sx={{
          color: '#1C252E',
          fontSize: '14px',
          fontWeight: '500',
          lineHeight: '22px',
          mb: '6px',
        }}
      >
        {field?.label}
      </FormLabel>
      <PhoneInput
        className={field?.readonly ? "phone-input-disabled" : "phone-input"}
        limitMaxLength={18 as any}
        id={field?.name}
        name={field?.name}
        international
        defaultCountry="IN"
        value={resolvedValue || ''}
        onChange={(val: string | undefined) => {
          if (isSingleField) {
            field?.handlePhoneChange(val, field?.name, field?.name1);
          } else {
            field?.handlePhoneChange(val, field?.index?.toString()!, field?.name);
          }
        }}
        onBlur={formik?.handleBlur}
        countryCallingCodeEditable={false}
        placeholder={field?.placeholder || ''}
        readOnly={field?.readonly}
        inputProps={{
          id: field?.name,
          name: field?.name,
          placeholder: field?.placeholder,
        }}
      />
      {showError && <FormHelperText error>{showError}</FormHelperText>}
    </FormControl>
  );
};

export default PhoneInputField;
