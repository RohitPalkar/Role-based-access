import type { ColumnDefinition } from 'src/hooks/use-column-manager';
import type { EOIDashboardListPayload } from 'src/services/admin-services/eoi-dashboard-service';

import dayjs from 'dayjs';
import { toast } from 'sonner';
import React, { useMemo, useState, useEffect, useCallback } from 'react';

import CloseIcon from '@mui/icons-material/Close';
import { Box, Card, Stack, Table, Dialog, TableBody, IconButton } from '@mui/material';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { EOI_VIEW_BY_OPTIONS, EOI_DASHBOARD_TAB_OPTIONS } from 'src/utils/constant';
import {
  getTableStyles,
  calculateTableMinWidth,
} from 'src/utils/table-styles';

import { fetchEOICampaignsAction } from 'src/redux/actions/rm-panel/eoi-actions';
import { resetEOIDashboardList } from 'src/redux/slices/admin/eoi-dashboard-slice';
import { resetCampaigns, resetUnitTypes } from 'src/redux/slices/rm-panel/eoi-slice';
import { fetchEOIDashboardList } from 'src/redux/actions/admin/eoi-dashboard-actions';

import { Scrollbar } from 'src/components/scrollbar';
import { AnimateLogo1 } from 'src/components/animate';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import ExpressionOfInterest from 'src/sections/common-module/expression-of-interest/expression-of-interest-table-view';

import ViewTypeTabs from './view-type-tabs';
import EOIDashboardTableRow from './eoi-dashboard-table-row';
import EOIDashboardTableToolbar from './eoi-dashboard-table-toolbar';
import { EOIDashboardTableFiltersResult } from './eoi-dashboard-table-filters-result';

import type { IEOIFilters } from './eoi-dashboard-table-toolbar';

export interface FilterOptions {
  viewBy: { userName: string; userId: string }[];
  unitType: { label: string; value: string }[];
  campaign: { label: string; value: string | number }[];
}

