import { useAppDispatch } from 'src/hooks/use-redux';

import { setTitleAsync } from 'src/redux/slices/admin/title-slice';

import EditProject from 'src/sections/admin/project/component/edit-project';

const ProjectList = () => {
  const dispatch = useAppDispatch();
  
  dispatch(setTitleAsync('Project'));
  return (<EditProject />);
}
export default ProjectList;
