import type { ColumnDefinition } from 'src/hooks/use-column-manager';
import type { IgreTablelistTableFilters } from 'src/types/gre/grelist';

import { Helmet } from 'react-helmet-async';
import { useSetState } from 'minimal-shared/hooks';
import { useRef, useState, useEffect } from 'react';

import { Box, Card, Table, TableBody } from '@mui/material';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import {
  getTableStyles,
  tableContainerStyles,
  calculateTableMinWidth,
  stickyBreadcrumbsStyles,
} from 'src/utils/table-styles';

import { fetchGREDashboardTableData } from 'src/redux/actions/gre/gre-action';

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

import GREPopup from './components/GREPopup';
import CustomerPopup from './components/CustomerPopup';
import { GRETableRow } from './components/gre-table-row';
import { GreTableToolbar } from './components/gre-table-toolbar';
import { GreTableFiltersResult } from './components/gre-table-filters-result';

const GRE_TABLE_HEAD: ColumnDefinition[] = [
  {
    id: 'Enquiry_Ref_No',
    label: 'Enquiry Ref No',
    width: 150,
    sortable: false,
    visible: true,
    disableToggle: true,
  },
  { id: 'leadName', label: 'Customer Name', width: 200, sortable: false, visible: true },
  {
    id: 'visitType',
    label: 'Type of Visit',
    width: 150,
    visible: true,
    sortable: false,
    disableToggle: false,
  },
  {
    id: 'svDate',
    label: 'SV Date',
    width: 200,
    sortable: true,
    visible: true,
    disableToggle: false,
  },
  {
    id: 'Project_Interested',
    label: 'Project Name',
    width: 180,
    visible: true,
    sortable: false,
    disableToggle: false,
  },
  { id: 'formStatus', label: 'Form Status', width: 180, visible: true },
  { id: 'sourcingRmName', label: 'Sourcing RM', width: 200, sortable: false, visible: true },
  { id: 'leadOwner', label: 'Closing RM', width: 200, sortable: false, visible: true },
  {
    id: 'cxFields',
    label: 'RM Fields',
    width: 150,
    visible: true,
    sortable: false,
    disableToggle: false,
  },
  {
    id: 'greRMFields',
    label: 'GRE Fields',
    width: 150,
    visible: true,
    sortable: false,
    disableToggle: false,
  },
  { id: 'outTime', label: 'Exit Time', width: 150, sortable: false,visible: true },
  { id: 'SV_Head_Count', label: 'Head Count', width: 150,sortable: false, visible: true }
];

type PopupType = 'GRE' | 'CX' | null;

