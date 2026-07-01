import type { Accept } from 'react-dropzone';

import { useDropzone } from 'react-dropzone';
import React, { useState, useCallback } from 'react';

import { alpha, styled } from '@mui/material/styles';
import LinearProgressBase, { linearProgressClasses } from '@mui/material/LinearProgress';
import {
  Box,
  Card,
  Grid,
  Alert,
  Stack,
  Tooltip,
  Typography,
  CircularProgress,
} from '@mui/material';

import { parseXlsxFirstSheetToMatrix } from 'src/utils/parse-xlsx-sheet';

import CloudUploadIcon from 'src/assets/icons/cloud-upload.png';

import { Iconify } from 'src/components/iconify';

const EXCEL_FILE_ICON = 'vscode-icons:file-type-excel';

const BorderLinearProgress = styled(LinearProgressBase)(({ theme }) => ({
  height: 10,
  borderRadius: 5,
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor: theme.palette.grey[200],
    ...theme.applyStyles('dark', {
      backgroundColor: theme.palette.grey[800],
    }),
  },
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: 5,
    backgroundColor: '#1A407D',
    ...theme.applyStyles('dark', {
      backgroundColor: '#308fe8',
    }),
  },
}));

const DEFAULT_XLSX_ACCEPT: Accept = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [],
} as unknown as Accept;

export type SpreadsheetUploadDropzoneMessages = {
  fileSizeExceed: string;
  invalidFileFormat: string;
  oneFileAllowed: string;
  duplicateFile: string;
  /** Shown when XLSX read/parse throws or returns unusable data */
  processingFailed: string;
};

export type SpreadsheetUploadDropzoneLabels = {
  clickToUpload: string;
  maxFileSize: string;
  /** Shown in the upload progress card while sending the file */
  fileUploading: string;
  /** While parsing / validating the sheet after drop (before submit) */
  verifyingFile?: string;
  /** Tooltip on the clear / pick-another-file control */
  reuploadTooltip?: string;
};

export type SpreadsheetUploadDropzoneProps = Readonly<{
  /** `undefined` = not tracking yet (pre-submit). `0`–`100` = S3 or job % from API (0 still shows bar, blank % label). */
  progress: number | undefined;
  onFileSelected: (file: File | '') => void;
  /** Return `null` if the sheet is valid; otherwise an error message for the user */
  validateSheet: (matrix: any[][]) => string | null;
  messages: SpreadsheetUploadDropzoneMessages;
  labels: SpreadsheetUploadDropzoneLabels;
  maxFileBytes?: number;
  accept?: Accept;
  /** When set, shows a success alert after upload reaches 100% (dismiss clears selection like other alerts). */
  uploadSuccessMessage?: string;
}>;

