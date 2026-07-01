
import type { Data } from 'src/types/admin/services/incentive-slabs';

import { toast } from 'sonner';
import React, { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import { Stack } from '@mui/material';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { stickyBreadcrumbsStyles } from 'src/utils/table-styles';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchIncentiveSlabs } from 'src/redux/actions/incentive-dashboard/incentive-slab-action';

import { AnimateLogo1 } from 'src/components/animate';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import {
  BoosterSlabTableBody,
  IncentiveStructureHeader,
  BoosterSlabStructureHeader,
  IncentiveStructureTableBody,
} from '../../../../components/table-slabs';

export const defaultIncentiveSlabs = {
  launchStartRange: '',
  launchEndRange: '',
  sustenanceStartRange: '',
  sustenanceEndRange: '',
  launchIncentivePercentage: '',
  sustenanceIncentivePercentage: '',
};

export const defaultValues = {
  slabs: [defaultIncentiveSlabs],
};

const IncentiveSlabsListView = () => {
  const dispatch = useAppDispatch();
  const {
    incentiveSlabs: slabs,
    loading,
    error,
  } = useAppSelector((state) => state.incentiveSlabs) || {};
  const [incentiveSlabs, setIncentiveSlabs] = useState<Data | null>(null);

  useEffect(() => {
    dispatch(fetchIncentiveSlabs());
  }, [dispatch]);
  
  useEffect(() => {
    setIncentiveSlabs(slabs);
  }, [slabs]);

  useEffect(() => {
    if (error && typeof error === 'string') {
      toast.error(error || 'Failed to load incentive slabs');
    }
  }, [error]);

  const policyItems =
    incentiveSlabs?.incentivePolicy?.filter((policyItem: unknown) => policyItem != null) ?? [];
  const boosterItems =
    incentiveSlabs?.boosters?.filter((b: unknown) => b != null) ?? [];
  const hasSlabContent = policyItems?.length > 0 || boosterItems.length > 0;

  return (
    <DashboardContent>
      <CustomBreadcrumbs heading="Incentive Slab" sx={stickyBreadcrumbsStyles} />
      {loading ? (
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            height: '80vh',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AnimateLogo1 />
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ p: 3 }}>
              {!hasSlabContent ? (
                <EmptyContent filled title="No data available" sx={{ py: 8 }} />
              ) : (
                <>
              {/* Incentive Slab Structure (Payable Cases) - same header, new table body */}
              {policyItems?.length > 0 &&
                policyItems?.map((item, index) => {
                  const mappedSlabs = (item?.incentiveSlabs ?? [])
                    .filter((incentiveItem: any) => incentiveItem != null)
                    .map((incentiveItem: any) => ({
                      id: incentiveItem?.id,
                      launchStartRange: incentiveItem?.launchProject?.startRange ?? '',
                      launchEndRange: incentiveItem?.launchProject?.endRange ?? '',
                      launchIncentivePercentage:
                        incentiveItem?.launchProject?.incentivePercentage ?? '',
                      launchMinBookings:
                        incentiveItem?.launchProject?.minimumBookings ?? '',
                      sustenanceStartRange:
                        incentiveItem?.sustenanceProject?.startRange ?? '',
                      sustenanceEndRange:
                        incentiveItem?.sustenanceProject?.endRange ?? '',
                      sustenanceIncentivePercentage:
                        incentiveItem?.sustenanceProject?.incentivePercentage ?? '',
                      sustenanceMinBookings:
                        incentiveItem?.sustenanceProject?.minimumBookings ?? '',
                    }));

                  return (
                    <Box key={`incentive-slab-${item?.id ?? index}`} sx={{ mb: 1 }} className="targetValueContWrapper">
                      <Typography sx={{ fontSize: '20px', fontWeight: 600, mb: 1 }}>
                        {item?.name || 'N/A'}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {uiText?.incentiveStructure?.subHeading} {item?.regions || 'N/A'}
                      </Typography>
                      <Stack spacing={0} className="firstTableScrollBar">
                        <IncentiveStructureHeader />
                        <IncentiveStructureTableBody slabs={mappedSlabs} />
                      </Stack>
                    </Box>
                  );
                })}

              {/* Divider between Incentive Slab and Booster */}
              {policyItems?.length > 0 && boosterItems.length > 0 && (
                  <Divider sx={{ my: 3, borderColor: '#DADADA' }} />
                )}
              {/* Booster - same structure as Incentive Slab */}
              {boosterItems.length > 0 &&
                boosterItems.map((item) => {
                  if (!item) return null;

                  const mappedBoosterSlabs = (item?.boosterSlabs ?? [])
                    .filter((slab: any) => slab != null)
                    .map((slab: any) => ({
                      id: slab?.id,
                      startRange: slab?.startRange ?? '',
                      endRange: slab?.endRange ?? '',
                      rewardType: slab?.rewardType ?? '',
                      rewardValue: slab?.rewardValue ?? '',
                    }));

                  return (
                    <Box key={`incentive-slab-boosters-${item?.id}`} sx={{ my: 3 }} className="targetValueContWrapper">
                      <Typography sx={{ fontSize: '20px', fontWeight: 600, mb: 1 }}>
                        {item?.name || 'Unknown Booster'}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {incentiveSlabs?.brand?.name || 'N/A'}
                      </Typography>
                      <Stack spacing={0} className="firstTableScrollBar">
                        <BoosterSlabStructureHeader />
                        <BoosterSlabTableBody slabs={mappedBoosterSlabs} />
                      </Stack>
                    </Box>
                  );
                })}
                </>
              )}
            </Card>
          </Grid>
        </Grid>
      )}
    </DashboardContent>
  );
};

export default IncentiveSlabsListView;