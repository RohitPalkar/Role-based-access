import type { AppDispatch } from 'src/redux/store';

import * as yup from 'yup';
import { toast } from 'sonner';
import { useFormik } from 'formik';
import { useParams } from 'react-router';
import { useDispatch } from 'react-redux';
import React, { useMemo, useState, useEffect } from 'react'

import ReplayIcon from '@mui/icons-material/Replay';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import { Box , Card , Grid, Button, Tooltip, Divider } from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { stickyBreadcrumbsStyles } from 'src/utils/table-styles';
import { ROLES, INVENTORY_TAB_OPTIONS, generateRoleBasedRoute } from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import CloudUploadIcon from 'src/assets/icons/cloud-upload.png';
import { fetchEOICampaignsAction } from 'src/redux/actions/rm-panel/eoi-actions';
import { buildUnitInventoryTabStripOptions } from 'src/config/role-based-permissions';
import { fetchUnitInventoryThunk, fetchUnitInventoryDropdowns } from 'src/redux/actions/rm-panel/unit-inventory-actions';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import FormikAutocomplete from 'src/components/formik-autocomplete/FormikAutocomplete';

import UnitInventoryList from './unit-inventory-list';
import { inventoryStatusOptions } from './unit-inventory-types';
import UnitInventoryTowerView from './unit-inventory-tower-view';
import ViewTypeTabs from '../eoi-dashboard/components/view-type-tabs';

export type UnitInventoryFormValues = {
  campaign: string;
  tower: string[];
  floor: string[];
  configuration: string[];
  facing: string[];
  series: string[];
  inventoryStatus?: string;
};

const formatDropdownOptions = (options?: { name: string; value: string }[]) =>
  (options || []).map((item) => ({
    label: item.name,
    value: item.value,
  }));

