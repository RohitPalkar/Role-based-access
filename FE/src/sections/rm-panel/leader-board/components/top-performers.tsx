import { useMemo, useState, useEffect } from 'react';

import { Box, Tab, Tabs, Divider, Skeleton } from '@mui/material';

import { useTabs } from 'src/hooks/use-tabs';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { getInitials } from 'src/utils/helper';

import { DashboardContent } from 'src/layouts/dashboard';
import { getTopPerformers } from 'src/redux/actions/leader-board/leader-board-top-performer-and-cancellation-action';

import { CityPerformers } from './tabs/city-performers';
import { BrandPerformers } from './tabs/brand-performers';
import { ProjectPerformers } from './tabs/project-performers';

const TABS = [
  { value: 'brand', label: 'Brand' },
  { value: 'city', label: 'City' },
  { value: 'project', label: 'Project' },
];

function TopPerformers() {
  const defaultCityId = localStorage.getItem('defaultCityId');
  const defaultProjectId = localStorage.getItem('defaultProjectId');
  const defaultBrandId = localStorage.getItem('defaultBrandId');
  const tabs = useTabs('brand');
  const dispatch = useAppDispatch();
  const { brandsList } = useAppSelector((state) => state.brandsList);
  const { projects } = useAppSelector((state) => state.common);
  const { cities } = useAppSelector((state) => state.common);
  const [tabsData, setTabsData] = useState<any>();
  const [activeTab, setActiveTab] = useState(defaultBrandId);

  const [finalData, setFinalData] = useState<any>([]);
  const { topPerformers, loading } = useAppSelector((state) => state.topPerformers);

  const mappedBrands = useMemo(
    () => brandsList?.map((item) => ({ label: item.name, index: item.id })),
    [brandsList]
  );

  const mappedProjects = useMemo(
    () => projects?.map((item) => ({ label: item.name, index: item.id })),
    [projects]
  );

  const mappedCities = useMemo(
    // @ts-ignore
    () => cities?.cities?.map((item) => ({ label: item.name, index: item.id })),
    // @ts-ignore
    [cities.cities]
  );

  useEffect(() => {
    if (!mappedBrands || mappedBrands?.length === 0 || tabs.value !== 'brand') return;
    dispatch(getTopPerformers({ type: 'brand', id: mappedBrands[0].index.toString() }));
    if (activeTab !== mappedBrands[0].index.toString()) {
      setActiveTab(mappedBrands[0].index.toString());
    }
    setTabsData(mappedBrands);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappedBrands, tabs.value]);

  useEffect(() => {
    if (!mappedProjects || mappedProjects?.length === 0 || tabs.value !== 'project') return;
    dispatch(getTopPerformers({ type: 'project', id: mappedProjects[0].index.toString() }));
    if (activeTab !== mappedProjects[0].index.toString())
      setActiveTab(mappedProjects[0].index.toString());
    setTabsData(mappedProjects);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, mappedProjects, tabs.value]);

  useEffect(() => {
    if (!mappedCities || mappedCities?.length === 0 || tabs.value !== 'city') return;
    dispatch(getTopPerformers({ type: 'city', id: mappedCities[0].index.toString() }));
    if (defaultCityId && activeTab !== defaultCityId.toString()) {
      setActiveTab(defaultCityId.toString());
    }
    setTabsData(mappedCities);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, mappedCities, tabs.value]);

  useEffect(() => {
    let restructuredData: any = [];
    // @ts-ignore
    if (topPerformers?.data?.performers) {
      // @ts-ignore
      restructuredData =
        topPerformers &&
        // @ts-ignore
        topPerformers?.data?.performers?.map((item: any) => ({
          name: item.name,
          totalCancellations: item.bookingsCount,
          amount: item.totalSales,
          initials: getInitials(item.name),
        }));
      setFinalData(restructuredData);
      // setActiveTab(restructuredData[0].id)
    }
  }, [topPerformers, brandsList, projects, activeTab, cities]);

  useEffect(() => {
    if (tabsData && tabsData?.length > 0) {
      setActiveTab(tabsData[0]?.index);
    }
  }, [tabsData, dispatch]);

  const renderSkeletonLoader = () => (
    <>
      <Box sx={{ display: 'flex', alighItems: 'center', marginTop: '10px' }}>
        <Skeleton
          variant="circular"
          width={50}
          height={50}
          sx={{ marginRight: '10px', flexShrink: 0, display: 'flex' }}
        />
        <Box sx={{ display: 'block' }}>
          <Skeleton variant="rounded" width={450} height={8} sx={{ marginTop: '10px' }} />
          <Skeleton variant="rounded" width={350} height={5} sx={{ marginTop: '10px' }} />
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alighItems: 'center', marginTop: '10px' }}>
        <Skeleton
          variant="circular"
          width={50}
          height={50}
          sx={{ marginRight: '10px', flexShrink: 0, display: 'flex' }}
        />
        <Box sx={{ display: 'block' }}>
          <Skeleton variant="rounded" width={450} height={8} sx={{ marginTop: '10px' }} />
          <Skeleton variant="rounded" width={350} height={5} sx={{ marginTop: '10px' }} />
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alighItems: 'center', marginTop: '10px' }}>
        <Skeleton
          variant="circular"
          width={50}
          height={50}
          sx={{ marginRight: '10px', flexShrink: 0, display: 'flex' }}
        />
        <Box sx={{ display: 'block' }}>
          <Skeleton variant="rounded" width={450} height={8} sx={{ marginTop: '10px' }} />
          <Skeleton variant="rounded" width={350} height={5} sx={{ marginTop: '10px' }} />
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alighItems: 'center', marginTop: '10px' }}>
        <Skeleton
          variant="circular"
          width={50}
          height={50}
          sx={{ marginRight: '10px', flexShrink: 0, display: 'flex' }}
        />
        <Box sx={{ display: 'block' }}>
          <Skeleton variant="rounded" width={450} height={8} sx={{ marginTop: '10px' }} />
          <Skeleton variant="rounded" width={350} height={5} sx={{ marginTop: '10px' }} />
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alighItems: 'center', marginTop: '10px' }}>
        <Skeleton
          variant="circular"
          width={50}
          height={50}
          sx={{ marginRight: '10px', flexShrink: 0, display: 'flex' }}
        />
        <Box sx={{ display: 'block' }}>
          <Skeleton variant="rounded" width={450} height={8} sx={{ marginTop: '10px' }} />
          <Skeleton variant="rounded" width={350} height={5} sx={{ marginTop: '10px' }} />
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alighItems: 'center', marginTop: '10px' }}>
        <Skeleton
          variant="circular"
          width={50}
          height={50}
          sx={{ marginRight: '10px', flexShrink: 0, display: 'flex' }}
        />
        <Box sx={{ display: 'block' }}>
          <Skeleton variant="rounded" width={450} height={8} sx={{ marginTop: '10px' }} />
          <Skeleton variant="rounded" width={350} height={5} sx={{ marginTop: '10px' }} />
        </Box>
      </Box>
    </>
  );

  return (
    <DashboardContent sx={{ m: 0, p: '0 !important', minHeight: { md: '480px', xs: 'auto' } }}>
      <Tabs
        value={tabs.value}
        onChange={async (event, newValue) => {
          // await dispatch(getTopPerformers({ type: newValue, id: tabsData[0].index }))
          if (defaultCityId && newValue === 'city') {
            await setActiveTab(defaultCityId.toString());
          }
          if (defaultProjectId && newValue === 'project') {
            await setActiveTab(defaultProjectId.toString());
          }
          if (newValue === 'brand') {
            // @ts-ignore
            await setActiveTab(defaultBrandId.toString());
          }
          tabs.onChange(event, newValue);
        }}
        sx={{ mb: { xs: 3, md: 1 } }}
      >
        {TABS.map((tab) => (
          <Tab key={tab.value} label={tab.label} value={tab.value} />
        ))}
      </Tabs>
      <Divider sx={{ borderBottom: 1, borderColor: '#919EAB24' }} />
      {loading ? (
        renderSkeletonLoader()
      ) : (
        <>
          {finalData && (
            <>
              {tabs.value === 'brand' && brandsList && brandsList.length > 0 && tabsData && (
                <BrandPerformers
                  brandsData={tabsData}
                  isCancellation={false}
                  data={finalData}
                  loading={loading}
                  tabValue={tabs.value}
                  setActiveTab={setActiveTab}
                  activeTab={activeTab}
                />
              )}
              {tabs.value === 'city' && tabsData && (
                <CityPerformers
                  citiesData={tabsData}
                  isCancellation={false}
                  data={finalData}
                  loading={loading}
                  tabValue={tabs.value}
                  setActiveTab={setActiveTab}
                  activeTab={activeTab}
                />
              )}
              {tabs.value === 'project' && tabsData && (
                <ProjectPerformers
                  projectsData={tabsData}
                  isCancellation={false}
                  data={finalData}
                  loading={loading}
                  tabValue={tabs.value}
                  setActiveTab={setActiveTab}
                  activeTab={activeTab}
                />
              )}
            </>
          )}
        </>
      )}
    </DashboardContent>
  );
}

export default TopPerformers;
