/* eslint-disable @typescript-eslint/no-unused-vars */
import type { IBookingReportsTableFilters } from 'src/types/admin/feature/reports-user';

import { useSetState } from 'minimal-shared/hooks';
import { useRef, useMemo, useEffect } from 'react';
import { useParams, useLocation } from 'react-router';

import { Box, Card, Table, TableBody } from '@mui/material';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { useDebounceMethod } from 'src/utils/helper';
import { roleColumnsToDefinitions } from 'src/utils/role-table-head';
import { getTableStyles, tableContainerStyles, calculateTableMinWidth, stickyBreadcrumbsStyles } from 'src/utils/table-styles';

import { DashboardContent } from 'src/layouts/dashboard';
import { fetchBrands } from 'src/redux/actions/admin/common-actions';
import { fetchUserBookings } from 'src/redux/actions/admin/reports-actions';
import { getStatusOptions } from 'src/services/admin-services/booster-srvice';
import { downloadBookingsUserReports } from 'src/redux/actions/admin/reports-user-actions';

import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  CustomTableSkeleton,
  TablePaginationCustom,
} from 'src/components/table';

import { BookingTableRow } from './user-bookings-table-row';
import { UnitStatusEnum, PaymentStatusEnum } from './reports-common';
import { BookingTableTotalRow } from './user-bookings-table-total-row';
import { UserBookingsTableToolbar } from './user-bookings-table-toolbar';
import { UserBookingsTableFiltersResult } from './user-bookings-table-filters-result';

// ----------------------------------------------------------------------




// ----------------------------------------------------------------------

