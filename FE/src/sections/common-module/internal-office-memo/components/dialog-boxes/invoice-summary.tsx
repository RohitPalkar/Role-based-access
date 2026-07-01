import type { FormikProps } from 'formik';

import React from 'react';

import { Grid } from '@mui/material';

import uiText from 'src/locales/langs/en/common.json';

import { FormikTextField } from 'src/components/formik-textfield/formik-textfield';

const copy = uiText.internalOfficeMemo.closeInvoice;

export type InvoiceSummaryField =
  | 'billingName'
  | 'address'
  | 'gstin'
  | 'panNo'
  | 'iomCount'
  | 'sumOfIomAmount';

type Props = Readonly<{
  formik: FormikProps<any>;
  fields: InvoiceSummaryField[];
}>;

const FIELD_CONFIG: Record<
  InvoiceSummaryField,
  {
    label: string;
    fullWidth?: boolean;
  }
> = {
  billingName: {
    label: copy.billingName,
    fullWidth: true,
  },
  address: {
    label: copy.address,
    fullWidth: true,
  },
  gstin: {
    label: copy.gstin,
  },
  panNo: {
    label: copy.panNo,
  },
  iomCount: {
    label: copy.iomCount,
  },
  sumOfIomAmount: {
    label: copy.sumOfIomAmount,
  },
};

const InvoiceSummary = ({
  formik,
  fields,
}: Props) => (
  <>
    {fields?.map((field) => {
      const config = FIELD_CONFIG?.[field];

      if (config?.fullWidth) {
        return (
          <Grid
            item
            xs={12}
            key={field}
          >
            <FormikTextField
              noGrid
              disabled
              formik={formik}
              name={field}
              label={config.label}
            />
          </Grid>
        );
      }

      return (
        <FormikTextField
          key={field}
          disabled
          formik={formik}
          name={field}
          label={config.label}
        />
      );
    })}
  </>
);

export default InvoiceSummary;