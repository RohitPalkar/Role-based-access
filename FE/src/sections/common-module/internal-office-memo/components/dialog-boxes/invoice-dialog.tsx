import dayjs from 'dayjs';
import * as Yup from 'yup';
import { useMemo } from 'react';
import { useFormik } from 'formik';

import {
  Grid,
  Button,
  Divider,
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import {
  DatePicker,
  LocalizationProvider,
} from '@mui/x-date-pickers';

import uiText from 'src/locales/langs/en/common.json';

import { ConfirmDialog } from 'src/components/custom-dialog';
import { FormikTextField } from 'src/components/formik-textfield/formik-textfield';

import InvoiceSummary from './invoice-summary';

import type { InvoiceSummaryField } from './invoice-summary';

const copy = uiText.internalOfficeMemo;

export type InvoiceDialogMode =
  | 'request'
  | 'submit'
  | 'close';

export type InvoiceDetails = {
  billingName?: string | null;
  address?: string | null;
  gstin?: string | null;
  panNo?: string | null;
  iomCount?: number | string | null;
  sumOfIomAmount?: number | string | null;
  invoiceRefNumber?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
};

type Props = Readonly<{
  mode: InvoiceDialogMode;
  open: boolean;
  onClose: () => void;
  onSubmit: (values: any) => void;
  invoiceDetails?: InvoiceDetails | null;
  isSubmitting?: boolean;
}>;

const CONFIG = {
  request: {
    title: copy.requestInvoice.title,
    button: copy.requestInvoice.requestInvoice,
    fields: [
      'billingName',
      'address',
      'gstin',
      'panNo',
      'iomCount',
      'sumOfIomAmount',
    ] as InvoiceSummaryField[],
  },

  submit: {
    title: copy.submitInvoice.title,
    button: copy.submitInvoice.submitInvoice,
    fields: [
      'billingName',
      'address',
      'gstin',
      'panNo',
      'iomCount',
      'sumOfIomAmount',
    ] as InvoiceSummaryField[],
  },

  close: {
    title: copy.closeInvoice.title,
    button: copy.closeInvoice.closeInvoice,
    fields: [
      'billingName',
      'address',
      'gstin',
      'panNo',
      'iomCount',
      'sumOfIomAmount',
    ] as InvoiceSummaryField[],
  },
};

export default function InvoiceDialog({
  mode,
  open,
  onClose,
  onSubmit,
  invoiceDetails,
  isSubmitting = false,
}: Props) {
  const config = CONFIG[mode];

  const validationSchema = useMemo(() => {
    switch (mode) {
      case 'request':
        return Yup.object({});

      case 'submit':
        return Yup.object({
          invoiceNumber: Yup.string().required(`${copy.closeInvoice.invoiceNumber} is required`),
          invoiceDate: Yup.string().required(`${copy.closeInvoice.invoiceDate} is required`),
        });

      case 'close':
        return Yup.object({
          paymentDate: Yup.string().required(`${copy.closeInvoice.paymentDate} is required`),
          amountPaid: Yup.string().required(`${copy.closeInvoice.amountPaid} is required`),
          utrNumber: Yup.string().required(`${copy.closeInvoice.utrNumber} is required`),
        });

      default:
        return Yup.object({});
    }
  }, [mode]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      paymentDate: '',
      amountPaid: '',
      utrNumber: '',

      invoiceNumber: '',
      invoiceRefNumber: '',
      invoiceDate: '',

      billingName: invoiceDetails?.billingName ?? '',
      address: invoiceDetails?.address ?? '',
      gstin: invoiceDetails?.gstin ?? '',
      panNo: invoiceDetails?.panNo ?? '',
      iomCount: invoiceDetails?.iomCount ?? '',
      sumOfIomAmount: invoiceDetails?.sumOfIomAmount ?? '',
    },
    validationSchema,
    onSubmit,
  });

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      showCloseButton
      leftAlignTitle
      contentTextAlign="left"
      isMedium
      showDivider
      titlePadding="24px 24px"
      title={config.title}
      cancelLabel={uiText.button.cancel}
      content={
        <Grid container spacing={2}>
          {mode === 'submit' && (
            <>
              <FormikTextField
                name="invoiceRefNumber"
                label={copy.closeInvoice.invoiceRefNumber}
                formik={formik}
              />
              <FormikTextField
                name="invoiceNumber"
                label={copy.closeInvoice.invoiceNumber}
                required
                formik={formik}
              />
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label={
                      <>
                        {copy.closeInvoice.invoiceDate}
                        <span style={{ color: '#FF0000' }}> *</span>
                      </>
                    }
                    maxDate={dayjs()}
                    value={
                      formik.values.invoiceDate
                        ? dayjs(formik.values.invoiceDate)
                        : null
                    }
                    onChange={(value) =>
                      formik.setFieldValue(
                        'invoiceDate',
                        value?.isValid()
                          ? value.format('YYYY-MM-DD')
                          : ''
                      )
                    }
                    format="DD/MM/YYYY"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        onBlur: () => {
                          formik.setFieldTouched('invoiceDate', true, true);
                        },
                        error: Boolean(
                          formik.touched.invoiceDate &&
                          formik.errors.invoiceDate
                        ),
                        helperText: formik.touched.invoiceDate
                          ? formik.errors.invoiceDate
                          : '',
                      },
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ borderStyle: 'dashed' }} />
              </Grid>
              <InvoiceSummary
                formik={formik}
                fields={config.fields}
              />
            </>
          )}

          {mode === 'close' && (
            <>
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label={
                      <>
                        {copy.closeInvoice.paymentDate}
                        <span style={{ color: '#FF0000' }}> *</span>
                      </>
                    }
                    maxDate={dayjs()}
                    value={
                      formik.values.paymentDate
                        ? dayjs(formik.values.paymentDate)
                        : null
                    }
                    onChange={(value) =>
                      formik.setFieldValue(
                        'paymentDate',
                        value?.isValid() ? value.format('YYYY-MM-DD') : ''
                      )
                    }
                    format="DD/MM/YYYY"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        onBlur: () => {
                          formik.setFieldTouched('paymentDate', true, true);
                        },
                        error: Boolean(
                          formik.touched.paymentDate &&
                          formik.errors.paymentDate
                        ),
                        helperText: formik.touched.paymentDate
                          ? formik.errors.paymentDate
                          : '',
                      },
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              <FormikTextField
                name="amountPaid"
                label={copy.closeInvoice.amountPaid}
                required
                formik={formik}
              />
              <FormikTextField
                name="utrNumber"
                label={copy.closeInvoice.utrNumber}
                required
                formik={formik}
              />
              <Grid item xs={12}>
                <Divider sx={{ borderStyle: 'dashed' }} />
              </Grid>
              <InvoiceSummary
                formik={formik}
                fields={config.fields}
              />
              <Grid item xs={12}>
                <Divider sx={{ borderStyle: 'dashed' }} />
              </Grid>
              <FormikTextField
                name="invoiceRefNumber"
                label={copy.closeInvoice.invoiceRefNumber}
                formik={formik}
                disabled
              />
              <FormikTextField
                name="invoiceNumber"
                label={copy.closeInvoice.invoiceNumber}
                formik={formik}
                disabled
              />
              <FormikTextField
                name="invoiceDate"
                label={copy.closeInvoice.invoiceDate}
                formik={formik}
                disabled
              />
            </>
          )}

          {mode === 'request' && (
            <InvoiceSummary
              formik={formik}
              fields={config.fields}
            />
          )}
        </Grid>
      }
      action={
        <Button
          variant="contained"
          className="primaryBtn"
          disabled={isSubmitting}
          onClick={() => formik.handleSubmit()}
          sx={{
            fontSize: '15px',
            fontWeight: '600',
            minWidth: { xs: '120px', lg: '204px' },
            height: '48px',
            margin: 0,
          }}
        >
          {config.button}
        </Button>
      }
    />
  );
}
