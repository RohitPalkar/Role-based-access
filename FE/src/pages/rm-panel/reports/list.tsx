import { useAppDispatch } from 'src/hooks/use-redux';

import { setTitleAsync } from 'src/redux/slices/admin/title-slice';

import { RmReportsListView } from 'src/sections/rm-panel/reports';

const RmReportsList = () => {
  const dispatch = useAppDispatch();
  
  dispatch(setTitleAsync('Reports'));
  return (
    <RmReportsListView />
  );
};

export default RmReportsList;