import { Box, Card, Grid, Stack, Typography } from "@mui/material";

import { Chart } from "src/components/chart"; // your shared chart
import type { ApexOptions } from "apexcharts";
import type { DailyTrackerPayload } from "src/services/admin-services/eoi-dashboard-service";

import React, { useMemo, useState, useEffect, useCallback } from 'react';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { formatDateIST } from "src/utils/helper";

import uiText from 'src/locales/langs/en/common.json';
import { fetchDailyTracker } from "src/redux/actions/admin/eoi-dashboard-actions";

import { EOICards } from "../eoi-dashboard-cards/eoi-cards";
import DailyTrackerTableToolbar from './daily-tracker-table-toolbar';

import type { DailyTrackerFilters } from './daily-tracker-table-toolbar';

const DailyTrackerListView = () => {
  const dispatch = useAppDispatch();
  const { filters: roleFilters } = useRoleBasedPermissions({
    module: 'dailyTracker',
  });
  const jsonValue = uiText.eoiDashboard.dailyTracker;
  const { campaigns } = useAppSelector((state) => state.expressonOfInterest);
  const { dailyTrackerData } = useAppSelector((state) => state.eoiDashboard);

  const [filters, setFilters] = useState<DailyTrackerFilters>({
    campaign: null,
    startDate: null,
    endDate: null,
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

  // Date range label
  const dateRangeText = useMemo(() => {
    const start = dailyTrackerData?.data?.startDate;
    const end = dailyTrackerData?.data?.endDate;

    if (!start || !end) return '';

    return `${formatDateIST(start, { hideTime: true })} to ${formatDateIST(end, { hideTime: true })}`;
  }, [
    dailyTrackerData?.data?.startDate,
    dailyTrackerData?.data?.endDate,
  ]);

  // Auto-select last campaign
  useEffect(() => {
    if (campaignOptions?.length > 0 && !filters?.campaign) {
      setFilters((prev) => ({
        ...prev,
        campaign: campaignOptions[campaignOptions.length - 1].value,
      }));
    }
  }, [campaignOptions, filters?.campaign]);
  const selectedCampaignLabel = useMemo(() => campaignOptions.find((c) => c.value === filters.campaign)?.label || '', [campaignOptions, filters.campaign]);

  // API call based on filters
  useEffect(() => {
    if (!filters.campaign) return;

    const payload: DailyTrackerPayload = {
      campaignId: filters.campaign,
      ...(filters.startDate && { startDate: filters.startDate }),
      ...(filters.endDate && { endDate: filters.endDate }),
    };

    dispatch(fetchDailyTracker(payload));
  }, [dispatch, filters]);


  const handleFiltersChange = useCallback((newFilters: DailyTrackerFilters) => {
    setFilters(newFilters);
  }, []);
  const dailyTrackerlabelSeriesData = dailyTrackerData?.data?.result ?? [];

  const labels = dailyTrackerlabelSeriesData?.map((d: { date: any; }) => d?.date);

  const series = [
    {
      name: jsonValue.series.eoiLinkShared,
      data: dailyTrackerlabelSeriesData?.map((d: { eoiLinkShared: any; }) => d.eoiLinkShared ?? 0),
    },
    {
      name: jsonValue.series.formSubmitted,
      data: dailyTrackerlabelSeriesData?.map((d: { formSubmitted: any; }) => d.formSubmitted ?? 0),
    },
    {
      name: jsonValue.series.qidAssigned,
      data: dailyTrackerlabelSeriesData?.map((d: { vouchersActivated: any; }) => d.vouchersActivated ?? 0),
    },
    {
      name: jsonValue.series.newCpLink,
      data: dailyTrackerlabelSeriesData?.map((d: { newCpLink: any; }) => d.newCpLink ?? 0),
    },
  ];


  const options: ApexOptions = {
    chart: { type: "line", toolbar: { show: false } },
    stroke: { curve: "smooth", width: 3 },
    markers: { size: 4 },
    xaxis: { categories: labels },
    legend: { position: "top" },
    responsive: [
      {
        breakpoint: 600,
        options: {
          chart: { height: 250 },
          legend: { position: "bottom" },
          markers: { size: 3 },
        },
      },
    ],
  };


  const totals = useMemo(() => {
    const data = dailyTrackerData?.data?.result ?? [];
    return {
      totalShared: data?.reduce((a: any, b: { eoiLinkShared: any; }) => a + (b.eoiLinkShared ?? 0), 0),
      totalSubmitted: data?.reduce((a: any, b: { formSubmitted: any; }) => a + (b.formSubmitted ?? 0), 0),
      totalQid: data?.reduce((a: any, b: { vouchersActivated: any; }) => a + (b.vouchersActivated ?? 0), 0),
      totalCpLinks: data?.reduce((a: any, b: { newCpLink: any; }) => a + (b.newCpLink ?? 0), 0),
    };
  }, [dailyTrackerData]);





  return (
<Card sx={{ width: '100%' }}>   {/* Ensure full width always */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'center' }}
        spacing={2}
        sx={{ width: '100%' }}
      >
        {/* TITLE */}
        <Box
          sx={{
            flexShrink: 0,
            width: { xs: '100%', md: 'auto' },          // ✅ full width mobile
            mb: { md: 3, xs: 0 },
            pl: 2,
            pt: 2,
          }}
        >
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            {selectedCampaignLabel}
          </Typography>
          <Typography sx={{ fontSize: '16px' }}>
            {jsonValue.title} - ({dateRangeText})
          </Typography>
        </Box>

        {/* FILTERS TOOLBAR */}
        <Box
          sx={{
            flexGrow: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: { xs: 'flex-start', md: 'flex-end' },
            alignItems: { xs: 'stretch', md: 'center' },
            width: '100%',
            px: { xs: 2, md: 0 },
            mt: { xs: 0, md: 0 },
          }}
        >
          <DailyTrackerTableToolbar
            filters={filters}
            onApplyFilters={handleFiltersChange}
            roleFilters={roleFilters}
            campaignOptions={campaignOptions}
          />
        </Box>
      </Stack>

      {/* KPI CARDS */}
      <Grid container spacing={2} sx={{ mb: 3, px: { xs: 2, md: 0 } }}>
    <Grid item xs={12} sm={3}>     {/* xs = full width mobile */}
          <EOICards
            title={jsonValue.cardsTitle.totalEOIShared}
            amount={totals?.totalShared}
            gradientColor="#4B7BEC"
            isActive={false}
            type="daily"
            showRupeeSymbol={false}
            borderBottom={false}
          />
        </Grid>

        <Grid item xs={12} sm={3}>
          <EOICards
            title={jsonValue.cardsTitle.totalFormSubmitted}
            amount={totals?.totalSubmitted}
            gradientColor="#20BF6B"
            isActive={false}
            type="daily"
            showRupeeSymbol={false}
            borderBottom={false}
          />
        </Grid>

        <Grid item xs={12} sm={3}>
          <EOICards
            title={jsonValue.cardsTitle.totalQidAssigned}
            amount={totals?.totalQid}
            gradientColor="#FD9644"
            isActive={false}
            type="daily"
            showRupeeSymbol={false}
            borderBottom={false}
          />
        </Grid>

        <Grid item xs={12} sm={3}>
          <EOICards
            title={jsonValue.cardsTitle.totalNewCpLinks}
            amount={totals?.totalCpLinks}
            gradientColor="#8854D0"
            isActive={false}
            type="daily"
            showRupeeSymbol={false}
            borderBottom={false}
          />
        </Grid>
      </Grid>

      {/* CHART SECTION */}
  <Card sx={{ p: { xs: 2, md: 3 }, width: '100%' }}>   {/* Mobile friendly padding */}
        <Typography variant="h6" sx={{ mb: 2 }}>
          {jsonValue.dailyActivityTrend} - ({dateRangeText})
        </Typography>

        {dailyTrackerlabelSeriesData?.length > 0 ? (
      <Chart
        type="line"
        sx={{ height: 350}}
        series={series}
        options={options}
      />
        ) : (
          <Typography>{uiText.eoiDashboard.noDataAvailable}</Typography>
        )}
      </Card>
    </Card>

  );
}
export default DailyTrackerListView;
