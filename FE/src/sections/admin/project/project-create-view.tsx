import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import ProjectCreateForm from './component/project-create-form';

const ProjectCreateView = () => (
  <DashboardContent>
    <CustomBreadcrumbs heading={uiText.projectJson.create.title} 
     sx={{ 
                      mb: { xs: 0.5 },
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      backgroundColor: 'background.default',
                      py: 0.25
                    }} />
    <ProjectCreateForm />
  </DashboardContent>
);

export default ProjectCreateView;
