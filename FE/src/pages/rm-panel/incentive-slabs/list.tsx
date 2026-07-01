import React from 'react'

import { useAppDispatch } from 'src/hooks/use-redux';

import { setTitleAsync } from 'src/redux/slices/admin/title-slice';

import IncentiveSlabsListView from "src/sections/rm-panel/incentive-slabs/components/incentive-slabs-list-view"


const IncentiveSlabs = () => {
  const dispatch = useAppDispatch();
  
  dispatch(setTitleAsync('Incentive Slabs'));
  return (
  <IncentiveSlabsListView />
  )
}
export default IncentiveSlabs