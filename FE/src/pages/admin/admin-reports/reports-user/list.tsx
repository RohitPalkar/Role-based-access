import { useAppDispatch } from 'src/hooks/use-redux';

import { setTitleAsync } from 'src/redux/slices/admin/title-slice';

import { ReportsUserListView } from 'src/sections/admin/admin-reports/users';

const UserList = () => {
  const dispatch = useAppDispatch();

  dispatch(setTitleAsync('ReportsUser'));
  return <ReportsUserListView />;
};
export default UserList;
