import '../../global.css';

import type { FormikProps } from 'formik';

import React from 'react';

import { Grid, FormLabel, FormControl, FormHelperText } from '@mui/material';

interface Option {
  name: string;
  value: string | number | boolean;
}

interface FieldProps {
  name: string;
  label?: string;
  required?: boolean;
  readonly?: boolean;
  options?: Option[];
  handleOnChange: (
    e: React.MouseEvent<HTMLDivElement>,
    index: number,
    name: string,
    options?: Option[]
  ) => void;
  grid?: boolean;
  listKey?: string;
  index?: number;
  nameKey?: string;
  xsCol?: number;
  smCol?: number;
  mdCol?: number;
  lgCol?: number;
  mb?: number;
}

interface BoxCheckInputProps {
  field: FieldProps;
  formik: FormikProps<any>;
}

const BoxCheckInput: React.FC<BoxCheckInputProps> = ({ field, formik }) => {
  const showError = (() => {
    if (field?.listKey && field?.index !== undefined && field?.nameKey) {
      const touchedList = formik?.touched?.[field.listKey];
      const errorList = formik?.errors?.[field.listKey];

      const touchedItem =
        Array.isArray(touchedList) &&
        touchedList?.[field.index] &&
        (touchedList?.[field.index] as any)?.[field.nameKey];

      const errorItem =
        Array.isArray(errorList) &&
        errorList?.[field.index] &&
        (errorList?.[field.index] as any)?.[field.nameKey];

      return touchedItem && errorItem;
    }

    return (formik?.touched as any)?.[field?.name] && (formik?.errors as any)?.[field?.name];
  })();

  const handleClick = (e: React.MouseEvent<HTMLDivElement>, index: number, option: Option) => {
    if (field?.readonly) return;
    field.handleOnChange(e, index, field.name, field.options);
  };

  return (
    <FormControl component="fieldset" fullWidth className="boxCheckInputContainer">
      <div className="radio-group-container">
        {field?.label && (
          <FormLabel
            className="form-label"
            sx={{
              color: '#1C252E',
              fontSize: '14px',
              fontWeight: 500,
              lineHeight: '22px',
              display: 'block',
              mb: '6px',
            }}
          >
            {field.label}
            {field.required && <span className="asteriskColor"> *</span>}
          </FormLabel>
        )}

        {field.grid ? (
          <Grid container spacing={2} sx={{ mb: field.mb ?? 2 }}>
            {field?.options?.map((option, index) => (
              <Grid item xs={field.xsCol} sm={field.smCol} md={field.mdCol} lg={field.lgCol}>
                <div
                  className={`checkBox topSpaceMob ${
                    formik?.values?.[field.name] === option.value ? 'selectedCheckBox' : ''
                  } ${field?.readonly ? 'readonly' : ''}`}
                  onClick={(e) => handleClick(e, index, option)}
                  onKeyDown={(e) => {
                    if (field?.readonly) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault(); // prevent scrolling for Space
                      handleClick(e as any, index, option);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  style={{
                    pointerEvents: field?.readonly ? 'none' : 'auto',
                    opacity: field?.readonly ? 0.7 : 1,
                    cursor: field?.readonly ? 'not-allowed' : 'pointer',
                  }}
                >
                  <div className="TextCenter">{option.name}</div>
                </div>
              </Grid>
            ))}
          </Grid>
        ) : (
          <div>
            {field?.options?.map((option, index) => (
              <div>
                <div
                  className={`checkBox ${
                    formik?.values?.[field.name] === option.value ? 'selectedCheckBox' : ''
                  } ${field?.readonly ? 'readonly' : ''}`}
                  onClick={(e) => handleClick(e, index, option)}
                  onKeyDown={(e) => {
                    if (field?.readonly) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault(); // prevent scrolling for Space
                      handleClick(e as any, index, option);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  style={{
                    pointerEvents: field?.readonly ? 'none' : 'auto',
                    opacity: field?.readonly ? 0.7 : 1,
                    cursor: field?.readonly ? 'not-allowed' : 'pointer',
                  }}
                >
                  <div>{option.name}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showError && (
        <FormHelperText error style={{ marginTop: field?.mb === 0 ? '0px' : '-12px' }}>
          {String(showError)}
        </FormHelperText>
      )}
    </FormControl>
  );
};

export default BoxCheckInput;
