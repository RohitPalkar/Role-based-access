import { useEffect } from 'react';

import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { useAppDispatch } from 'src/hooks/use-redux';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import { setTitleAsync } from 'src/redux/slices/admin/title-slice';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

export default function BatchTrackerView() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(setTitleAsync(uiText.batchManager.batchTrackerHeading));
  }, [dispatch]);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={uiText.batchManager.batchTrackerHeading}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <Card>
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            {uiText.batchManager.batchTrackerPlaceholder}
          </Typography>
        </CardContent>
      </Card>
    </DashboardContent>
  );
}
