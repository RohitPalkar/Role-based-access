import Button from '@mui/material/Button';
import { Typography } from '@mui/material';

import uiText from 'src/locales/langs/en/common.json';

import { ConfirmDialog } from 'src/components/custom-dialog';

// ----------------------------------------------------------------------

const VARIANT_CONFIG = {
  rm: {
    dismissible: false,
    showCancel: false,
    copy: {
      title: uiText.signatureBooking.dialog.title,
      message1: uiText.signatureBooking.dialog.message1,
      message2: uiText.signatureBooking.dialog.message2,
      upload: uiText.signatureBooking.dialog.upload,
      cancel: uiText.signatureBooking.dialog.cancel,
    },
  },
  crm: {
    dismissible: true,
    showCancel: true,
    copy: {
      title: uiText.signatureBooking.crmDialog.title,
      message1: uiText.signatureBooking.crmDialog.message1,
      message2: uiText.signatureBooking.crmDialog.message2,
      upload: uiText.signatureBooking.crmDialog.upload,
      cancel: uiText.signatureBooking.crmDialog.cancel,
    },
  },
};

type Variant = 'rm' | 'crm';

type SignatureRequiredDialogProps = Readonly<{
  open: boolean;
  onClose?: () => void;
  onUpload: () => void;
  variant?: Variant;
}>;

export function SignatureRequiredDialog({
  open,
  onClose,
  onUpload,
  variant = 'rm',
}: SignatureRequiredDialogProps) {
  const config = VARIANT_CONFIG[variant];

  const { dismissible, showCancel, copy } = config;

  const canDismiss = dismissible && Boolean(onClose);

  return (
    <ConfirmDialog
      open={open}
      onClose={canDismiss ? onClose : undefined}
      disableBackdropClose={!dismissible}
      title={copy.title}
      content={
        <Typography sx={{ fontSize: '14px', fontWeight: 400 }}>
          {copy.message1}
          <br />
          {copy.message2}
        </Typography>
      }
      showCancel={dismissible && showCancel}
      cancelLabel={copy.cancel}
      leftAlignTitle
      contentTextAlign="left"
      action={
        <Button
          variant="contained"
          onClick={onUpload}
          sx={{
            fontSize: '15px',
            fontWeight: '600',
            color: '#fff',
            background: '#1A407D',
            minWidth: { xs: '120px', lg: '204px' },
            height: '48px',
            '&:hover': { background: '#1A407D', boxShadow: 'none' },
          }}
        >
          {copy.upload}
        </Button>
      }
    />
  );
}
