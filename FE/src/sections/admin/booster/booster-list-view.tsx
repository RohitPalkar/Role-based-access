
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { IBoosterItem, IBoosterTableFilters } from 'src/types/admin/feature/booster';

import { useSetState } from 'minimal-shared/hooks';
import { useRef, useMemo, useState, useEffect } from 'react';

import {
  Box,
  Card,
  Table,
  Button,
  TableBody,
} from '@mui/material';

import { RouterLink } from 'src/routes/components';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useAdminPanelPaths } from 'src/hooks/use-admin-panel-paths';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { useDebounceMethod } from 'src/utils/helper';
import { roleColumnsToDefinitions } from 'src/utils/role-table-head';
import { getTableStyles, tableContainerStyles, calculateTableMinWidth, stickyBreadcrumbsStyles } from 'src/utils/table-styles';

import { DashboardContent } from 'src/layouts/dashboard';
import { fetchBrands } from 'src/redux/actions/admin/common-actions';
import { fetchBooster } from 'src/redux/actions/admin/booster-actions';
import { getStatusOptions } from 'src/services/admin-services/booster-srvice';

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

import { BoosterTableRow } from './components/booster-table-row';
import { BoosterTableToolbar } from './components/booster-table-toolbar';
import { BoosterTableFiltersResult } from './components/booster-table-filters-result';

// ----------------------------------------------------------------------


// ----------------------------------------------------------------------

export function BoosterListView() {
  const dispatch = useAppDispatch();
  const isFirstRender = useRef(true);
  const table = useTable();
  const panelPaths = useAdminPanelPaths();
  const { columns: roleColumns, canCreate } = useRoleBasedPermissions({ module: 'booster' });

  const { booster: dataFiltered, total, loading } = useAppSelector((state) => state.boosters);
  const { cities, brands, projects } = useAppSelector((state) => state.common);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);

  const filters = useSetState<IBoosterTableFilters>({
    projectName: '',
    project: null,
    cityId: [],
    brandId: null,
    status: null,
    startDate: null,
    endDate: null,
    sortBy: null,
  });
  const { state: currentFilters } = filters;

  const tableHeadFromRole = useMemo(
    () => roleColumnsToDefinitions(roleColumns),
    [roleColumns]
  );
  const columnManager = useColumnManager(tableHeadFromRole);
  const { visibleColumns } = columnManager;
  const dynamicMinWidth = calculateTableMinWidth(visibleColumns || tableHeadFromRole);


  const getApiCall = () => {
    const { projectName, startDate, endDate, ...rest } = currentFilters;

    const payload = {
      page: table.page  + 1,
      limit: table?.rowsPerPage,
      search: filters.state.projectName,
      startDate: startDate?.format('YYYY-MM-DD'),
      endDate: endDate?.format('YYYY-MM-DD'),
      ...rest,
    };
    if (table?.orderBy && table?.order) {
      payload.sortBy = `${table?.orderBy}:${table?.order}`;
    }

    dispatch(fetchBooster(payload));
  };

  const fetchStatusOptions = async () => {
    try {
      const response = await getStatusOptions();

      const statusOptionList = Object.keys(response).map((key) => response[key].name);
      setStatusOptions(statusOptionList);
    } catch (error) {
      console.log(error);
    }
  };

  const debounceApiCall = useDebounceMethod(getApiCall, 500);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false; // Mark first render as done, no need to call API on first render
      return;
    }
    debounceApiCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFilters?.projectName]);

  useEffect(() => {
    getApiCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentFilters?.brandId,
    currentFilters?.cityId,
    currentFilters?.endDate,
    currentFilters?.startDate,
    currentFilters?.project,
    currentFilters?.status,
    table.page ,
    table?.rowsPerPage,
    table?.orderBy,
    table?.order,
  ]);

  useEffect(() => {
    Promise.all([dispatch(fetchBrands())]);
  }, [dispatch]);

  useEffect(() => {
    fetchStatusOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canReset =
    !!currentFilters?.projectName ||
    !!currentFilters?.status ||
    currentFilters?.cityId?.length > 0 ||
    !!currentFilters?.brandId ||
    !!currentFilters?.startDate ||
    !!currentFilters?.endDate;

  const notFound = (!dataFiltered?.length && canReset) || !dataFiltered?.length;

  return (
    <DashboardContent>
      {/* Sticky Breadcrumbs */}
      <Box
        sx={stickyBreadcrumbsStyles}
      >
        <CustomBreadcrumbs
          heading="Booster Policies"
          action={
            canCreate ? (
              <Button
                component={RouterLink}
                href={panelPaths.booster.create}
                variant="contained"
                className="primaryBtn"
                startIcon={<Iconify icon="mingcute:add-line" />}
              >
                Add Booster Scheme
              </Button>
            ) : undefined
          }
        />
      </Box>

      <Card sx={tableContainerStyles}>
        {/* Fixed Header Section */}
        <Box sx={{ flexShrink: 0 }}>
          <BoosterTableToolbar
            filters={filters}
            options={{
              status: statusOptions,
              brand: brands?.map((brand) => ({ value: brand.id, label: brand.name })),
              city: Array.isArray(cities)
                ? cities.map((city) => ({ value: city.id, label: city?.name || '' }))
                : [],
              project: projects?.map((project) => ({ value: project.id, label: project.name })),
            }}
            onResetPage={table?.onResetPage}
            columnManager={columnManager}
          />

          {canReset && (
            <BoosterTableFiltersResult
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
                onSort={table?.onSort}
                sx={{ 
                  whiteSpace: 'nowrap',
                  backgroundColor: 'background.paper' 
                }}
              />

              <TableBody>
                {loading ? (
                  <CustomTableSkeleton rowCount={table?.rowsPerPage} cellCount={visibleColumns?.length || tableHeadFromRole.length} />
                ) : dataFiltered?.length > 0 ? (
                  dataFiltered?.map((row) => (
                    row && (
                      <BoosterTableRow
                        key={row?.id}
                        row={row as IBoosterItem}
                        selected={table?.selected.includes(row?.id?.toString() || '')}
                        editHref={panelPaths.booster.edit(row?.id?.toString() || '')}
                        readOnly={!canCreate}
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
              page={table.page }
              dense={table?.dense}
              count={total}
              rowsPerPage={table?.rowsPerPage}
              onPageChange={table?.onChangePage}
              onChangeDense={table?.onChangeDense}
              onRowsPerPageChange={table?.onChangeRowsPerPage}
              showResultsCount
              totalResults={total|| 0}
            />
          </Box>
        )}
      </Card>
    </DashboardContent>
  );
}
