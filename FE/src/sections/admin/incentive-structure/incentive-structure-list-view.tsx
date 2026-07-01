import type {
  IIncentiveStructureItem,
  IIncentiveStructureTableFilters,
} from 'src/types/admin/feature/incentive-structure';

import dayjs from 'dayjs';
import { useSetState } from 'minimal-shared/hooks';
import React, { useRef, useMemo, useEffect } from 'react';

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
import { FILTER_STATUS_OPTIONS } from 'src/utils/constant';
import { roleColumnsToDefinitions } from 'src/utils/role-table-head';
import { getTableStyles, tableContainerStyles, calculateTableMinWidth, stickyBreadcrumbsStyles } from 'src/utils/table-styles';

import { DashboardContent } from 'src/layouts/dashboard';
import { fetchBrands } from 'src/redux/actions/admin/brands-actions';
import { fetchIncentives } from 'src/redux/actions/admin/incentive-actions';

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

import { IncentiveStructureTableRow } from './components/incentive-structure-table-row';
import { IncentiveStructureTableToolbar } from './components/incentive-structure-table-toolbar';
import { IncentiveStructureTableFiltersResult } from './components/incentive-structure-table-filters-result';

// ----------------------------------------------------------------------


// ----------------------------------------------------------------------

export function IncentiveStructureListView() {
  const dispatch = useAppDispatch();
  const isFirstRender = useRef(true);
  const panelPaths = useAdminPanelPaths();
  const { columns: roleColumns, canCreate } = useRoleBasedPermissions({ module: 'incentiveStructure' });

  const {
    incentiveLists: dataFiltered = [],
    total = 0,
    loading = false,
    
  } = useAppSelector((state) => state.incentive || {
    incentiveLists: [],
    total: 0,
    loading: false,
    error: null
  });
  const { brandsList = [] } = useAppSelector((state) => state.brandsList || { brandsList: [] });

  const table = useTable();
  
  const tableHeadFromRole = useMemo(
    () => roleColumnsToDefinitions(roleColumns),
    [roleColumns]
  );
  const columnManager = useColumnManager(tableHeadFromRole);
  const { visibleColumns } = columnManager;

  const dynamicMinWidth = calculateTableMinWidth(visibleColumns || tableHeadFromRole);


  const filters = useSetState<IIncentiveStructureTableFilters>({
    name: '',
    brand: null,
    project: null,
    status: null,
    startDate: null,
    endDate: null,
  });

  const { state: currentFilters } = filters;

  const getApiCall = () => {
    try {
      const { name, brand, startDate, endDate, ...rest } = currentFilters || {};
      const payload = {
        page: (table?.page || 0) + 1,
        search: name || '',
        limit: table?.rowsPerPage || 10,
        brandId: brand || undefined,
        sortBy: table?.orderBy ? `${table.orderBy}:${table.order}` : undefined,
        startDate: startDate ? dayjs(startDate).format('YYYY-MM-DD') : undefined,
        endDate: endDate ? dayjs(endDate).format('YYYY-MM-DD') : undefined,
        ...rest,
      };
      dispatch(fetchIncentives(payload));
    } catch (error) {
      console.error('Error in getApiCall:', error);
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
  }, [currentFilters?.name]);

  useEffect(() => {
    getApiCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentFilters?.brand,
    currentFilters?.endDate,
    currentFilters?.startDate,
    currentFilters?.status,
    table?.page,
    table?.rowsPerPage,
    table?.orderBy,
    table?.order,
  ]);

  useEffect(() => {
    Promise.all([dispatch(fetchBrands({ limit: 10 }))]);
  }, [dispatch]);

  const canReset = !!currentFilters?.name || !!currentFilters?.status || !!currentFilters?.brand || !!currentFilters?.startDate || !!currentFilters?.endDate;

  const notFound = (!dataFiltered?.length && canReset) || !dataFiltered?.length;

  return (
    <DashboardContent>
      {/* Sticky Breadcrumbs */}
      <Box
       sx={stickyBreadcrumbsStyles}
      >
        <CustomBreadcrumbs
          heading="Incentive Policies"
          action={
            canCreate ? (
              <Button
                component={RouterLink}
                href={panelPaths.incentiveStructure.create}
                variant="contained"
                className="primaryBtn"
                startIcon={<Iconify icon="mingcute:add-line" />}
              >
                Add Incentive Policy
              </Button>
            ) : undefined
          }
        />
      </Box>

       <Card sx={tableContainerStyles}>
      
        {/* Fixed Header Section */}
        <Box sx={{ flexShrink: 0 }}>
          <IncentiveStructureTableToolbar
            filters={filters}
            onResetPage={table?.onResetPage || (() => {})}
            columnManager={columnManager}
            options={{
              status: FILTER_STATUS_OPTIONS || [],
             brand: (brandsList || [])
              .filter((brand) => brand?.id) // Ensure brand exists and has an id
              .map((brand) => ({ 
                value: brand?.id, 
                label: brand?.name || 'Unknown Brand' 
              }))
            }}
          />

          {canReset && (
            <IncentiveStructureTableFiltersResult
              filters={filters}
              totalResults={dataFiltered?.length || 0}
              onResetPage={table?.onResetPage || (() => {})}
              brands={(brandsList || []).map((brand) => ({ 
                value: brand?.id || '', 
                label: brand?.name || 'Unknown Brand' 
              }))}
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
                hideCheckbox
                sx={{ 
                  whiteSpace: 'nowrap',
                  backgroundColor: 'background.paper' 
                }}
              />

              <TableBody>
                {(() => {
                  if (loading) {
                    return (
                      <CustomTableSkeleton 
                        rowCount={table?.rowsPerPage || 10} 
                        cellCount={visibleColumns?.length || tableHeadFromRole.length}
                      />
                    );
                  }
                  if (dataFiltered?.length > 0) {
                    return dataFiltered
                      ?.filter((row) => row?.id) // Filter out null/undefined rows
                      ?.map((row, index) => {
                        // Safely transform the row data to match expected interface
                        const transformedRow: IIncentiveStructureItem = {
                          id: row?.id,
                          name: row?.name || '',
                          status: row?.status || (row?.active ? 'Active' : 'Inactive'),
                          projectName: row?.projectName || null,
                          brandName: row?.brandName || { name: '' },
                          duration: row?.duration || undefined,
                          active: undefined
                        };
                        
                        return (
                          <IncentiveStructureTableRow
                            key={row?.id ? `incentive-${row?.id}` : `row-${index}`}
                            row={transformedRow}
                            selected={table?.selected?.includes(row?.id?.toString() || '') || false}
                            editHref={panelPaths.incentiveStructure.edit(row?.id?.toString() || '')}
                            readOnly={!canCreate}
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
                        );
                      });
                  }
                  return (
                    <TableNoData 
                      notFound={notFound} 
                      colSpan={visibleColumns?.length || tableHeadFromRole.length} 
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
              totalResults={total|| 0}
            />
          </Box>
        )}
      </Card>
    </DashboardContent>
  );
}
