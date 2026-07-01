import { toast } from 'sonner';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { uuidv4 } from 'minimal-shared/utils';

import { Box, Button } from '@mui/material';

import { paths } from 'src/routes/paths';

import { useAppDispatch } from 'src/hooks/use-redux';
import { useSampleExcelDownload } from 'src/hooks/use-sample-excel-download';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  getPresignedUrl,
} from 'src/redux/actions/rm-panel/upload-actions';
import { downloadSampleSalaryExcel } from 'src/services/admin-services/common-services';
import { uploadFile, saveSalaryDocument } from 'src/redux/actions/finance-admin/salary-upload-actions';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import FileUploadSection from './components/file-upload-section';
import CloudDownloadIcon from '../../../assets/icons/cloud-download.png';

interface UploadPayload {
  key: string;
  presignedUrl: string;
  file: File;
  fileId: any
}

export function SalaryView() {
  const [uploadSelectedFile, setUploadSelectedFile] = useState();
  const [fileId, setFileId] = useState<string | null>(null); // State to hold the dynamic fileId

  const dispatch = useAppDispatch();

  const navigate = useNavigate();

  const { isDownloading, downloadSample } = useSampleExcelDownload({
    fetchSample: downloadSampleSalaryExcel,
    errorMessage: 'Error while downloading sample Excel',
    successFallbackMessage: 'Sample salary excel file downloaded successfully',
  });

  const handleSubmit = (file: any) => {
    const generatedFileId = uuidv4(); // Generate a unique ID for the file
    setFileId(generatedFileId);
    setUploadSelectedFile(file);
  };

  const handleUpload = async (selectedFile: any) => {
    try {
      const fileObjects = {
        folder: `salaries`,
        key: selectedFile.name.replaceAll(/\s+/g, ''),
      };
      const res = await dispatch(getPresignedUrl(fileObjects)).unwrap();

      if (res?.statusCode === 201) {
        const payload: UploadPayload = {
          key: res?.data?.key,
          presignedUrl: res?.data?.signedUrl,
          file: selectedFile,
          fileId
        };

        await dispatch(uploadFile(payload)).unwrap();

        const savePayload = {
          fileName: selectedFile.name,
          key: payload.key,
        };

        await dispatch(saveSalaryDocument(savePayload)).unwrap();
        setUploadSelectedFile(undefined);

        setTimeout(() => {
          navigate(paths.financeAdmin.logs.root);
        }, 100);
      }
    } catch (error) {
      console.error('❌ Error during file upload or document save:', error);
      toast.error(
        `${error?.errors?.message?.[0] ? error?.errors?.message?.[0] : 'Error while uploading document'}`
      );
    }
  };

  return (
    <DashboardContent>
            <Box
              sx={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                backgroundColor: 'background.default',
                pb: 2,
                mb: 0.5
              }}
            >
              <CustomBreadcrumbs
                heading="Salary"
                action={
                  <Button
          variant="contained"
          className="primaryBtn"
          onClick={downloadSample}
          disabled={isDownloading}
          startIcon={<img src={CloudDownloadIcon} alt="cloud-upload" width={24} height={20} />}
        >
          {isDownloading ? 'Downloading...' : 'Sample Excel'}
        </Button>
                }
              />
            </Box>
  
      <FileUploadSection handleUpload={handleSubmit} fileId={fileId}/>
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
    </DashboardContent>
  );
}
