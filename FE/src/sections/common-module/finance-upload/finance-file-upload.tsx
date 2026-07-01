import type {
  FinanceTxnFileUploadPayload} from 'src/redux/actions/rm-panel/eoi-finance-actions';

import { toast } from 'sonner';
import React, { useState } from 'react';
import { uuidv4 } from 'minimal-shared/utils';

import { Box, Alert, Button, Typography } from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { useAppDispatch } from 'src/hooks/use-redux';
import { useSampleExcelDownload } from 'src/hooks/use-sample-excel-download';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { interpolate } from 'src/utils/helper';
import { generateRoleBasedRoute } from 'src/utils/constant';
import { stickyBreadcrumbsStyles } from 'src/utils/table-styles';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import CloudDownloadIcon from 'src/assets/icons/cloud-download.png';
import { getPresignedUrl } from 'src/redux/actions/rm-panel/upload-actions';
import {
  downloadSampleFinanceExcel,
  type FinanceBulkJobStatusData,
  financeBulkJobFailureSummaryLines,
} from 'src/services/rm-panel/eoi-finance-service';
import {
  financeTxnProgress,
  uploadFinanceTxnFile,
  saveFinanceTxnDocument,
  pollFinanceBulkJobUntilDone,
  financeTxnUploadProgressClear,
  isFinanceTxnRecoverableHttpReject,
  FINANCE_TXN_S3_PROGRESS_MAX_PERCENT,
} from 'src/redux/actions/rm-panel/eoi-finance-actions';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import FinanceUploadFileSelection from './finance-upload-file-selection';

function extractFinanceBulkJobId(saveResponse: any): string | null {
  const nested = saveResponse?.data ?? saveResponse;
  const raw = nested?.jobId ?? saveResponse?.jobId;
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return null;
  }
  return String(raw);
}

/** Outer API `message` merged into `apiResponseMessage` by `fetchFinanceBulkJobStatus`. */
function getFinanceBulkJobUserFacingMessage(job: FinanceBulkJobStatusData): string {
  const fromApi =
    typeof job.apiResponseMessage === 'string' ? job.apiResponseMessage.trim() : '';
  if (fromApi) {
    return fromApi;
  }
  if (job.message != null && String(job.message).trim() !== '') {
    return String(job.message).trim();
  }
  return '';
}

function financeFlowErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'string') {
    return err;
  }
  if (isFinanceTxnRecoverableHttpReject(err)) {
    return err.message;
  }
  if (err && typeof err === 'object') {
    const o = err as { message?: string; errors?: { message?: string } };
    if (typeof o.message === 'string' && o.message) {
      return o.message;
    }
    if (o.errors?.message) {
      return String(o.errors.message);
    }
  }
  return fallback;
}

