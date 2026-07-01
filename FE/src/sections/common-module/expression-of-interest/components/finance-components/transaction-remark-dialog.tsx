import dayjs from 'dayjs';
import { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';

import { Box ,  Stack, Button, TextField, Typography } from '@mui/material';

import { getMinMaxDateForFilter } from 'src/utils/helper';
import { IomAction, EOIFinanceStatus } from 'src/utils/constant';

import { Field } from 'src/components/hook-form';
import { ConfirmDialog } from 'src/components/custom-dialog';

type Props = Readonly<{
  open: boolean;
  showAllFields?: boolean;
  action: EOIFinanceStatus.VERIFIED | EOIFinanceStatus.REVERSED | EOIFinanceStatus.REJECTED | 'resubmit' | 'approve' | IomAction.CANCEL_IOM | IomAction.REJECT_IOM ;
  remark: { realisationDate?: string; receiptNo?: number; comments?: string };
  setRemark: (value: Partial<{ realisationDate?: string; receiptNo?: number; comments?: string }>) => void;
  onClose: () => void;
  onSubmit: () => void;
  onChangeValue?: (value: string) => void;
  onReject?: () => void;
  minCommentLength?: number;
  commentsHelperText?: string;
}>;

export function TransactionRemarksDialog({
  open,
  showAllFields = false,
  action,
  remark,
  setRemark,
  onClose,
  onSubmit,
  onReject,
  minCommentLength = 1,
  commentsHelperText,
}: Props) {
  // 🧭 Map enum to user-friendly dialog titles
  const titleMap: Record<string, string> = {
    [EOIFinanceStatus.VERIFIED]: 'Add Remarks for Realization',
    [EOIFinanceStatus.REVERSED]: 'Reason for Not Realized',
    [EOIFinanceStatus.REJECTED]: 'Reason for Rejection',
    [IomAction.CANCEL_IOM]: 'Cancel IOM',
    [IomAction.REJECT_IOM]: 'Reject IOM',
    resubmit: 'Request for Resubmission',
    approve: 'Unit Approval',
  };

  const methods = useForm({
    defaultValues: {
      date: remark?.realisationDate || null,
    },
  });

  const { watch } = methods;
  const { startYearDate } = getMinMaxDateForFilter();
  const watchedDate = watch('date');

  useEffect(() => {
    if (showAllFields) {
      setRemark({
        realisationDate: watchedDate ? dayjs(watchedDate).format('YYYY-MM-DD') : undefined,
      });
    }
  }, [watchedDate, showAllFields, setRemark]);

  const trimmedCommentLength = (remark?.comments ?? '').trim().length;
  const meetsMinLength = trimmedCommentLength >= minCommentLength;

  let isSubmitDisabled = false;
  if (action !== 'approve') {
    if (showAllFields) {
      isSubmitDisabled = !(remark?.realisationDate && remark?.receiptNo && meetsMinLength);
    } else {
      isSubmitDisabled = !meetsMinLength;
    }
  }

  const hasMinLengthError = Boolean(
    commentsHelperText && trimmedCommentLength > 0 && !meetsMinLength
  );
  const counterText = `${remark?.comments?.length ?? 0}/500 characters`;
  const remarkHelperText = commentsHelperText
    ? `${commentsHelperText} • ${counterText}`
    : counterText;

  let buttonLabelText = 'Confirm';
  if (action === EOIFinanceStatus.VERIFIED) {
    buttonLabelText = 'Realize';
  } else if (action === EOIFinanceStatus.REVERSED) {
    buttonLabelText = 'Mark as Not Realized';
  } else if (action === EOIFinanceStatus.REJECTED || action === IomAction.REJECT_IOM) {
    buttonLabelText = 'Reject';
  } else if (action === IomAction.CANCEL_IOM) {
    buttonLabelText = 'Cancel';
  } else if (action === 'approve') {
    buttonLabelText = 'Approve';
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title={titleMap[action] || 'Add Remark'}
      content={
        <Stack
          spacing={1.5}
          sx={{
            width: '100%',
            minWidth: { xs: '280px', sm: '440px' },
            maxWidth: { xs: '90vw', sm: '500px' },
          }}
        >
        
          {/* Remarks TextArea */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2" sx={{ textAlign: 'left', fontWeight: 700 }}>
              {action === 'approve' ? 'Enter Comments :' : 'Enter Remark :'}
            </Typography>
            <TextField
              fullWidth
              placeholder={action === 'approve' ? "Enter comments" : "Enter reason"}
              multiline
              rows={4}
              value={remark?.comments || ''}
              onChange={(e) => setRemark({ comments: e.target.value })}
              inputProps={{ maxLength: 500 }}
              error={hasMinLengthError}
              helperText={remarkHelperText}
            />
          </Box>

          {/* Show additional fields only when verifying (Realized) */}
          {showAllFields && (
            <>
              <FormProvider {...methods}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ mb: 1, mt: 2 }}>
                    <Field.Date
                      name="date"
                      label="Enter Realisation Date"
                      minDate={startYearDate}
                      maxDate={dayjs()}
                    />
                  </Box>
                </Box>
              </FormProvider>

              <TextField
                fullWidth
                variant="outlined"
                label="Enter Receipt Number"
                value={remark?.receiptNo || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setRemark({ receiptNo: val ? Number(val) : undefined });
                }}
                InputLabelProps={{ shrink: true }}
              />
            </>
          )}
        </Stack>
      }
      action={
        <Box>
          <Button
            variant="contained"
            sx={{
              fontSize: '15px',
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
            disabled={isSubmitDisabled}
            onClick={onSubmit}
          >
            {`Yes, ${buttonLabelText}`}
          </Button>
        </Box>
      }
      cancelLabel={action === 'approve' ? 'Reject' : 'No'}
      cancelDisabled={action === 'approve' && !remark?.comments?.trim()}
      onCancel={action === 'approve' ? onReject : onClose}
      showCloseButton={action === 'approve'}
      centerTitle={action === 'approve'}
    />
  );
}
