/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ColumnDefinition } from 'src/hooks/use-column-manager';
import type { IOpportunityListTableFilters } from 'src/types/rm-panel/user';
import type { Opportunity } from 'src/redux/slices/rm-panel/opportunityList-slice';

import { useSetState } from 'minimal-shared/hooks';
import { useParams, useLocation } from 'react-router';
import { useState, useEffect, useCallback } from 'react';

import { Box, Card, Table, Button, TableBody, Typography } from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { BOOKING_FORM_STATUS } from 'src/utils/constant';
import {
  getTableStyles,
  tableContainerStyles,
  calculateTableMinWidth,
  stickyBreadcrumbsStyles,
} from 'src/utils/table-styles';

import { DashboardContent } from 'src/layouts/dashboard';
import { setCreateStep } from 'src/redux/slices/rm-panel/multi-unit-slice';
import { getOpportunityList } from 'src/redux/actions/rm-panel/dashboard-actions';
import { fetchMultiBookingGroupThunk } from 'src/redux/actions/rm-panel/multi-unit-actions';

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

import { UserTableRow } from './components/user-table-row';
import { UserTableToolbar } from './components/user-table-toolbar';
import { UserTableFiltersResult } from './components/user-table-filters-result';

// Optimized Table Header Configuration

interface OpportunityListProps {
  readonly selected?: Opportunity[];
  readonly setSelected?: React.Dispatch<React.SetStateAction<Opportunity[]>>;
  readonly groupDetailById?: any;
}
export function OpportunityList({
  selected = [],
  setSelected,
  groupDetailById,
}: OpportunityListProps) {
  const table = useTable();
  const dispatch = useAppDispatch();
  const filters = useSetState<IOpportunityListTableFilters>({ name: '', id: '' });
  const route = useRouter();
  const location = useLocation();

  const isCreateMultiUnit = location.pathname.includes('/create-multi-unit');
  const isEditMultiUnit = location.pathname.includes('/edit-multi-unit');
  const isGroupDetailByID = location.pathname.includes('/group-details');
  const isMultiUnit = isCreateMultiUnit || isEditMultiUnit;

  const TABLE_HEAD: ColumnDefinition[] = [
    { id: 'project_name', label: 'Project', width: 150, visible: true },
    { id: 'unit_number', label: 'Unit Number', width: 230, visible: true },
    { id: 'oppName', label: 'Customer Name', width: 200, visible: true, disableToggle: true },
    { id: 'oppId', label: 'Opportunity ID', width: 220, visible: true, disableToggle: true },
    { id: 'enqRefNo', label: 'Enquiry Ref. No.', width: 160, visible: true },
    { id: 'bookingStage', label: 'Booking Stage', width: 250, visible: true },
    { id: 'status', label: 'Status', width: 255, visible: true, disableToggle: true },
    // { id: 'Sales & Booking Value', label: 'Sales Value', width: 150, visible: true, disableToggle: false },
    // { id: 'Signature Status', label: 'Signature Status', width: 200, visible: true, disableToggle: false },
    ...(!isMultiUnit
      ? [{ id: 'Action', label: 'Action', width: 100, visible: true, disableToggle: false }]
      : []),
  ];

  const [isPopupApiCall, setIsPopupApiCall] = useState(false);
  const { opportunities } = useAppSelector((state) => state.opportunity);
  const { applicantData, opportunity } = useAppSelector((state) => state.dashboard);

  const { editMultiBookings } = useAppSelector((state) => state.multiUnit);
  const { groupDetails } = editMultiBookings?.data || {};

  const { data, loading } = opportunities;

  // Add isSelected field to all items
  const totalRecords = isGroupDetailByID
    ? editMultiBookings?.data?.totalRecords
    : data?.totalCount || 0;
  const [opportunitiesData, setOpportunitiesData] = useState<Opportunity[]>([]);
  const [tableCheck, settableCheck] = useState(false);
  const [allRowsCheck, setAllRowsCheck]= useState(false)

  const { groupId, id: groupdDetailId } = useParams();
  useEffect(() => {
    if (data?.opportunities) {
      const opportunityList = data?.opportunities?.map((item: Opportunity) => ({
        ...item,
        isSelected: isGroupDetailByID
          ? item?.isSelected
          : selected?.some((op) => op?.Id === item?.Id),
      }));

      if (isGroupDetailByID) {
        setOpportunitiesData(editMultiBookings?.data?.opportunities);
      } else {
        setOpportunitiesData(opportunityList);
      }
    } else {
      setOpportunitiesData([]); // clear if no data
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, selected, isGroupDetailByID]);

  useEffect(() => {
    if (isGroupDetailByID) {
      dispatch(
        fetchMultiBookingGroupThunk({
          id: groupdDetailId || '',
          page: table.page + 1,
          limit: table?.rowsPerPage,
          search: debouncedSearch,
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Select all rows
  const handleSelectAllRows = (checked: boolean) => {
    const updatedList = opportunitiesData?.map((item: Opportunity) => ({
      ...item,
      isSelected: item?.status===BOOKING_FORM_STATUS.NEW,
    }));
    setOpportunitiesData(updatedList);

    if (!setSelected) return;

    if (checked) {
      // Add all opportunity objects
      setSelected((prevSelected) => {
        const newItems = updatedList?.filter(item=>item?.isSelected) || [];
        const merged = [...prevSelected, ...newItems];
        // Remove duplicates based on Id
        const unique = merged?.filter(
          (item, index, self) => index === self?.findIndex((op) => op?.Id === item?.Id)
        );
        return unique;
      });
    } else {
      // Clear all selected opportunities
      setSelected([]);
    }
  };

  const [debouncedSearch, setDebouncedSearch] = useState(filters.state.name);

  const currentFilters = filters.state;
  const canReset = !!currentFilters?.name || !!currentFilters?.id;
  const notFound = opportunitiesData?.length === 0;

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
      const payload: any = {
        page: table.page + 1,
        limit: table?.rowsPerPage,
        search: debouncedSearch,
      };

      if (isCreateMultiUnit) {
        payload.status = BOOKING_FORM_STATUS.NEW;
      } else if (isEditMultiUnit) {
        payload.groupId = groupId || groupdDetailId || '';
        payload.status = BOOKING_FORM_STATUS.NEW;
      }

      dispatch(getOpportunityList(payload));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedSearch,
    table.page,
    table?.rowsPerPage,
    isCreateMultiUnit,
    isEditMultiUnit,
    dispatch,
    groupId,
  ]);

  const fetchGroupdDetails = useCallback(() => {
    if (!isGroupDetailByID) return;
    const searchTerm = debouncedSearch || '';
    if (searchTerm === '' || searchTerm.length >= 3) {
      const payload: any = {
        page: table.page + 1,
        limit: table?.rowsPerPage,
        search: debouncedSearch,
        id: groupdDetailId || '',
      };
      dispatch(fetchMultiBookingGroupThunk(payload));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedSearch,
    table.page,
    table?.rowsPerPage,
    isCreateMultiUnit,
    isEditMultiUnit,
    dispatch,
    groupId,
  ]);
  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  useEffect(() => {
    fetchGroupdDetails();
  }, [fetchGroupdDetails]);

  const handleSelectRow = (checked: boolean, id: string) => {
    const updatedList = opportunitiesData?.map((item: Opportunity) =>
      item?.Id === id ? { ...item, isSelected: checked } : item
    );
    setOpportunitiesData(updatedList);

    if (!setSelected) return;

    setSelected((prevSelected) => {
      const currentItem = opportunitiesData?.find((item) => item?.Id === id);
      if (!currentItem) return prevSelected;

      if (checked) {
        // Add the opportunity if not already selected
        const exists = prevSelected?.some((item) => item?.Id === id);
        return exists ? prevSelected : [...prevSelected, currentItem];
      }
      // Remove the opportunity
      return prevSelected?.filter((item) => item?.Id !== id);
    });
  };
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        action={
          isMultiUnit && (
            <Button
              disabled={selected?.length < 2}
              variant="contained"
              className={selected?.length < 2 ? '' : 'primaryBtn'}
              onClick={() => {
                dispatch(setCreateStep(1));
              }}
              startIcon={<Iconify icon="mingcute:add-line" />}
            >
              {selected?.length === 0
                ? `${isEditMultiUnit ? 'Edit Group' : 'Create Group'}`
                : `${isEditMultiUnit ? `Edit Group (${selected?.length} Units)` : `Create Group (${selected?.length} Units)`}`}
            </Button>
          )
        }
        heading={
          groupDetailById ? (
            <Box display="flex" alignItems="center" gap={3}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {groupDetails?.groupName}
              </Typography>

              <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                Total Units:&nbsp;
                <Typography component="span" sx={{ fontWeight: 700 }}>
                  {String(groupDetails?.noOfUnits || 0).padStart(2, '0')}
                </Typography>
              </Typography>
            </Box>
          ) : (
            'Bookings'
          )
        }
        sx={stickyBreadcrumbsStyles}
      />
      {loading || ((applicantData?.loading || opportunity?.loading) && !isPopupApiCall) ? (
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
                <UserTableToolbar filters={filters} onResetPage={table?.onResetPage} />
              </Box>

              {/* Use the reusable ColumnManager component */}
              <ColumnManager {...columnManager} />
            </Box>
            <Box>
              {canReset && (
                <UserTableFiltersResult
                  filters={filters}
                  totalResults={opportunitiesData?.length}
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
                  numSelected={opportunitiesData.filter((item) => item.isSelected).length}
                  rowCount={opportunitiesData?.length}
                  onSelectAllRows={(checked) => handleSelectAllRows(checked)}
                  sx={{ backgroundColor: 'background.paper' }}
                  settableCheck={settableCheck}
                  hideCheckbox={!isMultiUnit}
                  allRowsCheck={allRowsCheck}
                  setAllRowsCheck={setAllRowsCheck}
                  customCheck
                />

                <TableBody>
                  {opportunitiesData?.map((row) => (
                    <UserTableRow
                      key={row?.Id}
                      row={{
                        ...row,
                        status: row?.status || row?.BFstatus, // Use BFstatus or fallback to status
                        SalesValue: row?.salesValue || 'N/A', // Add SalesValue property
                        BookingValue: row?.bookingvalue || 'N/A', // Add BookingValue property
                      }}
                      selected={selected?.some((item) => item?.Id === row?.Id)}
                      columnVisibility={columnManager?.columns?.reduce(
                        (acc, col) => ({ ...acc, [col.id]: col.visible }),
                        {} as Record<string, boolean>
                      )}
                      setIsPopupApiCall={setIsPopupApiCall}
                      handleSelectRow={handleSelectRow}
                    />
                  ))}
                  {!loading && notFound && (
                    <TableNoData
                      notFound={notFound}
                      colSpan={visibleColumns?.length || TABLE_HEAD.length}
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
                count={totalRecords}
                rowsPerPage={table?.rowsPerPage}
                onPageChange={table?.onChangePage}
                onRowsPerPageChange={table?.onChangeRowsPerPage}
                showResultsCount
                totalResults={opportunitiesData?.length}
              />
            </Box>
          )}
        </Card>
      )}
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

type ApplyFilterProps = {
  inputData: Opportunity[];
  filters: { name: string; id: string };
  comparator: (a: Opportunity, b: Opportunity) => number;
};

function applyFilter({ inputData, filters }: ApplyFilterProps) {
  const { name, id } = filters;
  return inputData?.filter(
    (item) =>
      (!name || item.Name.toLowerCase().includes(name.toLowerCase())) &&
      (!id || item.Id.toLowerCase().includes(id.toLowerCase()))
  );
}
