import type { RootState, AppDispatch } from 'src/redux/store';

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
// eslint-disable-next-line import/no-extraneous-dependencies
import { useInView } from 'react-intersection-observer';

import { Box, Card, Grid, Skeleton, Typography } from '@mui/material';

import { useAppSelector } from 'src/hooks/use-redux';

import { getInitials } from 'src/utils/helper';

import { CONFIG } from 'src/config-global';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchBrands } from 'src/redux/actions/admin/brands-actions';
import { getHighestRevenue } from 'src/redux/actions/leader-board/highest-revenue-action';
import { getMostEfficientRMList } from 'src/services/leader-board-services/most-efficient-rms-service';
import { getHighestUnitsSoldList } from 'src/services/leader-board-services/highest-units-sold-service';
import {
  fetchAllCities,
  fetchProjectByBrandIdAndCityId,
} from 'src/redux/actions/admin/common-actions';
import { getTopRelationshipManagerList } from 'src/services/leader-board-services/top-relationship-manager-service';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import Cancellations from './components/cancellations';
import TopPerformers from './components/top-performers';
import HighestUnitsList from './components/highest-units-list';
import { MostEfficientRms } from './components/most-efficient-rms';
import { HighestRevenueSummary } from './components/highest-revenue-earn';
import TopRelationshipManagerList from './components/top-relationship-manager-list';

