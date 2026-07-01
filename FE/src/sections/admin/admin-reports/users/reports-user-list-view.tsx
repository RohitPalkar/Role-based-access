import type { RootState, AppDispatch } from 'src/redux/store';
import type {
  ReportsUserItem,
  ReportsUserTableFilters,
} from 'src/types/admin/feature/reports-user';

import { useRef, useMemo, useEffect } from 'react';
import { useSetState } from 'minimal-shared/hooks';

import {
  Box,
  Card,
  Table,
  TableBody,
} from '@mui/material';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { useDebounceMethod } from 'src/utils/helper';
import { roleColumnsToDefinitions } from 'src/utils/role-table-head';
import { getTableStyles, tableContainerStyles, calculateTableMinWidth, stickyBreadcrumbsStyles } from 'src/utils/table-styles';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  fetchReportsUser,
  downloadUserReports,
} from 'src/redux/actions/admin/reports-user-actions';

import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  CustomTableSkeleton,
  TablePaginationCustom,
} from 'src/components/table';

import { ReportsUserTableRow } from './components/reports-user-table-row';
import { ReportsUserTableToolbar } from './components/reports-user-table-toolbar';
import { ReportsUserTableFiltersResult } from './components/reports-user-table-filters-result';

// ----------------------------------------------------------------------

// ----------------------------------------------------------------------

export function ReportsUserListView() {
  const { columns: roleColumns, canExport, canRefresh } = useRoleBasedPermissions({
    module: 'reportsUsers',
  });
  const {
    reportsUser: dataFiltered,
    totalCount,
    loading,
  } = useAppSelector((state: RootState) => state.reportsUser);

  const isFirstRender = useRef(true);
  const table = useTable();
  const dispatch: AppDispatch = useAppDispatch();
  const filters = useSetState<ReportsUserTableFilters>({ name: '', sortBy: '' });
  const { state: currentFilters } = filters;
  const tableHeadFromRole = useMemo(
    () => roleColumnsToDefinitions(roleColumns),
    [roleColumns]
  );
  const columnManager = useColumnManager(tableHeadFromRole);
  const { visibleColumns } = columnManager;
  const dynamicMinWidth = calculateTableMinWidth(visibleColumns || tableHeadFromRole);

  const handleExport = () => {
    const payload: {
      search?: string;
      sortBy?: string;
    } = {};

    if (currentFilters?.name?.trim()) {
      payload.search = currentFilters.name.trim();
    }

    if (table?.orderBy && table?.order) {
      payload.sortBy = `${table?.orderBy}:${table?.order}`;
    }
    dispatch(downloadUserReports(payload));
  };

  const getApiCall = () => {
    const { name, ...rest } = filters.state;
    const payload: {
      page: number;
      search: string;
      limit: number;
      sortBy?: string;
      [key: string]: any;
    } = {
      page: table.page + 1,
      search: name || '',
      limit: table?.rowsPerPage,
      ...rest,
    };

    if (table?.orderBy && table?.order) {
      payload.sortBy = `${table?.orderBy}:${table?.order}`;
    }
    dispatch(fetchReportsUser(payload));
  };

  const debounceApiCall = useDebounceMethod(getApiCall, 500);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    debounceApiCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFilters?.name]);

  useEffect(() => {
    getApiCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, table?.rowsPerPage, table.page, table?.orderBy, table?.order]);

  const canReset = !!currentFilters?.name;

  const notFound = (!dataFiltered?.length && canReset) || !dataFiltered?.length;

  const tableOnReset = () => {
    table?.onResetPage();
  };

  return (
    <DashboardContent>
      {/* Sticky Breadcrumbs */}
      <Box
       sx={stickyBreadcrumbsStyles}
      >
        <CustomBreadcrumbs heading="Users" />
      </Box>

      <Card sx={tableContainerStyles}>
        {/* Fixed Header Section */}
        <Box sx={{ flexShrink: 0 }}>
          <ReportsUserTableToolbar
            filters={filters}
            onResetPage={tableOnReset}
            handleExport={handleExport}
            dataLength={dataFiltered?.length || 0}
            columnManager={columnManager}
            canExport={canExport}
            canRefresh={canRefresh}
          />

          {canReset && (
            <ReportsUserTableFiltersResult
              filters={filters}
              totalResults={dataFiltered?.length}
              onResetPage={table?.onResetPage}
              sx={{ p: 2.5, pt: 0 }}
            />
          )}
        </Box>
    

        {/* Scrollable Table Content */}
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
              size={table?.dense ? 'small' : 'medium'} 
              sx={getTableStyles(dynamicMinWidth)}
            >
              <TableHeadCustom
                order={table?.order}
                orderBy={table?.orderBy}
                headLabel={visibleColumns || []}
                rowCount={dataFiltered?.length}
                sx={{ 
                  whiteSpace: 'wrap',
                  backgroundColor: 'background.paper'
                }}
                onSort={table?.onSort}
              />

              <TableBody>
                {loading ? (
                  <CustomTableSkeleton rowCount={table?.rowsPerPage} cellCount={visibleColumns?.length || tableHeadFromRole.length} />
                ) : dataFiltered?.length > 0 ? (
                  dataFiltered?.map((row) => (
                    row && (
                      <ReportsUserTableRow
                        key={row?.id}
                        row={row as unknown as ReportsUserItem}
                        selected={table?.selected.includes(row?.id?.toString() || '')}
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
                  <TableNoData 
                    notFound={notFound} 
                    colSpan={visibleColumns?.length || tableHeadFromRole.length} 
                  />
                )}
              </TableBody>
            </Table>
          </Scrollbar>
        </Box>

        {/* Fixed Footer Pagination */}
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
              dense={table?.dense}
              count={totalCount || 0}
              rowsPerPage={table?.rowsPerPage}
              onPageChange={table?.onChangePage}
              onChangeDense={table?.onChangeDense}
              onRowsPerPageChange={table?.onChangeRowsPerPage}
              showResultsCount
              totalResults={totalCount || 0}
            />
          </Box>
        )}
      </Card>
    </DashboardContent>
  );
}
