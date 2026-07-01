import type { CardProps } from '@mui/material/Card';
import type { ChartOptions } from 'src/components/chart';

import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';

import { Chart, useChart, ChartLegends } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  chart: {
    colors?: string[];
    series: {
      label: string;
      value: number;
    }[];
    options?: ChartOptions;
  };
};

export function AchievedIncentive({ title, chart, ...other }: Props) {
  const theme = useTheme();

  const chartColors = chart.colors ?? [
    '#1A407D',
    theme.palette.grey[300],
  ];

  const chartSeries = chart.series.map((item) => item.value);

  const chartOptions = useChart({
    chart: { sparkline: { enabled: true } },
    colors: chartColors,
    labels: chart.series.map((item) => item.label),
    stroke: { width: 0 },
    tooltip: {
        // @ts-ignore
      y: {
        formatter: (value: number) => (value),
        title: { formatter: (seriesName: string) => `${seriesName}` },
      },
    },
    plotOptions: {
        // @ts-ignore
      pie: {
        donut: {
          size: '80%',
          labels: {
            value: { formatter: (value: number | string) => (value) },
            total: {
              formatter: (w: {
                globals: {
                  seriesTotals: number[];
                };
              }) => {
                const sum = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                return (sum);
              },
            },
          },
        },
      },
    },
    ...chart.options,
  });

  return (
    <Card {...other}>
      <CardHeader  title={title} />

      <Chart
        type="donut"
        series={chartSeries}
        options={chartOptions}
        sx={{
          width: {
            xs: 240,
            xl: 260,
          },
          height: {
            xs: 200, 
            xl: 213,
          },
          my: 3, 
          mx: 'auto' 
        }}
      />

      <ChartLegends
        labels={chartOptions?.labels}
        colors={chartOptions?.colors as string[]}
        sx={{ p: 3, justifyContent: 'start', flexDirection:'column' }}
      />
    </Card>
  );
}
