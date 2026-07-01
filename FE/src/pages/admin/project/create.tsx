import { useAppDispatch } from 'src/hooks/use-redux';

import { setTitleAsync } from 'src/redux/slices/admin/title-slice';

import ProjectCreateView from 'src/sections/admin/project/project-create-view';

const ProjectCreate = () => {
  const dispatch = useAppDispatch();
  
  dispatch(setTitleAsync('Project'));
  return (<ProjectCreateView />);
}
export default ProjectCreate;
