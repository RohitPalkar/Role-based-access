import { useAppDispatch } from 'src/hooks/use-redux';

import { setTitleAsync } from 'src/redux/slices/admin/title-slice';

import { BoosterListView } from 'src/sections/admin/booster'

const BoosterList = () => {
  const dispatch = useAppDispatch();
  
  dispatch(setTitleAsync('Booster'));

  return (<BoosterListView />)
}
  

export default BoosterList