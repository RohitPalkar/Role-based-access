import type { CardProps } from '@mui/material/Card';
import type { ChartOptions } from 'src/components/chart';

import { useState, useEffect, useCallback } from 'react';

import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';

import { fetchUserTarget } from 'src/services/incentive-dashboard-services/incentive-dashboard';

import { Chart, useChart, ChartSelect, ChartLegends } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
};

type ChartData = {
  colors?: string[];
  name: string;
  unit: string;
  categories: string[];
  data: {
    name: string;
    data: number[];
  }[];
  options?: ChartOptions;
};

export function TargetStatistics({ title, subheader, ...other }: Props) {
  const theme = useTheme();
  const [userTarget, setUserTarget] = useState<ChartData>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedSeries, setSelectedSeries] = useState('Monthly');

  const getUserTarget = useCallback(async (type: string) => {
    try {
      setIsLoading(true);

      const payload = {
        type: type.toLowerCase(),
      };
      const response = await fetchUserTarget(payload);

      setUserTarget(response);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    getUserTarget(selectedSeries);
  }, [selectedSeries, getUserTarget]);

  const chartColors = userTarget?.colors ?? [
    theme.palette.primary.main,
    theme.palette.warning.main,
    theme.palette.success.main,
  ];
  const chartOptions = useChart({
    stroke: { width: 2, colors: ['transparent'] },
    colors: chartColors,
    xaxis: { 
      categories: userTarget?.categories,
      labels: {
        rotate: 0, // No rotation for desktop
        rotateAlways: false, // Don't force rotation on desktop
        style: {
          fontSize: '11px',
          fontWeight: 600, // Make labels bolder
        },
        offsetX: 0, // No shift needed without rotation
        offsetY: 5,
        trim: false, // Prevent trimming of labels
        hideOverlappingLabels: true, // Hide overlapping labels for better readability
        minHeight: 40, // Ensure enough height for labels
      },
      axisBorder: {
        show: true,
      },
      axisTicks: {
        show: true,
      },
      tickAmount: userTarget?.categories?.length, // Force one tick per category
      tickPlacement: 'between', // Place ticks between bars for better spacing
    },
    chart: {
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
      parentHeightOffset: 0,
      offsetY: 0,
      offsetX: 0,
      width: '100%', // Ensure chart uses full width
    },
    responsive: [
      {
        breakpoint: 600, // Mobile breakpoint
        options: {
          plotOptions: {
            bar: {
              columnWidth: '30%', // Even narrower bars on mobile for more spacing
              distributed: true, // Ensure bars are distributed evenly
            },
          },
          xaxis: {
            labels: {
              rotate: -60, // Increase rotation angle for better spacing
              rotateAlways: true, // Force rotation on mobile
              style: {
                fontSize: '9px', // Smaller font on mobile
                fontWeight: 700, // Bolder text for better readability
              },
              offsetX: -3,
              offsetY: 7,
              minHeight: 30, // Ensure enough height for labels
              maxHeight: 60, // Limit maximum height
              trim: false, // Don't trim labels
            },
          },
          chart: {
            height: 350, // Slightly taller chart on mobile for better label visibility
          },
        },
      },
    ],
    tooltip: {
      theme: 'light', // Ensures contrast against dark backgrounds
      style: {
        fontSize: '14px',
      },
      y: {
        formatter: (value: number) => `₹ ${value.toLocaleString()} Cr`, // Formats large numbers with commas
      },
      fillSeriesColor: false, // Ensures tooltip is separate from bar color
      marker: {
        show: true, // Adds small marker dots for clarity
      },
    },
    grid: {
      padding: {
        bottom: 50, // Add extra bottom margin for x-axis labels
      },
    },
    ...userTarget?.options,
  });

  const handleChangeSeries = useCallback((newValue: string) => {
    setSelectedSeries(newValue);
  }, []);
  return (
    <Card {...other}>
      <CardHeader
        title={title}
        subheader={subheader}
        action={
          <ChartSelect
            options={['Monthly', 'Yearly']}
            value={selectedSeries}
            onChange={handleChangeSeries}
          />
        }
        sx={{ mb: 3 }}
      />

      {isLoading && <p>Loading...</p>}

      {!userTarget && <p>No data found!!</p>}

      {userTarget && (
        <>
          <ChartLegends
            colors={chartOptions?.colors as string[]}
            labels={userTarget?.data?.map((item) => item.name)}
            unit={userTarget?.unit}
            sx={{ px: 3, gap: 3, justifyContent: 'end' }}
          />

          <Chart
            type="bar"
            series={userTarget?.data || ''}
            options={chartOptions}
            sx={{ height: 350, width: '100%' }}
          />
        </>
      )}
    </Card>
  );
}
