import { useAppDispatch } from 'src/hooks/use-redux';

import { setTitleAsync } from 'src/redux/slices/admin/title-slice';

import {PhaseListView} from 'src/sections/admin/phase/phase-list-view'

const PhaseList = () => {
  const dispatch = useAppDispatch();
  
  dispatch(setTitleAsync('Phase'));
  
  return (  <PhaseListView /> )
}
export default PhaseList