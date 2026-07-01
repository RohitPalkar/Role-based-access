import { useAppDispatch } from "src/hooks/use-redux";

import { setTitleAsync } from "src/redux/slices/admin/title-slice";

import BoosterCreateView from "src/sections/admin/booster/booster-create-view";

const BoosterCreate = () =>{
    const dispatch = useAppDispatch();
    
    dispatch(setTitleAsync('Booster'));

    return ( <BoosterCreateView />)
}
export default BoosterCreate;
