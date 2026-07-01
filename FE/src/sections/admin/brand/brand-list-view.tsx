import type { IBrandsItem, IBrandsTableFilters } from 'src/types/admin/feature/brands';

import { useSetState } from 'minimal-shared/hooks';
import React, { useRef, useMemo, useEffect } from 'react';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import { Box, Tooltip } from '@mui/material';
import TableBody from '@mui/material/TableBody';
import InfoIcon from '@mui/icons-material/Info';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { useDebounceMethod } from 'src/utils/helper';
import { roleColumnsToDefinitions } from 'src/utils/role-table-head';
import { getTableStyles, tableContainerStyles, calculateTableMinWidth, stickyBreadcrumbsStyles } from 'src/utils/table-styles';

import { DashboardContent } from 'src/layouts/dashboard';
import { fetchBrands } from 'src/redux/actions/admin/brands-actions';

import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableHeadGrouped,
  CustomTableSkeleton,
  TablePaginationCustom,
} from 'src/components/table';

import { BrandTableRow } from './components/brand-table-row';
import { BrandTableToolbar } from './components/brand-table-toolbar';
import { BrandTableFiltersResult } from './components/brand-table-filters-result';

// ----------------------------------------------------------------------

const SALARY_MULTIPLIER_TOOLTIP =
  'The maximum incentive amount that can be paid to an RM with respect to their salary.';

const SALARY_MULTIPLIER_HEAD_LABEL = (
  <Box display="flex" alignItems="center" gap={0.5} component="span">
    Salary Multiplier
    <Tooltip enterTouchDelay={0} placement="right" title={SALARY_MULTIPLIER_TOOLTIP}>
      <InfoIcon fontSize="small" color="action" sx={{ cursor: 'pointer' }} />
    </Tooltip>
  </Box>
);

const GROUP_CONFIG = {
  RERA: {
    label: 'RERA',
    colspan: 2,
    align: 'center' as const,
  },
  RTM: {
    label: 'RTM',
    colspan: 2,
    align: 'center' as const,
  },
};
export function BrandListView() {
  const table = useTable();
  const isFirstRender = useRef(true);
  const dispatch = useAppDispatch();
  const { columns: roleColumns } = useRoleBasedPermissions({ module: 'brandList' });
  const { brandsList: dataFiltered, total, loading } = useAppSelector((state) => state.brandsList);

  const filters = useSetState<IBrandsTableFilters>({ name: '', salarymultiplier: null });
  const { state: currentFilters } = filters;

  const canReset = !!currentFilters?.name;

  const notFound = (!dataFiltered?.length && canReset) || !dataFiltered?.length;

  const tableHeadFromRole = useMemo(
    () =>
      roleColumnsToDefinitions(roleColumns).map((col) =>
        col.id === 'salaryMultiplier'
          ? { ...col, label: SALARY_MULTIPLIER_HEAD_LABEL, tooltip: undefined }
          : col
      ),
    [roleColumns]
  );

  const columnManager = useColumnManager(tableHeadFromRole);
  const { visibleColumns } = columnManager;

  const columnVisibility =
    columnManager.columns.reduce(
      (acc, col) => {
        if (col?.id) acc[col.id] = col.visible ?? true;
        return acc;
      },
      {} as Record<string, boolean>
    ) || {};

  const dynamicMinWidth = calculateTableMinWidth(visibleColumns || tableHeadFromRole);

  const getApiCall = () => {
    const payload = {
      page: table.page + 1,
      search: currentFilters?.name,
      limit: table?.rowsPerPage,
    };
    dispatch(fetchBrands(payload));
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
  }, [table.page , table?.rowsPerPage]);

  return (
    <DashboardContent>
         <CustomBreadcrumbs 
              heading="Brands" 
              sx={stickyBreadcrumbsStyles}
            />

   <Card sx={tableContainerStyles}>

        <BrandTableToolbar
          filters={filters}
          onResetPage={table?.onResetPage}
          onApply={() => {}}
          options={{
            salarymultiplier: [],
          }}
        />

        {canReset && (
          <BrandTableFiltersResult
            filters={filters}
            totalResults={dataFiltered?.length}
            onResetPage={table?.onResetPage}
            sx={{ px: 1.5, py: 0.75 }}
          />
        )}

        <Scrollbar>
             <Table 
              stickyHeader 
              size={table?.dense ? 'small' : 'medium'} 
              sx={{
                ...getTableStyles(dynamicMinWidth),
                '& .MuiTableHead-root .MuiTableCell-root': {
                  whiteSpace: 'normal',
                  wordWrap: 'break-word',
                  lineHeight: 1.2,
                  py: 1
                }
              }}
            >    
         <TableHeadGrouped
                     headLabel={visibleColumns || []}
                     rowCount={dataFiltered?.length}
                     order={table?.order}
                     orderBy={table?.orderBy}
                     onSort={table?.onSort}
                     groupConfig={GROUP_CONFIG}
                     stickyHeader
                     isColumnVisible={(columnId) => {
                       const column = columnManager.columns.find(col => col.id === columnId);
                       return column ? column.visible : true;
                     }}
                     sx={{ 
                       whiteSpace: 'nowrap',
                       backgroundColor: 'background.paper'
                     }}
                   />
            <TableBody>
              {loading ? (
                <CustomTableSkeleton
                  rowCount={table?.rowsPerPage}
                  cellCount={visibleColumns?.length || tableHeadFromRole.length}
                />
              ) : dataFiltered?.length > 0 ? (
                dataFiltered.map((row) => (
                  <BrandTableRow
                    key={row?.id}
                    row={row as IBrandsItem}
                    selected={table?.selected.includes(row?.id.toString())}
                    onRefresh={getApiCall}
                    columnVisibility={columnVisibility}
                  />
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
        <TablePaginationCustom
          page={table.page }
          dense={table?.dense}
          count={total}
          rowsPerPage={table?.rowsPerPage}
          onPageChange={table?.onChangePage}
          onChangeDense={table?.onChangeDense}
          onRowsPerPageChange={table?.onChangeRowsPerPage}
          showResultsCount
          totalResults={dataFiltered?.length}
        />
      </Card>
    </DashboardContent>
  );
}
