import React from 'react';

import { Card, Typography } from '@mui/material';

import uiText from 'src/locales/langs/en/common.json';

import { FormikTextField } from 'src/components/formik-textfield/formik-textfield';

const { view } = uiText.internalOfficeMemo;

type Props = {
  description?: string;
  title?: string;
  variant?: 'view' | 'form';
  formik?: any;
  name?: string;
};

const BusinessExceptionCard = ({
  description,
  title = view.businessException,
  variant = 'view',
  formik,
  name = 'businessException',
}: Props) => (
    <Card sx={{ p: 2 }}>
      {/* Title */}
      <Typography sx={{ fontSize: '16px', fontWeight: 600, mb: 3 }}>
        {title}
      </Typography>

      {/* Description */}
      {/* VIEW MODE */}
      {variant === 'view' && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ lineHeight: 1.6 }}
        >
          {description}
        </Typography>
      )}

      {/* FORM MODE */}
      {variant === 'form' && formik && (
        <FormikTextField
          name={name}
          label={view.businessException}
          formik={formik}
          disabled
          noGrid
        />
      )}
    </Card>
  );

export default BusinessExceptionCard;