import { useParams } from 'react-router';
import React, { useState, useEffect, useCallback } from 'react';

import { DashboardContent } from 'src/layouts/dashboard';
import { getBrandById } from 'src/services/admin-services/brand-srvice';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { BrandDetails } from './Brand-edit-form';


/* Edit Brand Component */
const EditBrand: React.FC = () => {
  const { id } = useParams();
  const [state, setState] = useState();

  const fetchBrands = useCallback(async () => {
    try {
      const response = await getBrandById(Number(id));
      setState(response);
      return response;
    } catch (error) {
      return error;
    }
  }, [id]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  return (
    // <Stack sx={{ p: '30px' }}>
    //   <Typography sx={{ fontSize: '24px', fontWeight: 600, color: '#1C252E', mb: 3 }}>
    //     Edit Brand
    //   </Typography>
      
    // </Stack>
      <DashboardContent>
        <CustomBreadcrumbs heading='Edit Brand' 
         sx={{ 
                          mb: { xs: 0.5 },
                          position: 'sticky',
                          top: 0,
                          zIndex: 10,
                          backgroundColor: 'background.default',
                          py: 0.25
                        }} />
        {state && <BrandDetails brand={state} />}
      </DashboardContent>
  );
};

export default EditBrand;
