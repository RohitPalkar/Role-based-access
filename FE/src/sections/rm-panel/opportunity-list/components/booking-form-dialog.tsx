import React from 'react'

import { Box , Stack, Typography } from '@mui/material';

import { ConfirmDialog } from 'src/components/custom-dialog'

interface BookingFormLinkDialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    formStatusLabel?: string;
    content: React.ReactNode;
    action: React.ReactNode;
}

const BookingFormDialog = ({ open, onClose, title, content, formStatusLabel, action } : BookingFormLinkDialogProps ) => (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      sx={{
         '& .MuiDialog-paper': {
           margin: { xs: 1, sm: 3 },
           marginBottom: 'auto',
           width: { xs: 'calc(100% - 16px)', sm: 'auto' },
           maxWidth: { xs: '95vw', sm: '600px' },
           maxHeight: '90vh',
           overflowY: 'auto',
         },
         '& .MuiDialogContent-root': {
           marginBottom: 'auto',
         },
    }}
      title={
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          {formStatusLabel && (
            <Box
              sx={{
                bgcolor: '#FEE4E2',
                color: '#B42318',
                fontSize: '0.75rem',
                fontWeight: 500,
                px: 1.5,
                py: 0.5,
                borderRadius: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              {formStatusLabel}
            </Box>
          )}
        </Box>
      }
      showCancel={false}
      showCloseButton
      showDivider
      content={
        <Stack
          spacing={2}
          sx={{
            width: '100%',
            minWidth: { xs: '280px', sm: '400px' },
            maxWidth: { xs: '90vw', sm: '500px' },
          }}
        >
        {content}
        </Stack>
      }
      action={action}
    />
  )

export default BookingFormDialog