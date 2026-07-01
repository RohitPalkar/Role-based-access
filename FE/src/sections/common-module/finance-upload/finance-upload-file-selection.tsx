import type { SpreadsheetUploadDropzoneMessages } from 'src/components/spreadsheet-upload';

import React, { useCallback } from 'react';

import { useAppSelector } from 'src/hooks/use-redux';

import uiText from 'src/locales/langs/en/common.json';

import { SpreadsheetUploadDropzone } from 'src/components/spreadsheet-upload';

import { validateFinanceTxnSheet } from './finance-sheet-validator';

type Props = Readonly<{
  handleUpload: (file: File | '') => void;
  fileId: string | null;
  expectedColumns: string[];
}>;

const FinanceUploadFileSelection = ({ handleUpload, fileId, expectedColumns }: Props) => {
  const progress = useAppSelector((state: any) => {
    if (!state.eoiFinance || !fileId) {
      return undefined;
    }
    const stored = state.eoiFinance.financeTxnUploads[fileId];
    return typeof stored?.progress === 'number' ? stored.progress : undefined;
  });
  const { fileUpload } = uiText.financeTxn;

  const validateSheet = useCallback(
    (matrix: any[][]) => validateFinanceTxnSheet(matrix, expectedColumns, fileUpload.toastMsg),
    [expectedColumns, fileUpload.toastMsg]
  );

  const messages: SpreadsheetUploadDropzoneMessages = {
    fileSizeExceed: fileUpload.toastMsg.fileSizeExceed,
    invalidFileFormat: fileUpload.toastMsg.invalidFileFormat,
    oneFileAllowed: fileUpload.toastMsg.oneFileAllowed,
    duplicateFile: fileUpload.toastMsg.duplicateFile,
    processingFailed: fileUpload.toastMsg.fileProcessingFailed,
  };

  return (
    <SpreadsheetUploadDropzone
      progress={progress}
      onFileSelected={handleUpload}
      validateSheet={validateSheet}
      messages={messages}
      labels={{
        clickToUpload: fileUpload.label.clickToUpload,
        maxFileSize: fileUpload.label.maxFileSize,
        fileUploading: fileUpload.label.fileUploading,
        reuploadTooltip: fileUpload.label.reuploadTooltip,
      }}
    />
  );
};

export default FinanceUploadFileSelection;
