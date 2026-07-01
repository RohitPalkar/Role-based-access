import type { Value } from 'react-phone-number-input/input';

import { getIn, type FormikProps } from 'formik';
import { parsePhoneNumber } from 'react-phone-number-input';

import { PhoneInput } from '../phone-input';

import type { PhoneInputProps } from '../phone-input';

// ----------------------------------------------------------------------

export type RHFPhoneInputProps = Omit<PhoneInputProps, 'value' | 'onChange'> & {
  name: string;
  countryCodeName?: string;
  formik: FormikProps<any>;
  disabled?: boolean;
  highlight?: boolean;
  highlightText?: string;
};

export function RHFPhoneInput({
  name,
  countryCodeName = 'countryCode',
  formik,
  helperText,
  disabled,
  showDialCode = true,
  highlight = false,
  highlightText,
  ...other
}: RHFPhoneInputProps & { showDialCode?: boolean }) {
  // Construct full phone number from separate fields
  const countryCode = getIn(formik.values, countryCodeName) || '+91';
  const mobileNumber = getIn(formik.values, name) || '';
  const fullPhoneNumber = countryCode && mobileNumber ? `${countryCode}${mobileNumber}` : '';

  const fieldError = getIn(formik.errors, name);
  const isTouched = getIn(formik.touched, name);
  const hasError = Boolean(isTouched && fieldError);

  const handlePhoneChange = (value: Value) => {
    if (!value) {
      // Clear both fields when input is cleared
      formik.setFieldValue(countryCodeName, '');
      formik.setFieldValue(name, '');
      return;
    }

    try {
      const parsedNumber = parsePhoneNumber(value);

      // Case 1: Only country dial code (e.g., "+91")
      if (!parsedNumber?.nationalNumber) {
        const dialCodeMatch = value.match(/^\+\d{1,4}$/);
        if (dialCodeMatch) {
          formik.setFieldValue(countryCodeName, value);
          formik.setFieldValue(name, '');
          return;
        }
      }

      // Case 2: Valid full phone number
      if (parsedNumber) {
        const newCountryCode = `+${parsedNumber.countryCallingCode}`;
        if (formik.values[countryCodeName] !== newCountryCode) {
          formik.setFieldValue(countryCodeName, newCountryCode);
        }
        if (formik.values[name] !== parsedNumber.nationalNumber) {
          formik.setFieldValue(name, parsedNumber.nationalNumber);
        }
        return;
      }

      // Case 3: Fallback (invalid/incomplete but not dial code)
      formik.setFieldValue(name, value);
    } catch (error) {
      console.warn('Phone number parsing error:', error);
      formik.setFieldValue(name, value);
    }
  };

  const handleBlur = () => {
    formik.setFieldTouched(name, true);
  };

  return (
    <PhoneInput
      value={fullPhoneNumber}
      onChange={handlePhoneChange}
      onBlur={handleBlur}
      error={hasError}
      helperText={hasError && typeof fieldError === 'string' ? fieldError : helperText}
      showDialCode={showDialCode}
      fullWidth
      required
      highlight={highlight}
      highlightText={highlightText}
      disabled={disabled}
      {...other}
    />
  );
}
