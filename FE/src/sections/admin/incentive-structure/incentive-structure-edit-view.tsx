
import { useState, useEffect } from 'react'

import { useParams } from 'src/routes/hooks'

import { stickyBreadcrumbsStyles } from 'src/utils/table-styles'
import { deepCopy, convertToStringObject } from 'src/utils/helper'

import uiText from 'src/locales/langs/en/common.json'
import { DashboardContent } from "src/layouts/dashboard"
import { getIncentiveById } from 'src/services/admin-services/incentive-srvice'

import { CustomBreadcrumbs } from "src/components/custom-breadcrumbs"

import IncentiveStructureCreateEditForm, { defaultValues } from './components/incentive-structure-edit-create-form'


const IncentiveStructureEditView = () => {

    const params = useParams()
    const [state, setState] = useState(defaultValues)
    const [mappedProjectList, setMappedProjectList] = useState([])


    const fetchIncentives = async () => {
        try {
            const response = await getIncentiveById(params.id as string)
            let brandIdValue;
            if (response?.brands && Array.isArray(response?.brands)) {
                brandIdValue = response?.brands?.map((brand: any) => String(brand.id));
            } else if (response?.brandIds && Array.isArray(response?.brandIds)) {
                brandIdValue = response?.brandIds?.map((id: number) => String(id));
            } else if (response?.brand?.id) {
                brandIdValue = String(response?.brand.id);
            } else {
                brandIdValue = [];
            }

            let groupIdValue = '';
            if (response?.group?.id) {
                groupIdValue = String(response?.group.id);
            } else if (response?.groupId) {
                groupIdValue = String(response?.groupId);
            }
            const resObj = {
              ...response,
              slabs: response?.incentiveSlabs.map((slab: any) => convertToStringObject(slab)) || [],
              projects: response?.projects.map((project: any) => String(project.id)) || [],
              brandId: brandIdValue,
              cities: response?.cities?.map((city: any) => String(city.id)),
              regions: response?.regions?.map((region: any) => String(region.id)) || [],
              maxPayableIncentive: response?.maxPayableIncentive
                ? String(response?.maxPayableIncentive)
                : '',
              groupId: groupIdValue,
            };


            setState({ ...resObj })
            if (response?.projects && Array.isArray(response?.projects)) {
                setMappedProjectList(deepCopy(response?.projects).map((project: any) => ({
                    value: String(project.id),
                    label: project.name
                })));
            }
        } catch (error) {
            console.log(error);

        }
    }

    useEffect(() => {
        fetchIncentives()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])


    return (
        <DashboardContent>
            <CustomBreadcrumbs
                heading={uiText.incentiveStructure.form.create.editTitle}
                 sx={stickyBreadcrumbsStyles}
            />
            {/* @ts-ignore */}
            <IncentiveStructureCreateEditForm mappedProjectList={mappedProjectList} isEdit id={params.id} currentIncentive={state} />
        </DashboardContent>
    )
}


export default IncentiveStructureEditView