import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import { Editor } from '../editor';

import type { EditorProps } from '../editor';

// ----------------------------------------------------------------------

type RHFEditorProps = EditorProps & {
  name: string;
  helperText?: React.ReactNode;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
};

export function RHFEditor({
  name,
  helperText,
  label,
  required = false,
  disabled = false,
  value,
  onChange,
  ...other
}: RHFEditorProps) {
  const methods = useFormContext();

  // Detect if RHF context exists
  const hasFormContext =
    methods &&
    typeof methods === 'object' &&
    'control' in methods &&
    methods.control !== undefined;

  // If RHF context exists, use Controller
  if (hasFormContext) {
    const {
      control,
      formState: { isSubmitSuccessful },
    } = methods;

    return (
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState: { error } }) => (
          <Editor
            {...field}
            label={label}
            error={!!error}
            helperText={error?.message ?? helperText}
            resetValue={isSubmitSuccessful}
            disabled={disabled}
            required={required}
            {...other}
          />
        )}
      />
    );
  }

  // Otherwise, behave like a normal controlled input (Formik or plain form)
  return (
    <Editor
      name={name}
      label={label}
      value={value ?? ''}
      onChange={onChange ?? (() => {})}
      helperText={helperText}
      error={!!helperText}
      disabled={disabled}
      required={required}
      {...other}
    />
  );
}