export function GREDashboard() {
  const table = useTable();
  const dispatch = useAppDispatch();
  const filters = useSetState<IgreTablelistTableFilters>({
    name: '',
    id: '',
    projectName: '',
    sourcingRm: '',
    startDate: null,
    endDate: null,
  });

  const [selectedRow, setSelectedRow] = useState<{ id: string; projectName: string } | null>(null);
  const [popupType, setPopupType] = useState<PopupType>(null);

  const [selected, setSelected] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isPopupApiCall, setIsPopupApiCall] = useState(false);

  const { table: tableState, loading } = useAppSelector((state) => state.greDashboard);
  const greTablelist = tableState?.data?.data || []; // <- array is inside .data
  const totalRecords = tableState?.data?.totalCount || 0;
  const [debouncedSearch, setDebouncedSearch] = useState(filters.state.name);

  const firstLoad = useRef(true); 
  
  const currentFilters = filters.state;
  const canReset =
    !!currentFilters?.name ||
    !!currentFilters?.id ||
    !!currentFilters?.projectName ||
    !!currentFilters?.sourcingRm ||
    !!currentFilters?.startDate ||
    !!currentFilters?.endDate;
  const notFound = greTablelist?.length === 0;

  // Use the column manager hook
  const columnManager = useColumnManager(GRE_TABLE_HEAD);
  const { visibleColumns } = columnManager;
  const dynamicMinWidth = calculateTableMinWidth(visibleColumns || GRE_TABLE_HEAD);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(filters.state.name), 1000);
    return () => clearTimeout(handler);
  }, [filters.state.name]);

  

  // Fetch data with filters and pagination
  useEffect(() => {
    if (!popupType) {
      const sortByValue = table?.orderBy ? `${table?.orderBy}:${table?.order}` : '';

      const params = {
        page: table.page + 1,
        limit: table.rowsPerPage,
        search: debouncedSearch || undefined,
        enquiryId: currentFilters.id || undefined,
        projectName: currentFilters.projectName || undefined,
        sourcingRmName: (currentFilters.sourcingRm as any)?.label || undefined, // Add this
        fromDate: currentFilters.startDate || undefined, // Add this
        toDate: currentFilters.endDate || undefined,
        sortBy: sortByValue,
      };

      dispatch(fetchGREDashboardTableData(params));
    }
    if (firstLoad.current) {
      firstLoad.current = false;
    }
  }, [
    dispatch,
    table.page,
    table.rowsPerPage,
    debouncedSearch,
    currentFilters.id,
    currentFilters.projectName,
    currentFilters.sourcingRm,
    currentFilters.startDate, // Add this
    currentFilters.endDate,
    table?.orderBy,
    table?.order, // Add this
    popupType,
  ]);

  const handleSelectAllRows = (checked: boolean, ids: string[]) => {
    setSelected(checked ? ids : []);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleFiltersChange = (newFilters: any) => {
    filters.setState(newFilters);
    table.onResetPage();
  };

  const handleOpenPopup = (type: PopupType, id: string, projectName: string) => {
    setSelectedRow({ id, projectName });
    setPopupType(type);
  };

  const handleClosePopup = () => {
    setSelectedRow(null);
    setPopupType(null);
  };

  return (
    <>
      <Helmet>
        <title>Puravankara | GRE Sales Panel</title>
      </Helmet>
      <CustomBreadcrumbs heading="GRE Sales Panel" sx={stickyBreadcrumbsStyles} />
      {selectedRow && popupType === 'GRE' && (
        <GREPopup
          id={selectedRow.id}
          projectName={selectedRow.projectName}
          open
          onClose={handleClosePopup}
        />
      )}

      {selectedRow && popupType === 'CX' && (
        <CustomerPopup
          id={selectedRow.id}
          projectName={selectedRow.projectName}
          open
          onClose={handleClosePopup}
        />
      )}
      {firstLoad.current && !isPopupApiCall ? (
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
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Box sx={{ flexGrow: 1 }}>
                <GreTableToolbar
                  filters={filters}
                  onResetPage={table?.onResetPage}
                  greTablelist={greTablelist}
                />
              </Box>
              <ColumnManager {...columnManager} />
            </Box>

            {canReset && (
              <GreTableFiltersResult
                filters={filters}
                totalResults={greTablelist?.length}
                onResetPage={table?.onResetPage}
                sx={{ p: 1.5, pt: 0 }}
                greTablelist={greTablelist}
              />
            )}
          </Box>

          {/* Table Content */}
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
                  order={table?.order}
                  orderBy={table?.orderBy}
                  onSort={table?.onSort}
                  headLabel={visibleColumns}
                  onSelectAllRows={(checked) =>
                    handleSelectAllRows(
                      checked,
                      greTablelist?.map((row) => row?.enquiryId)
                    )
                  }
                  hideCheckbox
                  sx={{ backgroundColor: 'background.paper' }}
                />

                <TableBody>
                  {greTablelist?.map((row) => (
                    <GRETableRow
                      key={row?.enquiryId}
                      row={{
                        ...row,
                      }}
                      selected={selected.includes(row?.enquiryId)}
                      columnVisibility={columnManager?.columns?.reduce(
                        (acc, col) => ({ ...acc, [col.id]: col.visible }),
                        {} as Record<string, boolean>
                      )}
                      handleOpenPopup={handleOpenPopup}
                    />
                  ))}

                  {!loading && notFound && (
                    <TableNoData
                      notFound={notFound}
                      colSpan={visibleColumns?.length || GRE_TABLE_HEAD.length}
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
                totalResults={totalRecords}
              />
            </Box>
          )}
        </Card>
      )}
    </>
  );
}