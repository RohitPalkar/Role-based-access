import { Chart, useChart } from 'src/components/chart';

export interface ChartSeries {
  name: string;
  data: number[];
}

export interface ColumnMultipleChartData {
  categories: string[];
  series: ChartSeries[];
}

type Props = {
  chart: ColumnMultipleChartData;
};

const ColumnMultipleBarChart = ({ chart }: Props) => {
  const chartOptions = useChart({
    colors: ['#3AA392', '#C067BC', '#FFC857', '#42A9D1'],

    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'left',
      markers: {
        size: 5,
        shape: 'circle',
      },
    },

    xaxis: {
      categories: chart.categories,
    },

    plotOptions: {
      bar: {
        columnWidth: '30%',
        borderRadius: 4,
      },
    },

    stroke: {
      show: true,
      width: 2,
      colors: ['transparent'],
    },

    tooltip: {
      theme: 'light',
      shared: false,
      intersect: true,
      y: {
        formatter: (value: number) => `${value}`,
      },
    },
  });

  return (
    <Chart
      type="bar"
      series={chart.series}
      options={chartOptions}
      sx={{
        height: 400,

        '& .apexcharts-legend-text': {
          paddingLeft: '10px !important',
          marginLeft: '0px !important',
        },
      }}
    />
  );
};

export default ColumnMultipleBarChart;
