import type { AppDispatch } from 'src/redux/store';

import dayjs from 'dayjs';
import React from 'react';
import { toast } from 'sonner';
import { useFormik } from 'formik';
import { useDispatch } from 'react-redux';
import { useForm, FormProvider } from 'react-hook-form';

import {
  Stack,
  Button,
  CircularProgress,
} from '@mui/material';

import uiText from 'src/locales/langs/en/common.json';
import { deleteImage } from 'src/redux/actions/rm-panel/upload-actions';

import { Field } from 'src/components/hook-form';
import { ConfirmDialog } from 'src/components/custom-dialog';
import NewDropzone from 'src/components/dropzone/NewDropzone';
import { FormikTextField } from 'src/components/formik-textfield/formik-textfield';

type Props = {
  open: boolean;
  onClose: () => void;
  row: {
    id: number; 
    paidAmount?: number;
    realisationDate?: dayjs.Dayjs | string;
    receiptNo?: number;
    receiptImage?: string;
  };
  loading?: boolean;
  onSubmit: (values: { receiptImage: string }) => void; 
};

export default function UploadReceiptDialog({
  open,
  onClose,
  row,
  loading = false,
  onSubmit,
}: Props) {
  const uploadFileText = uiText.EOIJson.createEOI.form.moreDetails.paymentDetails;
  const dispatch: AppDispatch = useDispatch();
  
  const uploadDialogFormik = useFormik({
    initialValues: {
      paidAmount: row?.paidAmount ? String(row.paidAmount) : '',
      receiptNo: row?.receiptNo ? String(row.receiptNo) : '',
      receiptImage: row?.receiptImage || '',
    },
    enableReinitialize: true,
    onSubmit: (values) => {
      onSubmit(values); 
    },
    });

    const methods = useForm({
      defaultValues: {
        date: row?.realisationDate ? dayjs(row.realisationDate) : null,
      },
    });

    const handledelete = async (fieldName: any, index: any, deleteKey?: any) => {
      try {
        await dispatch(deleteImage({ key: deleteKey }));
        toast?.success(uploadFileText.fileDeletedMsg);
      } catch (error) {
        toast.error(uploadFileText.fileErrorMsg);
        console.error('Error deleting file:', error);
      }
    };

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title="Upload Receipt"
      content={
        <Stack
         mt={2}
          spacing={3}
          sx={{
            width: '100%',
            minWidth: { xs: '280px', sm: '440px' },
            maxWidth: { xs: '90vw', sm: '500px' },
          }}
        >
          {/* Amount */}
          <FormikTextField
            name="paidAmount"
            label="Amount"
            formik={uploadDialogFormik}
            disabled
          />

          {/* Realisation Date */}
          <FormProvider {...methods}>
            <Field.Date
              name="date"
              label="Realisation Date"
              disabled
              maxDate={dayjs()}
            />
          </FormProvider>

          {/* Receipt Number */}
          <FormikTextField
            name="receiptNo"
            label="Receipt Number"
            formik={uploadDialogFormik}
            disabled
          />

          <NewDropzone
            name="receiptImage"
            file
            required
            fieldName="Upload Receipt"
            fileValue={uploadDialogFormik?.values?.receiptImage || ''}
            handleupload={() => {}}
            handledelete={handledelete}
            documentType="pdf"
            isOther={false}
            path={uploadDialogFormik?.values?.receiptImage || ''}
            id={uploadDialogFormik?.values?.receiptImage}
            formik={uploadDialogFormik}
            uploadText="Upload Receipt"
            showAsterik
          />
        </Stack>
      }
      showCancel
      action={
        <Button
          variant="contained"
          onClick={uploadDialogFormik.submitForm}
          disabled={loading || !uploadDialogFormik.values.receiptImage}
          sx={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#fff',
            background: '#1A407D',
            minWidth: { xs: '120px', lg: '204px' },
            height: '48px',
            '&:hover': {
              background: '#1A407D',
              boxShadow: 'none',
            },
          }}
        >
          {loading ? (
            <CircularProgress size={22} sx={{ color: '#fff' }} />
          ) : (
            'Submit'
          )}
        </Button>
      }
    />
  );
}