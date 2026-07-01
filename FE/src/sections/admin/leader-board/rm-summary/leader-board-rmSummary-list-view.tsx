import type { ILeaderBoardSummaryItem, ILeaderBoardRMSummaryTableFilters } from 'src/types/admin/feature/leader-board-rmSummary';

import { useLocation } from 'react-router';
import { useSetState } from 'minimal-shared/hooks';
import React, { useRef, useMemo, useEffect, useCallback } from 'react';

import { Box } from '@mui/material';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';

import { ROOTS } from 'src/routes/paths';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { useDebounceMethod } from 'src/utils/helper';
import { roleColumnsToDefinitions } from 'src/utils/role-table-head';
import {
  getTableStyles,
  tableContainerStyles,
  calculateTableMinWidth,
  stickyBreadcrumbsStyles,
} from 'src/utils/table-styles';

import { DashboardContent } from 'src/layouts/dashboard';
import { fetchBrands, fetchCitiesByBrandId } from 'src/redux/actions/admin/common-actions';
import { fetchLeaderBoardRMSummary, downloadLeaderBoardRMSummary } from 'src/redux/actions/admin/leader-board-rmSummary-actions';

import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  CustomTableSkeleton,
  TablePaginationCustom,
} from 'src/components/table';

import { LeaderBoardRMSummaryTableRow } from './components/leader-board-rmSummary-table-row';
import { LeaderBoardRMSummaryTableToolbar } from './components/leader-board-rmSummary-table-toolbar';
import { UnitStatusEnum, PaymentStatusEnum } from '../../admin-reports/users/components/reports-common';
import { LeaderBoardRMSummaryTableFiltersResult } from './components/leader-board-rmSummary-table-filters-result';

// ----------------------------------------------------------------------


