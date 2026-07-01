import type { RootState, AppDispatch } from 'src/redux/store';
import type { ColumnDefinition } from 'src/hooks/use-column-manager';
import type { EmployeeList, EmployeeListTableFilters } from 'src/types/finance-admin/employee-list';

import { useSetState } from 'minimal-shared/hooks';
import { useDispatch, useSelector } from 'react-redux';
import { useRef, useState, useEffect, useCallback } from 'react';

import { Box, Card, Table, TableBody } from '@mui/material';

import { paths } from 'src/routes/paths';

import { useColumnManager } from 'src/hooks/use-column-manager';

import { useDebounceMethod } from 'src/utils/helper';
import { getTableStyles, tableContainerStyles, calculateTableMinWidth, stickyBreadcrumbsStyles } from 'src/utils/table-styles';

import { DashboardContent } from 'src/layouts/dashboard';
import { getEmployeeList } from 'src/redux/actions/finance-admin/employee-list-actions';

import { Scrollbar } from 'src/components/scrollbar';
import { ColumnManager } from 'src/components/column-manager';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  CustomTableSkeleton,
  TablePaginationCustom,
} from 'src/components/table';

import { EmployeeListTableRow } from './component/employee-list-table-row';
import { EmployeeListTableToolbar } from './component/employee-list-table-toolbar';
import { EmployeeListFiltersResult } from './component/employee-list-filters-result';

// Optimized Table Header Configuration with Column Management
const TABLE_HEAD: ColumnDefinition[] = [
  { id: 'empId', label: 'Employee ID', width: 200, visible: true, sortable: false },
  { id: 'name', label: 'Name', width: 300, visible: true, sortable: true, disableToggle: true },
  { id: 'email', label: 'Email', width: 250, visible: false, sortable: false },
  { id: 'role', label: 'Role', width: 300, visible: true, sortable: false },
  { id: 'employeeStatus', label: 'Employment Status', width: 250, visible: true },
  { id: 'salary', label: 'Salary', width: 300, visible: true, sortable: false },
  { id: 'accruals', label: 'Accruals', width: 300, visible: true, sortable: false },
  { id: 'updatedAt', label: 'Updated At', width: 300, visible: true, sortable: true },
  { id: 'actions', label: 'Action', width: 88, visible: true, sortable: false, disableToggle: true },
];

export function EmployeeListTableView() {
  const table = useTable();
  const isFirstRender = useRef(true);
  const [loading] = useState(false);
  const dispatch: AppDispatch = useDispatch();
  const { employeeList, total } = useSelector((state: RootState) => state.employeeList);

  const filters = useSetState<EmployeeListTableFilters>({
    empID: '',
    name: '',
  });

  const { state: currentFilters } = filters;

  // Use the column manager hook
  const columnManager = useColumnManager(TABLE_HEAD);
  const { visibleColumns } = columnManager;
  const dynamicMinWidth = calculateTableMinWidth(visibleColumns || TABLE_HEAD);

  const getApiCall = useCallback(() => {
    const sortByValue = table?.orderBy ? `${table?.orderBy}:${table?.order}` : '';
    dispatch(
      getEmployeeList({
        page: (table.page  || 0) + 1,
        limit: table?.rowsPerPage || 10,
        search: currentFilters?.name || '',
        sortBy: sortByValue,
      })
    );
  }, [dispatch, currentFilters?.name, table.page , table?.rowsPerPage, table?.orderBy, table?.order]);

  useEffect(() => {
    getApiCall();
  }, [getApiCall]);

  const debounceApiCall = useDebounceMethod(getApiCall, 500);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false; // Mark first render as done, no need to call API on first render !
      return;
    }
    debounceApiCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFilters?.name]);

  const dataFiltered = employeeList || [];

  const canReset = !!currentFilters?.name;

  const notFound = !dataFiltered?.length && canReset;

  return (
    <DashboardContent>
      <CustomBreadcrumbs heading="Employee List" 
       sx={stickyBreadcrumbsStyles} />
      
      <Card sx={tableContainerStyles}>
     
        {/* Fixed Header Section */}
        <Box sx={{ flexShrink: 0 }}>
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ flexGrow: 1 }}>
              <EmployeeListTableToolbar
                filters={filters}
                onResetPage={table?.onResetPage}
                getLists={getApiCall}
              />
            </Box>

            {/* Use the reusable ColumnManager component */}
            <ColumnManager {...columnManager} />
          </Box>

          {canReset && (
            <EmployeeListFiltersResult
              filters={filters}
              totalResults={dataFiltered?.length || 0}
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
                rowCount={dataFiltered?.length || 0}
                onSort={table?.onSort}
                sx={{ backgroundColor: 'background.paper' }}
              />
              <TableBody>
                {(() => {
                  if (loading) {
                    return <CustomTableSkeleton rowCount={table?.rowsPerPage || 10} cellCount={visibleColumns?.length || 0} />;
                  }
                  if (dataFiltered?.length > 0) {
                    return dataFiltered.map((row) => (
                      row?.empId ? (
                        <EmployeeListTableRow
                          key={row?.empId}
                          row={row as unknown as EmployeeList}
                          selected={table?.selected?.includes(row?.empId?.toString()) || false}
                          editHref={paths.financeAdmin.employeeList.edit(row?.empId?.toString() || '')}
                          columnVisibility={columnManager?.columns?.reduce(
                            (acc, col) => ({ ...acc, [col?.id]: col?.visible }),
                            {} as Record<string, boolean>
                          ) || {}}
                        />
                      ) : null
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
              count={total || 0}
              rowsPerPage={table?.rowsPerPage || 10}
              onPageChange={table?.onChangePage}
              onChangeDense={table?.onChangeDense}
              onRowsPerPageChange={table?.onChangeRowsPerPage}
              showResultsCount
              totalResults={total || 0}
            />
          </Box>
        )}
      </Card>
    </DashboardContent>
  );
}
