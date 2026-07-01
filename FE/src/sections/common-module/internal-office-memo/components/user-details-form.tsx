import React from 'react';

import { Card, Grid, Typography } from '@mui/material';

import uiText from 'src/locales/langs/en/common.json';

import { FormikTextField } from 'src/components/formik-textfield/formik-textfield';

const { generateIOM, view } = uiText.internalOfficeMemo;

type Props = {
  title: string;
  formik: any;
  fieldPrefix: string;
};

const UserDetailsForm = ({ title, formik, fieldPrefix }: Props) => (
  <Card sx={{ p: 2 }}>
    <Typography sx={{ fontSize: '16px', fontWeight: 600, mb: 3 }}>
      {title}
    </Typography>

    <Grid container spacing={2}>
      <Grid item xs={12}>
        <FormikTextField
          name={`${fieldPrefix}.customerName`}
          label={view.customerName}
          formik={formik}
          disabled
          noGrid
        />
      </Grid>

      <FormikTextField
        name={`${fieldPrefix}.projectName`}
        label={generateIOM.labels.projectName}
        formik={formik}
        disabled
      />

      <FormikTextField
        name={`${fieldPrefix}.projectLocation`}
        label={generateIOM.labels.projectLocation}
        formik={formik}
        disabled
      />

      <FormikTextField
        name={`${fieldPrefix}.unitNo`}
        label={view.unitNo}
        formik={formik}
        disabled
      />

      <FormikTextField
        name={`${fieldPrefix}.bpCode`}
        label={view.bpCode}
        formik={formik}
        disabled
      />

      <FormikTextField
        name={`${fieldPrefix}.bookingDate`}
        label={view.bookingDate}
        formik={formik}
        disabled
      />
    </Grid>
  </Card>
);

export default UserDetailsForm;