const FinanceUpload = () => {
  const route = useRouter();
  const { userRole } = useRoleBasedPermissions({ module: 'eoi' });
  const dispatch = useAppDispatch();
  const expectedColumns = [
    'Payment Reference ID',
    'Voucher ID',
    'Standard ID',
    'Preferential ID',
    'Sr. No',
    'Payment Mode',
    'Payment Date',
    'Transaction ID',
    'Amount',
    'Realization Date',
    'Receipt No',
    'Comments',
    'Status',
  ];
  const {fileUpload} = uiText.financeTxn
  const [uploadSelectedFile, setUploadSelectedFile] = useState();
  const [fileId, setFileId] = useState<string | null>(null);
  const [bulkJobFailureLines, setBulkJobFailureLines] = useState<string[]>([]);
  const { isDownloading, downloadSample } = useSampleExcelDownload({
    fetchSample: downloadSampleFinanceExcel,
    errorMessage: fileUpload.toastMsg.errorSampleDownload,
  });
  const [isUploadInProgress, setIsUploadInProgress] = useState(false);

  const handleSubmit = (file: any) => {
    if (file === '' || file === undefined || file === null) {
      setFileId(null);
      setUploadSelectedFile(undefined);
      setBulkJobFailureLines([]);
      setIsUploadInProgress(false);
      return;
    }
    setBulkJobFailureLines([]);
    const generatedFileId = uuidv4();
    setFileId(generatedFileId);
    setUploadSelectedFile(file);
  };

  const handleUpload = async (selectedFile: any) => {
    if (!fileId) {
      toast.error(fileUpload.toastMsg.errorUploadDoc);
      return;
    }
    if (isUploadInProgress) {
      return;
    }

    setBulkJobFailureLines([]);
    setIsUploadInProgress(true);
    try {
      const fileObjects = {
        folder: `vouchers`,
        key: selectedFile.name.replaceAll(/\s+/g, ''),
      };
      const res = await dispatch(getPresignedUrl(fileObjects)).unwrap();

      if (res?.statusCode === 201) {
        const payload: FinanceTxnFileUploadPayload = {
          key: res?.data?.key,
          presignedUrl: res?.data?.signedUrl,
          file: selectedFile,
          fileId,
          /** First half of the bar = S3; remainder mapped from bulk job API (see pollFinanceBulkJobUntilDone). */
          s3ProgressMaxPercent: FINANCE_TXN_S3_PROGRESS_MAX_PERCENT,
        };

        await dispatch(uploadFinanceTxnFile(payload)).unwrap();

        const savePayload = {
          fileName: selectedFile.name,
          key: payload.key,
        };

        const response = await dispatch(saveFinanceTxnDocument(savePayload)).unwrap();

        const saveOk =
          response?.statusCode === 201 || response?.statusCode === 202;
        if (!saveOk) {
          toast.error(response?.message || fileUpload.toastMsg.errorUploadDoc);
          return;
        }

        const jobId = extractFinanceBulkJobId(response);

        if (jobId) {
          try {
            const jobResult = await dispatch(
              pollFinanceBulkJobUntilDone({
                fileId,
                jobId,
                jobProgressBasePercent: FINANCE_TXN_S3_PROGRESS_MAX_PERCENT,
              })
            ).unwrap();

            const jobState = (jobResult.state || '').toLowerCase();
            if (jobState === 'failed') {
              const failReason =
                jobResult.failedReason != null && String(jobResult.failedReason).trim() !== ''
                  ? String(jobResult.failedReason)
                  : '';
              dispatch(financeTxnUploadProgressClear({ fileId }));
              setIsUploadInProgress(false);
              toast.error(
                failReason ||
                  (jobResult.message as string) ||
                  fileUpload.toastMsg.errorUploadDoc
              );
              return;
            }

            const rv = jobResult.returnvalue as { failureCount?: number } | undefined;
            const failureCount = rv?.failureCount;
            const hasFailureCount = typeof failureCount === 'number';

            let rowFailureLines = financeBulkJobFailureSummaryLines(jobResult);
            if (rowFailureLines.length === 0 && hasFailureCount && failureCount > 0) {
              rowFailureLines = [`${failureCount} row(s) failed to process.`];
            }

            if (hasFailureCount && failureCount > 0) {
              if (rowFailureLines.length === 0) {
                rowFailureLines = [
                  fileUpload.toastMsg.bulkJobNoRowsSucceeded ||
                    'No rows were processed successfully.',
                ];
              }
              dispatch(financeTxnUploadProgressClear({ fileId }));
              setIsUploadInProgress(false);
              setBulkJobFailureLines(rowFailureLines);
              const partialMsg =
                getFinanceBulkJobUserFacingMessage(jobResult) ||
                fileUpload.toastMsg.bulkJobRowFailuresSummary ||
                'Some rows could not be processed. See details below.';
              toast.warning(partialMsg);
              return;
            }

            if (!hasFailureCount && rowFailureLines.length > 0) {
              dispatch(financeTxnUploadProgressClear({ fileId }));
              setIsUploadInProgress(false);
              setBulkJobFailureLines(rowFailureLines);
              const partialMsg =
                getFinanceBulkJobUserFacingMessage(jobResult) ||
                fileUpload.toastMsg.bulkJobRowFailuresSummary ||
                'Some rows could not be processed. See details below.';
              toast.success(partialMsg);
              return;
            }

            const jobSuccessMsg =
              getFinanceBulkJobUserFacingMessage(jobResult) || 'Bulk transaction processing finished.';
            toast.success(jobSuccessMsg);
          } catch (pollError: unknown) {
            const msg = financeFlowErrorMessage(pollError, fileUpload.toastMsg.errorUploadDoc);
            dispatch(financeTxnUploadProgressClear({ fileId }));
            setIsUploadInProgress(false);
            toast.error(msg);
            return;
          }
        } else {
          dispatch(financeTxnProgress({ fileId, progress: 100 }));
          toast.success(
            (response?.message as string) || 'Upload completed.'
          );
        }

        setUploadSelectedFile(undefined);
        route.push(generateRoleBasedRoute(userRole, 'eoi-records'));
      }
    } catch (error: unknown) {
      if (fileId) {
        dispatch(financeTxnUploadProgressClear({ fileId }));
      }
      const msg = financeFlowErrorMessage(error, fileUpload.toastMsg.errorUploadDoc);
      toast.error(msg);
    } finally {
      setIsUploadInProgress(false);
    }
  };
  return (
    <DashboardContent>
      <Box sx={stickyBreadcrumbsStyles}>
        <CustomBreadcrumbs
          heading={fileUpload.heading}
          action={
            <Button
              variant="contained"
              className="primaryBtn"
              onClick={downloadSample}
              disabled={isDownloading}
              startIcon={
                <img src={CloudDownloadIcon} alt="cloud-download" width={24} height={20} />
              }
            >
              {isDownloading ? fileUpload.label.downloading : fileUpload.label.sampleExel}
            </Button>
          }
        />
      </Box>

      <FinanceUploadFileSelection
        expectedColumns={expectedColumns}
        handleUpload={handleSubmit}
        fileId={fileId}
      />

      {uploadSelectedFile && bulkJobFailureLines.length === 0 && (
        <Box sx={{ marginTop: '20px', display: 'flex', justifyContent: 'end' }}>
          <Button
            variant="contained"
            className="primaryBtn"
            onClick={() => handleUpload(uploadSelectedFile)}
            disabled={isUploadInProgress}
            sx={{ height: '50px', width: '150px' }}
          >
            {isUploadInProgress ? fileUpload.label.uploadingSubmit : uiText.button.submit}
          </Button>
        </Box>
      )}
      {bulkJobFailureLines.length > 0 && (
        <Alert
          severity="error"
          sx={{
            mt: 2,
            '& .MuiAlert-message': { flex: 1, minWidth: 0 },
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {fileUpload.toastMsg.bulkJobRowFailuresHeading || 'Row errors'}
          </Typography>
          <Box
            component="ul"
            sx={{
              m: 0,
              pl: 2.5,
              mb: 0,
              maxHeight: 180,
              overflowY: 'auto',
              pr: 0.5,
            }}
          >
            {bulkJobFailureLines.map((line, i) => (
              <li key={i}>
                <Typography variant="body2" component="span">
                  {line}
                </Typography>
              </li>
            ))}
          </Box>
        </Alert>
      )}
      {/* Instructions */}
      <Box sx={{ mb: 2, mt: 2, fontSize: '14px' }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {fileUpload.label.instructions}:
        </Typography>
        <p>
          {interpolate(fileUpload.label.columnInfo, { colLength: String(expectedColumns.length) })}: {expectedColumns.join(', ')}
          .
        </p>
      </Box>
    </DashboardContent>
  );
};

export default FinanceUpload;
