import type { SpreadsheetUploadDropzoneMessages } from 'src/components/spreadsheet-upload';

import { useCallback } from 'react';

import { useAppSelector } from 'src/hooks/use-redux';

import { SpreadsheetUploadDropzone } from 'src/components/spreadsheet-upload';

import { validateSalarySheet } from './salary-sheet-validator';

const MESSAGES: SpreadsheetUploadDropzoneMessages = {
  fileSizeExceed: 'File size exceeds 10MB. Please upload a smaller file.',
  invalidFileFormat: 'Invalid file format. Please upload only .xlsx',
  oneFileAllowed: 'Only 1 .xlsx file at a time is allowed.',
  duplicateFile: 'This file has already been uploaded. Please choose a different file.',
  processingFailed: 'File processing failed. Please check the file and try again.',
};

const LABELS = {
  clickToUpload: 'Click to upload or drag and drop',
  maxFileSize: '.xlsx(File size: Maximum 10 MB)',
  fileUploading: 'Your File is uploading...',
  reuploadTooltip: 'Reupload',
};

type Props = Readonly<{
  handleUpload: (file: File | '') => void;
  fileId: string | null;
}>;

export default function FileUploadSection({ handleUpload, fileId }: Props) {
  const progress = useAppSelector((state: any) => {
    if (!state.salaryUpload || !fileId) {
      return undefined;
    }
    const stored = state.salaryUpload.uploads[fileId];
    return typeof stored?.progress === 'number' ? stored.progress : undefined;
  });

  const validateSheet = useCallback((matrix: any[][]) => validateSalarySheet(matrix), []);

  return (
    <SpreadsheetUploadDropzone
      progress={progress}
      onFileSelected={handleUpload}
      validateSheet={validateSheet}
      messages={MESSAGES}
      labels={LABELS}
      uploadSuccessMessage="Your File is successfully Uploaded!"
    />
  );
}
