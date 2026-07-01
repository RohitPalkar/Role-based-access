import { useAppDispatch } from 'src/hooks/use-redux';

import { setTitleAsync } from 'src/redux/slices/admin/title-slice';

import {BrandListView} from 'src/sections/admin/brand/brand-list-view'

const BrandList = () => {
  const dispatch = useAppDispatch();
  
  dispatch(setTitleAsync('Brand'));
  
  return (  <BrandListView /> )
}
export default BrandList