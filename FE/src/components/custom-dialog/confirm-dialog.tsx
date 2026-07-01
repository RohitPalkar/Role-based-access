import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import { Box, Divider, IconButton } from '@mui/material';

import { Iconify } from '../iconify';

import type { ConfirmDialogProps } from './types';

// ----------------------------------------------------------------------

export function ConfirmDialog({
  title,
  centerTitle = false,
  content,
  action,
  open,
  icon,
  topIcon,
  onClose,
  showCancel = true,
  disableBackdropClose = false,
  showCloseButton = false,
  showDivider = false,
  cancelLabel,
  cancelDisabled = false,
  onCancel,
  leftAlignTitle = false,
  contentTextAlign = 'center',
  isLarge = false,
  isMedium = false,
  titlePadding = '40px 24px',
  ...other
}: ConfirmDialogProps) {

  let paperProps;
  if (isLarge) {
    paperProps = {
      sx: {
        width: '1124px',
        maxWidth: '1124px',
        borderRadius: '16px',
      },
    };
  } else if (isMedium) {
    paperProps = {
      sx: {
        width: '650px',
        maxWidth: '650px',
        borderRadius: '16px',
      },
    };
  }

  let justifyContent = 'center';
  if (leftAlignTitle || showCloseButton) {
    justifyContent = 'flex-start';
  }

  return (
    <Dialog
      fullWidth
      // maxWidth="md"
      sx={{
        maxWidth: isLarge || isMedium
          ? undefined
          : {
              lg: '558px', //  default dialog width
            },
        margin: '0px auto',
      }}
      PaperProps={paperProps}
      open={open}
      disableEscapeKeyDown={disableBackdropClose}
      onClose={(_event, reason) => {
        if (disableBackdropClose && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
          return;
        }
        onClose?.();
      }}

      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)', // Set the desired opacity here
          },
        },
      }}
      {...other}
    >
      <Box
        className="confirmDialogWrapper"
        sx={{
          display: 'flex',
          justifyContent: 'center',
          flexDirection: 'column',
          ...(leftAlignTitle ? {} : { alignItems: 'center' }),
          padding: titlePadding,
        }}
      >
        <DialogTitle
          sx={{
            p: 0,
            m: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: '#1C252E',
            mb: showDivider ? 0 : 1,
            display: 'flex',
            justifyContent,
            alignItems: 'center',
            width: '100%'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', flex: showCloseButton ? 1 : 'none', justifyContent: centerTitle ? 'center' : 'flex-start' }}>
            {icon?.name && <Iconify icon={icon.name} width={icon.width ?? undefined} />}
            {title}
          </Box>
          {showCloseButton && (
            <IconButton
              onClick={onClose}
              sx={{ color: 'grey.500', p: 0.5, ml: 1 }}
            >
              <Iconify icon="eva:close-fill" width={24} />
            </IconButton>
          )}
        </DialogTitle>

        {topIcon && (
          <Box
            sx={{
              mb: 2,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <img
              src={topIcon}
              alt="dialog-icon"
            />
          </Box>
        )}

        {content && (
          <DialogContent
            sx={{
              typography: 'body2',
              textAlign: contentTextAlign,
              p: 0,
              m: 0,
              fontSize: '14px',
              fontWeight: '400',
              color: '#1C252E',
              mb: 3,
            }}
          >
            {showDivider && <Divider sx={{ mt: 2, mb: 2, borderStyle: 'dashed', borderColor: '#DADADA' }} />}
            {' '}
            {content}{' '}
          </DialogContent>
        )}

        <DialogActions
          className="btnYesNo"
          sx={{
            m: '0',
            p: '0',
            gap: {
              xs: 1,
              lg: 3,
            },
          }}
        >
          {action}

          {showCancel && (
            <Button
              variant="outlined"
              color="inherit"
              onClick={onCancel ?? onClose}
              disabled={cancelDisabled}
              sx={{
                fontSize: '15px',
                fontWeight: '600',
                color: '#1A407D',
                height: '48px',
                minWidth: {
                  xs: '120px',
                  lg: '204px',
                },
              }}
            >
              {cancelLabel ?? 'No'}
            </Button>
          )}
        </DialogActions>
      </Box>
    </Dialog>
  );
}