import type { ColumnDefinition } from 'src/hooks/use-column-manager';

import { toast } from 'sonner';
import React, { useMemo, useState, useEffect } from 'react';

import { Box, Card, Table, TableBody } from '@mui/material';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import {
  getTableStyles,
  tableContainerStyles,
  calculateTableMinWidth,
  stickyBreadcrumbsStyles,
} from 'src/utils/table-styles';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchBatchViewRecordsAction } from 'src/redux/actions/common-module/batch-manager-actions';

import { Scrollbar } from 'src/components/scrollbar';
import { AnimateLogo1 } from 'src/components/animate';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import BatchRecordsRow from './components/batch-records/batch-records-row';
import BatchRecordsToolbar from './components/batch-records/batch-records-toolbar';
import { BatchVoucherListFilterResult } from './components/batch-voucher-listing/batch-voucher-list-filter-result';

const BatchRecordsView = () => {
  const { columns: roleColumns } = useRoleBasedPermissions({
    module: 'batchViewRecords',
  });

  const TABLE_HEAD: ColumnDefinition[] = useMemo(
    () => Object.values(roleColumns),
    [roleColumns]
  );

  const columnManager = useColumnManager(TABLE_HEAD);
  const { visibleColumns } = columnManager;
  const dynamicMinWidth = calculateTableMinWidth(visibleColumns || TABLE_HEAD);

  const dispatch = useAppDispatch();
  const table = useTable();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [refreshKey, setRefreshKey] = useState(0);

  const { batchRecordsList, batchRecordsTotal, batchRecordsError, batchRecordsLoading } =
    useAppSelector((state) => state.batchManager);

  const canReset = !!search;

  useEffect(() => {
    if (batchRecordsError) {
      toast.error(batchRecordsError);
    }
  }, [batchRecordsError]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search.toLowerCase().trim()), 1000);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    table.onResetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    const params = {
      page: table.page + 1,
      limit: table.rowsPerPage,
      ...(debouncedSearch && { search: debouncedSearch }),
    };
    dispatch(fetchBatchViewRecordsAction(params));
  }, [dispatch, debouncedSearch, table.page, table.rowsPerPage, refreshKey]);

  if (batchRecordsLoading) {
    return (
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          height: '50vh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AnimateLogo1 />
      </Box>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs heading={uiText.batchManager.viewRecords} sx={stickyBreadcrumbsStyles} />
      <Card sx={{ ...tableContainerStyles, mt: 1 }}>
        <BatchRecordsToolbar
          columnManager={columnManager}
          search={search}
          onSearchChange={setSearch}
        />

        {canReset && (
          <BatchVoucherListFilterResult
            search={search}
            setSearch={setSearch}
            totalResults={batchRecordsTotal}
            onResetPage={table.onResetPage}
            sx={{ px: 1.5, py: 0.75 }}
          />
        )}

        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            position: 'relative',
          }}
        >
          <Scrollbar
            sx={{
              height: '100%',
              '& .simplebar-content': {
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              },
            }}
          >
            <Table
              stickyHeader
              size={table?.dense ? 'small' : 'medium'}
              sx={getTableStyles(dynamicMinWidth)}
            >
              <TableHeadCustom
                order="asc"
                orderBy={undefined}
                headLabel={visibleColumns}
                hideCheckbox
                rowCount={batchRecordsList?.length || 0}
              />
              <TableBody>
                {batchRecordsList?.length > 0 ? (
                  batchRecordsList.map((row) => (
                    <BatchRecordsRow
                      key={row.id || `${row.uniqueReferenceId}-${row.paidVoucherId}`}
                      row={row}
                      visibleColumns={visibleColumns}
                      onRefresh={() => setRefreshKey((prev) => prev + 1)}
                    />
                  ))
                ) : (
                  <TableNoData notFound colSpan={visibleColumns?.length || TABLE_HEAD.length} />
                )}
              </TableBody>
            </Table>
          </Scrollbar>
        </Box>
        {(batchRecordsTotal > 0 || batchRecordsList?.length > 0) && (
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
              count={batchRecordsTotal}
              rowsPerPage={table?.rowsPerPage}
              onPageChange={table?.onChangePage}
              onRowsPerPageChange={table?.onChangeRowsPerPage}
              showResultsCount
              totalResults={batchRecordsTotal}
            />
          </Box>
        )}
      </Card>
    </DashboardContent>
  );
};

export default BatchRecordsView;
