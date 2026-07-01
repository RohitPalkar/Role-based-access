import { useAppDispatch } from 'src/hooks/use-redux';

import { setTitleAsync } from 'src/redux/slices/admin/title-slice';

import { EmployeeListTableView } from 'src/sections/finance-admin/employee-list/employee-list-table-view';

function EmployeeList() {
  const dispatch = useAppDispatch();
  
  dispatch(setTitleAsync('Employee List'));
  return <EmployeeListTableView />;
}

export default EmployeeList;
