import { useEffect } from 'react';

import { useAppDispatch } from 'src/hooks/use-redux';

import { DashboardContent } from 'src/layouts/dashboard';
import { setTitleAsync } from 'src/redux/slices/admin/title-slice';

import { AgreementManagementDashboard } from 'src/sections/crm/agreement-management-dashboard';

export default function CrmDashboardPage() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(setTitleAsync('CRM Dashboard'));
  }, [dispatch]);

  return (
    <DashboardContent>
    <AgreementManagementDashboard />

    </DashboardContent>
  );
}
