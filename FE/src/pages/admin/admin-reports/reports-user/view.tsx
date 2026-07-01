import { useAppDispatch } from 'src/hooks/use-redux';

import { setTitleAsync } from 'src/redux/slices/admin/title-slice';

import UserIncentiveDashboardView from 'src/sections/admin/admin-reports/users/components/user-incentive-dashboard-view';

const UserView = () => {
  const dispatch = useAppDispatch();

  dispatch(setTitleAsync('UserBookingsList'));
  return <UserIncentiveDashboardView />;
};
export default UserView;
