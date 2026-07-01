import type { InventoryWiseSplitListPayload } from 'src/services/admin-services/eoi-dashboard-service';

import dayjs from 'dayjs';
import React, { useMemo, useState, useEffect, useCallback } from 'react';

import { Box, Card, Typography } from '@mui/material';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { formatDateIST } from 'src/utils/helper';

import uiText from 'src/locales/langs/en/common.json';
import { fetchInventoryWiseSplit } from 'src/redux/actions/admin/eoi-dashboard-actions';

import { Chart } from 'src/components/chart';
import { AnimateLogo1 } from 'src/components/animate';

import BHKTableToolbar from './bhk-wise-split-table-toolbar';

import type { BHKFilters } from './bhk-wise-split-table-toolbar';

const BHKListView = () => {
  const dispatch = useAppDispatch();
  const { filters: roleFilters } = useRoleBasedPermissions({
    module: 'bhkWiseSplit',
  });

  const { campaigns } = useAppSelector((state) => state.expressonOfInterest);
  const { inventoryWiseSplit } = useAppSelector((state) => state.eoiDashboard);

  // -----------------------------
  // Local Chart State
  // -----------------------------
  const [chartData, setChartData] = useState({
    labels: [] as string[],
    series: [] as number[],
    loading: true,
  });

  // -----------------------------
  // Filters
  // -----------------------------
  const [filters, setFilters] = useState<BHKFilters>({
    campaign: null,
    startDate: null,
    endDate: dayjs(),
  });

  // Format campaign options
  const campaignOptions = useMemo(
    () =>
      campaigns?.map((item) => ({
        label: item?.name,
        value: String(item?.value),
      })) || [],
    [campaigns]
  );
  const selectedCampaignLabel = useMemo(() => campaignOptions.find((c) => c.value === filters.campaign)?.label || '', [campaignOptions, filters.campaign]);

  // Date range label
  const launchTillText = useMemo(() => {
    const today = formatDateIST(new Date(), { hideTime: true });

    if (filters.startDate && filters.endDate) {
      return `${
        formatDateIST(
          typeof filters.startDate === 'string'
            ? filters.startDate
            : filters.startDate.toDate(),
          { hideTime: true }
        )
      } to ${
        formatDateIST(
          typeof filters.endDate === 'string'
            ? filters.endDate
            : filters.endDate.toDate(),
          { hideTime: true }
        )
      }`;
    }

    return `Launch till ${today}`;
  }, [filters.startDate, filters.endDate]);

  // Auto-select last campaign
  useEffect(() => {
    if (campaignOptions?.length > 0 && !filters?.campaign) {
      setFilters((prev) => ({
        ...prev,
        campaign: campaignOptions[campaignOptions.length - 1].value,
      }));
    }
  }, [campaignOptions, filters?.campaign]);


  // -----------------------------
  // Fetch API on filter changes
  // -----------------------------
  useEffect(() => {
    if (!filters.campaign) return;

    setChartData((prev) => ({ ...prev, loading: true }));

    const payload: InventoryWiseSplitListPayload = {
      campaignId: filters.campaign,
      ...(filters.startDate && { startDate: filters.startDate }),
      ...(filters.endDate && { endDate: filters.endDate }),
    };

    dispatch(fetchInventoryWiseSplit(payload));
  }, [dispatch, filters]);


  // -----------------------------
  // Update local chart state when API returns data
  // -----------------------------
  useEffect(() => {
    if (!inventoryWiseSplit) {
      setChartData({
        labels: [],
        series: [],
        loading: false,
      });
      return;
    }

    const labels = inventoryWiseSplit?.data?.labels || [];
    const series = inventoryWiseSplit?.data?.series || [];

    setChartData({
      labels,
      series,
      loading: false,
    });
  }, [inventoryWiseSplit]);



  // Filter handler
  const handleFiltersChange = useCallback((newFilters: BHKFilters) => {
    setFilters(newFilters);
  }, []);



  const renderChartArea = () => {
    if (chartData?.loading) {
      return <AnimateLogo1 />;
    }
    if (!chartData?.series || chartData.series.length === 0) {
      return (
        <Typography variant="h6" sx={{ opacity: 0.6 }}>
          {uiText.eoiDashboard.noDataAvailable}
        </Typography>
      );
    }
    return (
      <Chart
        type="pie"
        sx={{
          height: 300
        }}
        series={chartData?.series}
        options={{
          labels: chartData?.labels,
          fill: { opacity: 0.9 },
          noData: { text: uiText.eoiDashboard.noDataAvailable },
          stroke: { width: 0 },
          tooltip: {
            enabled: true,
            theme: "light",
            fillSeriesColor: false, 
            marker: {
              show: true, 
            },
          },
          dataLabels: {
            enabled: true,
            formatter: (value, opts) => {
              const index = opts?.seriesIndex ?? 0;
              const count = chartData?.series?.[index] ?? 0;
              const percent = Number(value).toFixed(1);
              return `${percent}% (${count})`;
            },
          },
          plotOptions: {
            pie: {
              dataLabels: {
                offset: -40,
                minAngleToShowLabel: 10,
              },
            },
          },

          responsive: [
            {
              breakpoint: 768, // mobile & small tablets
              options: {
                chart: {
                  height: 320,
                },
                legend: {
                  show: true,
                  position: 'top',
                  horizontalAlign: 'center',
                  fontSize: '14px',
                },
                dataLabels: {
                  enabled: false,
                },
              },
            },
          ],
        }}
      />
    );
  };

  return (
    <Card>
      {/* HEADER + FILTERS */}

      {/* HEADER + FILTERS */}
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', sm: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          p: 2,
        }}
      >
        <Box>
        {/* TITLE */}
        <Typography
          variant="h6"
          sx={{
            textAlign: { xs: 'left', sm: 'left', md: 'left' },
            width: { xs: '100%', md: 'auto' },
            mb: 0.5,
          }}
        >
          {selectedCampaignLabel}
        </Typography>
        <Typography
          sx={{
            textAlign: { xs: 'left', sm: 'left', md: 'left' },
            width: { xs: '100%', md: 'auto' },
            fontSize: '16px'
          }}
        >
          {uiText.eoiDashboard.bhkWiseSplit.title} - ({launchTillText})
        </Typography>
        </Box>

        {/* FILTER TOOLBAR */}
        <Box
          sx={{
            width: { xs: '100%', md: 'auto' },
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: { xs: 'flex-start', md: 'flex-end' },
          }}
        >
          <BHKTableToolbar
            filters={filters}
            onApplyFilters={handleFiltersChange}
            roleFilters={roleFilters}
            campaignOptions={campaignOptions}
          />
        </Box>
      </Box>


      {/* CHART AREA */}
      <Box
        sx={{
          height: 350,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        {renderChartArea()}
      </Box>
    </Card>
  );
};

export default BHKListView;
