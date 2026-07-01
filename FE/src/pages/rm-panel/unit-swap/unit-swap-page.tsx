import React from 'react';

import { Box } from '@mui/material';

import { stickyBreadcrumbsStyles } from 'src/utils/table-styles';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { UnitSwapComponent } from 'src/sections/rm-panel/opportunity-list/components/unit-swap-component';

// ----------------------------------------------------------------------

export default function UnitSwapPage() {
  // Sample data for demonstration
  const sampleCancelledUnit = {
    unitNumber: 'A-101',
    projectName: 'Puravankara Heights',
    unitType: '2BHK',
    area: '1200 sq ft',
    price: '₹85,00,000',
  };

  const sampleNewUnit = {
    unitNumber: 'B-205',
    projectName: 'Puravankara Heights',
    unitType: '3BHK',
    area: '1500 sq ft',
    price: '₹1,20,00,000',
  };

  return (
    <DashboardContent>
      <Box sx={stickyBreadcrumbsStyles}>
        <CustomBreadcrumbs heading="Unit Swap" />
      </Box>

      <UnitSwapComponent cancelledUnit={sampleCancelledUnit} newUnit={sampleNewUnit} />
    </DashboardContent>
  );
}