const UnitInventoryView = () => {
  const { id } = useParams();
  const route = useRouter();
  const dispatch: AppDispatch = useDispatch();

  const [tabValue, setTabValue] = useState('towerView');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isFetched, setIsFetched] = useState(false);

  const {
    permissions: unitInventoryModulePermissions,
    canCreate,
    userRole,
    filters: roleFilters,
    canExport,
    useTab: showListTowerViewTabs,
  } = useRoleBasedPermissions({
    module: 'unitInventory',
  });

  const unitInventoryTabStripOptions = useMemo(
    () => buildUnitInventoryTabStripOptions(unitInventoryModulePermissions),
    [unitInventoryModulePermissions]
  );

  const { campaigns } = useAppSelector((state) => state.expressonOfInterest);
  const { towerOptions, floorOptions, seriesOptions, bhkConfigOptions, facingOptions } = useAppSelector((state: any) => state.unitInventory);
  
  const jsonValue = uiText.EOIJson.UnitInventoryView;

  const unitInventoryFormik = useFormik<UnitInventoryFormValues>({
    initialValues: {
      campaign: '',
      tower: [],
      floor: [],
      series: [],
      configuration: [],
      facing: [],
      inventoryStatus: '',
    },
    validationSchema: yup.object({
      campaign: yup.string().required(jsonValue?.validations?.campaign),
      tower: yup.array().of(yup.string()).nullable().notRequired(),
      floor: yup.array().of(yup.string()).nullable().notRequired(),
      series: yup.array().of(yup.string()).nullable().notRequired(),
      configuration: yup.array().of(yup.string()).nullable().notRequired(),
      facing: yup.array().of(yup.string()).nullable().notRequired(),
      inventoryStatus: yup.string().nullable().notRequired(),
      }),
    enableReinitialize: true,
    onSubmit: (values) => {},
  });

  const campaignId = unitInventoryFormik.values.campaign;
  const isTowerSelected = unitInventoryFormik.values.tower?.length > 0;

  useEffect(() => {
    if (userRole === ROLES.SALES_TL || userRole === ROLES.PROJECT_HEAD) {
      dispatch(fetchEOICampaignsAction({ showBuddyCampaigns: true }));
    } else {
      dispatch(fetchEOICampaignsAction());
    }
  }, [dispatch, id, userRole]);

  useEffect(() => {
    unitInventoryFormik.validateForm();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitInventoryFormik?.values]);

  // Cascading dropdown API calls
  useEffect(() => {
    const timeout = setTimeout(() => {
      const { campaign, tower, floor } = unitInventoryFormik.values;

      if (!campaign) return;

      dispatch(fetchUnitInventoryDropdowns({
        campaignId: Number(campaign),
        towerName: tower,
        floor,
      }));
    }, 1000);

    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dispatch,
    unitInventoryFormik.values.campaign,
    unitInventoryFormik.values.tower,
    unitInventoryFormik.values.floor,
  ]);

  useEffect(() => {
    setIsFetched(false);
  }, [
    unitInventoryFormik.values.campaign,
    unitInventoryFormik.values.tower,
    unitInventoryFormik.values.floor,
    unitInventoryFormik.values.series,
    unitInventoryFormik.values.configuration,
    unitInventoryFormik.values.facing,
    unitInventoryFormik.values.inventoryStatus,
  ]);

  const effectiveFetchLimit = useMemo(
    () => (showListTowerViewTabs && tabValue === 'towerView' ? 100 : limit),
    [showListTowerViewTabs, tabValue, limit]
  );

  useEffect(() => {
    if (!showListTowerViewTabs && tabValue !== 'listView') {
      setTabValue('listView');
    }
  }, [showListTowerViewTabs, tabValue]);

  useEffect(() => {
    if (!isFetched) return;

    const { values } = unitInventoryFormik;

    dispatch(
      fetchUnitInventoryThunk({
        page,
        limit: effectiveFetchLimit,
        search,
        inventoryStatus: values.inventoryStatus,
        campaignId: values.campaign,
        tower: values.tower,
        floor: values.floor,
        series: values.series,
        configuration: values.configuration,
        facing: values.facing,
      })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, effectiveFetchLimit, search, isFetched, dispatch]);

  // Reset to list view every time filters change
  useEffect(() => {
    setTabValue('towerView');
  }, [unitInventoryFormik.values]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
      setTabValue(newValue);
  };

  // Format dropdown options
  const towerDropdownOptions = useMemo(
    () => formatDropdownOptions(towerOptions),
    [towerOptions]
  );

  const floorDropdownOptions = useMemo(
    () => formatDropdownOptions(floorOptions),
    [floorOptions]
  );

  const seriesDropdownOptions = useMemo(
    () => formatDropdownOptions(seriesOptions),
    [seriesOptions]
  );

  const bhkDropdownOptions = useMemo(
    () => formatDropdownOptions(bhkConfigOptions),
    [bhkConfigOptions]
  );

  const facingDropdownOptions = useMemo(
    () => formatDropdownOptions(facingOptions),
    [facingOptions]
  );

  const filterConfig = [
    {
      id: "series",
      label: jsonValue.label.series,
      name: "series",
      options: seriesDropdownOptions,
      multiple: true,
    },
    {
      id: "configuration",
      label: jsonValue.label.configuration,
      name: "configuration",
      options: bhkDropdownOptions,
      multiple: true,
    },
    {
      id: "facing",
      label: jsonValue.label.facing,
      name: "facing",
      options: facingDropdownOptions,
      multiple: true,
    },
    {
      id: "inventoryStatus",
      label: jsonValue.label.inventoryStatus,
      name: "inventoryStatus",
      options: inventoryStatusOptions,
      multiple: false,
    },
  ];

  const handleFetch = async () => {
  const { values } = unitInventoryFormik;

    setPage(1);
    const payload: any = {
      page,
      limit,
      search,
      campaignId: values.campaign,
      tower: values.tower,
    };

    if (values.floor?.length) payload.floor = values.floor;
    if (values.series?.length) payload.series = values.series;
    if (values.configuration?.length) payload.configuration = values.configuration;
    if (values.facing?.length) payload.facing = values.facing;
    if (values.inventoryStatus) payload.inventoryStatus = values.inventoryStatus;

    try {
      await dispatch(fetchUnitInventoryThunk(payload)).unwrap();
      setIsFetched(true);
    } catch (error: any) {
      toast.error(error || error?.message || 'Failed to fetch unit inventory');
    }
  };

  const handleClear = () => {
    unitInventoryFormik.resetForm();
    setIsFetched(false);
  };

  const refetchUnitInventory = () => {
    const { values } = unitInventoryFormik;

    dispatch(
      fetchUnitInventoryThunk({
        page,
        limit: effectiveFetchLimit,
        search,
        inventoryStatus: values.inventoryStatus,
        campaignId: values.campaign,
        tower: values.tower,
        floor: values.floor,
        series: values.series,
        configuration: values.configuration,
        facing: values.facing,
      })
    );
  };

  return (
    <DashboardContent>
        <Box sx={stickyBreadcrumbsStyles}>
            <CustomBreadcrumbs
              heading={jsonValue.title}
              action={
                canCreate ? (
                  <Button
                    variant="contained"
                    disabled={!campaignId}
                    sx={{
                      backgroundColor: campaignId ? '#1a407d' : '#092552',
                      color: '#fff',
                      '&:hover': {
                        backgroundColor: '#1a407d',
                        color: '#fff',
                      },
                    }}
                    onClick={() => {
                      route.push(
                        generateRoleBasedRoute(
                          userRole,
                          `inventory/upload-unit-inventory/${campaignId}`
                        )
                      );
                    }}
                    startIcon={
                      <img
                        src={CloudUploadIcon}
                        alt="export"
                        style={{
                          width: 24,
                          height: 24,
                          filter: campaignId
                            ? 'brightness(0) invert(1)'
                            : 'grayscale(30%)',
                        }}
                      />
                    }
                  >
                    {uiText.unitInventory.uploadBtn}
                  </Button>
                ) : null
              }
              slotProps={{
                container: {
                  sx: {
                    justifyContent: 'flex-start',
                  },
                },
              }}
          />
        </Box>
        <form onSubmit={unitInventoryFormik?.handleSubmit}>
            <Card sx={{ padding: '20px'}}>
              <Grid container spacing={2} sx={{ justifyContent: 'space-between'}}>
              {roleFilters?.find((i: any) => i?.id === 'campaign') && (
                <Grid item xs={12} sm={4} md={4} lg={4} xl={4}>
                  <FormikAutocomplete
                    label={jsonValue.label.campaign}
                    name="campaign"
                    required
                    formik={unitInventoryFormik}
                    options={campaigns?.map((cam) => ({
                      value: String(cam?.value),
                      label: cam?.name,
                    }))}
                    externalOnChange={(value) => {
                      unitInventoryFormik.setFieldValue('tower', []);
                      unitInventoryFormik.setFieldValue('floor', []);
                      unitInventoryFormik.setFieldValue('series', []);
                      unitInventoryFormik.setFieldValue('configuration', []);
                      unitInventoryFormik.setFieldValue('facing', []);
                      unitInventoryFormik.setFieldValue('status', '');
                    }}
                  />
                </Grid>
              )}
              {unitInventoryFormik.values.campaign && (
                <>
                {roleFilters?.find((i: any) => i?.id === 'tower') && (
                  <Grid item xs={12} sm={4} md={4} lg={4} xl={4}>
                    <FormikAutocomplete
                      label={jsonValue.label.tower}
                      name="tower"
                      multiple
                      limitTags={1}
                      formik={unitInventoryFormik}
                      options={towerDropdownOptions || []}
                      externalOnChange={(value) => {
                        unitInventoryFormik.setFieldValue('tower', value || []);
                        unitInventoryFormik.setFieldValue('floor', []);
                        unitInventoryFormik.setFieldValue('series', []);
                        unitInventoryFormik.setFieldValue('configuration', []);
                        unitInventoryFormik.setFieldValue('facing', []);
                        unitInventoryFormik.setFieldValue('inventoryStatus', '');
                      }}
                    />
                  </Grid>
                )}

              {roleFilters?.find((i: any) => i?.id === 'floor') && (
                <Grid item xs={12} sm={4} md={4} lg={4} xl={4}>
                  <FormikAutocomplete
                    label={jsonValue.label.floor}
                    name="floor"
                    multiple
                    limitTags={1}
                    formik={unitInventoryFormik}
                    options={floorDropdownOptions || []}
                    disabled={!isTowerSelected}
                  />
                </Grid>
              )}
                </>
              )}
              </Grid>

            {unitInventoryFormik?.values?.campaign && (
            <>
              <Divider sx={{ borderBottom: '1px dashed rgba(218, 218, 218, 1)', mt: 2 }} />
              {/* Dropdowns flex to use available width; actions stay compact (no overlap) */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'stretch', sm: 'flex-start' },
                  gap: 2,
                  mt: 2,
                }}
              >
                <Box
                  sx={{
                    flex: '1 1 0%',
                    minWidth: 0,
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'minmax(0, 1fr)',
                      sm: 'repeat(2, minmax(0, 1fr))',
                      md: 'repeat(2, minmax(0, 1fr))',
                      lg: 'repeat(auto-fit, minmax(240px, 1fr))',
                      xl: 'repeat(auto-fit, minmax(260px, 1fr))',
                    },
                    gap: 2,
                    columnGap: 2,
                    rowGap: 2,
                  }}
                >
                  {filterConfig
                    ?.filter((filter) =>
                      roleFilters?.some((rf: any) => rf?.id === filter?.id)
                    )
                    ?.map((filter) => (
                      <Box key={filter?.id} sx={{ minWidth: 0 }}>
                        <FormikAutocomplete
                          label={filter?.label}
                          name={filter?.name}
                          multiple={filter?.multiple}
                          limitTags={1}
                          formik={unitInventoryFormik}
                          options={filter?.options || []}
                          disabled={!isTowerSelected}
                        />
                      </Box>
                    ))}
                </Box>
                <Box
                  sx={{
                    flex: '0 0 auto',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 1,
                    pl: { sm: 0.5 },
                    pt: { xs: 0, sm: '4px' },
                    alignSelf: { xs: 'flex-end', sm: 'flex-start' },
                    width: { xs: '100%', sm: 'auto' },
                    minWidth: 'fit-content',
                  }}
                >
                  <Tooltip title={uiText.button.reset}>
                    <span>
                      <Button
                        variant="outlined"
                        onClick={handleClear}
                        sx={{
                          minWidth: 40,
                          width: 40,
                          height: 40,
                          padding: 0,
                        }}
                      >
                        <ReplayIcon />
                      </Button>
                    </span>
                  </Tooltip>
                  <Tooltip title={uiText.button.fetch}>
                    <span>
                      <Button
                        variant="contained"
                        onClick={handleFetch}
                        disabled={!isTowerSelected || isFetched}
                        sx={{
                          minWidth: 40,
                          width: 40,
                          height: 40,
                          padding: 0,
                          backgroundColor: '#1A407D',
                          '&:hover': {
                            backgroundColor: '#174A9D',
                          },
                        }}
                      >
                        <ManageSearchIcon />
                      </Button>
                    </span>
                  </Tooltip>
                </Box>
              </Box>
            </>
            )}
            </Card>
        </form>

        {isFetched && (
          <>
            {showListTowerViewTabs ? (
              <ViewTypeTabs
                value={tabValue}
                onChange={handleTabChange}
                options={
                  unitInventoryTabStripOptions.length > 0
                    ? unitInventoryTabStripOptions
                    : INVENTORY_TAB_OPTIONS
                }
                noLeftMargin
              />
            ) : null}

            {(!showListTowerViewTabs || tabValue === 'listView') && (
              <UnitInventoryList
                search={search}
                setSearch={setSearch}
                page={page}
                setPage={setPage}
                limit={limit}
                setLimit={setLimit}
                refetchUnitInventory={refetchUnitInventory}
                canExport={canExport}
                filters={unitInventoryFormik.values}
              />
            )}

            {showListTowerViewTabs && tabValue === 'towerView' ? <UnitInventoryTowerView /> : null}
          </>
        )}
    </DashboardContent>
  )
}

export default UnitInventoryView