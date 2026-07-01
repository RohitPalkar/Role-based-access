import { useEffect } from 'react';

import { useAppDispatch } from 'src/hooks/use-redux';

import { DashboardContent } from 'src/layouts/dashboard';
import { setTitleAsync } from 'src/redux/slices/admin/title-slice';

import { GREDashboard } from 'src/sections/gre-panel/GREDashboard';

export default function GreDashboardPage() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(setTitleAsync('GRE Dashboard'));
  }, [dispatch]);

  return (
    <DashboardContent>
      <GREDashboard />
    </DashboardContent>
  );
}