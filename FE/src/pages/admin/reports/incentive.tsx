import { useAppDispatch } from 'src/hooks/use-redux';

import { setTitleAsync } from 'src/redux/slices/admin/title-slice';

import { IncentiveReportsListView } from 'src/sections/admin/reports/incentive-reports'

const IncentiveReportsList = () => {
  const dispatch = useAppDispatch();
  
  dispatch(setTitleAsync('Incentive Reports'));
  return (
    <IncentiveReportsListView />
  )
}
export default IncentiveReportsList