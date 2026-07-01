import type { FinanceRecordTableItem, FinanceRecordTableFilters } from 'src/types/finance-admin/eoi-finance-record-details';

import { useParams } from 'react-router-dom';
import { useSetState } from 'minimal-shared/hooks';
import React, { useMemo, useState, useEffect } from 'react';

import { Box , Card , Table, TableBody, Typography } from '@mui/material';

import { paths } from 'src/routes/paths';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { CapitalizeFirstLetter } from 'src/utils/helper';
import { eoiPaymentStatusOptions } from 'src/utils/constant';
import { roleColumnsToDefinitions } from 'src/utils/role-table-head';
import {
  getTableStyles,
  tableContainerStyles,
  calculateTableMinWidth,
  stickyBreadcrumbsStyles,
} from 'src/utils/table-styles';

import { DashboardContent } from 'src/layouts/dashboard';
import { fetchTransactionsListAction } from 'src/redux/actions/rm-panel/eoi-finance-actions';

import { Scrollbar } from 'src/components/scrollbar';
import { AnimateLogo1 } from 'src/components/animate';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { useTable, TableNoData, TableHeadCustom, CustomTableSkeleton, TablePaginationCustom } from 'src/components/table';

import { FinanceRecordTableRow } from './finance-record-table-row';
import { FinanceRecordTableToolbar } from './finance-record-table-toolbar';
import { FinanceRecordTableFiltersResult } from './finance-record-table-filter-result';


const FinanceRecordDetailsTable = () => {
  const dispatch = useAppDispatch();
  const table = useTable();
  const { id } = useParams<{ id: string }>();
  const { columns: roleColumns } = useRoleBasedPermissions({ module: 'financeRecordDetails' });
  const { projects } = useAppSelector((state) => state.common);
  // Get transactions data from Redux store
  const {
    transactionsList: dataFiltered = [],
    total = 0,
    loading = false,  
    referenceId = '',
  } = useAppSelector((state) => state.eoiFinance || { transactionsList: [], total: 0, loading: false, error: null});
  
  const tableHeadFromRole = useMemo(
    () => roleColumnsToDefinitions(roleColumns),
    [roleColumns]
  );

  const columnManager = useColumnManager(tableHeadFromRole);
  const { visibleColumns } = columnManager;
  const dynamicMinWidth = calculateTableMinWidth(visibleColumns || tableHeadFromRole);

  const filters = useSetState<FinanceRecordTableFilters>({
    search: '',
    projectIds: [],
    paymentStatus: '',
    startDate: null,
    endDate: null,
  });

  const { state: currentFilters } = filters;
  const [debouncedSearch, setDebouncedSearch] = useState(currentFilters.search);

  useEffect(() => {
      const handler = setTimeout(() => setDebouncedSearch(currentFilters.search), 1000);
      return () => clearTimeout(handler);
  }, [currentFilters.search]);
  
  useEffect(() => {
    // Fetch transactions list for the voucher
    if (id) {
      dispatch(fetchTransactionsListAction({ 
        id,
        params: {
          page: (table?.page ?? 0) + 1, // API is 1-based, table is 0-based
          limit: table?.rowsPerPage ?? 10,
          search: debouncedSearch || '',
        }
      }));
    }
  }, [dispatch, id, table?.page, table?.rowsPerPage, debouncedSearch]);

  const canReset = !!currentFilters?.search || currentFilters?.projectIds?.length > 0 || !!currentFilters?.paymentStatus || !!currentFilters?.startDate || !!currentFilters?.endDate;

  const notFound = (!dataFiltered?.length && canReset) || !dataFiltered?.length;

  const projectOptions =
    projects?.map((p) => ({
      userName: CapitalizeFirstLetter(p.name || ''),
      userId: String(p.id),
    })) || [];

  const tableOnReset = () => {
    table?.onResetPage();
  };

  const renderTableContent = () => {
    if (loading) {
      return (
        <CustomTableSkeleton 
          rowCount={table?.rowsPerPage || 10} 
          cellCount={visibleColumns?.length || tableHeadFromRole.length}
        />
      );
    }

    if (dataFiltered?.length > 0) {
      return dataFiltered.map((row) => {
        if (!row) return null;
        return (
          <FinanceRecordTableRow
            key={row?.id}
            row={row as FinanceRecordTableItem}
            selected={table?.selected?.includes(row?.id?.toString() || '') || false}
            editHref={paths.financeAdmin.voucherEOI.financeRecordDetails(row?.id?.toString() || '')}
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
            currentPage={table?.page || 0}
            rowsPerPage={table?.rowsPerPage || 10}
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
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs heading="Finance Record Detail" sx={stickyBreadcrumbsStyles} />
      {loading ? (
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            height: '80vh',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AnimateLogo1 />
        </Box>
      ) : (
        <>
          <Typography variant="body2" sx={{ color: '#637381', mb: 2 }}> 
            Voucher/EOI ID: {referenceId || ''}
          </Typography>
          <Card sx={tableContainerStyles}>
            {/* Fixed Header Section */}
            <Box sx={{ flexShrink: 0 }}>
              <FinanceRecordTableToolbar
                filters={filters}
                //   onResetPage={table?.onResetPage || (() => {})}
                onResetPage={tableOnReset}
                columnManager={columnManager}
                projectOptions={projectOptions}
                paymentStatusOptions={eoiPaymentStatusOptions}
              />

              {canReset && (
                <FinanceRecordTableFiltersResult
                  filters={filters}
                  totalResults={dataFiltered?.length || 0}
                  // onResetPage={table?.onResetPage || (() => {})}
                  onResetPage={tableOnReset}
                  projectOptions={projectOptions}
                  paymentStatusOptions={eoiPaymentStatusOptions}
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
                  page={table?.page ?? 0}
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
        </>
      )}
    </DashboardContent>
  );
};

export default FinanceRecordDetailsTable;

