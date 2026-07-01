import React from 'react'

import { stickyBreadcrumbsStyles } from 'src/utils/table-styles';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard'

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs'

import IncentiveSlabsListView from './components/incentive-slabs-list-view';

const IncentiveSlabsList = () => (
  <DashboardContent>
    <CustomBreadcrumbs
      heading={uiText.incentiveStructure.form.create.editTitle}
  sx={stickyBreadcrumbsStyles}
    />
    <IncentiveSlabsListView />
  </DashboardContent>
)

export default IncentiveSlabsList