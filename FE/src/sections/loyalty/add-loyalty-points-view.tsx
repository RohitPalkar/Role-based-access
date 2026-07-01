import React, { useState, useCallback } from 'react';

import { Box, Grid, Stack, Button } from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { generateRoleBasedRoute } from 'src/utils/constant';
import { stickyBreadcrumbsStyles } from 'src/utils/table-styles'

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard'

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs'

import StatusAlert from './components/status-alert';
import PaymentDetailsCard from '../common-module/internal-office-memo/components/payment-details-card';
import ReferrerDetailsCard from '../common-module/internal-office-memo/components/referrer-details-card';
import EditProfileDialog from '../common-module/internal-office-memo/components/dialog-boxes/edit-profile-dialog';
import CreateProfileDialog from '../common-module/internal-office-memo/components/dialog-boxes/create-profile-dialog';
import {
  PointsClassificationDialog,
  type PointsClassificationFormValues,
} from './components/points-classification-dialog';

const { addLoyaltyPoints } = uiText.internalOfficeMemo;

type ProfileDialogType =
  | 'create-referrer'
  | 'create-referee'
  | 'edit-referrer'
  | 'edit-referee'
  | null;

const AddLoyaltyPointsView = () => {
  const { userRole } = useRoleBasedPermissions({ module: 'iomManagement' });
  const router = useRouter();
  const [isClassificationDialogOpen, setIsClassificationDialogOpen] = useState(false);
  const [profileDialog, setProfileDialog] = useState<ProfileDialogType>(null);

  const handleOpenClassificationDialog = useCallback(() => {
    setIsClassificationDialogOpen(true);
  }, []);

  const handleCloseClassificationDialog = useCallback(() => {
    setIsClassificationDialogOpen(false);
  }, []);

  const handleClassificationSubmit = useCallback((_values: PointsClassificationFormValues) => {
    setIsClassificationDialogOpen(false);
  }, []);

  // const handleOpenCreateReferrer = useCallback(() => {
  //   setProfileDialog('create-referrer');
  // }, []);

  const handleOpenCreateReferee = useCallback(() => {
    setProfileDialog('create-referee');
  }, []);

  const handleOpenEditReferrer = useCallback(() => {
    setProfileDialog('edit-referrer');
  }, []);

  // const handleOpenEditReferee = useCallback(() => {
  //   setProfileDialog('edit-referee');
  // }, []);

  const handleCloseProfileDialog = useCallback(() => {
    setProfileDialog(null);
  }, []);

  const handleCreateProfile = useCallback(() => {
    setProfileDialog(null);
  }, []);

  const handleEditProfile = useCallback(() => {
    setProfileDialog(null);
  }, []);

  return (
    <DashboardContent>
      <Box sx={{ ...stickyBreadcrumbsStyles, mb: 2 }}>
        <CustomBreadcrumbs
          heading={addLoyaltyPoints.title}
          links={[
            {
              name: uiText.internalOfficeMemo.title,
              href: generateRoleBasedRoute(userRole, 'iom-management'),
            },
            {
              name: addLoyaltyPoints.title,
              href: '#',
            }
          ]}
        />
      </Box>
      <Stack spacing={2}>
        <PaymentDetailsCard
          showTitle={false}
          basicSalePrice="1,20,00,000"
          brokeragePercent="2.00"
          brokerageAmount="2,40,000"
          pointsAdjustmentType="1:1"
          pointsToReferrer="1%"
          pointsReferrerAmount="1,20,000"
          pointsToReferee="1"
          pointsRefereeAmount="1%"
        />
        <StatusAlert
          type="success"
          message={addLoyaltyPoints.statusAlert.verified}
          pineLabsId="PL123456789"
        />
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <ReferrerDetailsCard
              data={{
                customerName: 'Ganesh G',
                mobileNo: '4568754345',
                project: 'Project A',
                unitNo: 'A-169',
                pinelabsId: '12345678',
              }}
              showEdit
              onEdit={handleOpenEditReferrer}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <ReferrerDetailsCard
              data={{
                customerName: 'Amit K',
                mobileNo: '2001289456',
                project: 'Project B',
                unitNo: 'A-1204',
              }}
              showCreate
              onCreate={handleOpenCreateReferee}
            />
          </Grid>
        </Grid>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            size="large"
            variant="outlined"
            sx={{ width: { xs: '100%', md: '150px' } }}
            onClick={() => router.push(generateRoleBasedRoute(userRole, 'iom-management'))}
          >
            {uiText.button.cancel}
          </Button>
          <Button
            size="large"
            variant="contained"
            className="primaryBtn"
            sx={{ width: { xs: '100%', md: '150px' } }}
            onClick={handleOpenClassificationDialog}
          >
            {addLoyaltyPoints.updatePoints}
          </Button>
        </Box>
      </Stack>

      <PointsClassificationDialog
        open={isClassificationDialogOpen}
        onClose={handleCloseClassificationDialog}
        onSubmit={handleClassificationSubmit}
        eligiblePoolAmount="30000"
        redeemablePoolAmount="50000"
      />
      <CreateProfileDialog
        open={
          profileDialog === 'create-referrer' ||
          profileDialog === 'create-referee'
        }
        onClose={handleCloseProfileDialog}
        onSubmit={handleCreateProfile}
        type={profileDialog === 'create-referrer' ? 'referrer' : 'referee'}
      />

      <EditProfileDialog
        open={
          profileDialog === 'edit-referrer' ||
          profileDialog === 'edit-referee'
        }
        onClose={handleCloseProfileDialog}
        onSubmit={handleEditProfile}
        type={profileDialog === 'edit-referrer' ? 'referrer' : 'referee'}
      />
    </DashboardContent>
  );
};

export default AddLoyaltyPointsView