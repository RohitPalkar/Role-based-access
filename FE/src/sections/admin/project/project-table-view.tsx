import type { RootState, AppDispatch } from 'src/redux/store';
import type { IProjectItem, IProjectTableFilters } from 'src/types/admin/feature/project';

import { useRef, useMemo, useEffect } from 'react';
import { useSetState } from 'minimal-shared/hooks';

import { Box, Card, Table, Button, TableBody } from '@mui/material';

import { RouterLink } from 'src/routes/components';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useAdminPanelPaths } from 'src/hooks/use-admin-panel-paths';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { useDebounceMethod } from 'src/utils/helper';
import { roleColumnsToDefinitions } from 'src/utils/role-table-head';
import { getTableStyles, tableContainerStyles, calculateTableMinWidth, stickyBreadcrumbsStyles } from 'src/utils/table-styles';

import { DashboardContent } from 'src/layouts/dashboard';
import { fetchBrands, fetchCitiesByBrandId } from 'src/redux/actions/admin/common-actions';
import { fetchProjects, getBillingEntities } from 'src/redux/actions/admin/project-actions';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableHeadGrouped,
  CustomTableSkeleton,
  TablePaginationCustom,
} from 'src/components/table';

import { ProjectTableRow } from './component/project-table-row';
import { ProjectTableToolbar } from './component/project-table-toolbar';
import { ProjectTableFiltersResult } from './component/project-table-filters-result';

// Group configuration for table headers
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

export function ProjectListView() {
  const table = useTable();
  const isFirstRender = useRef(true);
  const panelPaths = useAdminPanelPaths();
  const { columns: roleColumns, canCreate } = useRoleBasedPermissions({ module: 'projectList' });

  const dispatch: AppDispatch = useAppDispatch();
  const {
    projects: dataFiltered,
    loading,
    billingEntites,
    totalCount,
  } = useAppSelector((state: RootState) => state.project);
  const { cities, brands } = useAppSelector((state) => state.common);

  const tableHeadFromRole = useMemo(
    () => roleColumnsToDefinitions(roleColumns),
    [roleColumns]
  );

  const columnManager = useColumnManager(tableHeadFromRole);
  const { visibleColumns } = columnManager;

  const filters = useSetState<IProjectTableFilters>({
    name: '',
    brand: null,
    city: null,
    billingEntity: null,
    phases: null,
  });

  const { state: currentFilters } = filters;

  const getApiCall = () => {
    const { name, ...rest } = filters.state;
    const sortByValue = table?.orderBy && table?.order && `${table?.orderBy}:${table?.order}`;
    const payload = {
      page: table.page  + 1,
      search: name,
      limit: table?.rowsPerPage,
      sortBy: sortByValue,
      brandId: currentFilters?.brand ? Number(currentFilters?.brand) : undefined,
      cityId: currentFilters?.city ? Number(currentFilters?.city) : undefined,
      billingEntities: currentFilters?.billingEntity ? currentFilters?.billingEntity : undefined,
      ...rest,
    };
    dispatch(fetchProjects(payload));
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
    table.page ,
    currentFilters?.brand,
    currentFilters?.city,
    currentFilters?.billingEntity,
    table?.orderBy,
    table?.order,
  ]);
  useEffect(() => {
    Promise.all([dispatch(fetchBrands())]);
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchCitiesByBrandId(''));
  }, [dispatch]);

  useEffect(() => {
    dispatch(getBillingEntities());
  }, [dispatch]);

  const tableOnReset = () => {
    table?.onResetPage();
  };

  const canReset =
    !!currentFilters?.name ||
    !!currentFilters?.billingEntity ||
    !!currentFilters?.brand ||
    !!currentFilters?.city;

  const notFound = (!dataFiltered?.length && canReset) || !dataFiltered?.length;

  // Calculate dynamic minimum width based on visible columns
  const dynamicMinWidth = calculateTableMinWidth(visibleColumns || tableHeadFromRole);

  const renderTableContent = () => {
    if (loading) {
      return (
        <CustomTableSkeleton 
          rowCount={table?.rowsPerPage} 
          cellCount={visibleColumns?.length || tableHeadFromRole.length} 
        />
      );
    }
    if (dataFiltered && dataFiltered.length > 0) {
      return dataFiltered.map((row) => (
        <ProjectTableRow
          key={row?.id}
          row={row as unknown as IProjectItem}
          selected={table?.selected.includes(row?.id.toString())}
          columnVisibility={columnManager.columns.reduce(
            (acc, col) => ({ ...acc, [col.id]: col.visible }),
            {} as Record<string, boolean>
          )}
        />
      ));
    }
    return (
      <TableNoData 
        notFound={notFound} 
        colSpan={visibleColumns?.length || tableHeadFromRole.length} 
      />
    );
  };

  return (
    <DashboardContent>
      {/* Sticky Breadcrumbs */}
      <CustomBreadcrumbs
        heading="Projects"
        action={
          canCreate ? (
            <Button
              component={RouterLink}
              href={panelPaths.project.create}
              variant="contained"
              className="primaryBtn"
              startIcon={<Iconify icon="mingcute:add-line" />}
            >
              Add Project
            </Button>
          ) : undefined
        }
        sx={stickyBreadcrumbsStyles}
      />

 <Card sx={tableContainerStyles}>

        {/* Fixed Header Section */}
        <Box sx={{ flexShrink: 0 }}>
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ flexGrow: 1 }}>
              <ProjectTableToolbar
                filters={filters}
                onResetPage={tableOnReset}
                columnManager={columnManager}
                options={{
                  brand: brands?.map((brand) => ({ value: brand.id, label: brand.name })),
                  city: Array.isArray(cities)
                    ? cities.map((city) => ({ value: city.id, label: city?.name || '' }))
                    : [],
                  billingEntity: billingEntites?.map((billing: any) => ({
                    value: billing.id,
                    label: billing.name,
                  })),
                }}
                getLists={getApiCall}
              />
            </Box>
          </Box>

          {canReset && (
            <ProjectTableFiltersResult
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
                {renderTableContent()}
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
              page={table.page }
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