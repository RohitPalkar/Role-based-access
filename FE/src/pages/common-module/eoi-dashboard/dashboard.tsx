import { useAppDispatch } from 'src/hooks/use-redux';

import { setTitleAsync } from 'src/redux/slices/admin/title-slice';

import { EOIDashboard } from 'src/sections/common-module/eoi-dashboard/eoi-dashboard';

const Dashboard = () => {
   const dispatch = useAppDispatch();
    
    dispatch(setTitleAsync('EOI Dashboard'));
    
    return (  <EOIDashboard /> )
}

export default Dashboard;
