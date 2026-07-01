import React from 'react'

import { useAppDispatch } from 'src/hooks/use-redux';

import { setTitleAsync } from 'src/redux/slices/admin/title-slice';

import Incentivedashboard from 'src/sections/rm-panel/incentive-dashboard'




const IncentivedashboardView = () => {
  const dispatch = useAppDispatch();
  
  dispatch(setTitleAsync('Incentive Dashboard'));
  return (
  <Incentivedashboard />
  )
}

export default IncentivedashboardView