import type { SpreadsheetUploadDropzoneMessages } from 'src/components/spreadsheet-upload';

import React, { useCallback } from 'react';

import { useAppSelector } from 'src/hooks/use-redux';

import uiText from 'src/locales/langs/en/common.json';

import { SpreadsheetUploadDropzone } from 'src/components/spreadsheet-upload';

import { validateUnitInventorySheet } from './unit-inventory-sheet-validator';

type Props = Readonly<{
  handleUpload: (file: File | '') => void;
  fileId: string | null;
  expectedColumns: string[];
}>;

const UnitInventoryFileSelection = ({ handleUpload, fileId, expectedColumns }: Props) => {
  const progress = useAppSelector((state: any) => {
    if (!state.unitInventory || !fileId) {
      return undefined;
    }
    const stored = state.unitInventory.unitInventoryuploads[fileId];
    return typeof stored?.progress === 'number' ? stored.progress : undefined;
  });

  const {toastMsg} = uiText.financeTxn.fileUpload;

  const validateSheet = useCallback(
    (matrix: any[][]) =>
      validateUnitInventorySheet(matrix, expectedColumns, {
        colHeaderMismatch: toastMsg.colHeaderMismatch,
        missingExpectedCol: toastMsg.missingExpectedCol,
        atleastOneDataRow: toastMsg.atleastOneDataRow,
        valCanNotBeEmpty: toastMsg.valCanNotBeEmpty,
      }),
    [
      expectedColumns,
      toastMsg.colHeaderMismatch,
      toastMsg.missingExpectedCol,
      toastMsg.atleastOneDataRow,
      toastMsg.valCanNotBeEmpty,
    ]
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
};

export default UnitInventoryFileSelection;
