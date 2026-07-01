import type { CampaignTableFilters } from 'src/types/eoi/eoi';

import { useSetState } from 'minimal-shared/hooks';
import { useMemo, useState, useEffect, useCallback } from 'react';

import { Box, Card, Table, Button, TableBody } from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { generateRoleBasedRoute } from 'src/utils/constant';
import { roleColumnsToDefinitions } from 'src/utils/role-table-head';
import {
  getTableStyles,
  tableContainerStyles,
  calculateTableMinWidth,
} from 'src/utils/table-styles';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchEOICampaignList } from 'src/redux/actions/admin/eoi-manager-actions';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { AnimateLogo1 } from 'src/components/animate';
import { ColumnManager } from 'src/components/column-manager';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import { CampaignTableRow } from './campaign-table-row';
import { CampaignTableToolBar } from './campaign-table-toolBar';
import { CampaignTableFiltersResult } from './campaign-table-filters-result';

export function CampaignTable() {
  const {
    columns: roleColumns,
    filters: roleFilters,
    actions: roleActions,
    canCreate,
    userRole,
  } = useRoleBasedPermissions({
    module: 'eoiManager',
  });
  const table = useTable();
  const dispatch = useAppDispatch();
  const filters = useSetState<CampaignTableFilters>({
    search: '',
    projectStatus: [],
    city: [],
  });
  const route = useRouter();

  const { campaigns, total, loading } = useAppSelector(
    (state) => state.eoiManager
  );

  const [debouncedSearch, setDebouncedSearch] = useState(filters.state.search);

  const currentFilters = filters.state;
  const canReset =
    !!currentFilters?.search ||
    currentFilters?.projectStatus?.length !== 0 ||
    currentFilters?.city?.length !== 0;
  const notFound = campaigns?.length === 0;

  const tableHeadFromRole = useMemo(
    () => roleColumnsToDefinitions(roleColumns),
    [roleColumns]
  );
  const columnManager = useColumnManager(tableHeadFromRole);
  const { visibleColumns } = columnManager;
  const dynamicMinWidth = calculateTableMinWidth(visibleColumns || tableHeadFromRole);

  // ✅ API Fetch Logic
  const fetchEOICampaignListData = useCallback(() => {
    const searchTerm = debouncedSearch?.trim() || '';

    // Only trigger when search is empty or 3+ characters
    if (searchTerm === '' || searchTerm.length >= 3) {
      dispatch(
        fetchEOICampaignList({
          page: table.page + 1, // API is 1-based indexing
          limit: table.rowsPerPage,
          ...(searchTerm ? { search: searchTerm } : {}),
          ...(filters?.state?.city?.length > 0
            ? { cityIds: filters?.state?.city?.map((c) => Number(c?.value)) }
            : {}),
          ...(filters?.state?.projectStatus?.length > 0
            ? { status: filters?.state?.projectStatus?.map((s) => s?.value) }
            : {}),
        })
      );
    }
  }, [
    debouncedSearch,
    table.page,
    table.rowsPerPage,
    filters.state.city,
    filters.state.projectStatus,
    dispatch,
  ]);

  // ✅ Effect to trigger API when filters/pagination change
  useEffect(() => {
    fetchEOICampaignListData();
  }, [
    fetchEOICampaignListData,
    debouncedSearch,
    table.page,
    table.rowsPerPage,
    filters.state.city,
    filters.state.projectStatus,
  ]);

  // ✅ Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(filters.state.search);
    }, 600); // shorter debounce for better UX
    return () => clearTimeout(handler);
  }, [filters.state.search]);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={uiText.campaignListing.heading}
        action={
          canCreate ? (
            <Button
              variant="contained"
              className="primaryBtn"
              onClick={() => {
                route.push(generateRoleBasedRoute(userRole, 'eoi-manager/create'));
              }}
              startIcon={<Iconify icon="mingcute:add-line" />}
            >
              {uiText.campaignListing.buttonLabel}
            </Button>
          ) : undefined
        }
        slotProps={{
          container: {
            sx: {
              justifyContent: 'flex-start',
            },
          },
        }}
      />{' '}
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
          {/* Fixed Header Section */}
          <Box sx={{ flexShrink: 0 }}>
            <Box
              sx={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: {
                  xs: 'flex-start',
                  sm: 'center',
                },
                flexDirection: {
                  xs: 'column', // Stack vertically on mobile
                  sm: 'row', // Keep horizontal on larger screens
                },
                mt: {
                  xs: 1,
                  sm: 0,
                },
                px: {
                  xs: 1,
                  sm: 0,
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'start',
                  justifyContent: 'start',
                  width: '100%',
                  gap: 0,
                  flexDirection: 'column',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    gap: 2,
                    flexDirection: { xs: 'column', sm: 'row' },
                  }}
                >
                  <CampaignTableToolBar
                    filters={filters}
                    roleFilters={roleFilters}
                    search={filters.state.search}
                    setSearch={(value) => filters.setState({ search: value })}
                    columnManager={columnManager}
                  />

                  {/* Use the reusable ColumnManager component */}
                  <ColumnManager {...columnManager} />
                </Box>
                {canReset && (
                  <CampaignTableFiltersResult
                    filters={filters}
                    totalResults={total}
                    onResetPage={table?.onResetPage}
                    sx={{ p: 1.5, pt: 0 }}
                  />
                )}
              </Box>
            </Box>
          </Box>

          {/* Table Content */}
          <Box
            sx={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0, // Important for flex child to shrink
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
                  order={table?.order}
                  orderBy={table?.orderBy}
                  headLabel={visibleColumns}
                  hideCheckbox
                  sx={{ backgroundColor: 'background.paper' }}
                />

                <TableBody>
                  {campaigns?.map((row) => (
                    <CampaignTableRow
                      key={row?.id}
                      row={row}
                      columnVisibility={columnManager?.columns?.reduce(
                        (acc, col) => ({ ...acc, [col.id]: col.visible }),
                        {} as Record<string, boolean>
                      )}
                      selected={false}
                      roleActions={roleActions}
                      userRole={userRole}
                    />
                  ))}
                  {!loading && notFound && (
                    <TableNoData
                      notFound={notFound}
                      colSpan={visibleColumns?.length || tableHeadFromRole.length}
                    />
                  )}
                </TableBody>
              </Table>
            </Scrollbar>
          </Box>

          {/* Pagination */}
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
}
