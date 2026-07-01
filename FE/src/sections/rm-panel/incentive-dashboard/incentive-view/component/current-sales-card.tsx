import { useTheme } from '@mui/material';

import { Chart, useChart } from 'src/components/chart';

type Props = Readonly<{
  chart: {
    colors?: string[];
    series: [number];
  };
  values: any;
}>;

export function ChartSemiCircleGauge({ chart, values }: Props) {
  const theme = useTheme();
  const chartColors = chart.colors ?? [theme.palette.secondary.main, theme.palette.secondary.light];

  const chartOptions = useChart({
    chart: {
      offsetY: 18,
      sparkline: { enabled: true },
    },
    fill: {
      type: 'gradient',
      gradient: {
        colorStops: [
          {
            offset: 0,
            color: chartColors[0],
            opacity: 1,
          },
          {
            offset: 100,
            color: chartColors[0],
            opacity: 1,
          },
        ],
      },
    },
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        hollow: { margin: -20 },
        track: { margin: -20 },
        dataLabels: {
          name: { offsetY: 8 },
          value: { offsetY: -25, fontWeight: 'bold', fontSize: '24px' },
          total: {
            // label: `Used of `,
            color: theme.vars.palette.text.disabled,
            fontSize: theme.typography.caption.fontSize as string,
            fontWeight: theme.typography.caption.fontWeight,
          },
        },
      },
    },
    annotations: {
      // position: 'front',
      texts: [
        {
          x: 15, // Left end of the semi-circle
          y: 110, // Adjust for proper positioning
          text: `${values?.startRange?.value ?? ''} ${values?.startRange?.unit ?? ''}`,
          fontSize: '14px',
          fontWeight: 'bold',
          foreColor: theme.palette.text.primary, // Correct attribute for text color
          textAnchor: 'start',
        },
        {
          x: 180, // Right end of the semi-circle
          y: 110, // Adjust for proper positioning
          text: `${values?.endRange?.value ?? ''} ${values?.endRange?.unit ?? ''}`,
          fontSize: '14px',
          fontWeight: 'bold',
          foreColor: theme.palette.text.primary, // Correct attribute for text color
          textAnchor: 'end',
        },
      ],
    },
  });

  return (
    <Chart
      type="radialBar"
      series={chart.series}
      options={chartOptions}
      sx={{ width: 200, height: '100%'}}
    />
  );
}
