import type { UnitInvFileUploadPayload} from 'src/redux/actions/rm-panel/unit-inventory-actions';

import { toast } from 'sonner';
import React, { useState } from 'react';
import { uuidv4 } from 'minimal-shared/utils';

import { Box, Button, Typography } from '@mui/material';

import { useParams, useRouter } from 'src/routes/hooks';

import { useAppDispatch } from 'src/hooks/use-redux';
import { useSampleExcelDownload } from 'src/hooks/use-sample-excel-download';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { generateRoleBasedRoute } from 'src/utils/constant';
import { stickyBreadcrumbsStyles } from 'src/utils/table-styles';

import { DashboardContent } from 'src/layouts/dashboard';
import CloudDownloadIcon from 'src/assets/icons/cloud-download.png';
import { getPresignedUrl } from 'src/redux/actions/rm-panel/upload-actions';
import { downloadSampleUnitInventoryExcel } from 'src/services/rm-panel/unit-inventory-service';
import { uploadUnitInventoryFile, saveUnitInventoryDocument } from 'src/redux/actions/rm-panel/unit-inventory-actions';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import UnitInventoryFileSelection from './unit-inventory-file-selection';

const UnitInventoryFileUpload = () => {
  const { id: campaignId } = useParams();
  const route = useRouter();
  const { userRole,} = useRoleBasedPermissions({ module: 'unitInventory' });
  const dispatch = useAppDispatch();
  const expectedColumns = ['Tower Id', 'Unit Id', 'Tower Name', 'Floor', 'Unit Number', 'Series', 'Unit Type', 'Facing', 'Car Park Type', 'No. of Car Parks', 'SBA Sq.ft', 'Carpet Area Sq.ft', 'Agreement Value', 'Status'
  ];

  const [uploadSelectedFile, setUploadSelectedFile] = useState();
  const [fileId, setFileId] = useState<string | null>(null);
  const { isDownloading, downloadSample } = useSampleExcelDownload({
    fetchSample: downloadSampleUnitInventoryExcel,
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
        folder: `inventory_units`,
        key: selectedFile.name.replaceAll(/\s+/g, ''),
      };
      const res = await dispatch(getPresignedUrl(fileObjects)).unwrap();

      if (res?.statusCode === 201) {
        const payload: UnitInvFileUploadPayload = {
          key: res?.data?.key,
          presignedUrl: res?.data?.signedUrl,
          file: selectedFile,
          fileId,
        };

        await dispatch(uploadUnitInventoryFile(payload)).unwrap();

        const savePayload = {
          fileName: selectedFile.name,
          key: payload.key,
          campaignId: Number(campaignId)
        };

        const response = await dispatch(saveUnitInventoryDocument(savePayload)).unwrap();
        toast.success(response?.message);
        setUploadSelectedFile(undefined);
        if (response?.statusCode === 201) {
          route.push(generateRoleBasedRoute(userRole, 'inventory'));
        }
      }
    } catch (error) {
      toast.error(
        `${error?.errors?.message ? error?.errors?.message : 'Error while uploading document'}`
      );
    }
  };
  return (
    <DashboardContent>
      <Box sx={stickyBreadcrumbsStyles}>
        <CustomBreadcrumbs
          heading="Upload Inventory"
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
              {isDownloading ? 'Downloading...' : 'Sample Excel'}
            </Button>
          }
        />
      </Box>

      <UnitInventoryFileSelection
        expectedColumns={expectedColumns}
        handleUpload={handleSubmit}
        fileId={fileId}
      />

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
      {/* Instructions */}
      <Box sx={{ mb: 2, mt: 2, fontSize: '14px' }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Instructions:
        </Typography>
        <p>
          The Excel template contains {expectedColumns.length} columns: {expectedColumns.join(', ')}
          .
        </p>
      </Box>
    </DashboardContent>
  );
};

export default UnitInventoryFileUpload;
