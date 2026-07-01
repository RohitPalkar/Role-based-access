import { useAppDispatch } from "src/hooks/use-redux";

import { setTitleAsync } from "src/redux/slices/admin/title-slice";

import IncentiveStructureCreateView from "src/sections/admin/incentive-structure/incentive-structure-create-view"


const IncentiveStructureCreate = () => {
  const dispatch = useAppDispatch();
  
  dispatch(setTitleAsync('Incentive Policies'));
  return (
    <IncentiveStructureCreateView />
  )
}
export default IncentiveStructureCreate