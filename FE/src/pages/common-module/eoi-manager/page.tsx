import { useEffect } from 'react';

import { useAppDispatch } from 'src/hooks/use-redux';

import { DashboardContent } from 'src/layouts/dashboard';
import { setTitleAsync } from 'src/redux/slices/admin/title-slice';

import { EOIDashboardView } from 'src/sections/common-module/eoi-manager';



export default function EOIDashboardPage() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(setTitleAsync('CRM Dashboard'));
  }, [dispatch]);

  return (
    <DashboardContent>
    <EOIDashboardView />

    </DashboardContent>
  );
}
