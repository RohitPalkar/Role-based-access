import React from 'react';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import ProjectCreateForm from './project-create-form';

/* Edit project Component */
const EditProject: React.FC = () =>
(
  <DashboardContent>
    <CustomBreadcrumbs heading='Edit Project'
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

export default EditProject;
