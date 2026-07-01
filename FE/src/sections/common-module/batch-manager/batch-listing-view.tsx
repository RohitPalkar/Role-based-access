import type { ColumnDefinition } from 'src/hooks/use-column-manager';

import { toast } from 'sonner';
import React, { useMemo, useState, useEffect } from 'react';

import { Box, Card, Table, Button, TableBody } from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { ROLES, BatchStatus, generateRoleBasedRoute, BATCH_LISTING_TAB_OPTIONS } from 'src/utils/constant';
import {
  getTableStyles,
  tableContainerStyles,
  calculateTableMinWidth,
  stickyBreadcrumbsStyles,
} from 'src/utils/table-styles';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import { setTitleAsync } from 'src/redux/slices/admin/title-slice';
import { fetchBatchListAction } from 'src/redux/actions/common-module/batch-manager-actions';

import { Scrollbar } from 'src/components/scrollbar';
import { AnimateLogo1 } from 'src/components/animate';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import ViewTypeTabs from 'src/sections/common-module/eoi-dashboard/components/view-type-tabs';

import BatchListTableRow from "./components/batch-listing/batch-list-table-row";
import BatchListToolbar from "./components/batch-listing/batch-list-table-toolbar";
import { BatchTableFiltersResult } from './components/batch-listing/batch-table-filters-result';


export default function BatchListingView() {
  const { columns: roleColumns, userRole, actions: roleActions, canCreate } = useRoleBasedPermissions({
    module: 'batchListing',
  });
  const TABLE_HEAD: ColumnDefinition[] = useMemo(
    () => Object.values(roleColumns),
    [roleColumns]
  );

  const showTabView = userRole === ROLES.SuperAdmin || userRole === ROLES.Admin

  const { batchList, total, error, loading } = useAppSelector(
    (state) => state.batchManager
  );

  const dispatch = useAppDispatch();
  const table = useTable();
  const route = useRouter();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [tabValue, setTabValue] = useState(BATCH_LISTING_TAB_OPTIONS[0].value);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => setRefreshKey((prev) => prev + 1);


  const columnManager = useColumnManager(TABLE_HEAD);
  const { visibleColumns } = columnManager;
  
  // Filter out actions column when archived tab is selected
  const filteredColumns = useMemo(() => {
    if (tabValue === BatchStatus.ARCHIVED) {
      return visibleColumns?.filter(col => col.id !== 'actions') || [];
    }
    return visibleColumns || [];
  }, [visibleColumns, tabValue]);
  
  const dynamicMinWidth = calculateTableMinWidth(filteredColumns || TABLE_HEAD);

  useEffect(() => {
    dispatch(setTitleAsync(uiText.batchManager.batchListingHeading));
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search.toLowerCase().trim()), 1000);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    table.onResetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabValue, debouncedSearch]);

  useEffect(() => {
    const params = {
      page: table.page + 1,
      limit: table.rowsPerPage,
      ...(debouncedSearch && { search: debouncedSearch }),
      status: tabValue,
    };
    dispatch(fetchBatchListAction(params));
  }, [dispatch, debouncedSearch, table.page, table.rowsPerPage, tabValue, refreshKey]);


  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setTabValue(newValue as BatchStatus);
    table.onResetPage();
  };

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
        heading={uiText.batchManager.batchListingHeading} 
        action={
          canCreate ? (
            <Button
              variant="contained"
              className="primaryBtn"
              onClick={() => {
                route.push(generateRoleBasedRoute(userRole, 'batch/listing/create'));
              }}

            >
              + {uiText.batchManager.createNewBatch}

            </Button>
          ) : null
        } 
        sx={stickyBreadcrumbsStyles}
        links={[
          {
            name: uiText.batchManager.batchListingHeading,
            href: generateRoleBasedRoute(userRole, 'batch/listing'),
          }
        ]}
      />
      <Card sx={{ ...tableContainerStyles, mt: 1 }} >
        {showTabView && (
          <ViewTypeTabs
            value={tabValue}
            onChange={handleTabChange}
            options={BATCH_LISTING_TAB_OPTIONS}
          />
        )}
        <BatchListToolbar
          columnManager={columnManager}
          search={search}
          onSearchChange={setSearch}
        />
        {Boolean(search) && (
          <BatchTableFiltersResult
            search={search}
            setSearch={setSearch}
            totalResults={total}
            onResetPage={table.onResetPage}
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
                rowCount={batchList.length}
              />
              <TableBody>
                {batchList?.length > 0 ? (
                  batchList?.map((row) => (
                    <BatchListTableRow
                      key={row.id}
                      row={row}
                      visibleColumns={filteredColumns}
                      userRole={userRole}
                      roleActions={roleActions}
                      onRefresh={handleRefresh}
                    />
                  ))
                ) : (
                  <TableNoData notFound colSpan={filteredColumns?.length || TABLE_HEAD.length} />
                )}
              </TableBody>
            </Table>
          </Scrollbar>
        </Box>
        {batchList?.length > 0 && (
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
}
