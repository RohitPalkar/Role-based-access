import { useAppDispatch } from "src/hooks/use-redux";

import { setTitleAsync } from "src/redux/slices/admin/title-slice";

import { IncentiveStructureListView } from "src/sections/admin/incentive-structure"


const IncentiveStructure = () => {
  const dispatch = useAppDispatch();
  
  dispatch(setTitleAsync('Incentive Policies'));
  return (
    <IncentiveStructureListView />
  )
}
export default IncentiveStructure