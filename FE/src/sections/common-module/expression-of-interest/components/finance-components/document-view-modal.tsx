import React from 'react';

import CloseIcon from '@mui/icons-material/Close';
import { Box, Dialog, IconButton, Typography } from '@mui/material';

interface DocumentViewModalProps {
  open: boolean;
  fileURL: string | null;
  documentName: string;
  onClose: () => void;
  title?:string
}

const DocumentViewModal: React.FC<DocumentViewModalProps> = ({
  open,
  fileURL,
  documentName,
  onClose,
  title
}) => {

  if (!fileURL) {
    return null;
  }

  const lowerUrl = fileURL.toLowerCase();
  const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].some((ext) =>
    lowerUrl.endsWith(ext)
  );
  const isPDF = lowerUrl.endsWith('.pdf');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiPaper-root': {
          borderRadius: '8px',
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)',
        },
      }}
    >
      <Box sx={{ p: 2, position: 'relative' }}>
        {/* Close Icon */}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[600],
          }}
        >
          <CloseIcon />
        </IconButton>

        {/* Title */}
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            pr: 4,
            fontWeight: 600,
            color: '#1C252E',
            mb: 1,
          }}
        >
         {title || 'Preview'}
        </Typography>

        {/* File Preview */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            mt: 2,
            mb: 2,
            maxHeight: '80vh',
            overflow: 'auto',
            background: '#F9FAFB',
            borderRadius: '8px',
            p: 2,
          }}
        >
          {isImage && (
            <img
              src={fileURL}
              alt={documentName}
              style={{
                maxWidth: '100%',
                height: 'auto',
                borderRadius: 6,
                objectFit: 'contain',
              }}
            />
          )}

          {isPDF && (
            <iframe
              src={fileURL}
              title={documentName}
              style={{
                width: '100%',
                height: '80vh',
                border: 'none',
                borderRadius: '6px',
              }}
            />
          )}

          {!isImage && !isPDF && (
            <Typography variant="body2" color="text.secondary">
              Unsupported file format — please upload an image or PDF.
            </Typography>
          )}
        </Box>
      </Box>
    </Dialog>
  );
};

export default DocumentViewModal;
