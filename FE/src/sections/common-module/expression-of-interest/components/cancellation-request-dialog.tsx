import type { AppDispatch } from 'src/redux/store';

import * as yup from 'yup';
import { toast } from 'sonner';
import { useState } from 'react';
import { useFormik } from 'formik';
import { useDispatch } from 'react-redux';

import {
  Box,
  Stack,
  Button,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';

import { CancellationActionEnum } from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';
import { deleteImage } from 'src/redux/actions/rm-panel/upload-actions';
import { approveCancellationAction } from 'src/redux/actions/rm-panel/eoi-actions';

import { ConfirmDialog } from 'src/components/custom-dialog';
import NewDropzone from 'src/components/dropzone/NewDropzone';

const jsonValue = uiText?.EOIJson.changeSource.cancellationApproveDialogCRM;

type Props = {
  open: boolean;
  voucherId: number | null;
  onClose: () => void;
  onSuccess: () => void;
};

export default function CancellationApproveDialogCRM({ open, voucherId, onClose, onSuccess }: Props) {
  const dispatch: AppDispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  const formik = useFormik({
    initialValues: {
      refundCheque: null as string | null,
      depositSlip: null as string | null,
      acknowledgement: null as string | null,
      remark: '',
    },
    validationSchema: yup.object({
      refundCheque: yup.mixed().required(jsonValue?.validations?.refundCheque),
      depositSlip: yup.mixed().required(jsonValue?.validations?.depositSlip),
      acknowledgement: yup.mixed().required(jsonValue?.validations?.acknowledgement),
      remark: yup.string(),
    }),
    enableReinitialize: true,
    onSubmit: async () => {
      if (!voucherId) return;
      setLoading(true);
      try {
        const payload = {
          voucherId,
          remarks: formik.values.remark?.trim() || 'Cancel by CRM',
          action: CancellationActionEnum.CANCEL,
          refundDocuments: {
            refundChequeCopy: formik.values.refundCheque ? [formik.values.refundCheque] : [],
            depositSlip: formik.values.depositSlip ? [formik.values.depositSlip] : [],
            acknowledgementForm: formik.values.acknowledgement ? [formik.values.acknowledgement] : [],
          },
        };
        await dispatch(approveCancellationAction(payload as any)).unwrap();
        toast.success('Cancellation completed successfully');
        onSuccess();
        onClose();
      } catch (err: any) {
        toast.error(err?.message || 'Failed to complete cancellation');
      } finally {
        setLoading(false);
      }
    },
  });

  const handledelete = async (fieldName: any, index: any, deleteKey?: any) => {
    try {
      await dispatch(deleteImage({ key: deleteKey }));
      toast?.success(jsonValue.fileDeletedMsg);
    } catch (error) {
      toast.error(jsonValue.fileErrorMsg);
      console.error('Error deleting file:', error);
    }
  };

  const handleClose = () => {
    formik.resetForm();
    onClose();
  };

  return (
    <ConfirmDialog
      open={open}
      onClose={handleClose}
      showCloseButton
      title={jsonValue?.title}
      showDivider
      leftAlignTitle
      showCancel
      cancelLabel="Cancel"
      titlePadding="24px"
      isMedium

      content={
        <Box width="100%">
          <Typography
            sx={{ fontSize: '14px', fontWeight: 500, textAlign: 'left', mb: 2 }}>
            {jsonValue?.upload}
          </Typography>

        <Stack spacing={2}>
          <NewDropzone
            name="refundCheque"
            file
            required
            showAsterik
            fieldName={`Upload ${jsonValue.label.refundCheque}`}
            fileValue={formik?.values?.refundCheque || ''}
            handleupload={() => {}}
            handledelete={handledelete}
            documentType="both"
            pdfMaxSize10MB
            isOther={false}
            path={formik?.values?.refundCheque || ''}
            id={formik?.values?.refundCheque || ''}
            formik={formik}
            uploadText={jsonValue.label.refundCheque}
          />
          <NewDropzone
            name="depositSlip"
            file
            required
            showAsterik
            fieldName={`Upload ${jsonValue.label.depositSlip}`}
            fileValue={formik?.values?.depositSlip || ''}
            handleupload={() => {}}
            handledelete={handledelete}
            documentType="both"
            pdfMaxSize10MB
            isOther={false}
            path={formik?.values?.depositSlip || ''}
            id={formik?.values?.depositSlip || ''}
            formik={formik}
            uploadText={jsonValue.label.depositSlip}
          />
          <NewDropzone
            name="acknowledgement"
            file
            required
            showAsterik
            fieldName={`Upload ${jsonValue.label.acknowledgement}`}
            fileValue={formik?.values?.acknowledgement || ''}
            handleupload={() => {}}
            handledelete={handledelete}
            documentType="both"
            pdfMaxSize10MB
            isOther={false}
            path={formik?.values?.acknowledgement || ''}
            id={formik?.values?.acknowledgement || ''}
            formik={formik}
            uploadText={jsonValue.label.acknowledgement}
          />
          <TextField
            fullWidth
            name="remark"
            label={jsonValue?.remarkLabel ?? 'Remark'}
            placeholder={jsonValue?.remarkPlaceholder ?? 'Enter remark'}
            value={formik.values.remark}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.remark && Boolean(formik.errors.remark)}
            helperText={formik.touched.remark && formik.errors.remark}
            multiline
            rows={3}
            inputProps={{ maxLength: 500 }}
            sx={{ mt: 1 }}
          />
          </Stack>
        </Box>
      }
      action={
        <Button
          variant="contained"
          disabled={
            !formik?.values?.refundCheque ||
            !formik?.values?.depositSlip ||
            !formik?.values?.acknowledgement ||
            loading
          }
          onClick={() => formik.handleSubmit()}
          sx={{
            fontSize: '14px',
            fontWeight: 600,
            minWidth: { xs: '120px', lg: '204px' },
            height: '48px',
            background: '#1A407D',
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