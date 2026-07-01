import { useAppDispatch } from "src/hooks/use-redux";

import { setTitleAsync } from "src/redux/slices/admin/title-slice";

import EditUserView from "src/sections/admin/user/edit-user";

const EditUser = () =>{
  const dispatch = useAppDispatch();
  
  dispatch(setTitleAsync('Users'));
  return ( <EditUserView />)
}

export default EditUser;
