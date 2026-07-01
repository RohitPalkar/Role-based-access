import type { FormikProps } from 'formik';

import { getIn } from 'formik';

import { Grid, InputBase, Typography } from '@mui/material';

import NewDropzone from 'src/components/dropzone/NewDropzone';

type DocumentBlockProps = {
  title: string;
  inputName: string;
  dropzoneName: string;
  formik: FormikProps<any>;
  maxLength?: number;
  handledelete: (fieldName: any, file: any, deleteKey?: string) => void;
  isAadhaar?: boolean;
};

export const DocumentBlock = ({
  title,
  inputName,
  dropzoneName,
  formik,
  maxLength,
  handledelete,
  isAadhaar = false,
}: DocumentBlockProps) => {
  const inputValue = getIn(formik.values, inputName);
  const fileValue = getIn(formik.values, dropzoneName);
  const touched = getIn(formik.touched, inputName);
  const error = getIn(formik.errors, inputName);
  const backFileValue = isAadhaar
    ? getIn(formik.values, dropzoneName.replace('aadhaarImage', 'aadhaarBackImage'))
    : null;

  return (
    <>
      <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
        <Typography sx={{ fontSize: '14px', fontWeight: '500' }}>{title}</Typography>
      </Grid>

      <Grid
        item
        xs={12}
        sm={isAadhaar ? 12 : 6}
        md={isAadhaar ? 12 : 6}
        lg={isAadhaar ? 12 : 6}
        xl={isAadhaar ? 12 : 6}
        sx={{ mt: { xs: -2, sm: -3 } }}
      >
        <InputBase
          fullWidth
          name={inputName}
          value={inputValue || ''}
          placeholder={`Enter ${title}`}
          onChange={(e) => {
            const value = e.target.value.toUpperCase();
            formik.setFieldValue(inputName, value);
          }}
          onBlur={formik.handleBlur}
          className="InputBaseRow"
          inputProps={{ maxLength }}
          sx={{
            '& input': {
              textTransform: 'uppercase',
              height: '68px',
            },
            '& ::placeholder': { textTransform: 'none' },
            mb: 1,
          }}
        />
        {touched && error && (
          <Typography color="error" sx={{ fontSize: '12px', mb: '4px' }}>
            {error}
          </Typography>
        )}
      </Grid>

      {!isAadhaar && (
         <Grid item xs={12} sm={6} sx={{ mt: { xs: -2, sm: -3 } }} />
      )}

      <Grid item xs={12} sm={6} sx={{ mt: { xs: -2, sm: -3 } }}>
        <NewDropzone
          name={dropzoneName}
          file
          required={false}
          fieldName={isAadhaar ? `${title} Front` : title}
          fileValue={fileValue || ''}
          handleupload={() => {}}
          handledelete={handledelete}
          documentType="image"
          isOther={false}
          path={fileValue || ''}
          id={fileValue || ''}
          formik={formik}
          {...(isAadhaar && {
            uploadText: `Click to upload Aadhaar Front`,
          })}
          showAsterik={false}
          customSx
        />
      </Grid>
     
      {isAadhaar && (
        <Grid item xs={12} sm={6} sx={{ mt: { xs: -2, sm: -3 } }}>
          <NewDropzone
            name={dropzoneName.replace('aadhaarImage', 'aadhaarBackImage')}
            file
            required={false}
            fieldName={`${title} Back`}
            fileValue={backFileValue || ''}
            handleupload={() => {}}
            handledelete={handledelete}
            documentType="image"
            isOther={false}
            path={backFileValue || ''}
            id={backFileValue || ''}
            formik={formik}
            uploadText="Click to upload Aadhaar Back"
            showAsterik={false}
            customSx
          />
        </Grid>
      )}
    </>
  );
};
