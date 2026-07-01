import type { ChangeEvent } from 'react';
import type { FormikProps } from 'formik';

export type AgreementFieldSanitizeType = 'alphanumeric' | 'numeric';

/** Sanitized change for agreement fields (replaces legacy `id`-based local Formik text field). */
export function agreementSanitizedChange<T>(
  formik: FormikProps<T>,
  name: string,
  fieldType: AgreementFieldSanitizeType
): (event: ChangeEvent<HTMLInputElement>) => void {
  return (event: ChangeEvent<HTMLInputElement>) => {
    let { value } = event.target;
    if (fieldType === 'numeric') {
      value = value.replaceAll(/\D/g, '');
    } else {
      value = value.replaceAll(/[^a-zA-Z0-9 ]/g, '');
    }
    formik.setFieldValue(name, value);
  };
}
