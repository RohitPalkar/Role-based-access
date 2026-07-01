import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import BoosterStructureEditCreateForm from './components/booster-edit-create-form';

const BoosterCreateView = () => (
  <DashboardContent>
    <CustomBreadcrumbs
      heading={uiText.boosterStructure.form.create.title}
      sx={{ 
                      mb: { xs: 0.5 },
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      backgroundColor: 'background.default',
                      py: 0.25
                    }} 
    />
    
    <BoosterStructureEditCreateForm />
  </DashboardContent>
);

export default BoosterCreateView;
