/* eslint-disable @typescript-eslint/no-unused-vars */
import type { RootState, AppDispatch } from 'src/redux/store';
import type { ColumnDefinition } from 'src/hooks/use-column-manager';

// eslint-disable-next-line import/no-extraneous-dependencies
import { varAlpha } from 'minimal-shared/utils';
import { useSetState } from 'minimal-shared/hooks';
import { useDispatch, useSelector } from 'react-redux';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import { Tooltip } from '@mui/material';
import TableBody from '@mui/material/TableBody';

import { paths } from 'src/routes/paths';

import { useAppSelector } from 'src/hooks/use-redux';
import { useColumnManager } from 'src/hooks/use-column-manager';

import { TYPE } from 'src/utils/constant';
import { deepCopy, useDebounceMethod } from 'src/utils/helper';
import { getTableStyles, tableContainerStyles, calculateTableMinWidth } from 'src/utils/table-styles';

import { fetchIncentiveDashboardData } from 'src/redux/actions/incentive-dashboard/incentive-dashboard-actions';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  CustomTableSkeleton,
  TablePaginationCustom,
} from 'src/components/table';

// eslint-disable-next-line import/no-cycle
import { IncentiveDashTableRow } from './component/incentive-dash-table-row';
import { IncentiveDashTableToolbar } from './component/incentive-dash-table-toolbar';
import { IncentiveDashTableFiltersResult } from './component/incentive-dash-table-filters-result';
// eslint-disable-next-line import/no-cycle

// ----------------------------------------------------------------------

export interface IncentiveDashboardItem {
  rmName?: string;
  id: string;

  unitStatus: string;
  flag: boolean;
  message: string;
  customerName: string;
  unitDetails: any;
  bookingDate: string;
  agreementReceivedDate: string;
  receivedPercent: number;
  grossTotalValue: number;
  incentivePercentage: number;
  incentivePayable: any;
  stage: string;
  qualifiedDate: string;
  paymentStatus: string;
  receivedDate: string;
}

// User table filter structure
export interface IncentiveDashboardTableFilters {
  search: string;
  role: string[];
  status: 'all' | 'regularized' | 'management sale' | 'cancelled';
  filterBy: string;
  projectIds?: any;
  year?: string;
  month?: string;
  rmId?: any;
  resetState: () => void;
}

// -------------------------------------------------------------------------------

const STATUS_OPTIONS = [
  {
    value: 'all',
    label: 'All Bookings',
    isLocked: false,
    tooltip:
      'All sales regardless of their status.',
  },
  {
    value: 'regularized',
    label: 'Regularized',
    isLocked: false,
    tooltip:
      'A sale in which the customer has paid 9.5-10% of the sale value, and the agreement is signed within 60 days of file login.',
  },
  {
    value: 'unregularized',
    label: 'Unregularized',
    isLocked: false,
    tooltip:
      'Sales that are still within the 60-day window from file login and have the potential to be regularized.',
  },
  {
    value: 'qualified',
    label: 'Qualified',
    isLocked: false,
    tooltip:
      'regularized sales where the customer has paid at least 15% of the sale value, making them eligible for incentive payments.',
  },
  {
    value: 'management sale',
    label: 'Managment Sale',
    isLocked: false,
    tooltip:
      'Sales that could not be regularized within the 60-day window from the file login date.',
  },
  {
    value: 'management approved credit sale',
    label: 'Management Approved Credit Sale',
    isLocked: false,
    tooltip: 'A non-regularized sale approved by management for incentive eligibility.',
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    isLocked: false,
    tooltip: 'Bookings that have been officially voided or revoked.',
  },
];


