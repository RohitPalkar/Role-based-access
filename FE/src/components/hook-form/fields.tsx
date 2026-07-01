import { RHFEditor } from './rhf-editor';
import { RHFDatePicker } from './rhf-date';
import { RHFTimePicker } from './rhf-time';
import { RHFTextField } from './rhf-text-field';
import { RHFPhoneInput } from './rhf-phone-input';

// ----------------------------------------------------------------------

export const Field = {
  Text: RHFTextField,
  Date: RHFDatePicker,
  Time: RHFTimePicker,
  Editor: RHFEditor,
  Phone: RHFPhoneInput,
};
