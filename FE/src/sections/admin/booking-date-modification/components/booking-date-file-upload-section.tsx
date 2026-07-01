import type { SpreadsheetUploadDropzoneMessages } from 'src/components/spreadsheet-upload';

import React, { useCallback } from 'react';

import { useAppSelector } from 'src/hooks/use-redux';

import uiText from 'src/locales/langs/en/common.json';

import { SpreadsheetUploadDropzone } from 'src/components/spreadsheet-upload';

import { validateBookingDateSheet } from './booking-date-sheet-validator';

const BOOKING_DATE_EXPECTED_COLUMNS = [
  'Booking Id',
  'Booking Date From SAP',
  'Actual Booking Date',
  'Reason (Optional)',
] as const;

type Props = Readonly<{
  handleUpload: (file: File | '') => void;
  fileId: string | null;
}>;

export default function BookingDateFileUploadSection({ handleUpload, fileId }: Props) {
  const progress = useAppSelector((state: any) => {
    if (!state.bookingDateUpload || !fileId) {
      return undefined;
    }
    const stored = state.bookingDateUpload.uploads[fileId];
    return typeof stored?.progress === 'number' ? stored.progress : undefined;
  });

  const {toastMsg} = uiText.financeTxn.fileUpload;

  const validateSheet = useCallback(
    (matrix: any[][]) =>
      validateBookingDateSheet(matrix, [...BOOKING_DATE_EXPECTED_COLUMNS], {
        colHeaderMismatch: toastMsg.colHeaderMismatch,
        missingExpectedCol: toastMsg.missingExpectedCol,
        atleastOneDataRow: toastMsg.atleastOneDataRow,
      }),
    [toastMsg.colHeaderMismatch, toastMsg.missingExpectedCol, toastMsg.atleastOneDataRow]
  );

  const messages: SpreadsheetUploadDropzoneMessages = {
    fileSizeExceed: toastMsg.fileSizeExceed,
    invalidFileFormat: toastMsg.invalidFileFormat,
    oneFileAllowed: toastMsg.oneFileAllowed,
    duplicateFile: toastMsg.duplicateFile,
    processingFailed: toastMsg.fileProcessingFailed,
  };

  const labels = uiText.financeTxn.fileUpload.label;

  return (
    <SpreadsheetUploadDropzone
      progress={progress}
      onFileSelected={handleUpload}
      validateSheet={validateSheet}
      messages={messages}
      labels={{
        clickToUpload: labels.clickToUpload,
        maxFileSize: labels.maxFileSize,
        fileUploading: labels.fileUploading,
        reuploadTooltip: labels.reuploadTooltip,
      }}
    />
  );
}