export function SpreadsheetUploadDropzone({
  progress,
  onFileSelected,
  validateSheet,
  messages,
  labels,
  maxFileBytes = 10 * 1024 * 1024,
  accept = DEFAULT_XLSX_ACCEPT,
  uploadSuccessMessage,
}: SpreadsheetUploadDropzoneProps) {
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastUploadedFile, setLastUploadedFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const verifyingLabel = labels.verifyingFile ?? 'Verifying spreadsheet…';
  const reuploadTooltip = labels.reuploadTooltip ?? 'Reupload';

  const runValidation = useCallback(
    async (file: File) => {
      setIsValidating(true);
      setError(null);
      setFileName(file.name);
      try {
        const jsonData = await parseXlsxFirstSheetToMatrix(file);
        const validationError = validateSheet(jsonData);
        if (validationError) {
          setError(validationError);
          setFileName('');
          return;
        }
        setLastUploadedFile(file);
        onFileSelected(file);
      } catch {
        setError(messages.processingFailed);
        setFileName('');
      } finally {
        setIsValidating(false);
      }
    },
    [messages.processingFailed, onFileSelected, validateSheet]
  );

  const { getRootProps, getInputProps } = useDropzone({
    accept,
    maxFiles: 1,
    maxSize: maxFileBytes,
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        let tooManyFiles = false;

        rejectedFiles.forEach((file) => {
          const tooMany = file.errors.some((err) => err.code === 'too-many-files');
          const fileTooLarge = file.errors.some((err) => err.code === 'file-too-large');
          const invalidType = file.errors.some((err) => err.code === 'file-invalid-type');

          if (tooMany) {
            tooManyFiles = true;
          } else if (fileTooLarge) {
            setError(messages.fileSizeExceed);
          } else if (invalidType) {
            setError(messages.invalidFileFormat);
          }
        });

        if (tooManyFiles) {
          setError(messages.oneFileAllowed);
        }
      } else {
        setError(null);
        const file = acceptedFiles[0];
        if (!file) return;

        if (lastUploadedFile?.name === file.name && lastUploadedFile?.size === file.size) {
          setError(messages.duplicateFile);
          return;
        }

        runValidation(file).catch(() => {});
      }
    },
  });

  const handleReset = () => {
    setFileName('');
    onFileSelected('');
    setError(null);
    setLastUploadedFile(null);
    setIsValidating(false);
  };

  const handleDrop = (files: FileList | null) => {
    const file = files?.[0];
    if (file) {
      setFileName(file.name);
    }
  };

  const progressValue = typeof progress === 'number' ? progress : 0;
  const isTrackingProgress = typeof progress === 'number';
  /** Includes job/S3 at 0% from API (bar visible, % label blank). */
  const isActiveUpload = isTrackingProgress && progressValue < 100;
  const isUploadComplete = isTrackingProgress && progressValue >= 100;

  return (
    <section>
      {uploadSuccessMessage && isUploadComplete && (
        <Box
          sx={{
            marginBottom: '20px',
            position: 'absolute',
            top: '10px',
            right: '24px',
            zIndex: '1111',
          }}
        >
          <Alert severity="success">
            <Box sx={{ display: 'flex' }}>
              {uploadSuccessMessage}
              <Iconify
                icon="eva:close-fill"
                sx={{ cursor: 'pointer' }}
                width={24}
                onClick={handleReset}
              />
            </Box>
          </Alert>
        </Box>
      )}

      {error && (
        <Box
          sx={{
            marginBottom: '20px',
            position: 'absolute',
            top: '10px',
            right: '24px',
            zIndex: '1111',
          }}
        >
          <Alert severity="error">
            <Box sx={{ display: 'flex' }}>
              {error}
              <Iconify
                icon="eva:close-fill"
                sx={{ cursor: 'pointer' }}
                width={24}
                onClick={handleReset}
              />
            </Box>
          </Alert>
        </Box>
      )}

      <Box
        {...getRootProps()}
        sx={(theme) => ({
          position: 'relative',
          width: '100%',
          height: '200px',
          padding: 3,
          border: '1px solid',
          borderColor: isValidating ? 'warning.main' : '#1A407D4D',
          borderRadius: 2,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          cursor: isValidating || fileName.length > 0 ? 'default' : 'pointer',
          transition: 'background-color 0.3s ease, border-color 0.3s ease, opacity 0.2s ease',
          overflow: 'hidden',
          pointerEvents: isValidating || fileName.length > 0 ? 'none' : 'auto',
          bgcolor: isValidating ? alpha(theme.palette.warning.main, 0.12) : 'grey.50',
          ...(!isValidating &&
            !fileName.length && {
              '&:hover': {
                backgroundColor: '#e3f2fd',
              },
            }),
        })}
      >
        <input
          {...getInputProps()}
          onDrop={(e) => handleDrop(e.dataTransfer.files)}
          disabled={fileName.length > 0}
        />

        <Box
          sx={{
            width: '95%',
            height: '130px',
            padding: 3,
            border: '2px dashed',
            borderColor: isValidating ? 'warning.main' : '#D0D5DD',
            borderRadius: 2,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            cursor: 'inherit',
            transition: 'border-color 0.3s ease, background-color 0.3s ease',
            bgcolor: 'transparent',
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                }}
              >
                <img src={CloudUploadIcon} alt="cloud-upload" width={24} height={24} />
                <Iconify icon={EXCEL_FILE_ICON} width={26} sx={{ flexShrink: 0 }} />
              </Box>
            </Grid>
            <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
              <Box>
                <Typography variant="body1">{labels.clickToUpload}</Typography>
                <Typography variant="body2">{labels.maxFileSize}</Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {fileName && isTrackingProgress && (
        <Card
          variant="outlined"
          sx={{
            mt: 2,
            px: 2,
            py: 1.5,
            borderColor: isActiveUpload ? 'primary.light' : 'divider',
            boxShadow: isActiveUpload ? 2 : 0,
          }}
        >
          <Stack spacing={1.5}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Iconify icon={EXCEL_FILE_ICON} width={28} sx={{ flexShrink: 0 }} />
              <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <Typography variant="subtitle2" noWrap title={fileName}>
                  {fileName}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mt: 0.25,
                    color: isActiveUpload ? 'text.secondary' : 'success.main',
                    fontWeight: isActiveUpload ? 400 : 600,
                  }}
                >
                  {isActiveUpload ? labels.fileUploading : 'Upload complete'}
                </Typography>
              </Box>
              <Box
                sx={{
                  flexShrink: 0,
                  minWidth: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {progressValue === 0 ? (
                  <Box sx={{ width: 40, minHeight: 24 }} aria-hidden />
                ) : (
                  <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                    {`${Math.round(progressValue)}%`}
                  </Typography>
                )}
              </Box>
            </Box>
            <BorderLinearProgress
              variant="determinate"
              value={Math.min(100, Math.max(0, progressValue))}
              sx={{
                height: 10,
                borderRadius: 1,
              }}
            />
            {isUploadComplete && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Tooltip title={reuploadTooltip} arrow placement="top">
                  <span>
                    <Iconify
                      icon="eva:close-fill"
                      aria-label={reuploadTooltip}
                      sx={{ cursor: 'pointer', color: 'text.secondary' }}
                      width={22}
                      onClick={handleReset}
                    />
                  </span>
                </Tooltip>
              </Box>
            )}
          </Stack>
        </Card>
      )}
      {fileName && !isTrackingProgress && (
        <Card sx={{ marginTop: '20px', py: 1.5, px: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Iconify icon={EXCEL_FILE_ICON} width={28} sx={{ flexShrink: 0 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap title={fileName}>
                {fileName}
              </Typography>
              {isValidating && (
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mt: 0.25,
                    color: 'warning.dark',
                    fontWeight: 600,
                  }}
                >
                  {verifyingLabel}
                </Typography>
              )}
            </Box>
            <Box
              sx={{
                flexShrink: 0,
                width: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isValidating ? (
                <CircularProgress size={26} thickness={4} sx={{ color: 'warning.main' }} />
              ) : (
                <Tooltip title={reuploadTooltip} arrow placement="top">
                  <span>
                    <Iconify
                      icon="eva:close-fill"
                      aria-label={reuploadTooltip}
                      sx={{ cursor: 'pointer', color: 'text.secondary' }}
                      width={24}
                      onClick={handleReset}
                    />
                  </span>
                </Tooltip>
              )}
            </Box>
          </Box>
        </Card>
      )}
    </section>
  );
}
