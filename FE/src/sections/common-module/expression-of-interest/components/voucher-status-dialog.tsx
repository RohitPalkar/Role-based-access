import { Box, Stack, Button, TextField, Typography } from '@mui/material';

import { ConfirmDialog } from 'src/components/custom-dialog';

type Props = Readonly<{
  open: boolean;
  action: 'verify' | 'requestChanges'; // unified for both MIS and CRM
  voucherId: number | null;
  comment: string;
  setComment: (comment: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}>;

export default function VoucherStatusDialog({
  open,
  action,
  voucherId,
  comment,
  setComment,
  onClose,
  onSubmit,
}: Props) {
  const titleMap: Record<typeof action, string> = {
    verify: 'Verify Voucher Status',
    requestChanges: 'Request Changes for Voucher',
  };

  const actionLabels: Record<typeof action, string> = {
    verify: 'Verify',
    requestChanges: 'Request Changes',
  };

  const fieldLabel =
    action === 'verify' ? 'Add Verification Comments:' : 'Add Reason for Changes:';

  const placeholder =
    action === 'verify'
      ? 'Enter verification comments (optional)'
      : 'Enter reason for requesting changes';

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title={titleMap[action]}
      content={
        <Stack
          spacing={1.5}
          sx={{
            width: '100%',
            minWidth: { xs: '280px', sm: '440px' },
            maxWidth: { xs: '90vw', sm: '500px' },
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography
              variant="body2"
              sx={{ textAlign: 'left', fontWeight: '700' }}
            >
              {fieldLabel}
            </Typography>

            <TextField
              fullWidth
              placeholder={placeholder}
              multiline
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              inputProps={{ maxLength: 500 }}
              helperText={`${comment?.length ?? 0}/500 characters`}
            />
          </Box>
        </Stack>
      }
      action={
        <Box>
          <Button
            variant="contained"
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
            disabled={action === 'requestChanges' && !comment?.trim()}
            onClick={onSubmit}
          >
            {`Yes, ${actionLabels[action]}`}
          </Button>
        </Box>
      }
    />
  );
}