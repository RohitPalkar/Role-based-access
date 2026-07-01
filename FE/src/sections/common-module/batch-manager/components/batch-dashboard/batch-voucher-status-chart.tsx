import type { ColumnMultipleChartData } from 'src/components/chart/column-multiple-bar-chart';

import { Card, CardHeader, CardContent } from '@mui/material';

import uiText from 'src/locales/langs/en/common.json';

import ColumnMultipleBarChart from 'src/components/chart/column-multiple-bar-chart';

const BatchVoucherStatusChart = () => {
  const { dayWiseStatistics } = uiText.batchManager.dashboard;

  const batchVoucherStatusMockData: ColumnMultipleChartData = {
    categories: dayWiseStatistics.categories,

    series: [
      {
        name: dayWiseStatistics.series.invited,
        data: [1000, 1000, 1000, 1000],
      },
      {
        name: dayWiseStatistics.series.attended,
        data: [870, 875, 880, 878],
      },
      {
        name: dayWiseStatistics.series.unitsBooked,
        data: [180, 185, 190, 188],
      },
      {
        name: dayWiseStatistics.series.agreeementSigned,
        data: [120, 118, 122, 121],
      },
    ],
  };

  return (
    <Card>
      <CardHeader title={dayWiseStatistics.title} />

      <CardContent>
        <ColumnMultipleBarChart chart={batchVoucherStatusMockData} />
      </CardContent>
    </Card>
  );
};

export default BatchVoucherStatusChart;
