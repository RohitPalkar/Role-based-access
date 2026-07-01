import { useAppDispatch } from 'src/hooks/use-redux';

import { setTitleAsync } from 'src/redux/slices/admin/title-slice';

import EditPhaseForm from 'src/sections/admin/phase/components/phase-edit-form';

const PhaseEdit = () => {
  const dispatch = useAppDispatch();
  
  dispatch(setTitleAsync('Phase'));
  return (<EditPhaseForm />);
}
export default PhaseEdit;
