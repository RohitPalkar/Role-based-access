import { useState, useEffect } from 'react';

import { useParams } from 'src/routes/hooks';

import { useAppDispatch } from 'src/hooks/use-redux';

import { DashboardContent } from 'src/layouts/dashboard';
import { setTitleAsync } from 'src/redux/slices/admin/title-slice';
import { getBrandById } from 'src/services/admin-services/brand-srvice';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { BrandDetails } from 'src/sections/admin/brand/components/Brand-edit-form';

const BrandEdit = () => {
  const dispatch = useAppDispatch();
  const { id } = useParams();
  
  const [brand, setBrand] = useState(null);

  useEffect(() => {
    dispatch(setTitleAsync('Edit Brand'));
  }, [dispatch]);

  useEffect(() => {
    const fetchBrand = async () => {
      if (!id) return;
      
      try {
        const response = await getBrandById(Number(id));
        setBrand(response);
      } catch (error) {
        console.error('Failed to fetch brand:', error);
        setBrand(null);
      } finally {
        dispatch(setTitleAsync('Edit Brand'));}
    };

    fetchBrand();
  }, [dispatch, id]);




  return (
    <DashboardContent>
      <CustomBreadcrumbs 
        heading="Edit Brand" 
        sx={{ 
          mb: { xs: 0.5 },
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: 'background.default',
          py: 0.25
        }} 
      />
      <BrandDetails brand={brand} />
    </DashboardContent>
  );
};

export default BrandEdit;
