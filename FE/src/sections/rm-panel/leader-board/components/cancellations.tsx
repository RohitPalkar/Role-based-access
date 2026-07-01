import React, { useMemo, useState, useEffect } from 'react';

import { Box , Tab, Tabs, Divider, Skeleton, } from '@mui/material';

import { useTabs } from 'src/hooks/use-tabs';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { getInitials } from 'src/utils/helper';

import { DashboardContent } from 'src/layouts/dashboard';
import { getCancellations } from 'src/redux/actions/leader-board/leader-board-top-performer-and-cancellation-action';

import { CityCancellations } from './tabs/city-cancellations';
import { BrandCancellations } from './tabs/brand-cancellations';
import { ProjectCancellations } from './tabs/project-cancellations';


const TABS = [
  { value: 'brand', label: 'Brand' },
  { value: 'city', label: 'City' },
  { value: 'project', label: 'Project' },
];

function Cancellations() {
  const defaultCityId = localStorage.getItem("defaultCityId");

  const tabs = useTabs('brand');
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<any>();
  const [finalData, setFinalData] = useState<any>([])
  const [tabsData, setTabsData] = useState<any>()

  const { brandsList } = useAppSelector((state) => state.brandsList);
  const { projects } = useAppSelector((state) => state.common);
  const { cities } = useAppSelector((state) => state.common);


    const mappedBrands = useMemo(
      () => brandsList?.map(item => ({ label: item.name, index: item.id })),
      [brandsList]
    );
  
    const mappedProjects = useMemo(
      () => projects?.map(item => ({ label: item.name, index: item.id })),
      [projects]
    );
  
    const mappedCities = useMemo(
      // @ts-ignore
      () => cities?.cities?.map(item => ({ label: item.name, index: item.id })),
      // @ts-ignore
      [cities.cities]
    );

  useEffect(() => {
    if (!mappedBrands || mappedBrands.length === 0 || tabs.value !== "brand") return;
    dispatch(getCancellations({ type: "brand", id: mappedBrands[0].index.toString() }));
    if (activeTab !== mappedBrands[0].index.toString()) {
      setActiveTab(mappedBrands[0].index.toString());
    }
    setTabsData(mappedBrands)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappedBrands, tabs.value])
  
    useEffect(() => {
      if (!mappedProjects || mappedProjects.length === 0 || tabs.value !== "project") return;
      dispatch(getCancellations({ type: "project", id: mappedProjects[0].index.toString() }))
      if (activeTab !== mappedProjects[0].index.toString()) setActiveTab(mappedProjects[0].index.toString())
      setTabsData(mappedProjects)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, mappedProjects, tabs.value])
  
    useEffect(() => {
      if (!mappedCities || mappedCities.length === 0 || tabs.value !== "city") return;
      dispatch(getCancellations({ type: "city", id: mappedCities[0].index.toString() }));
      if (defaultCityId && activeTab !== defaultCityId.toString()) {
        setActiveTab(defaultCityId.toString());
      }
      setTabsData(mappedCities)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, mappedCities, tabs.value])
  

  const { cancellations, loading } = useAppSelector((state) => state.cancellations);
  useEffect(() => {
    // @ts-ignore
    if (cancellations?.data?.cancellations) {
      // @ts-ignore
      const restructuredData = cancellations?.data?.cancellations?.map(item => ({ name: item?.name, amount: item?.totalSales, initials: getInitials(item?.name), totalCancellations: item?.totalCancellations }))
      setFinalData(restructuredData)
    }
  }, [cancellations, brandsList, projects, activeTab, cities]);

  useEffect(() => {
    if (tabsData && tabsData.length > 0) { setActiveTab(tabsData[0]?.index) }

  }, [tabsData, dispatch])

  const renderSkeletonLoader = () =>(
    <>
      <Box sx={{display: 'flex', alighItems: 'center', marginTop: '10px'}}>
        <Skeleton variant="circular" width={50} height={50} sx={{marginRight: '10px', flexShrink: 0, display: 'flex'}}/>
        <Box sx={{display: 'block'}}>
          <Skeleton variant="rounded" width={450} height={8} sx={{marginTop: '10px'}} /><Skeleton variant="rounded" width={350} height={5} sx={{marginTop: '10px'}} />
        </Box>
      </Box>
      <Box sx={{display: 'flex', alighItems: 'center', marginTop: '10px'}}>
        <Skeleton variant="circular" width={50} height={50} sx={{marginRight: '10px', flexShrink: 0, display: 'flex'}}/>
        <Box sx={{display: 'block'}}>
          <Skeleton variant="rounded" width={450} height={8} sx={{marginTop: '10px'}} /><Skeleton variant="rounded" width={350} height={5} sx={{marginTop: '10px'}} />
        </Box>
      </Box>
      <Box sx={{display: 'flex', alighItems: 'center', marginTop: '10px'}}>
        <Skeleton variant="circular" width={50} height={50} sx={{marginRight: '10px', flexShrink: 0, display: 'flex'}}/>
        <Box sx={{display: 'block'}}>
          <Skeleton variant="rounded" width={450} height={8} sx={{marginTop: '10px'}} /><Skeleton variant="rounded" width={350} height={5} sx={{marginTop: '10px'}} />
        </Box>
      </Box>
      <Box sx={{display: 'flex', alighItems: 'center', marginTop: '10px'}}>
        <Skeleton variant="circular" width={50} height={50} sx={{marginRight: '10px', flexShrink: 0, display: 'flex'}}/>
        <Box sx={{display: 'block'}}>
          <Skeleton variant="rounded" width={450} height={8} sx={{marginTop: '10px'}} /><Skeleton variant="rounded" width={350} height={5} sx={{marginTop: '10px'}} />
        </Box>
      </Box>
      <Box sx={{display: 'flex', alighItems: 'center', marginTop: '10px'}}>
        <Skeleton variant="circular" width={50} height={50} sx={{marginRight: '10px', flexShrink: 0, display: 'flex'}}/>
        <Box sx={{display: 'block'}}>
          <Skeleton variant="rounded" width={450} height={8} sx={{marginTop: '10px'}} /><Skeleton variant="rounded" width={350} height={5} sx={{marginTop: '10px'}} />
        </Box>
      </Box>
      <Box sx={{display: 'flex', alighItems: 'center', marginTop: '10px'}}>
        <Skeleton variant="circular" width={50} height={50} sx={{marginRight: '10px', flexShrink: 0, display: 'flex'}}/>
        <Box sx={{display: 'block'}}>
          <Skeleton variant="rounded" width={450} height={8} sx={{marginTop: '10px'}} /><Skeleton variant="rounded" width={350} height={5} sx={{marginTop: '10px'}} />
        </Box>
      </Box>
    </>
  )

  return (
    <DashboardContent sx={{ m: 0, p: '0 !important', minHeight: "480px" }}>
      <Tabs value={tabs.value} onChange={(event, newValue) => {
        setActiveTab(tabsData[0].index.toString())
        tabs.onChange(event, newValue)
      }} sx={{ mb: { xs: 3, md: 1 } }}>
        {TABS.map((tab) => (
          <Tab key={tab.value} label={tab.label} value={tab.value} />
        ))}
      </Tabs>
      <Divider sx={{ borderBottom: 1, borderColor: '#919EAB24' }} />
      {
        loading ?
          renderSkeletonLoader()
          :
          <>
            {finalData && <>
              {tabs.value === 'brand' && brandsList && brandsList.length > 0 && tabsData && <BrandCancellations brandsData={tabsData} isCancellation data={finalData} loading={loading} tabValue={tabs.value} setActiveTab={setActiveTab} activeTab={activeTab} />}
              {tabs.value === 'city' && tabsData && <CityCancellations citiesData={tabsData} isCancellation data={finalData} loading={loading} tabValue={tabs.value} setActiveTab={setActiveTab} activeTab={activeTab} />}
              {tabs.value === 'project' && tabsData && <ProjectCancellations projectsData={tabsData} isCancellation data={finalData} loading={loading} tabValue={tabs.value} setActiveTab={setActiveTab} activeTab={activeTab} />}
            </>}
          </>
      }
    </DashboardContent>
  );
}

export default Cancellations;
