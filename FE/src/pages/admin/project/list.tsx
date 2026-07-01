import { useAppDispatch } from "src/hooks/use-redux";

import { setTitleAsync } from "src/redux/slices/admin/title-slice";

import { ProjectListView } from "src/sections/admin/project/project-table-view";

const ProjectList = () => {
  const dispatch = useAppDispatch();
  
  dispatch(setTitleAsync('Project'));
  return (<ProjectListView />);
}
export default ProjectList;
