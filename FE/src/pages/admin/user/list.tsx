import { useAppDispatch } from 'src/hooks/use-redux';

import { setTitleAsync } from 'src/redux/slices/admin/title-slice';

import { UserListView } from 'src/sections/admin/user';

const UserList = () => {
  const dispatch = useAppDispatch();
  
  dispatch(setTitleAsync('Users'));
  return (
  <UserListView />
) ;
}
export default UserList;
