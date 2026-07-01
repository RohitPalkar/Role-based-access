/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ColumnDefinition } from 'src/hooks/use-column-manager';
import type { IGroupListTableFilters } from 'src/types/rm-panel/multi-unit';
import type { MultiUnitData } from 'src/services/rm-panel/multi-unit-service';

import { useSetState } from 'minimal-shared/hooks';
import { useState, useEffect, useCallback } from 'react';

import { Box, Card, Table, Button, TableBody } from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import {
  getTableStyles,
  tableContainerStyles,
  calculateTableMinWidth,
  stickyBreadcrumbsStyles,
} from 'src/utils/table-styles';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import {  fetchMultiBookingListThunk } from 'src/redux/actions/rm-panel/multi-unit-actions';

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

import { GroupListTableRow } from './components/group-list-row';
import { GroupListTableToolbar } from './components/group-list-toolbar';
import { GroupListTableFiltersResult } from './components/group-list-filters-result';

// Optimized Table Header Configuration
const TABLE_HEAD: ColumnDefinition[] = [
  { id: 'groupName', label: 'Group Name', width: 200, visible: true },
  { id: 'enqRefNo', label: 'Enquiry Ref. No.', width: 150, visible: true },
  {
    id: 'primaryApplicant',
    label: 'Primary Applicant',
    width: 200,
    visible: true,
    disableToggle: true,
  },
  { id: 'noOfUnits', label: 'No. of Units', width: 150, visible: true, disableToggle: true },
  { id: 'project', label: 'Project', width: 160, visible: true },
  { id: 'unitNo', label: 'Unit Details', width: 250, visible: true },

  {
    id: 'paymentMethod',
    label: 'Booking Amt. Paid In',
    width: 200,
    visible: true,
    disableToggle: false,
  },
  { id: 'status', label: 'Status', width: 255, visible: true, disableToggle: true },
  { id: 'Action', label: 'Action', width: 100, visible: true, disableToggle: false },
];

export function GroupListing() {
  const table = useTable();
  const dispatch = useAppDispatch();
  const filters = useSetState<IGroupListTableFilters>({ name: '', id: '' });

  const [selected, setSelected] = useState<string[]>([]);
  const [isPopupApiCall, setIsPopupApiCall] = useState(false);
  const { groupListData } = useAppSelector((state) => state.multiUnit);
  const route = useRouter();
  const { data, loading } = groupListData;

  const GroupList = data?.data || [];
  const totalRecords = data?.totalRecords || 0;

  const [debouncedSearch, setDebouncedSearch] = useState(filters.state.name);

  const currentFilters = filters.state;
  const canReset = !!currentFilters?.name || !!currentFilters?.id;
  const notFound = GroupList?.length === 0;

  // Use the column manager hook
  const columnManager = useColumnManager(TABLE_HEAD);
  const { visibleColumns } = columnManager;
  const dynamicMinWidth = calculateTableMinWidth(visibleColumns || TABLE_HEAD);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(filters.state.name), 1000);
    return () => clearTimeout(handler);
  }, [filters.state.name]);

  const fetchOpportunities = useCallback(() => {
    const searchTerm = debouncedSearch || '';
    if (searchTerm === '' || searchTerm.length >= 3) {
      dispatch(
        fetchMultiBookingListThunk({
          page: table.page + 1,
          limit: table?.rowsPerPage,
          search: debouncedSearch,
        })
      );
    }
  }, [dispatch, debouncedSearch, table.page, table?.rowsPerPage]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const handleSelectAllRows = (checked: boolean, ids: string[]) => {
    setSelected(checked ? ids : []);
  };

  return (
    <DashboardContent>
      <Box sx={stickyBreadcrumbsStyles}>
        <CustomBreadcrumbs
          heading={uiText.muiltiBooking.title}
          action={
            <Button
              startIcon={<Iconify icon="mingcute:add-line" />}
              variant="contained"
              className="primaryBtn"
              onClick={() => {
                route.push('/rm-panel/group-list/create-multi-unit');
              }}
            >
              {uiText.muiltiBooking.createCP.btnLabel}
            </Button>
          }
          slotProps={{
            container: {
              sx: {
                justifyContent: 'flex-start',
              },
            },
          }}
        />
      </Box>
      {loading && !data ? (
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
              <Box sx={{ flexGrow: 1 }}>
                <GroupListTableToolbar filters={filters} onResetPage={table?.onResetPage} />
              </Box>

              {/* Use the reusable ColumnManager component */}
              <ColumnManager {...columnManager} />
            </Box>
            <Box>
              {canReset && (
                <GroupListTableFiltersResult
                  filters={filters}
                  totalResults={GroupList?.length}
                  onResetPage={table?.onResetPage}
                  sx={{ p: 1.5, pt: 0 }}
                />
              )}
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
                  onSelectAllRows={(checked) =>
                    handleSelectAllRows(
                      checked,
                      GroupList?.map((row) => row?.id)
                    )
                  }
                  hideCheckbox
                  sx={{ backgroundColor: 'background.paper' }}
                />

                <TableBody>
                    {GroupList?.map((row: MultiUnitData) => (
                      <GroupListTableRow
                        key={row?.id}
                         row={
                          {
                            ...row
                          } as any
                        } 
                        selected={selected.includes(row?.id)}
                        columnVisibility={columnManager?.columns?.reduce(
                          (acc, col) => ({ ...acc, [col.id]: col.visible }),
                          {} as Record<string, boolean>
                        )}
                      setIsPopupApiCall={setIsPopupApiCall}
                      />
                    ))}

                  {!loading && notFound && (
                    <TableNoData
                      notFound={notFound}
                      colSpan={visibleColumns?.length || TABLE_HEAD?.length}
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
                page={table?.page}
                count={totalRecords}
                rowsPerPage={table?.rowsPerPage}
                onPageChange={table?.onChangePage}
                onRowsPerPageChange={table?.onChangeRowsPerPage}
                showResultsCount
                totalResults={GroupList?.length}
              />
            </Box>
          )}
        </Card>
      )}
    </DashboardContent>
  );
}
