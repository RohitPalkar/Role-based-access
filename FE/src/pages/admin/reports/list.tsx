import { useAppDispatch } from 'src/hooks/use-redux';

import { setTitleAsync } from 'src/redux/slices/admin/title-slice';

import { ReportsListView } from 'src/sections/admin/reports'

const ReportsList = () => {
  const dispatch = useAppDispatch();
  
  dispatch(setTitleAsync('Reports'));
  return (
    <ReportsListView />
  )
}
export default ReportsList