import type { ColumnDefinition } from 'src/hooks/use-column-manager';

import { useParams } from 'react-router';
import React, { useMemo, useState, useEffect, useCallback } from 'react';

import { Box, Card, Table, TableBody } from '@mui/material';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { ROLES, BatchStatus, generateRoleBasedRoute } from 'src/utils/constant';
import {
  getTableStyles,
  tableContainerStyles,
  calculateTableMinWidth,
  stickyBreadcrumbsStyles,
} from 'src/utils/table-styles';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchBatchVouchersListAction, fetchBatchSlotsDropdownAction } from 'src/redux/actions/common-module/batch-manager-actions';

import { Scrollbar } from 'src/components/scrollbar';
import { AnimateLogo1 } from 'src/components/animate';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import BatchVoucherListRow from './batch-voucher-list-row';
import BatchVoucherListToolbar from './batch-voucher-list-toolbar';
import { BatchVoucherListFilterResult } from './batch-voucher-list-filter-result';

const BatchVoucherListView = () => {
  const { columns: roleColumns, userRole, actions: roleActions } = useRoleBasedPermissions({
    module: 'batchVoucherListing',
  });

  const { batchVouchersListData, batchId, batchName, loading, campaignName, slotName, batchSlotsDropdownData, batchStatus } = useAppSelector(
    (state) => state.batchManager
  );

  const TABLE_HEAD: ColumnDefinition[] = useMemo(
    () => Object.values(roleColumns),
    [roleColumns]
  );
  
  const total = batchVouchersListData.length || 0;
  const { id } = useParams()
  const dispatch = useAppDispatch();
  const table = useTable();

  const columnManager = useColumnManager(TABLE_HEAD);
  const { visibleColumns } = columnManager;
  const filteredColumns = useMemo(
    () =>
      batchStatus === BatchStatus.ARCHIVED
        ? visibleColumns.filter((col) => col.id !== 'action')
        : visibleColumns,
    [visibleColumns, batchStatus]
  );

  const dynamicMinWidth = calculateTableMinWidth(filteredColumns || TABLE_HEAD);

  const [search, setSearch] = useState('');

  const canReset = !!search;

  const handleRefresh = useCallback(() => {
    if (id) {
      const params = {
        slotId: String(id),
        page: table.page + 1,
        limit: table.rowsPerPage,
        search,
      };
      dispatch(fetchBatchVouchersListAction(params));
    }
  }, [dispatch, table.page, table.rowsPerPage, search, id]);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  useEffect(() => {
    const allowedRoles = [ROLES.Admin, ROLES.SuperAdmin];
    if (allowedRoles.includes(userRole as ROLES) && batchId && id) {
      const params = {
        batchId,
        excludeSlotId: String(id) || '',
      };

      dispatch(fetchBatchSlotsDropdownAction(params));
    }
  }, [batchId, dispatch, id, userRole]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    table.onResetPage();
  }, [table]);


  if (loading) {
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
      <CustomBreadcrumbs 
        heading={slotName} 
        sx={stickyBreadcrumbsStyles}
        links={[
          {
            name: uiText.batchManager.batchListingHeading,
            href: generateRoleBasedRoute(userRole, 'batch/listing'),
          },
          {
            name: `${campaignName} - ${batchName}`,
            href: generateRoleBasedRoute(userRole, `batch/listing/slot-details/${batchId}`),
          },
          {
            name: slotName,
            href: '#',
          }
        ]} 
      />

      <Card sx={tableContainerStyles}>
        <BatchVoucherListToolbar
          columnManager={columnManager}
          search={search}
          onSearchChange={handleSearchChange}
        />

        {canReset && (
          <BatchVoucherListFilterResult
            search={search}
            setSearch={setSearch}
            totalResults={total}
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
                headLabel={filteredColumns}
                hideCheckbox
                rowCount={batchVouchersListData?.length || 0}
              />
              <TableBody>
                {batchVouchersListData?.length > 0 ? (
                  batchVouchersListData?.map((row: any, index: number) => (
                    <BatchVoucherListRow
                      key={row.id || index}
                      row={row}
                      visibleColumns={filteredColumns}
                      roleActions={roleActions}
                      onRefresh={handleRefresh}
                      slotId={String(id)}
                      batchSlotsDropdownData= {batchSlotsDropdownData || []}
                    />
                  ))
                ) : (
                  <TableNoData notFound colSpan={filteredColumns?.length || TABLE_HEAD.length} />
                )}
              </TableBody>
            </Table>
          </Scrollbar>
        </Box>
        {batchVouchersListData?.length > 0 && (
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
    </DashboardContent>
  );
};

export default BatchVoucherListView;
