import { useAppDispatch } from "src/hooks/use-redux";

import { setTitleAsync } from "src/redux/slices/admin/title-slice";

import EmployeeListEditView from "src/sections/finance-admin/employee-list/employee-list-edit-view";

function EmployeeListEdit() {
  const dispatch = useAppDispatch();
  
  dispatch(setTitleAsync('Employee List'));
  return <EmployeeListEditView />;
}

export default EmployeeListEdit;
