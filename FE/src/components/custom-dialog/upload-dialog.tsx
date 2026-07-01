import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { Iconify } from '../iconify';

import type { ConfirmDialogProps } from './types';

// ----------------------------------------------------------------------

export function UploadDialog({
  title,
  content,
  action,
  open,
  icon,
  onClose,
  showCancel = true,
  ...other
}: ConfirmDialogProps) {
  return (
    <Dialog
      fullWidth
      maxWidth="md"
      open={open}
      onClose={onClose}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)', // Set the desired opacity here
          },
        },
      }}      
      {...other}
    >
      <DialogTitle sx={{ pb: 2, display: 'flex', alignItems: 'center' }}>
        {icon?.name && (
          <Iconify icon={icon.name} width={icon.width ?? undefined} sx={{ mr: 2 }} />
        )}
        {title}
      </DialogTitle>

      {content && <DialogContent sx={{ typography: 'body2' }}> {content} </DialogContent>}

      <DialogActions>
        {action}

        {showCancel && (
          <Button variant="outlined" color="inherit" onClick={onClose}>
            No
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
