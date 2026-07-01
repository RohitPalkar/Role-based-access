import { useAppDispatch } from "src/hooks/use-redux";

import { setTitleAsync } from "src/redux/slices/admin/title-slice";

import BoosterEditView from "src/sections/admin/booster/booster-edit-view";

const BoosterEdit = () =>{
    const dispatch = useAppDispatch();
    
    dispatch(setTitleAsync('Booster'));
    
    return ( <BoosterEditView />)
}

export default BoosterEdit;
