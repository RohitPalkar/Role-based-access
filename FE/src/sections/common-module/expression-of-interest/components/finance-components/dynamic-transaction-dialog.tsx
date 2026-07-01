import dayjs from 'dayjs';
import { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';

import { Box, Stack, Button, TextField } from '@mui/material';

import { getMinMaxDateForFilter } from 'src/utils/helper';

import { Field } from 'src/components/hook-form';
import { ConfirmDialog } from 'src/components/custom-dialog';

type TransactionData = {
  paidAmount: string;
  refundDate?: string;
  refundTransactionId?: string;
  internalRefNumber?: string;
  comments?: string;
};

type Props = Readonly<{
  open: boolean;
  title: string;
  transactionData: TransactionData;
  onTransactionDataChange: (data: Partial<TransactionData>) => void;
  onClose: () => void;
  onSubmit: () => void;
  submitButtonText?: string;
  isLoading?: boolean;
}>;

export function DynamicTransactionDialog({
  open,
  title,
  transactionData,
  onTransactionDataChange,
  onClose,
  onSubmit,
  submitButtonText = 'Submit',
  isLoading = false,
}: Props) {
  const { startYearDate } = getMinMaxDateForFilter();
  
  const methods = useForm({
    defaultValues: {
      refundDate: transactionData?.refundDate || null,
    },
  });

  const { watch } = methods;
  const watchedrefundDate = watch('refundDate');

  useEffect(() => {
    if (watchedrefundDate) {
      onTransactionDataChange({
        ...transactionData,
        refundDate: watchedrefundDate,
      });
    }
  }, [watchedrefundDate, transactionData, onTransactionDataChange]);

  const isSubmitDisabled =
    !transactionData?.refundDate || !transactionData?.refundTransactionId?.trim();

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title={title}
      content={
        <Stack
          spacing={1.5}
          sx={{
            width: '100%',
            minWidth: { xs: '320px', sm: '480px' },
            maxWidth: { xs: '95vw', sm: '600px' },
            padding: { xs: '16px', sm: '24px' },
            boxSizing: 'border-box',
          }}
        >
          <FormProvider {...methods}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                type="number"
                fullWidth
                variant="outlined"
                label="Amount Refunded"
                value={transactionData?.paidAmount || ''}
                onChange={(e) =>
                  onTransactionDataChange({
                    ...transactionData,
                    paidAmount: e.target.value,
                  })
                }
                InputLabelProps={{
                  shrink: true,
                }}
                required
              />

              {/* Transaction Date - Required */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '80px',
                }}
              >
                <Field.Date
                  name="refundDate"
                  label="Transaction Date *"
                  minDate={startYearDate}
                  maxDate={dayjs()}
                />
              </Box>

              {/* Transaction ID - Required */}
              <TextField
                fullWidth
                variant="outlined"
                label="Transaction ID "
                value={transactionData?.refundTransactionId || ''}
                onChange={(e) =>
                  onTransactionDataChange({
                    ...transactionData,
                    refundTransactionId: e.target.value,
                  })
                }
                InputLabelProps={{
                  shrink: true,
                }}
                required
              />

              {/* Internal Reference Number - Optional */}
              <TextField
                fullWidth
                variant="outlined"
                label="Internal Reference Number"
                value={transactionData?.internalRefNumber || ''}
                onChange={(e) =>
                  onTransactionDataChange({
                    ...transactionData,
                    internalRefNumber: e.target.value,
                  })
                }
                InputLabelProps={{
                  shrink: true,
                }}
              />

              {/* Comments - Optional */}
              <TextField
                fullWidth
                label="Comments"
                placeholder="Enter comments"
                multiline
                rows={4}
                value={transactionData?.comments || ''}
                onChange={(e) =>
                  onTransactionDataChange({
                    ...transactionData,
                    comments: e.target.value,
                  })
                }
                inputProps={{ maxLength: 500 }}
                helperText={`${transactionData?.comments?.length ?? 0}/500 characters`}
              />
            </Box>
          </FormProvider>
        </Stack>
      }
      action={
        <Box>
          <Button
            variant="contained"
            onClick={onSubmit}
            disabled={isSubmitDisabled || isLoading}
            sx={{
              fontSize: '15px',
              fontWeight: '600',
              color: '#fff',
              background: '#1A407D',
              minWidth: { xs: '120px', lg: '204px' },
              height: '48px',
              margin: 0,
              '&:hover': {
                background: '#1A407D',
                boxShadow: 'none',
              },
            }}
          >
            {isLoading ? 'Processing...' : submitButtonText}
          </Button>
        </Box>
      }
    />
  );
}

export type { TransactionData };
