import { toast } from 'sonner';
import { useState } from 'react';
import { uuidv4 } from 'minimal-shared/utils';

import { Box, Button, Typography } from '@mui/material';

import { useAppDispatch } from 'src/hooks/use-redux';
import { useSampleExcelDownload } from 'src/hooks/use-sample-excel-download';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { stickyBreadcrumbsStyles } from 'src/utils/table-styles';

import { DashboardContent } from 'src/layouts/dashboard';
import { getPresignedUrl } from 'src/redux/actions/rm-panel/upload-actions';
import { downloadSampleBookingDateExcel } from 'src/services/admin-services/common-services';
import {
  uploadBookingDateFile,
  saveBookingDateDocument,
} from 'src/redux/actions/admin/booking-date-upload-actions';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import CloudDownloadIcon from '../../../assets/icons/cloud-download.png';
import BookingDateFileUploadSection from './components/booking-date-file-upload-section';

interface UploadPayload {
  key: string;
  presignedUrl: string;
  file: File;
  fileId: any;
}

export function BookingDateModificationView() {
  const [uploadSelectedFile, setUploadSelectedFile] = useState();
  const [fileId, setFileId] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const { canCreate, canExport } = useRoleBasedPermissions({ module: 'bookingDateModification' });
  const { isDownloading, downloadSample } = useSampleExcelDownload({
    fetchSample: downloadSampleBookingDateExcel,
    errorMessage: 'Error while downloading sample Excel',
  });

  const handleSubmit = (file: any) => {
    if (file === '' || file === undefined || file === null) {
      setFileId(null);
      setUploadSelectedFile(undefined);
      return;
    }
    const generatedFileId = uuidv4();
    setFileId(generatedFileId);
    setUploadSelectedFile(file);
  };

  const handleUpload = async (selectedFile: any) => {
    try {
      const fileObjects = {
        folder: `booking_override`,
        key: selectedFile.name.replaceAll(/\s+/g, ''),
      };
      const res = await dispatch(getPresignedUrl(fileObjects)).unwrap();

      if (res?.statusCode === 201) {
        const payload: UploadPayload = {
          key: res?.data?.key,
          presignedUrl: res?.data?.signedUrl,
          file: selectedFile,
          fileId,
        };

        await dispatch(uploadBookingDateFile(payload)).unwrap();

        const savePayload = {
          fileName: selectedFile.name,
          key: payload.key,
        };

       const response  =  await dispatch(saveBookingDateDocument(savePayload)).unwrap();
       toast.success(response?.message);
        setUploadSelectedFile(undefined);
      }
    } catch (error) {
      toast.error(
        `${error?.errors?.message ? error?.errors?.message : 'Error while uploading document'}`
      );
    }
  };

  return (
    <DashboardContent>
      <Box
         sx={stickyBreadcrumbsStyles}
      >
        <CustomBreadcrumbs
          heading="Modify Booking Dates"
          action={
            canExport ? (
              <Button
                variant="contained"
                className="primaryBtn"
                onClick={downloadSample}
                disabled={isDownloading}
                startIcon={
                  <img src={CloudDownloadIcon} alt="cloud-download" width={24} height={20} />
                }
              >
                {isDownloading ? 'Downloading...' : 'Sample Excel'}
              </Button>
            ) : undefined
          }
        />
      </Box>
   

      {canCreate && (
        <>
          <BookingDateFileUploadSection handleUpload={handleSubmit} fileId={fileId} />

          {uploadSelectedFile && (
            <Box sx={{ marginTop: '20px', display: 'flex', justifyContent: 'end' }}>
              <Button
                variant="contained"
                className="primaryBtn"
                onClick={() => handleUpload(uploadSelectedFile)}
                sx={{ height: '50px', width: '150px' }}
              >
                Submit
              </Button>
            </Box>
          )}
        </>
      )}
         {/* Instructions */}
      <Box sx={{ mb: 2,mt:2, fontSize: '14px' }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Instructions:
        </Typography>
        <p>
          The Excel template contains five columns: Booking ID, Booking Date from SAP
          and Actual Booking Date and Reason.
        </p>
        <ol style={{ paddingLeft: '1.5rem' }}>
          <li>
            <strong>Booking ID:</strong> Enter the Booking ID as shown in the{' '}
            <strong>‘Booking ID’</strong> field in SAP.
          </li>
          <li>
            <strong>Booking Date from SAP:</strong> Enter the modified date of booking to be updated
            in SAP. This date will be pushed through the API to the incentive dashboard but will not
            be considered for incentive calculation.
          </li>
          <li>
            <strong>Actual Booking Date:</strong> Enter the date on which the actual file login
            occurred. This date will be used to calculate the regularisation timeline and determine
            the incentives.
          </li>
          <li>
            <strong>Reason:</strong> (Optional field) Provide the reason for the change in booking
            date. This field will not be displayed with the bookings but can help track the
            rationale for date changes if needed.
          </li>
        </ol>
      </Box>
    </DashboardContent>
  );
}
