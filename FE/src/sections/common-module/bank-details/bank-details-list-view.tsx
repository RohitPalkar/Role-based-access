import React, { useMemo, useState, useEffect } from 'react';

import { Box, Card, Table, TableBody } from '@mui/material';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { roleColumnsToDefinitions } from 'src/utils/role-table-head';
import {
  getTableStyles,
  tableContainerStyles,
  tableScrollbarStyles,
  calculateTableMinWidth,
  stickyBreadcrumbsStyles,
  scrollableTableContentStyles,
} from 'src/utils/table-styles';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchBankDetailsList } from 'src/redux/actions/rm-panel/bank-details-actions';

import { Scrollbar } from 'src/components/scrollbar';
import { AnimateLogo1 } from 'src/components/animate';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import BankDetailsTableRow from './components/bank-details-table-row';
import BankDetailsTableToolbar from './components/bank-details-table-toolbar';
import BankDetailsFilterResult from './components/bank-details-filter-result';

const BankDetailsListView = () => {
  const { columns: roleColumns, actions: roleActions } = useRoleBasedPermissions({
    module: 'bankDetails',
  });
  const { bankDetailsList, loading, total } = useAppSelector((state) => state.bankDetails);
  const table = useTable();
  const dispatch = useAppDispatch();

  const tableHeadFromRole = useMemo(
    () => roleColumnsToDefinitions(roleColumns),
    [roleColumns]
  );
  const columnManager = useColumnManager(tableHeadFromRole);
  const { visibleColumns } = columnManager;
  const dynamicMinWidth = calculateTableMinWidth(visibleColumns || tableHeadFromRole);
  const [search, setSearch] = useState('');
  const canReset = !!search;

  useEffect(() => {
    const params = {
      page: table.page + 1,
      limit: table.rowsPerPage,
      search,
    };
    dispatch(fetchBankDetailsList(params));
  }, [dispatch, search, table.page, table.rowsPerPage]);

  return (
    <DashboardContent>
      <Box sx={stickyBreadcrumbsStyles}>
        <CustomBreadcrumbs
          heading={uiText.bankDetails.title}
          slotProps={{
            container: {
              sx: {
                justifyContent: 'flex-start',
              },
            },
          }}
        />
      </Box>
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
        <Card sx={tableContainerStyles}>
          <BankDetailsTableToolbar
            search={search}
            setSearch={setSearch}
            onResetPage={table.onResetPage}
            columnManager={columnManager}
          />

          {/* Filters result */}
          {canReset && (
            <BankDetailsFilterResult
              search={search}
              setSearch={setSearch}
              totalResults={bankDetailsList?.length || 0}
              sx={{ px: 2, pb: 1 }}
              onResetPage={table.onResetPage}
            />
          )}
          <Box sx={scrollableTableContentStyles}>
            <Scrollbar sx={tableScrollbarStyles}>
              <Table
                stickyHeader
                size={table?.dense ? 'small' : 'medium'}
                sx={getTableStyles(dynamicMinWidth)}
              >
                <TableHeadCustom
                  headLabel={visibleColumns}
                  orderBy={table.orderBy}
                  order={table.order}
                  onSort={table.onSort}
                  numSelected={0}
                  rowCount={bankDetailsList.length}
                />
                <TableBody>
                  {bankDetailsList?.length > 0 ? (
                    bankDetailsList?.map((row) => (
                      <BankDetailsTableRow
                        key={row.campaignId}
                        row={row}
                        visibleColumns={visibleColumns}
                        roleActions={roleActions}
                      />
                    ))
                  ) : (
                    <TableNoData notFound colSpan={visibleColumns?.length || tableHeadFromRole.length} />
                  )}
                </TableBody>
              </Table>
            </Scrollbar>
          </Box>
          {bankDetailsList?.length > 0 && (
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
                count={total}
                rowsPerPage={table?.rowsPerPage}
                onPageChange={table?.onChangePage}
                onRowsPerPageChange={table?.onChangeRowsPerPage}
                showResultsCount
                totalResults={total}
              />
            </Box>
          )}
        </Card>
      )}
    </DashboardContent>
  );
};

export default BankDetailsListView;
