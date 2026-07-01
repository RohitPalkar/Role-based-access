import { useState, useEffect } from 'react';

import { Box, Card, Stack, Skeleton, Typography } from '@mui/material';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { fetchCurrentSalesChartData } from 'src/redux/actions/incentive-dashboard/dashboard-charts-actions';

import { ChartSelect } from 'src/components/chart';
import { Carousel, useCarousel, CarouselArrowBasicButtons } from 'src/components/carousel';

import { ChartSemiCircleGauge } from './current-sales-card';

type Props = {
  data: {
    id: string;
    title: string;
    coverUrl: string;
    description: string;
  }[];
};

const CURRENT_SALES_OPTION_KEYS = {
  LAUNCH: 'Launch',
  SUSTENANCE: 'Sustenance',
};

export function IncentiveRatesAndAmounts() {
  const dispatch = useAppDispatch();

  const carousel = useCarousel({
    align: 'start',
    slideSpacing: '20px',
    slidesToShow: {
      xs: 1,
      sm: 2,
      md: 3,
      lg: 4,
    },
  });
  const [value, setValue] = useState<string>(
    'Launch' // Default to "Launch"
  );
  useEffect(() => {
    const phaseType = value === 'Sustenance' ? CURRENT_SALES_OPTION_KEYS.SUSTENANCE : CURRENT_SALES_OPTION_KEYS.LAUNCH;
    dispatch(fetchCurrentSalesChartData({ phaseType }));
  }, [dispatch, value]);

  const { semicircleChartData, loading } = useAppSelector((state) => state.semicircleChartData);
  const currentDate = new Date();
  const monthYear = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  
  return (
    <Card
      sx={{
        display: { lg: 'flex', md: 'flex', xs: 'block' },
        my: 4,
        border: '1px solid #ccc',
        py: 3,
        px: 2.3,
        // minHeight: { md: '430px' },
      }}
    >
      <Box sx={{ width: '100%' }}>
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              // justifyContent: 'center',
              minHeight: { md: '300px' },
            }}
          >
            <Stack spacing={5} direction="row" alignItems="center" sx={{ mt: 4 }}>
              <Skeleton
                sx={{
                  borderRadius: 1.5,
                  width: 250,
                  height: 250,
                  flexShrink: 0,
                }}
              />
              <Skeleton sx={{ width: 250, height: 250 }} />
              <Skeleton sx={{ width: 250, height: 250 }} />
            </Stack>
          </Box>
        ) : (
          <Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '16px',
                marginBottom: '10px',
                color: '#1A407D',
              }}
            >
              {monthYear}
            </Box>
            <Box
              sx={{
                display: 'flex',
                mx: { md: 3, xs: 0 },
                justifyContent: 'space-between',
                flexDirection: { xs: 'column', md: 'row' },
              }}

            >
              <Box
                sx={{ display: 'flex', flexDirection: 'column', order: { xs: 2, md: 0 } }}

              >
                <Box sx={{ display: 'flex', flexDirection: { md: 'row', xs: 'column' } }}>
                  <Box sx={{ display: 'flex' }}>
                    <Typography
                      variant="h3"
                      sx={{
                        textWrap: 'nowrap',
                        fontWeight: 'light',
                        mr: 2,
                        mb: { xs: 1.5, sm: 3, md: 3, lg: 0 },
                        fontSize: { md: '16px !important', xs: '14px !important' },
                      }}
                    >
                      Regularized Sales:
                    </Typography>
                    {semicircleChartData?.currentSales != null ? (
                      <Typography
                        variant="h3"
                        sx={{
                          textWrap: 'nowrap',
                          color: '#FF5630',
                          fontWeight: 'light',
                          fontSize: { md: '16px !important', xs: '14px !important' },
                          mr: 4,
                          mb: { xs: 1.5, sm: 3, md: 3, lg: 0 },
                        }}
                      >{`${semicircleChartData?.currentSales?.value} ${semicircleChartData?.currentSales?.unit}`}</Typography>
                    ) : (
                      <Typography
                        variant="h3"
                        sx={{
                          textWrap: 'nowrap',
                          opacity: 0.6,
                          fontWeight: 'light',
                          fontSize: { md: '16px !important', xs: '14px !important' },
                          mr: 4,
                          mb: { xs: 1.5, sm: 3, md: 3, lg: 0 },
                        }}
                      >
                        No data
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex' }}>
                    <Typography
                      variant="h3"
                      sx={{
                        textWrap: 'nowrap',
                        fontSize: { md: '16px !important', xs: '14px !important' },
                        fontWeight: 'light',
                        mr: 2,
                        mb: { xs: 1.5, sm: 3, md: 3, lg: 0 },
                      }}
                    >
                      Incentive :
                    </Typography>
                    {semicircleChartData?.earnedIncentive != null ? (
                      <Typography
                        variant="h3"
                        sx={{
                          textWrap: 'nowrap',
                          fontSize: { md: '16px !important', xs: '14px !important' },
                          color: '#22C55E',
                          fontWeight: 'light',
                          mr: 4,
                          mb: { xs: 1.5, sm: 3, md: 3, lg: 0 },
                        }}
                      >{`${semicircleChartData?.earnedIncentive?.value} ${semicircleChartData?.earnedIncentive?.unit}`}</Typography>
                    ) : (
                      <Typography
                        variant="h3"
                        sx={{
                          textWrap: 'nowrap',
                          opacity: 0.6,
                          fontSize: { md: '16px !important', xs: '14px !important' },
                          fontWeight: 'light',
                          mr: 4,
                          mb: { xs: 1.5, sm: 3, md: 3, lg: 0 },
                        }}
                      >
                        No data
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: { xs: 'flex-start', md: 'flex-end' },
                  mb: { xs: 2, md: 0 },
                  width: { xs: '100%', md: '20%' },
                }}

              >
                <ChartSelect
                  options={['Launch', 'Sustenance']}
                  // @ts-ignore
                  value={value}
                  onChange={(newValue) => {
                    setValue(newValue || 'Launch');
                  }}
                />
              </Box>
            </Box>
            <Box sx={{ mx: 3, mt: 2 }}>
              {loading ? (
                <Stack spacing={5} direction="row" alignItems="center" sx={{ mt: 4 }}>
                  <Skeleton
                    sx={{
                      borderRadius: 1.5,
                      width: 250,
                      height: 250,
                      flexShrink: 0,
                    }}
                  />
                  <Skeleton sx={{ width: 250, height: 250 }} />
                  <Skeleton sx={{ width: 250, height: 250 }} />
                </Stack>
              ) : (
                <Box sx={{ width: '100%' }}>
                  {semicircleChartData?.slabs ? (
                    <Box>
                      <Box
                        sx={{
                          width: '100%',
                        }}
                        className={
                          semicircleChartData?.slabs?.length > 4 ? '' : 'CurrentSalesCaroselWrap'
                        }
                      >
                        <Carousel
                          carousel={carousel}
                          sx={{
                            width: '100%',
                          }}
                        >
                          {semicircleChartData?.slabs?.map((item, index) => (
                              <CarouselItem
                                key={item?.slabId ?? `slab-${index}`}
                                index={index}
                                data={item}
                              />
                            ))}
                        </Carousel>
                      </Box>
                      {Array.isArray(semicircleChartData?.slabs) &&
                        // @ts-ignore
                        semicircleChartData?.slabs?.length > 4 && (
                          <Box
                            sx={{
                              width: '100%',
                              display: 'flex',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                              fontSize: '10px',
                              my: 2,
                              mr: 2,
                            }}
                          >
                            <CarouselArrowBasicButtons
                              sx={{
                                fontSize: '2rem',
                                color: '#333', // Darker shade for the arrows
                              }}
                              {...carousel.arrows}
                              options={carousel.options}
                            />
                          </Box>
                        )}
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: { md: '28vh' },
                      }}
                    >
                      <Typography>No data available</Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type CarouselItemProps = {
  index: number;
  item: Props['data'][number];
};

function CarouselItem({ data, index }: any) {
  return (
    <Box sx={{ borderRadius: 2, position: 'relative', mx: 0 }}>
      <Card
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          my: 2,
          boxShadow: '4px 4px 10px rgba(0, 0, 0, 0.08)',
        }}
      >
        <Box>
          <ChartSemiCircleGauge
            chart={{
              series: [
                Number(data?.completedPercentage?.value) || 0,
              ] as [number],
            }}
            values={{
              completedPercentage: data?.completedPercentage,
              startRange: data?.startRange,
              endRange: data?.endRange,
              incentiveRate: data?.incentiveRate,
              incentiveAmount: data?.incentiveAmount,
            }}
          />
          {/* <ChartSemiCircleGauge chart={{ series: [data?.completedPercentage.value] }} /> */}
        </Box>
        <Box sx={{ my: 0, textAlign: 'start', width: '100%', px: 2, pt: 0, pb: 2 }}>
          {' '}
          {/* Add margin-top for spacing */}
          <Box sx={{ my: 1, display: 'flex', justifyContent: 'space-between' }}>
            <Typography>Incentive rate</Typography>
            <Typography>{`${data?.incentiveRate?.value ?? ''} ${data?.incentiveRate?.unit ?? ''}`}</Typography>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
export default IncentiveRatesAndAmounts;
