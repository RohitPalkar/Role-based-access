import type { ColumnDefinition } from 'src/hooks/use-column-manager';
import type { LogItems, ILogsTableFilters } from 'src/types/admin/feature/logs';

import dayjs from 'dayjs';
import { useSetState } from 'minimal-shared/hooks';
import { useRef, useState, useEffect } from 'react';

import { Box, Card, Table, TableBody } from '@mui/material';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { useDebounceMethod } from 'src/utils/helper';
import { getTableStyles, tableContainerStyles, calculateTableMinWidth, stickyBreadcrumbsStyles } from 'src/utils/table-styles';

import { DashboardContent } from 'src/layouts/dashboard';
import { fetchLogHistory } from 'src/redux/actions/finance-admin/log-history-action';

import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  CustomTableSkeleton,
  TablePaginationCustom,
} from 'src/components/table';

import { LogTableRow } from './component/log-table-row';
import { LogTableToolbar } from './component/log-table-toolbar';
import { LogsTableFiltersResult } from './component/logs-table-filters-result';

// ----------------------------------------------------------------------

const TABLE_HEAD: ColumnDefinition[] = [
  { id: 'empId', label: 'Employee ID', width: 250, visible: true, sortable: true, disableToggle: true },
  { id: 'name', label: 'Name', width: 350, visible: true, sortable: true, disableToggle: true },
  { id: 'email', label: 'Email Address', width: 370, visible: true, sortable: true },
  { id: 'fileName', label: 'File Name', width: 300, visible: true, sortable: true },
  { id: 'createdAt', label: 'Created At', width: 250, visible: true, sortable: true },
  { id: 'status', label: 'Status', width: 150, visible: true, sortable: true },
];

// ----------------------------------------------------------------------

export function LogListTableView() {
  const table = useTable();
  const isFirstRender = useRef(true);
  const dispatch = useAppDispatch();
  const [logsData, setLogsData] = useState<any>([]);
  
  // Column manager hook
  const columnManager = useColumnManager(TABLE_HEAD);
  const { visibleColumns } = columnManager;
    const dynamicMinWidth = calculateTableMinWidth(visibleColumns || TABLE_HEAD);
  
  // Column visibility for TableHeadCustom
  
  // Create column visibility function
  const isColumnVisible = (columnId: string) => {
    const column = columnManager?.columns?.find(col => col?.id === columnId);
    return column?.visible !== false;
  };
  
  const {
    logHistory = [],
    loading: loadingState = false,
    totalCount = 0,
  } = useAppSelector((state) => state.logHistory) || {};

  const filters = useSetState<ILogsTableFilters>({
    name: '',
    startDate: null,
    endDate: null,
    status: null,
  });

  const { state: currentFilters } = filters;
  // logHistory

  const getApiCall = () => {
    const { name, startDate, endDate, ...rest } = filters?.state || {};
    const sortByValue = table?.orderBy ? `${table?.orderBy}:${table?.order}` : ``;

    const payload = {
      page: (table.page  || 0) + 1,
      search: name || '',
      sortBy: sortByValue,
      limit: table?.rowsPerPage || 10,
      ...rest,
      startDate: startDate ? dayjs(startDate).format('YYYY-MM-DD') : undefined,
      endDate: endDate ? dayjs(endDate).format('YYYY-MM-DD') : undefined,
    };

    dispatch(fetchLogHistory(payload));
  };

  const debounceApiCall = useDebounceMethod(getApiCall, 500);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false; // Mark first render as done, no need to call API on first render
      return;
    }
    debounceApiCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFilters?.name]);
  useEffect(() => {
    getApiCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    table?.rowsPerPage,
    table.page ,
    dispatch,
    table?.orderBy,
    table?.order,
    currentFilters?.status,
    currentFilters?.startDate,
    currentFilters?.endDate,
  ]);

  const canReset =
    !!currentFilters?.name ||
    !!currentFilters?.startDate ||
    !!currentFilters?.endDate ||
    currentFilters?.status;
  const rowsPerPage = table?.rowsPerPage ?? 10;

  /**
   * Server sends the current page only. If the API returns more rows than `limit` (e.g. 12 vs 10),
   * show at most `rowsPerPage` so the table matches pagination.
   */
  const displayedLogs = (logsData || [])
    .filter((row: unknown) => row != null)
    .slice(0, rowsPerPage);

  let notFound = (!logsData?.length && canReset) || !logsData?.length;
  useEffect(() => {
    if (!loadingState) {
      setLogsData(logHistory || []);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      notFound = (!logsData?.length && canReset) || !logsData?.length;
    }
    // dataFiltered = logHistory
  }, [loadingState, logHistory]);

  return (
    <DashboardContent>
      <CustomBreadcrumbs heading="Logs History"
      sx={stickyBreadcrumbsStyles}  />
      
      <Card sx={tableContainerStyles}>
        {/* Fixed Header Section */}
        <Box sx={{ flexShrink: 0 }}>
          <LogTableToolbar
            filters={filters}
            onResetPage={table?.onResetPage || (() => {})}
            columnManager={columnManager}
          />

          {canReset && (
            <LogsTableFiltersResult
              filters={filters}
              totalResults={totalCount ?? 0}
              onResetPage={table?.onResetPage || (() => {})}
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
                headLabel={TABLE_HEAD}
                rowCount={displayedLogs?.length || 0}
                onSort={table?.onSort}
                hideCheckbox
                isColumnVisible={isColumnVisible}
                sx={{ backgroundColor: 'background.paper' }}
              />

              <TableBody>
                {(() => {
                  if (loadingState) {
                    return (
                      <CustomTableSkeleton 
                        rowCount={table?.rowsPerPage || 10} 
                        cellCount={visibleColumns?.length || TABLE_HEAD.length} 
                      />
                    );
                  }
                  if (displayedLogs?.length > 0) {
                    return displayedLogs.map((row: any, index: number) => (
                      <LogTableRow
                        key={row?.id != null ? String(row.id) : `log-${index}-${row?.createdAt ?? ''}`}
                        row={row as unknown as LogItems}
                        selected={table?.selected?.includes((row?.empID || row?.empId)?.toString() || '') || false}
                        columnVisibility={
                          columnManager?.columns?.reduce(
                            (acc, col) => {
                              if (col?.id) {
                                acc[col.id] = col?.visible ?? true;
                              }
                              return acc;
                            },
                            {} as Record<string, boolean>
                          ) || {}
                        }
                      />
                    ));
                  }
                  return (
                    <TableNoData 
                      notFound={notFound} 
                      colSpan={visibleColumns?.length || TABLE_HEAD.length} 
                    />
                  );
                })()}
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
              page={table.page  || 0}
              dense={table?.dense || false}
              count={totalCount || 0}
              rowsPerPage={table?.rowsPerPage || 10}
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