const EOIDashboardListView = () => {
  const {
    columns: roleColumns,
    filters: roleFilters,
    canExport,
  } = useRoleBasedPermissions({
    module: 'eoiDashboard',
  });
  const [openTable, setOpenTable] = useState(false);

  const [listFilters, setListFilters] = useState({
    campaignId: '',
    primarySource: '',
    leadStatus: '',
    formStatus: '',
    paymentStatus: '',
    financeStatus: '',
    sortBy: '',
    deletionStatus: '',
    rmPending: '',
    queueIdAllotted: '',
    eoiCollected: '',
    totalEoiAmount: '',
    isEoiDashboard: true,
    startDate: '',
    endDate: '',
    unitType: '',
    crmPending: '',
    misPending: '',
    eoiCollectedPartiallyPaid: '',
    totalEoiAmountCollected: '',
  });
  const onClose = () => {
    setOpenTable(false);
  };
  const handleOpen = () => {
    setOpenTable(true);
  };
  const DEFAULT_TABLE_HEAD: ColumnDefinition[] = useMemo(
    () => Object.values(roleColumns ?? {}).filter((col) => col.tab === "default" || col.tab === "both"),
    [roleColumns]
  );

  const SOURCE_WISE_TABLE_HEAD: ColumnDefinition[] = useMemo(
    () => Object.values(roleColumns ?? {}).filter((col) => col.tab === 'source' || col.tab === 'both'),
    [roleColumns]
  );

  const table = useTable();
  const [tabValue, setTabValue] = useState('default');

  // Determine table
  const isDefaultView = tabValue === 'default';
  const activeTableHead = isDefaultView ? DEFAULT_TABLE_HEAD : SOURCE_WISE_TABLE_HEAD;
  const [filters, setFilters] = useState<IEOIFilters>({
    viewBy: null,
    campaign: null,
    unitType: null,
    startDate: null,
    endDate: null,
  });

  const dispatch = useAppDispatch();
  const { campaigns, total, loading, error } = useAppSelector((state) => state.eoiDashboard);
  const { campaigns: campaignMasterOptions } = useAppSelector((state) => state.expressonOfInterest);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const campaignOptions = useMemo(
    () =>
      campaignMasterOptions?.map((item) => ({
        label: item?.name,
        value: String(item?.value),
      })) || [],
    [campaignMasterOptions]
  );

  useEffect(() => {
    dispatch(fetchEOICampaignsAction());
    return () => {
      dispatch(resetCampaigns());
      dispatch(resetUnitTypes());
    };
  }, [dispatch]);

  useEffect(() => {
    const { viewBy, campaign, unitType, startDate, endDate } = filters || {};

    const payload: EOIDashboardListPayload = {
      page: table.page + 1,
      limit: table.rowsPerPage,
      view: isDefaultView ? 'default' : 'source',
      ...(viewBy && { viewBy }),
      ...(campaign && { campaign }),
      ...(unitType && { unitType }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
    };

    if (table?.orderBy && table?.order && activeTableHead?.find((i) => i?.id === table?.orderBy)) {
      payload.sortBy = `${table?.orderBy}:${table?.order}`;
    }

    dispatch(fetchEOIDashboardList(payload));

    return () => {
      dispatch(resetEOIDashboardList());
    };
  }, [
    activeTableHead,
    dispatch,
    filters,
    isDefaultView,
    table?.order,
    table?.orderBy,
    table.page,
    table.rowsPerPage,
  ]);

  useEffect(() => {
    table.onResetPage();
    if (tabValue === 'default' && filters?.viewBy) {
      setFilters((prev) => ({
        ...prev,
        viewBy: null,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabValue]);

  const canReset =
    (!!filters.viewBy && filters.viewBy.length > 0) ||
    !!filters.campaign ||
    !!filters.unitType ||
    !!filters.startDate ||
    !!filters.endDate;

  const defaultColumnManager = useColumnManager(DEFAULT_TABLE_HEAD);
  const sourceWiseColumnManager = useColumnManager(SOURCE_WISE_TABLE_HEAD);

  // column manager
  const columnManager = isDefaultView ? defaultColumnManager : sourceWiseColumnManager;
  const { visibleColumns } = columnManager;
  const dynamicMinWidth = calculateTableMinWidth(visibleColumns || activeTableHead);

  const notFound = campaigns?.length === 0;
  const totalRecords = total;

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setTabValue(newValue);
  };

  const handleRemoveFilter = useCallback((filterName: keyof IEOIFilters) => {
    setFilters((prev) => ({ ...prev, [filterName]: null }));
    // sync removal to modal filters
    if (filterName === 'startDate') {
      setListFilters((p) => ({ ...p, startDate: '' }));
    }

    if (filterName === 'endDate') {
      setListFilters((p) => ({ ...p, endDate: '' }));
    }

    if (filterName === 'unitType') {
      setListFilters((p) => ({ ...p, unitType: '' }));
    }
  }, []);
  
  const handleRemoveViewByItem = useCallback((updatedViewBy: string[] | null) => {
    setFilters((prev) => ({ ...prev, viewBy: updatedViewBy }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({
      viewBy: null,
      campaign: null,
      unitType: null,
      startDate: null,
      endDate: null,
    });

    setListFilters((prev) => ({
    ...prev,
    startDate: '',
    endDate: '',
    unitType: '',
  }));
  }, []);

  const handleFiltersChange = useCallback((newFilters: IEOIFilters) => {
    setFilters(newFilters);
    setListFilters((prev) => ({
    ...prev,
    startDate: newFilters.startDate
      ? dayjs(newFilters.startDate).format('YYYY-MM-DD')
      : '',
    endDate: newFilters.endDate
      ? dayjs(newFilters.endDate).format('YYYY-MM-DD')
      : '',
    unitType: newFilters.unitType || '',
    }));
  }, []);

  if (loading) {
    return (
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          height: '50vh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AnimateLogo1 />
      </Box>
    );
  }

  return (
    <Card>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'center' }}
        spacing={2}
        sx={{ width: '100%' }}
      >
        <Box
          sx={{
            flexShrink: 0,
            width: { xs: '100%', md: 'auto' },
            mb: { md: 3, xs: 0 },
          }}
        >
          <ViewTypeTabs
            value={tabValue}
            onChange={handleTabChange}
            options={EOI_DASHBOARD_TAB_OPTIONS}
          />
        </Box>

        <Box
          sx={{
            flexGrow: 1,
            minWidth: 0,
            display: 'flex',
            justifyContent: { sm: 'flex-start', md: 'flex-end' },
            alignItems: 'center',
            width: '100%',
            flexWrap: 'wrap',
          }}
        >
          <EOIDashboardTableToolbar
            columnManager={columnManager}
            filters={filters}
            onApplyFilters={handleFiltersChange}
            roleFilters={roleFilters}
            canExport={canExport}
            isSourceView={!isDefaultView}
            viewByOptions={EOI_VIEW_BY_OPTIONS}
            campaignOptions={campaignOptions}
            isExportDisabled={campaigns?.length === 0}
          />
        </Box>
      </Stack>
      {canReset && (
        <EOIDashboardTableFiltersResult
          filters={filters}
          onResetFilters={handleResetFilters}
          onRemoveFilter={handleRemoveFilter}
          onRemoveViewByItem={handleRemoveViewByItem}
          viewByOptions={EOI_VIEW_BY_OPTIONS}
          campaignOptions={campaignOptions}
          totalResults={totalRecords}
          sx={{ px: 1.5, py: 0.75 }}
        />
      )}

      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          position: 'relative',
        }}
      >
        <Scrollbar
          sx={{
            height: '100%',
            '& .simplebar-content': {
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            },
          }}
        >
          <Table
            stickyHeader
            size={table?.dense ? 'small' : 'medium'}
            sx={getTableStyles(dynamicMinWidth)}
          >
            <TableHeadCustom
              order={table?.order}
              orderBy={table?.orderBy}
              onSort={table?.onSort}
              headLabel={visibleColumns}
              hideCheckbox
              sx={{ backgroundColor: 'background.paper' }}
            />

            <TableBody>
              {campaigns?.map((row) => (
                <EOIDashboardTableRow
                  key={row?.campaignId}
                  row={row}
                  isDefaultView={isDefaultView}
                  columnVisibility={columnManager?.columns?.reduce(
                    (acc, col) => ({ ...acc, [col.id]: col.visible }),
                    {} as Record<string, boolean>
                  )}
                  setListFilters={setListFilters}
                  onModalOpen={handleOpen}
                />
              ))}
              {!loading && notFound && (
                <TableNoData
                  notFound={notFound}
                  colSpan={visibleColumns?.length || activeTableHead.length}
                />
              )}
            </TableBody>
          </Table>
        </Scrollbar>
      </Box>

      {!notFound && (
        <Box
          sx={{
            flexShrink: 0,
            borderTop: (theme) => `1px dashed ${theme.palette.divider}`,
            backgroundColor: 'background.paper',
            zIndex: 1,
          }}
        >
          <TablePaginationCustom
            page={table.page}
            count={totalRecords}
            rowsPerPage={table?.rowsPerPage}
            onPageChange={table?.onChangePage}
            onRowsPerPageChange={table?.onChangeRowsPerPage}
            showResultsCount
            totalResults={totalRecords}
          />
        </Box>
      )}

      <Dialog
        open={openTable}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        sx={{
          '& .MuiPaper-root': {
            borderRadius: '16px',
          },
        }}
      >
        <Box>
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              zIndex: 9999,
              color: (theme) => theme.palette.grey[600],
            }}
          >
            <CloseIcon />
          </IconButton>
          <ExpressionOfInterest dashboardFilters={listFilters} />
        </Box>
      </Dialog>
    </Card>
  );
};

export default EOIDashboardListView;
