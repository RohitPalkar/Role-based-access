import React, { useEffect } from 'react';
import { useParams } from 'react-router';

import { Card, Typography } from '@mui/material';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { generateRoleBasedRoute } from 'src/utils/constant';
import {
  stickyBreadcrumbsStyles,
} from 'src/utils/table-styles';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchBatchSlotsCardData } from 'src/redux/actions/common-module/batch-manager-actions';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import BatchPreviewTable from '../batch-preview-table';
import BatchSlotDetailsCards from './batch-slot-details-cards';

const BatchSlotDetailsListView = () => {
  const { userRole, } = useRoleBasedPermissions({
    module: 'batchSlotListing',
  });

  const { batchSlotsCardsData, campaignName, batchName, loading, isUserMapped, batchStatus } = useAppSelector((state: any) => state.batchManager);

  const { id } = useParams();
  const dispatch = useAppDispatch();


  useEffect(() => {
    if (id) {
      dispatch(fetchBatchSlotsCardData({ id }));
    }
  }, [id, dispatch]);

  return (
    <DashboardContent>
      <CustomBreadcrumbs 
        heading={`${campaignName} - ${batchName}`} 
        sx={stickyBreadcrumbsStyles}
        links={[
          {
            name: uiText.batchManager.batchListingHeading,
            href: generateRoleBasedRoute(userRole, 'batch/listing'),
          },
          {
            name: `${campaignName} - ${batchName}`,
            href: '#',
          }
        ]}
      />
      <Card sx={{ pt: 1, px: 2, my: 2 }}>
        <Typography sx={{ fontWeight: 600, fontSize: '16px', mb: 3 }}>{batchName} Summary</Typography>
        <BatchSlotDetailsCards
          cardsData={batchSlotsCardsData}
          loading={loading}
        />
      </Card>

      <BatchPreviewTable
        mode="listing"
        batchName="Batch Listing"
        userRole={userRole}
        editingEnabled={false}
        batchId={id}
        isUserMapped={isUserMapped}
        batchStatus={batchStatus}
       />

    </DashboardContent>
  );
};

export default BatchSlotDetailsListView;