export function LeaderBoardRMSummaryListView() {
  const location = useLocation();
  const table = useTable();
  const dispatch = useAppDispatch();
  const isFirstRender = useRef(true);

  const { columns: roleColumns, canExport: canExportByRole } = useRoleBasedPermissions({
    module: 'leaderboardRmSummary',
  });

  const isBisPanel = location.pathname.startsWith(ROOTS.BIS);
  const canExport = canExportByRole && !isBisPanel;

  const { leaderBoardRMSummary, loading: leaderBoardRMSummaryLoading } = useAppSelector((state) => state.leaderBoardRMSummary);

  
  const { brands, projects, cities } = useAppSelector((state) => state.common);


  const tableHeadFromRole = useMemo(
    () => roleColumnsToDefinitions(roleColumns),
    [roleColumns]
  );
  const columnManager = useColumnManager(tableHeadFromRole);
  const { visibleColumns } = columnManager;

  const emptyStateColSpan = visibleColumns?.length || tableHeadFromRole.length;

  const filters = useSetState<ILeaderBoardRMSummaryTableFilters>({
      name: '',
    brandId: '',
    cityIds: [],
    projectIds: null,
    unitStatus: '',
    incentiveStatus: '',
    startDate: null,
    endDate: null,
    sortBy: '',
    // search: ''
  });
  const { state: currentFilters } = filters;



  const dataFiltered = (Array.isArray(leaderBoardRMSummary?.rmSummary) ? leaderBoardRMSummary.rmSummary : []).map((item: ILeaderBoardSummaryItem, index: number) => ({
    ...item,
    id: item.id || index + 1,
    srNo: (table.page * table.rowsPerPage) + index + 1
  }));
  const canReset =
    !!currentFilters?.name ||
    !!currentFilters?.brandId ||
    (currentFilters?.projectIds && currentFilters?.projectIds.length > 0) ||
    (currentFilters?.cityIds && currentFilters?.cityIds.length > 0) ||
    !!currentFilters?.unitStatus ||
    !!currentFilters?.incentiveStatus ||
    !!currentFilters?.startDate ||
    !!currentFilters?.endDate;

  const notFound =
    (!dataFiltered?.length && canReset) || !dataFiltered?.length;

  const totalCount = leaderBoardRMSummary?.total ?? dataFiltered.length;

  const dynamicMinWidth = calculateTableMinWidth(visibleColumns || tableHeadFromRole);

  useEffect(() => {
    dispatch(fetchBrands());
    dispatch(fetchCitiesByBrandId(''));
  }, [dispatch]);

const getApiCall = useCallback(() => {
      const {  startDate, endDate,  ...rest } = currentFilters;

  const payload = {
    page: (table?.page ?? 0) + 1, // API expects 1-based page numbering
    limit: table?.rowsPerPage,
      search: filters.state.name,
      startDate: startDate?.format('YYYY-MM-DD'),
      endDate: endDate?.format('YYYY-MM-DD'),
      ...rest,
  };
  dispatch(fetchLeaderBoardRMSummary(payload));
}, [currentFilters, table?.rowsPerPage, table?.page, filters.state.name, dispatch]);


  const debounceApiCall = useDebounceMethod(getApiCall, 500);

// Effect for filter changes (debounced)
useEffect(() => {
  if (isFirstRender.current) {
    isFirstRender.current = false;
    getApiCall();
  } else {
    debounceApiCall();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ currentFilters?.name,
  currentFilters?.brandId,
  currentFilters?.cityIds,
  currentFilters?.projectIds,
  currentFilters?.unitStatus,
  currentFilters?.incentiveStatus,
  currentFilters?.startDate,
  currentFilters?.endDate]);

// Effect for pagination changes (immediate)
useEffect(() => {
  if (!isFirstRender.current) {
    getApiCall();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table.rowsPerPage, table.page]);
  const handleExport = () => {
    const payload: Record<string, any> = {};

    if (currentFilters?.brandId) payload.brandId = currentFilters?.brandId;
    if (currentFilters?.cityIds?.length) payload.cityIds = currentFilters?.cityIds;
    if (currentFilters?.projectIds?.length) payload.projectIds = currentFilters?.projectIds;
    if (currentFilters?.unitStatus) payload.unitStatus = currentFilters?.unitStatus;
    if (currentFilters?.incentiveStatus) payload.incentiveStatus = currentFilters?.incentiveStatus;
    if (currentFilters?.startDate) payload.startDate = currentFilters?.startDate?.format('YYYY-MM-DD');
    if (currentFilters?.endDate) payload.endDate = currentFilters?.endDate?.format('YYYY-MM-DD');
    if (currentFilters?.name) payload.name = currentFilters?.name;

    dispatch(downloadLeaderBoardRMSummary(payload));
  };

  return (
    <DashboardContent>
         <Box
       sx={stickyBreadcrumbsStyles}
      >
       {!location.pathname.includes('users') ? (
          <>
            <CustomBreadcrumbs heading="Leaderboard" />
            {leaderBoardRMSummary?.message && (
              <>{leaderBoardRMSummary.message}</>
            )}
          </>
        ) : (
          <CustomBreadcrumbs
            heading={leaderBoardRMSummary?.message && (
              <>{leaderBoardRMSummary.message}</>
            )}
          />
        )}
      </Box>

       <Card sx={tableContainerStyles}>    
                <Box sx={{ flexShrink: 0 }}>
          
          <LeaderBoardRMSummaryTableToolbar
          handleExport={handleExport}
          dataLength={leaderBoardRMSummary?.total || dataFiltered?.length || 0}
          filters={filters}
          columnManager={columnManager}
          onResetPage={table?.onResetPage}
          onApply={getApiCall}
          canExport={canExport}
          options={{
                       brand: Array.isArray(brands) ? brands?.map((brand) => ({ value: brand.id, label: brand.name })) : [],
                       project: Array.isArray(projects) ? projects?.map((project) => ({ value: project.id, label: project.name })) : [],
                       city: Array.isArray(cities) ? cities?.map((city) => ({ value: city?.id, label: city?.name })) : [],
                       unitStatus: Array.isArray(UnitStatusEnum) ? UnitStatusEnum?.map((status) => ({
                         value: status.id,
                         label: status.name,
                       })) : [],
                       incentiveStatus: Array.isArray(PaymentStatusEnum) ? PaymentStatusEnum?.map((incentive) => ({
                         value: incentive.id,
                         label: incentive.name,
                       })) : [],
                     }}
                
        />

        {canReset && (
          <LeaderBoardRMSummaryTableFiltersResult
            filters={filters}
            onResetPage={table?.onResetPage}
            totalResults={leaderBoardRMSummary?.total || dataFiltered?.length || 0}
            sx={{ p: 2.5, pt: 0 }}
          />
        )}
        </Box>
        <Box sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: 0, // Important for flex child to shrink
          position: 'relative'
        }}>
        <Scrollbar sx={{ 
            height: '100%',
            '& .simplebar-content': {
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }
          }}>
           <Table 
              stickyHeader 
              sx={getTableStyles(dynamicMinWidth)}
             
            >
            <TableHeadCustom
              order={table.order}
              orderBy={table.orderBy}
              headLabel={visibleColumns}
              rowCount={dataFiltered?.length}
              numSelected={table.selected.length}
              onSort={table.onSort}
               sx={{ 
                  whiteSpace: 'nowrap',
                  backgroundColor: 'background.paper' 
                }}
            />

                    <TableBody>
                                {leaderBoardRMSummaryLoading ? (
                                  <CustomTableSkeleton rowCount={table?.rowsPerPage} cellCount={visibleColumns?.length || tableHeadFromRole.length} />
                                ) : dataFiltered?.length > 0 ? (
                                  dataFiltered?.map((row: any, index: number) => (
                                    row && (
                    <LeaderBoardRMSummaryTableRow
                      key={row.id}
                      row={row}
                      selected={table.selected.includes(row.id.toString())}
                      onSelectRow={() => table.onSelectRow(row.id.toString())}
                      visibleColumns={visibleColumns}
                      columnVisibility={
                          columnManager?.columns?.reduce(
                            (acc, col) => {
                              if (col?.id) {
                                acc[col.id] = col.visible ?? true;
                              }
                              return acc;
                            },
                            {} as Record<string, boolean>
                          ) || {}
                        }
                    />
                      )
                  ))
                ) : (
                  <TableNoData notFound={notFound} colSpan={emptyStateColSpan} />
                )}
            </TableBody>
          </Table>
        </Scrollbar>
</Box>
        {totalCount > 0 && (
        <TablePaginationCustom
          page={table.page}
          dense={table.dense}
          count={totalCount}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={table.onChangeRowsPerPage}
          showResultsCount
          totalResults={totalCount}
        />
        )}
      </Card>
    </DashboardContent>
  );
}