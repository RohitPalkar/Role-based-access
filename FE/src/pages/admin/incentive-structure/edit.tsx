import { useAppDispatch } from "src/hooks/use-redux";

import { setTitleAsync } from "src/redux/slices/admin/title-slice";

import IncentiveStructureEditView from "src/sections/admin/incentive-structure/incentive-structure-edit-view"


const IncentiveStructureEdit = () => {
  const dispatch = useAppDispatch();
  
  dispatch(setTitleAsync('Incentive Policies'));
  return (
    <IncentiveStructureEditView />
  )
}

export default IncentiveStructureEdit