export const LeaderBoardView = () => {
  const [mostEfficientRMList, setMostEfficientRMList] = useState();
  const [isHighestUnitLoading, setIsHighestUnitLoading] = useState(false);
  const [isTopRMLoading, setIsTopRMLoading] = useState(false);
  const [isEfficientRMLoading, setIsEfficientRMLoading] = useState(false);
  const [topRMList, setTopRMList] = useState<any>();
  const [highestUnitsSoldList, setHighestUnitsSoldList] = useState();
  const dispatch: AppDispatch = useDispatch();
  const { revenue, loading } = useSelector((state: RootState) => state.highestRevenue);
  const { brandsList } = useAppSelector((state) => state.brandsList);
  const { projects } = useAppSelector((state) => state.common);
  const { cities } = useAppSelector((state) => state.common);
  const { ref: efficientRMRef, inView: efficientRMInView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });
  const { ref: cancellationsRef, inView: cancellationsInView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  useEffect(() => {
    dispatch(getHighestRevenue());
  }, [dispatch]);

  useEffect(() => {
    Promise.all([
      dispatch(fetchBrands({ fetchAll: true })),
      dispatch(fetchAllCities({})),
      // @ts-ignore
      dispatch(fetchProjectByBrandIdAndCityId({})),
    ]);
  }, [dispatch]);

  useEffect(() => {
    // @ts-ignore
    if (cities?.cities?.length > 0 && projects?.length > 0 && brandsList?.length > 0) {
      localStorage.setItem('defaultProjectId', projects[0].id.toString());
      // @ts-ignore
      localStorage.setItem('defaultCityId', cities.cities[0].id.toString());
      localStorage.setItem('defaultBrandId', brandsList[0].id.toString());
    }
  }, [dispatch, projects, cities, brandsList]);

  const fetchMostEfficientRMList = async () => {
    try {
      setIsEfficientRMLoading(true);
      const response = await getMostEfficientRMList();

      setMostEfficientRMList(response);
      setIsEfficientRMLoading(false);
    } catch (error) {
      console.log(error);
      setIsEfficientRMLoading(false);
    }
  };

  const fetchTopRelationshipManagerList = async () => {
    try {
      setIsTopRMLoading(true);
      const response = await getTopRelationshipManagerList();

      if (response?.rms?.length) {
        const updatedResponse = response?.rms?.map((user: any) => ({
          ...user,
          amount: `${user.totalSales}`,
          totalSales: undefined,
        }));

        setTopRMList(updatedResponse);
        setIsTopRMLoading(false);
      }
    } catch (error) {
      console.log(error);
      setIsTopRMLoading(false);
    }
  };

  // fetchHighestUnitsSoldList-----
  const fetchHighestUnitsSoldList = async () => {
    try {
      setIsHighestUnitLoading(true);
      const response = await getHighestUnitsSoldList();
      const updatedResponse = response?.map((user: any) => ({
        ...user,
        amount: user.bookingsCount,
        bookingsCount: undefined,
      }));

      setHighestUnitsSoldList(updatedResponse);
      setIsHighestUnitLoading(false);
    } catch (error) {
      console.log(error);
      setIsHighestUnitLoading(false);
    }
  };

  useEffect(() => {
    fetchMostEfficientRMList();
    fetchTopRelationshipManagerList();
    fetchHighestUnitsSoldList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <Skeleton variant="rounded" width={250} height={8} sx={{ marginTop: '10px' }} />
          <Skeleton variant="rounded" width={150} height={5} sx={{ marginTop: '10px' }} />
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
          <Skeleton variant="rounded" width={250} height={8} sx={{ marginTop: '10px' }} />
          <Skeleton variant="rounded" width={150} height={5} sx={{ marginTop: '10px' }} />
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
          <Skeleton variant="rounded" width={250} height={8} sx={{ marginTop: '10px' }} />
          <Skeleton variant="rounded" width={150} height={5} sx={{ marginTop: '10px' }} />
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
          <Skeleton variant="rounded" width={250} height={8} sx={{ marginTop: '10px' }} />
          <Skeleton variant="rounded" width={150} height={5} sx={{ marginTop: '10px' }} />
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
          <Skeleton variant="rounded" width={250} height={8} sx={{ marginTop: '10px' }} />
          <Skeleton variant="rounded" width={150} height={5} sx={{ marginTop: '10px' }} />
        </Box>
      </Box>
    </>
  );
  return (
    <DashboardContent>
             <CustomBreadcrumbs 
                    heading="Leaderboard" 
                    sx={{ 
                      mb: { xs: 0.5 },
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      backgroundColor: 'background.default',
                      py: 0.25
                    }} 
                  />
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7} lg={8}>
          <Card sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Highest Revenue Earners
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex' }}>
                <Skeleton variant="rounded" width={510} height={100} sx={{ marginRight: '10px' }} />
                <Skeleton variant="rounded" width={510} height={100} sx={{ marginRight: '10px' }} />
                <Skeleton variant="rounded" width={510} height={100} sx={{ marginRight: '10px' }} />
              </Box>
            ) : (
              <Grid
                container
                spacing={2}
                alignItems="stretch"
                sx={
                  {
                    // display: 'flex',
                    // justifyContent: "space-between"
                  }
                }
              >
                {revenue?.map((item: any, index: number) => {
                  const getColor = (period: string) => {
                    switch (period) {
                      case 'YTD':
                        return { light: '#cafac2', dark: '#8bd891' };
                      case 'QTD':
                        return { light: '#c5f5fe', dark: '#8adfee' };
                      case 'MTD':
                        return { light: '#fce3af', dark: '#e9c988' };
                      default:
                        return { light: '#61F3F3', dark: '#0077B6' };
                    }
                  };

                  const getIconBackground = (period: string) => {
                    switch (period) {
                      case 'YTD':
                        return '#005511';
                      case 'QTD':
                        return '#004450';
                      case 'MTD':
                        return '#5A3C00';
                      default:
                        return 'info';
                    }
                  };

                  return (
                    <Grid item key={index} xs={12} sm={4} md={4} lg={4} sx={{ display: 'flex' }}>
                      <HighestRevenueSummary
                        sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                        initials={getInitials(item.user.name)}
                        title={item.user.name}
                        period={item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                        total={item.totalSales}
                        // @ts-ignore
                        color={getColor(item.type)}
                        icon={
                          <Box
                            sx={{
                              backgroundColor: getIconBackground(item.type),
                              borderRadius: '50%',
                              width: 50,
                              height: 40,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <img
                              alt="icon"
                              src={`${CONFIG.site.basePath}/assets/icons/home/trophy.svg`}
                            />
                          </Box>
                        }
                      />
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Card>
          {/* TopPerformers---- */}
          <Card sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Top 10 Performers
            </Typography>
            <TopPerformers />
          </Card>
        </Grid>

        <Grid item xs={12} md={5} lg={4}>
          <Card sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, ml: 3 }}>
              Highest Units Sold
            </Typography>
            <Box sx={{ maxHeight: '350px', ml: 3, overflowY: 'auto' }}>
              {isHighestUnitLoading ? (
                renderSkeletonLoader()
              ) : (
                <HighestUnitsList highestUnitsSoldList={highestUnitsSoldList} />
              )}
            </Box>
          </Card>
          <Card sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, ml: 3 }}>
              Top 10 Relationship Managers
            </Typography>
            {isTopRMLoading ? (
              renderSkeletonLoader()
            ) : (
              <>
                {topRMList && topRMList.length > 0 && (
                  <Box sx={{ maxHeight: '355px', ml: 3, overflowY: 'auto', width: '94%' }}>
                    <TopRelationshipManagerList
                      topRMList={[
                        ...topRMList,
                        { totalCancellations: undefined },
                        { isHighestUnitsSold: false },
                      ]}
                    />
                  </Box>
                )}
              </>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* Most Efficient RMs------ */}
      <Card sx={{ pt: 2, mb: 3 }} ref={efficientRMRef}>
        <Typography variant="subtitle2" sx={{ mb: 2, px: 3 }}>
          Most Efficient RMs
        </Typography>
        <Box sx={{ width: '100%', display: 'flex' }}>
          {efficientRMInView && isEfficientRMLoading ? (
            <Box sx={{ display: 'flex' }}>
              <Skeleton variant="rounded" width={510} height={100} sx={{ marginRight: '10px' }} />
              <Skeleton variant="rounded" width={510} height={100} sx={{ marginRight: '10px' }} />
              <Skeleton variant="rounded" width={510} height={100} sx={{ marginRight: '10px' }} />
            </Box>
          ) : (
            <MostEfficientRms mostEfficientRMList={mostEfficientRMList} />
          )}
        </Box>
      </Card>
      {/* Cancellations----- */}
      <Card sx={{ p: 2 }} ref={cancellationsRef}>
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          Cancellations
        </Typography>
        {cancellationsInView && <Cancellations />}
      </Card>
    </DashboardContent>
  );
};

export default LeaderBoardView;
