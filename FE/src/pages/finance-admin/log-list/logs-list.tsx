import { useAppDispatch } from 'src/hooks/use-redux';

import { setTitleAsync } from 'src/redux/slices/admin/title-slice';

import { LogListTableView } from 'src/sections/finance-admin/logs-list/logs-list-table-view';

function LogsHistory() {
  const dispatch = useAppDispatch();
  
  dispatch(setTitleAsync('Logs History'));
  return <LogListTableView />;
}

export default LogsHistory;
