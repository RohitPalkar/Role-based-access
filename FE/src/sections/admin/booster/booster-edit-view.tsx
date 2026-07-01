import { useState, useEffect } from 'react';

import { useParams } from 'src/routes/hooks';

import { filterKeys } from 'src/utils/helper';
import { stickyBreadcrumbsStyles } from 'src/utils/table-styles';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import { getBoosterById } from 'src/services/admin-services/booster-srvice';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import BoosterStructureEditCreateForm, {
  defaultValues,
} from './components/booster-edit-create-form';

const BoosterEditView = () => {
  const params = useParams();
  const [state, setState] = useState(defaultValues);

  const fetchBoosters = async () => {
    try {
      const response = await getBoosterById(params.id as string);

      let brandIdValue;
      if (response?.brand && Array.isArray(response?.brand)) {
        brandIdValue = response?.brand?.map((brand: any) => String(brand.id));
      } else if (response?.brandIds && Array.isArray(response?.brandIds)) {
        brandIdValue = response?.brandIds?.map((id: number) => String(id));
      } else if (response?.brand?.id) {
        brandIdValue = String(response?.brand.id);
      } else {
        brandIdValue = [];
      }

      let groupIdValue = '';
      if (response?.group?.id) {
        groupIdValue = String(response?.group?.id);
      } else if (response?.groupId) {
        groupIdValue = String(response?.groupId);
      }
      const resObj = {
        ...response,
        groupId: groupIdValue,
        projects: response?.projects.map((project: any) => project?.id?.toString()),
        brandId: brandIdValue,
        cityIds: response?.city.map((city: any) => city?.id?.toString()),
      };

      setState(
        filterKeys(
          resObj,
          'name',
          'groupId',
          'cityIds',
          'brandId',
          'startDate',
          'endDate',
          'projects',
          'boosterSlabs'
        )
      );
    } catch (error) {
      console.error('Error fetching booster data:', error);
    }
  };

  useEffect(() => {
    fetchBoosters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={uiText.boosterStructure.form.create.editTitle}
          sx={stickyBreadcrumbsStyles}
      />
      <BoosterStructureEditCreateForm isEdit id={params?.id} currentBooster={state} />
    </DashboardContent>
  );
};

export default BoosterEditView;
