import type { IPhaseItem, IPhaseTableFilters } from 'src/types/admin/feature/phase';

import { useSetState } from 'minimal-shared/hooks';
import React, { useRef, useMemo, useEffect } from 'react';

import Card from '@mui/material/Card';
import { Button } from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';

import { RouterLink } from 'src/routes/components';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useAdminPanelPaths } from 'src/hooks/use-admin-panel-paths';
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
import { fetchPhases } from 'src/redux/actions/admin/phase-actions';
import { fetchBrands, fetchCitiesByBrandId } from 'src/redux/actions/admin/common-actions';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  CustomTableSkeleton,
  TablePaginationCustom,
} from 'src/components/table';

import { PhaseTableRow } from './components/phase-table-row';
import { PhaseTableToolbar } from './components/phase-table-toolbar';
import { PhaseTableFiltersResult } from './components/phase-table-filters-result';

// ----------------------------------------------------------------------

export function PhaseListView() {
  const table = useTable();
  const isFirstRender = useRef(true);
  const dispatch = useAppDispatch();
  const panelPaths = useAdminPanelPaths();
  const { columns: roleColumns, canCreate } = useRoleBasedPermissions({ module: 'phaseList' });
  const { phasesList: dataFiltered, total, loading } = useAppSelector((state) => state.phasesList);
  const { cities, brands } = useAppSelector((state) => state.common);

  const tableHeadFromRole = useMemo(
    () => roleColumnsToDefinitions(roleColumns),
    [roleColumns]
  );

  const columnManager = useColumnManager(tableHeadFromRole);
  const { visibleColumns } = columnManager;

  const filters = useSetState<IPhaseTableFilters>({
    name: '',
    brand: null,
    city: null,
  });
  const { state: currentFilters } = filters;

  const canReset = !!currentFilters?.name || !!currentFilters?.brand || (!!currentFilters?.city && currentFilters.city.length > 0);

  const notFound = (!dataFiltered?.length && canReset) || !dataFiltered?.length;

  const dynamicMinWidth = calculateTableMinWidth(visibleColumns || tableHeadFromRole);
  useEffect(() => {
    Promise.all([dispatch(fetchBrands())]);
  }, [dispatch]);
  useEffect(() => {
    dispatch(fetchCitiesByBrandId(''));
  }, [dispatch]);

  const getApiCall = () => {
    const payload = {
      page: table.page + 1,
      search: currentFilters?.name,
      limit: table?.rowsPerPage,
      brandId: currentFilters?.brand ? Number(currentFilters?.brand) : undefined,
      cityIds: currentFilters?.city && currentFilters.city.length > 0 
        ? currentFilters.city.map(id => Number(id)) 
        : undefined,
    };
    dispatch(fetchPhases(payload));
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
    dispatch,
    table?.rowsPerPage,
    table.page,
    currentFilters?.brand,
    currentFilters?.city,
    table?.orderBy,
    table?.order,
  ]);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Project Phases"
        action={
          canCreate ? (
            <Button
              component={RouterLink}
              href={panelPaths.phase.create}
              variant="contained"
              className="primaryBtn"
              startIcon={<Iconify icon="mingcute:add-line" />}
            >
              Add Phase
            </Button>
          ) : undefined
        }
        sx={stickyBreadcrumbsStyles}
      />

      <Card sx={tableContainerStyles}>
        <PhaseTableToolbar
          filters={filters}
          columnManager={columnManager}
          onResetPage={table?.onResetPage}
          options={{
            brand: brands?.map((brand) => ({ value: brand.id, label: brand.name })),
            city: Array.isArray(cities)
              ? cities.map((city) => ({ value: city.id, label: city?.name || '' }))
              : [],
          }}
        />

        {canReset && (
          <PhaseTableFiltersResult
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
            sx={getTableStyles(dynamicMinWidth)}
          >
            <TableHeadCustom
              onSort={table?.onSort}
              headLabel={visibleColumns}
              rowCount={dataFiltered?.length}
            />
            <TableBody>
              {loading ? (
                <CustomTableSkeleton
                  rowCount={table?.rowsPerPage}
                  cellCount={visibleColumns?.length || tableHeadFromRole.length}
                />
              ) : dataFiltered?.length > 0 ? (
                dataFiltered.map((row) => (
                  <PhaseTableRow
                    key={row?.id}
                    row={row as IPhaseItem}
                    selected={table?.selected.includes(row?.id.toString())}
                    onRefresh={getApiCall}
                    visibleColumns={visibleColumns}
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
          page={table.page}
          dense={table?.dense}
          count={total}
          rowsPerPage={table?.rowsPerPage}
          onPageChange={table?.onChangePage}
          onChangeDense={table?.onChangeDense}
          onRowsPerPageChange={table?.onChangeRowsPerPage}
          showResultsCount
          totalResults={total || 0}
        />
      </Card>
    </DashboardContent>
  );
}