export function BookingsListView() {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { columns: roleColumns, canExport, canRefresh } = useRoleBasedPermissions({ module: 'reportsBookings' });
  const isFirstRender = useRef(true);

  const { loading, brands, projects } = useAppSelector((state) => state.common);
  const { bookings: dataFiltered } = useAppSelector(
    (state) => state.bookings
  );
  const { rmList } = useAppSelector((state) => state.reportsUser);
  const table = useTable();
  const { id } = useParams();

  const tableHeadFromRole = useMemo(
    () => roleColumnsToDefinitions(roleColumns),
    [roleColumns]
  );
  const columnManager = useColumnManager(tableHeadFromRole);
  const { visibleColumns } = columnManager;
  const filters = useSetState<IBookingReportsTableFilters>({
    name: '',
    brandId: '',
    projectIds: null,
    rmIds: null,
    unitStatus: '',
    incentiveStatus: '',
    startDate: null,
    endDate: null,
    sortBy: '',
    userId: id,
    // search: ''
  });
  const { state: currentFilters } = filters;
  const dynamicMinWidth = calculateTableMinWidth(visibleColumns || tableHeadFromRole);

  const handleBookingsExport = () => {
    const payload: Record<string, any> = {};

    if (currentFilters?.userId) payload.userId = currentFilters?.userId;
    if (currentFilters?.brandId) payload.brandId = currentFilters?.brandId;
    if (currentFilters?.rmIds) payload.rmIds = currentFilters?.rmIds;
    if (currentFilters?.projectIds?.length) payload.projectIds = currentFilters?.projectIds.join(',');
    if (currentFilters?.unitStatus) payload.unitStatus = currentFilters?.unitStatus;
    if (currentFilters?.incentiveStatus) payload.incentiveStatus = currentFilters?.incentiveStatus;
    if (currentFilters?.startDate) payload.startDate = currentFilters?.startDate?.format('YYYY-MM-DD');
    if (currentFilters?.endDate) payload.endDate = currentFilters?.endDate?.format('YYYY-MM-DD');
    if (currentFilters?.name) payload.search = currentFilters?.name;
    if (table?.orderBy && table?.order) {
      payload.sortBy = `${table?.orderBy}:${table?.order}`;
    }

    dispatch(downloadBookingsUserReports(payload));
  };

  const getApiCall = () => {
    const { name, startDate, endDate, rmIds, ...rest } = currentFilters;

    const payload = {
      page: table.page + 1,
      limit: table?.rowsPerPage,
      search: filters.state.name,
      rmIds: filters.state.rmIds,
      startDate: startDate?.format('YYYY-MM-DD'),
      endDate: endDate?.format('YYYY-MM-DD'),
      ...rest,
    };

    if (table?.orderBy && table?.order) {
      payload.sortBy = `${table?.orderBy}:${table?.order}`;
    }

    dispatch(fetchUserBookings(payload));
  };

  const fetchStatusOptions = async () => {
    try {
      const response = await getStatusOptions();

      const statusOptionList = Object.keys(response).map((key) => response[key].name);
      
    } catch (error) {
      console.log(error);
    }
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
    table?.setSelected([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentFilters?.endDate,
    currentFilters?.startDate,
    currentFilters?.projectIds,
    currentFilters?.rmIds,
    currentFilters?.brandId,
    currentFilters?.unitStatus,
    currentFilters?.incentiveStatus,
    table.page ,
    table?.rowsPerPage,
    table?.orderBy,
    table?.order,
  ]);

  useEffect(() => {
    Promise.all([dispatch(fetchBrands()), fetchStatusOptions()]);
  }, [dispatch]);

  const canReset =
    !!currentFilters?.name ||
    !!currentFilters?.brandId ||
    !!currentFilters?.projectIds ||
    !!currentFilters?.rmIds ||
    !!currentFilters?.unitStatus ||
    !!currentFilters?.incentiveStatus ||
    !!currentFilters?.startDate ||
    !!currentFilters?.endDate;

  const notFound =
    (!dataFiltered?.data?.bookings?.length && canReset) || !dataFiltered?.data?.bookings?.length;

  return (
    <DashboardContent>
      {/* Sticky Breadcrumbs */}
      <Box
         sx={stickyBreadcrumbsStyles}
      >
        {!location.pathname.includes('users') ? (
          <>
            <CustomBreadcrumbs heading="Bookings" />
            {dataFiltered?.message && (
              <>{dataFiltered?.message}</>
              )}
          </>
        ) : (
          <CustomBreadcrumbs
            heading={dataFiltered?.message && (
              <>{dataFiltered?.message}</>
            )}
          />
        )}
      </Box>
      {/* <ReportsUserSummaryCards 
        totals={{
          grossTotalValueSum: dataFiltered?.data?.grossTotalValueSum || 0,
          incentiveAmountSum: dataFiltered?.data?.incentiveAmountSum || 0
        }} 
        loading={bookingsLoading} 
      /> */}

      <Card sx={tableContainerStyles}>
        {/* Fixed Header Section */}
        <Box sx={{ flexShrink: 0 }}>
          <UserBookingsTableToolbar
            filters={filters}
            columnManager={columnManager}
            options={{
              brand: brands?.map((brand) => ({ value: brand.id, label: brand.name })),
              project: projects?.map((project) => ({ value: project.id, label: project.name })),
              // @ts-ignore
              rm: rmList?.map((rm) => ({ value: rm.id, label: rm.name })),
              unitStatus: UnitStatusEnum?.map((status) => ({
                value: status.id,
                label: status.name,
              })),
              incentiveStatus: PaymentStatusEnum?.map((incentive) => ({
                value: incentive.id,
                label: incentive.name,
              })),
            }}
            onResetPage={table?.onResetPage}
            handleExport={handleBookingsExport}
            dataLength={dataFiltered?.data?.bookings?.length || 0}
            canExport={canExport}
            canRefresh={canRefresh}
          />

          {canReset && (
            <UserBookingsTableFiltersResult
              filters={filters}
              totalResults={dataFiltered?.data?.total}
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
          minHeight: 0,
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
              sx={{ ...getTableStyles(dynamicMinWidth) }}
            >
              <TableHeadCustom
                hideCheckbox
                sx={{
                  backgroundColor: 'background.paper',
                }}
                order={table?.order}
                orderBy={table?.orderBy}
                headLabel={visibleColumns || []}
                onSort={table?.onSort}
              />

              <TableBody>
                {loading ? (
                  <CustomTableSkeleton rowCount={table?.rowsPerPage} cellCount={visibleColumns?.length || tableHeadFromRole.length} />
                ) : dataFiltered?.data?.bookings?.length > 0 ? (
                  <>
                    {dataFiltered?.data?.bookings?.map((row: any, index: number) => (
                      row && (
                        <BookingTableRow
                          key={row?.id}
                          index={index}
                          row={row as any}
                          reset={table?.onResetPage}
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
                          table={table}
                          currentFilters={currentFilters}
                        />
                      )
                    ))}
                    {/* Total Row */}
                    <BookingTableTotalRow
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
                      totals={{
                        grossTotalValueSum: dataFiltered?.data?.grossTotalValueSum || 0,
                        incentiveAmountSum: dataFiltered?.data?.incentiveAmountSum || 0,
                      }}
                    />
                  </>
                ) : (
                  <TableNoData notFound={notFound} />
                )}
              </TableBody>
            </Table>
          </Scrollbar>
        </Box>

        {/* Fixed Footer Section */}
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
              count={dataFiltered?.data?.total || 0}
              rowsPerPage={table?.rowsPerPage}
              onPageChange={table?.onChangePage}
              onChangeDense={table?.onChangeDense}
              onRowsPerPageChange={table?.onChangeRowsPerPage}
              showResultsCount
              totalResults={dataFiltered?.data?.total || 0}
            />
          </Box>
        )}

      </Card>
    </DashboardContent>
  );
}
