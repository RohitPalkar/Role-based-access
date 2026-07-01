import { useState, useEffect } from 'react';

import { useSearchParams } from 'src/routes/hooks';

import { convertToStringObject } from 'src/utils/helper';
import { stickyBreadcrumbsStyles } from 'src/utils/table-styles';

import uiText from 'src/locales/langs/en/common.json'
import { DashboardContent } from 'src/layouts/dashboard';
import { getIncentiveById } from 'src/services/admin-services/incentive-srvice';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import IncentiveStructureCreateEditForm , { defaultValues } from './components/incentive-structure-edit-create-form';

const IncentiveStructureCreateView = () => {
  const searchParams = useSearchParams();
  const copyId = searchParams.get('copyId');

  const [state, setState] = useState(defaultValues);
  const [mappedProjectList, setMappedProjectList] = useState([]);

  useEffect(() => {
    if (!copyId) return;

    const fetchForCopy = async () => {
      const response = await getIncentiveById(copyId);

      const resObj = {
        ...response,
        name: `${response.name}`, // optional UX
        slabs: response?.incentiveSlabs?.map((slab: any) =>
          convertToStringObject(slab)
        ),
        projects: response?.projects?.map((p: any) => String(p.id)),
        brandId: response?.brands?.map((b: any) => String(b.id)) || [],
        cities: response?.cities?.map((c: any) => String(c.id)),
        regions: response?.regions?.map((r: any) => String(r.id)),
        groupId: String(response?.group?.id),
      };

      setState(resObj);

      setMappedProjectList(
        response?.projects?.map((p: any) => ({
          value: String(p.id),
          label: p.name,
        })) || []
      );
    };

    fetchForCopy();
  }, [copyId]);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={uiText.incentiveStructure.form.create.title}
        sx={stickyBreadcrumbsStyles}
      />

      <IncentiveStructureCreateEditForm
        currentIncentive={state}
        mappedProjectList={mappedProjectList}
        isEdit={false}   // 👈 important
        isCopy={!!copyId}
      />
    </DashboardContent>
  );
};

export default IncentiveStructureCreateView;
