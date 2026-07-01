/* eslint-disable react-hooks/exhaustive-deps */
import type { AppDispatch } from 'src/redux/store';
import type { MapAndConvertPayload } from 'src/services/rm-panel/eoi-service';

import * as yup from 'yup';
import { toast } from 'sonner';
import { useFormik } from 'formik';
import { useDispatch } from 'react-redux';
import React, { useMemo, useState, useEffect } from 'react';

import { Box , Card, Grid, Button, Divider, Typography } from '@mui/material';

import { useParams, useRouter } from 'src/routes/hooks';

import { useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { generateRoleBasedRoute } from 'src/utils/constant';
import { stickyBreadcrumbsStyles } from 'src/utils/table-styles';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import { getUnitDropdown, getFloorDropdown, addMapAndConvert, getMapConvertById } from 'src/redux/actions/rm-panel/eoi-actions';

import { AnimateLogo1 } from 'src/components/animate';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { FormikTextField } from 'src/components/formik-textfield/formik-textfield';
import FormikAutocomplete from 'src/components/formik-autocomplete/FormikAutocomplete';

import { UnitDetailsCard } from './components/map-and-convert-components/unit-details-card';

const PROJECT_NAME = "Aspire";

const MapAndConvertView = () => {
  const [isFetched, setIsFetched] = useState(false);
  const [unitSource, setUnitSource] = useState<'mapped' | 'selected'>('mapped');
  const dispatch: AppDispatch = useDispatch();
  const route = useRouter();
  const { id } = useParams();
  const rolePermissions = useRoleBasedPermissions({ module: 'eoi' });
  const { userRole } = rolePermissions;
  const jsonValue = uiText.EOIJson.mapAndConvertEOI;
  const { mapAndConvertLoading, floorOptions, unitOptions, mapAndConvertData } = useAppSelector((state) => state.expressonOfInterest);

  const mapAndConvertFormik = useFormik({
    initialValues: {
      campaign: mapAndConvertData?.campaignName === null ? '' : String(mapAndConvertData?.campaignName),
      tower: '',
      floor: '',
      unit: '',
      checkBox: false,
    },
    validationSchema: yup.object({
      campaign: yup.string().required(jsonValue?.validations?.campaign),
      floor: yup.string().required(jsonValue?.validations?.floor),
      tower: yup.string().required(jsonValue?.validations?.tower),
      unit: yup.string().required(jsonValue?.validations?.unit),
    }),
    enableReinitialize: true,
    onSubmit: (values) => {
      handleSubmit(values);
    },
  });

  useEffect(() => {
    dispatch(getMapConvertById({ id: Number(id) }))
  }, [dispatch, id]);

  useEffect(() => {
    mapAndConvertFormik.validateForm();
  }, [mapAndConvertFormik?.values]);

  // Fetch floor options when tower changes
  useEffect(() => {
    const { tower } = mapAndConvertFormik.values;
    if (!tower) return;
    dispatch(
      getFloorDropdown({
        projectName: PROJECT_NAME,
        tower,
        campaignId: Number(mapAndConvertData?.campaignId),
      })
    );
  }, [mapAndConvertFormik?.values?.tower, dispatch]);

  // Fetch unit options when tower changes
  useEffect(() => {
    const { tower, floor } = mapAndConvertFormik.values;
    if (!tower || !floor) return;

    dispatch(
      getUnitDropdown({
        projectName: PROJECT_NAME,
        tower,
        floor,
        campaignId: Number(mapAndConvertData?.campaignId),
      })
    );
  }, [mapAndConvertFormik?.values?.tower, mapAndConvertFormik?.values?.floor, dispatch]);

  useEffect(() => {
    const mapped = mapAndConvertData?.mappedUnit;

    if (!mapped) return;

    // 1. Set form values from mappedUnit
    mapAndConvertFormik.setValues({
      campaign: String(mapAndConvertData?.campaignName || ''),
      tower: String(mapped?.towerName || ''),
      floor: String(mapped?.floor || ''),
      unit: String(mapped?.unitNumber || ''),
      checkBox: false,
    });

    // 2. Show details section
    setIsFetched(true);
    setUnitSource('mapped');
  }, [mapAndConvertData?.mappedUnit]);

  // Format tower options
  const towerDropdownOptions = useMemo(
    () =>
      (mapAndConvertData?.towers || [])?.map((tower: { name: string; value: string }) => ({
        label: tower?.name,
        value: tower?.value,
      })),
    [mapAndConvertData?.towers]
  );

  // Format floor options
  const floorDropdownOptions = useMemo(
    () =>
      floorOptions?.map((item: any) => ({
        label: item?.name,
        value: String(item?.value),
      })) || [],
    [floorOptions]
  );

  // Format unit options
  const unitDropdownOptions = useMemo(
    () =>
      (unitOptions || [])?.map((unit: any) => ({
        label: unit?.unitNumber,
        value: unit?.unitNumber,
      })),
    [unitOptions]
  );

  const handleFetch = () => {
    const { tower, floor, unit } = mapAndConvertFormik?.values || "";

    if (!tower || !floor || !unit) {
      mapAndConvertFormik.setTouched(
        { tower: true, floor: true, unit: true },
        true
      );
      return;
    }
    setIsFetched(true);
  };

  const resetUnitFields = () => {
    setIsFetched(false);

    // User is now choosing a unit manually
    setUnitSource('selected');

    // Only reset UNIT
    mapAndConvertFormik.setFieldValue('unit', '');
    mapAndConvertFormik.setFieldTouched('unit', false, false);
    mapAndConvertFormik.setFieldError('unit', undefined);
  };

  const selectedUnitDetails = useMemo(() => {
    if (unitSource === 'mapped' && mapAndConvertData?.mappedUnit) {
      return mapAndConvertData?.mappedUnit;
    }

    const selectedUnitNumber = mapAndConvertFormik?.values?.unit;
    if (!selectedUnitNumber || !unitOptions) return null;

    return unitOptions?.find((u: any) => String(u?.unitNumber) === String(selectedUnitNumber)) || null;
  }, [
    unitSource,
    mapAndConvertData?.mappedUnit,
    mapAndConvertFormik?.values?.unit,
    unitOptions,
  ]);

  const handleSubmit = (values: any) => {
    if (Object?.keys(mapAndConvertFormik?.errors)?.length !== 0) return;

    if (!selectedUnitDetails) {
      return;
    }

    const hasMappedUnit = Boolean(mapAndConvertData?.mappedUnit);

    const payload: MapAndConvertPayload = {
      voucherId: Number(id),
      sfdcTowerId: selectedUnitDetails?.sfdcTowerId || '',
      towerName: values?.tower || '',
      floor: Number(selectedUnitDetails?.floor), 
      facing: selectedUnitDetails?.facing || '',
      sfdcUnitId: selectedUnitDetails?.sfdcUnitId || '',
      inventoryUnitId: selectedUnitDetails?.inventoryUnitId || '',
      unitNumber: selectedUnitDetails?.unitNumber,
      configuration: selectedUnitDetails?.configuration || '',
      areaSBA: Number(selectedUnitDetails?.areaSBA),
      // Only include changeUnit if a unit was already mapped
      ...(hasMappedUnit ? { changeUnit: true } : {}),
    };

    dispatch(addMapAndConvert(payload))
      .unwrap()
      .then((res) => {
        toast.success(res || 'Unit mapped successfully');
        route.push(generateRoleBasedRoute(userRole, 'eoi-records'));
      })
      .catch((err) => {
        toast.error(err || 'Could not map unit to opportunity ID');
      });
  };

  return mapAndConvertLoading ? (
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          height: '80vh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AnimateLogo1 />
      </Box>
    ) : (
    <DashboardContent>
      <Box sx={stickyBreadcrumbsStyles}>
        <CustomBreadcrumbs heading={jsonValue.title} />
      </Box>
      <form onSubmit={mapAndConvertFormik?.handleSubmit}>
        <Card sx={{ padding: '20px', mb: 2 }}>
          <Grid container spacing={3}>
            <FormikTextField
              name="campaign"
              label={jsonValue.label.campaign}
              required
              formik={mapAndConvertFormik}
              disabled
            />
          </Grid>

          <Grid container spacing={3} mt={0}>
            <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
              <Typography sx={{ fontSize: '14px', fontWeight: 400, mb: -1}}>
                {jsonValue.label.selectUnit}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
              <FormikAutocomplete
                label={jsonValue.label.tower}
                name="tower"
                required
                formik={mapAndConvertFormik}
                options={towerDropdownOptions}
                disabled={isFetched}
                fallbackLabel={mapAndConvertData?.mappedUnit?.towerName}
                externalOnChange={(value) => {
                  mapAndConvertFormik.setFieldValue('floor', '');
                  mapAndConvertFormik.setFieldValue('unit', '');
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
              <FormikAutocomplete
                label={jsonValue.label.floor}
                name="floor"
                required
                formik={mapAndConvertFormik}
                options={floorDropdownOptions}
                disabled={isFetched}
                fallbackLabel={String(mapAndConvertData?.mappedUnit?.floor || '')}
                externalOnChange={(value) => {
                  mapAndConvertFormik.setFieldValue('unit', '');
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
              <FormikAutocomplete
                label={jsonValue.label.unit}
                name="unit"
                required
                formik={mapAndConvertFormik}
                options={unitDropdownOptions}
                disabled={isFetched}
                fallbackLabel={mapAndConvertData?.mappedUnit?.unitNumber}
                onClear={isFetched ? resetUnitFields : undefined}
              />
            </Grid>

            <Grid item xs={12} sm={4} md={4} lg={4} xl={4}>
              <Button
                size="large"
                variant="contained"
                sx={{
                  py: 3.2,
                  width: "140px",
                  fontSize: '14px',
                  ...(isFetched
                    ? {}
                    : {
                        backgroundColor: '#1A407D',
                        '&:hover': {
                          backgroundColor: '#174A9D',
                        },
                      }),
                }}
                onClick={handleFetch}
                disabled={isFetched}
              >
                {uiText.button.fetch}
              </Button>
            </Grid>
          </Grid>
          <Divider sx={{ borderColor: '#DADADA', borderStyle: 'dashed', mt: 2 }} />

        {isFetched && (
          <Grid container spacing={3} mt={0}>
            <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
              <Typography sx={{ fontSize: '14px', fontWeight: 400, mb: -1}}>
                {jsonValue.label.unitCard.unitDetails}
              </Typography>
            </Grid>

            <UnitDetailsCard
              unitNo={selectedUnitDetails?.unitNumber || '-'}
              floor={selectedUnitDetails?.floor || '-'}
              configuration={selectedUnitDetails?.configuration || '-'}
              areaSBA={selectedUnitDetails?.areaSBA || '-'}
            />

            {/* <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Checkbox
                    size="small"
                    checked={mapAndConvertFormik.values.checkBox}
                    onChange={(e) =>
                      mapAndConvertFormik.setFieldValue('checkBox', e.target.checked)
                    }
                  />
                  <Typography sx={{ fontSize: '14px', fontWeight: 400 }}>
                    {jsonValue.label.assignButton}
                  </Typography>
                </Box>
            </Grid> */}
          </Grid>
        )}

          <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
            <Button
              size='large'
              variant="outlined"
              color="inherit"
              sx={{ px: 3.5 }}
              onClick={() => {
                route.push(generateRoleBasedRoute(userRole, 'eoi-records'));
              }}
            >
              {uiText.button.cancel}
            </Button>
            <Button 
              type="submit" 
              size='large' 
              variant="contained" 
              sx={{
                px: 3.5,
                backgroundColor: '#1A407D',
                '&:hover': {
                  backgroundColor: '#174A9D',
                },
              }}
              disabled={!isFetched}
            >
              {uiText.button.submit}
            </Button>
          </Box>
        </Card>
      </form>
    </DashboardContent>
  );
};

export default MapAndConvertView;