const TABLE_HEAD: ColumnDefinition[] = [
  { id: 'unitStatus', label: 'Unit Status', width: 150, visible: true, disableToggle: true, sortable: false },
  { id: 'customerName', label: 'Customer Name', width: 250, visible: true, disableToggle: true, sortable: false },
  { id: 'phaseName', label: 'Phase Name', width: 180, visible: true, sortable: false },
  { id: 'propertyNumber', label: 'Property Number', width: 180, visible: true, sortable: false },
  { id: 'bookingDate', label: 'Booking Date', width: 180, visible: true, sortable: false },
  { id: 'agreementReceived', label: 'Agreement Received Date', width: 250, visible: true, tooltip: 'Agreement Received Date', sortable: false },
  { id: 'recivedPersentage', label: 'Reg. % Recd. Date', width: 180, visible: true, tooltip: 'Regularization Amount Percentage Received', sortable: false },
  { id: 'qualifiedDate', label: 'Qualified Date', width: 180, visible: true, sortable: false },
  { id: 'receivedAmountPercent', label: '% of Amount Received', width: 200, visible: true, tooltip: 'Percentage of Amount Received', sortable: false },
  { id: 'agreementValue', label: 'Agreement Value', width: 180, visible: true, sortable: false },
  { id: 'incentivePercentage', label: 'Incentive %', width: 180, visible: true, sortable: false },
  { id: 'incentivePayable', label: 'Incentive Amount', width: 180, visible: true, sortable: false },
  { id: 'paymentStatus', label: 'Payment Status', width: 180, visible: true, sortable: false },
  { id: 'stage', label: 'Stage', width: 150, visible: true, sortable: false },
];
// ----------------------------------------------------------------------

type Props = Readonly<{
  // eslint-disable-next-line react/no-unused-prop-types
  currentFilters: any;
  updateFilters: any;
  filters: any;
  isUserView?: boolean;
}>;

export function IncentiveDashboardListView({ currentFilters, updateFilters, filters, isUserView }: Props) {
  const isFirstRender = useRef(true);

  const { incentiveData, incentiveCount, loading } = useSelector(
    (state: RootState) => state.incentiveDashboard
  );
  const { cards: incentiveCards, activeCardId } = useAppSelector((state) => state.cards);
  const table = useTable();
  const dispatch: AppDispatch = useDispatch();

  const [tableData, setTableData] = useState<IncentiveDashboardItem[]>(incentiveData || []);
  const [statusOptions, setStatusOptions] = useState(STATUS_OPTIONS);

  // Add local filters state for the filters result component
  const localFilters = useSetState<IncentiveDashboardTableFilters>({
    search: currentFilters?.search || '',
    role: currentFilters?.role || [],
    status: currentFilters?.status || 'all',
    filterBy: currentFilters?.filterBy || '',
    projectIds: currentFilters?.projectIds || undefined,
    year: currentFilters?.year || undefined,
    month: currentFilters?.month || undefined,
    resetState(): void {
      throw new Error('Function not implemented.');
    }
  });

  const memoFilters = useMemo(
    () => ({ state: currentFilters, setState: updateFilters }),
    [currentFilters, updateFilters]
  );

  const memoLocalFilters = useMemo(
    () => ({
      ...localFilters,
      setState: updateFilters
    }),
    [localFilters, updateFilters]
  );


  // Sync local filters with parent filters
  useEffect(() => {
    localFilters.setState({
      search: currentFilters?.search || '',
      role: currentFilters?.role || [],
      status: currentFilters?.status || 'all',
      filterBy: currentFilters?.filterBy || '',
      projectIds: currentFilters?.projectIds || undefined,
      year: currentFilters?.year || undefined,
      month: currentFilters?.month || undefined,
    });
  }, [currentFilters, localFilters, localFilters.setState]);

  // Add column manager functionality
  const columnManager = useColumnManager(TABLE_HEAD);
  const { visibleColumns } = columnManager;

  // Calculate dynamic minWidth based on visible columns
  const dynamicMinWidth = calculateTableMinWidth(visibleColumns || TABLE_HEAD);


  const getApiCall = () => {
    const payload: {
      rmId?: any;
      type: string;
      page: number;
      limit: number;
      incentiveFilter: any;
      status?: string;
      year?: string;
      month?: string;
      projectIds?: any;
      search?: string;
    } = {
      type: currentFilters?.status,
      page: table.page + 1,
      limit: table?.rowsPerPage,
      incentiveFilter: currentFilters?.status === 'cancelled' ? '' : activeCardId || '',
    };
    // Only add 'status' if 'currentFilters?.filterBy' exists
    if (currentFilters?.filterBy) {
      payload.status = currentFilters?.filterBy;
    }
    if (currentFilters?.year) {
      payload.year = currentFilters?.year;
    }

    if (currentFilters?.month) {
      payload.month = currentFilters?.month;
    }
    if (currentFilters?.projectIds) {
      payload.projectIds = currentFilters?.projectIds;
    }
    if (currentFilters?.search) {
      payload.search = currentFilters?.search;
    }
    if (isUserView && currentFilters?.rmId) {
      payload.rmId = currentFilters?.rmId;
    }
    dispatch(fetchIncentiveDashboardData(payload));
  };

  useEffect(() => {
    let newStatusOptions = deepCopy(STATUS_OPTIONS);
    switch (activeCardId) {
      case TYPE.Risk:
        newStatusOptions = newStatusOptions.filter(
          (item) => item.value === 'unregularized' || item.value === 'management sale'
        );
        updateFilters({ status: 'unregularized' });
        setStatusOptions(newStatusOptions);
        break;
      case TYPE.Paid_YTD:
      case TYPE.Payable:
      case TYPE.Paid:
        newStatusOptions = newStatusOptions.filter(
          (item) => item.value === 'qualified' || item.value === 'management approved credit sale'
        );
        updateFilters({ status: 'qualified' });
        setStatusOptions(newStatusOptions);
        break;
      default:
        setStatusOptions(STATUS_OPTIONS);
        break;
    }
  }, [activeCardId, updateFilters]);

  useEffect(() => {
    getApiCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dispatch,
    activeCardId,
    table.page,
    table?.rowsPerPage,
    currentFilters?.filterBy,
    currentFilters?.status,
    currentFilters?.startDate,
    currentFilters?.endDate,
    currentFilters?.projectIds,
    incentiveCards,
  ]);

  useEffect(() => {
    if (incentiveData && incentiveData?.length > 0) {
      const formattedData: IncentiveDashboardItem[] = incentiveData?.map((item: IncentiveDashboardItem, index) => ({
        id: item.id || `${index}`,
        unitStatus: item.unitStatus || '',
        flag: item.flag || false,
        message: item.message || '',
        customerName: item.customerName || '-',
        unitDetails: item?.unitDetails || '-',
        agreementReceivedDate: item.agreementReceivedDate,
        bookingDate: item.bookingDate || '',
        qualifiedDate: item.qualifiedDate || '',
        receivedPercent: item.receivedPercent || 0,
        grossTotalValue: item.grossTotalValue || 0,
        incentivePercentage: item.incentivePercentage || 0,
        incentivePayable: item?.incentivePayable || 0,
        paymentStatus: item?.paymentStatus,
        stage: item.stage || '-',
        receivedDate: item.receivedDate || '',
      }));
      setTableData(formattedData);
    } else setTableData([]);
  }, [incentiveData]);

  const debounceApiCall = useDebounceMethod(getApiCall, 500);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false; // Mark first render as done, no need to call API on first render
      return;
    }
    debounceApiCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFilters?.search]);

  const canReset = !!currentFilters?.search;
  const notFound = (!tableData?.length && canReset) || !tableData?.length;


  const tableOnReset = useCallback(() => {
    table?.onResetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleFilterStatus = useCallback(
    (
      event: React.SyntheticEvent,
      newValue: 'all' | 'regularized' | 'management sale' | 'cancelled' | 'qualified' | 'unregularized'
    ) => {
      tableOnReset();
      updateFilters({ status: newValue });
    },
    [tableOnReset, updateFilters]
  );

  return (
    <Card sx={{ ...tableContainerStyles, mb: 3 }}>
      {/* Fixed Header Section */}
      <Box sx={{ flexShrink: 0 }}>
        <Tabs
          value={currentFilters?.status || 'all'}
          onChange={handleFilterStatus}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: { xs: 1, md: 2.5 },
            boxShadow: (theme) =>
              `inset 0 -2px 0 0 ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
            '& .MuiTabs-indicator': {
              backgroundColor: 'primary.main',
              height: '2px',
            },
            '& .MuiTab-root': {
              fontWeight: 500,
              color: 'text.secondary',
              minWidth: { xs: 'auto', md: 160 },
              fontSize: { xs: '0.875rem', md: '1rem' },
              '&.Mui-selected': {
                color: 'primary.main',
              },
            },
          }}
        >
          {statusOptions.map((tab) => (
            <Tab
              key={tab.value}
              iconPosition="end"
              value={tab.value}
              disabled={tab.isLocked}
              // eslint-disable-next-line react/jsx-no-useless-fragment
              icon={tab.isLocked ? <Iconify icon="ic:round-account-box" /> : <></>}
              label={
                <Tooltip title={tab.tooltip} arrow>
                  <span>{tab.label}</span>
                </Tooltip>
              }
            />
          ))}
        </Tabs>

        <IncentiveDashTableToolbar
          filters={memoFilters}
          currentFilters={currentFilters}
          updateFilters={updateFilters}
          columnManager={columnManager}
          onResetPage={tableOnReset}
          isUserView={isUserView}
          rmId={currentFilters?.rmId}
        />

        {canReset && (
          <IncentiveDashTableFiltersResult
            filters={memoLocalFilters}
            totalResults={incentiveCount || 0}
            onResetPage={tableOnReset}
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
        {(() => {
          if (loading) {
            return (
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
                    rowCount={tableData?.length || 0}
                    onSort={table?.onSort}
                    sx={{
                      whiteSpace: 'nowrap',
                      backgroundColor: 'background.paper'
                    }}
                  />
                  <TableBody>
                    <CustomTableSkeleton rowCount={table?.rowsPerPage} cellCount={visibleColumns?.length || 5} />
                  </TableBody>
                </Table>
              </Scrollbar>
            );
          }
          if (tableData?.length > 0) {
            return (
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
                    rowCount={tableData?.length || 0}
                    onSort={table?.onSort}
                    sx={{
                      whiteSpace: 'nowrap',
                      backgroundColor: 'background.paper'
                    }}
                  />
                  <TableBody>
                    {tableData?.map((row) => (
                      <IncentiveDashTableRow
                        key={row?.id}
                        row={row}
                        selected={table?.selected.includes(row?.id?.toString() || '')}
                        editHref={paths.admin.user.edit(row?.id?.toString() || '')}
                        columnVisibility={columnManager?.columns?.reduce(
                          (acc, col) => ({ ...acc, [col.id]: col.visible }),
                          {} as Record<string, boolean>
                        ) || {}}
                      />
                    ))}
                  </TableBody>
                </Table>
              </Scrollbar>
            );
          }
          return (
            // No Data state - rendered outside table structure for full width
            <Box sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%'
            }}>
              <TableNoData
                notFound={notFound}
                colSpan={visibleColumns?.length || TABLE_HEAD.length}
              />
            </Box>
          );
        })()}
      </Box>

      {/* Fixed Footer Pagination */}
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
          dense={table?.dense}
          count={incentiveCount || 0}
          rowsPerPage={table?.rowsPerPage}
          onPageChange={table?.onChangePage}
          onChangeDense={table?.onChangeDense}
          onRowsPerPageChange={table?.onChangeRowsPerPage}
          showResultsCount
          totalResults={tableData?.length || 0}

        />
      </Box>
    </Card>
  );
}

// ----------------------------------------------------------------------
