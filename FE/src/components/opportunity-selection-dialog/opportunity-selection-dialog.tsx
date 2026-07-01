import type { Opportunity } from 'src/redux/slices/rm-panel/opportunityList-slice';

import React, { useState, useEffect, useCallback } from 'react';

import {
  Box,
  Card,
  Table,
  Dialog,
  TableBody,
  IconButton,
  DialogTitle,
  DialogContent,
} from '@mui/material';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { getTableStyles, calculateTableMinWidth } from 'src/utils/table-styles';

import {
  getOpportunityList,
  getCancelledOpportunities,
} from 'src/redux/actions/rm-panel/dashboard-actions';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import { AnimateLogo1 } from '../animate';
import { ColumnManager } from '../column-manager';
import SearchInput from '../search-field-toolbar/SearchInput';
import { OpportunitySelectionTableRow } from './opportunity-selection-table-row';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'project_name', label: 'Project', width: 100, visible: true },
  { id: 'unit_number', label: 'Unit Number', width: 100, visible: true },
  { id: 'oppName', label: 'Opportunity Name', width: 120, visible: true },
  { id: 'oppId', label: 'Opportunity ID', width: 120, visible: true },
  { id: 'enqrefno', label: 'Enquiry No.', width: 60, visible: true },
  { id: 'status', label: 'Status', width: 130, visible: true },
  { id: 'action', label: 'Action', width: 60, visible: true },
];

interface OpportunitySelectionDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSelect: (opportunity: Opportunity) => void;
  readonly title?: string;
  readonly selectedOpportunity?: Opportunity | null;
  readonly isCancelledUnit?: boolean; // New prop to determine which API to use
  readonly status?: string; // New prop to filter by status
  readonly isEditMode?: boolean; // New prop to determine if this is edit mode
}

export function OpportunitySelectionDialog({
  open,
  onClose,
  onSelect,
  title = 'Select Opportunity',
  selectedOpportunity = null,
  isCancelledUnit = false,
  status,
  isEditMode = false,
}: OpportunitySelectionDialogProps) {
  // Create separate table instances for cancelled and new units
  const cancelledTable = useTable();
  const newTable = useTable();
  
  // Use the appropriate table based on the dialog type
  const table = isCancelledUnit ? cancelledTable : newTable;
  const dispatch = useAppDispatch();

  // Separate state variables for cancelled and new opportunities
  const [selectedCancelledOpp, setSelectedCancelledOpp] = useState<Opportunity | null>(
    isEditMode && isCancelledUnit ? selectedOpportunity : null
  );
  const [selectedNewOpp, setSelectedNewOpp] = useState<Opportunity | null>(
    isEditMode && !isCancelledUnit ? selectedOpportunity : null
  );

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  // Get current selected opportunity based on mode
  const currentSelectedOpp = isCancelledUnit ? selectedCancelledOpp : selectedNewOpp;

  const { opportunities, cancelledOpportunities } = useAppSelector((state) => state.opportunity);

  // Use cancelled opportunities data when isCancelledUnit is true
  const currentOpportunities = isCancelledUnit ? cancelledOpportunities : opportunities;
  const { loading } = currentOpportunities || {};
  const opportunityList = currentOpportunities?.data?.opportunities || [];
  const totalRecords = currentOpportunities?.data?.totalCount || 0;

  const notFound = opportunityList?.length === 0;
  const columnManager = useColumnManager(TABLE_HEAD);
  const { visibleColumns } = columnManager || {};
  const dynamicMinWidth = calculateTableMinWidth(visibleColumns || TABLE_HEAD);
  // Update selected opportunity when props change
  useEffect(() => {
    if (isEditMode && selectedOpportunity) {
      if (isCancelledUnit) {
        setSelectedCancelledOpp(selectedOpportunity);
      } else {
        setSelectedNewOpp(selectedOpportunity);
      }
    }
  }, [selectedOpportunity, isEditMode, isCancelledUnit]);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 1000);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchOpportunities = useCallback(() => {
    const searchValue = debouncedSearch || '';
    if (searchValue === '' || searchValue.length >= 3) {
      const actionToDispatch = isCancelledUnit ? getCancelledOpportunities : getOpportunityList;
      const payload: any = {
        page: (table?.page || 0) + 1,
        limit: table?.rowsPerPage || 10,
        search: debouncedSearch,
      };

      // Add status parameter if provided
      if (status) {
        payload.status = status;
      }

      dispatch(actionToDispatch(payload));
    }
  }, [dispatch, table?.page, table?.rowsPerPage, debouncedSearch, isCancelledUnit, status]);

  useEffect(() => {
    if (open) {
      fetchOpportunities();
      // Set selected opportunity when dialog opens in edit mode
      if (isEditMode && selectedOpportunity) {
        if (isCancelledUnit) {
          setSelectedCancelledOpp(selectedOpportunity);
        } else {
          setSelectedNewOpp(selectedOpportunity);
        }
      }
    }
  }, [fetchOpportunities, open, isEditMode, selectedOpportunity, isCancelledUnit]);

  const handleSelectOpportunity = (opportunity: Opportunity) => {
    if (isCancelledUnit) {
      setSelectedCancelledOpp(opportunity);
    } else {
      setSelectedNewOpp(opportunity);
    }
    // Auto-confirm selection and close dialog
    onSelect(opportunity);
    handleClose();
  };

  const handleClose = () => {
    // Reset both state variables when closing
    setSelectedCancelledOpp(null);
    setSelectedNewOpp(null);
    setSearchTerm('');
    setDebouncedSearch('');
    
    // Reset both table states to ensure clean state for next opening
    cancelledTable.onResetPage?.();
    newTable.onResetPage?.();
    
    onClose();
  };



  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: '80vh',
          maxHeight: 800,
        },
      }}
    >
      <DialogTitle
        sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        {title}
        <IconButton
          onClick={handleClose}
          sx={{
            color: 'text.secondary',
            '&:hover': {
              color: 'text.primary',
            },
          }}
        >
          <Iconify icon="eva:close-fill" />
        </IconButton>
      </DialogTitle>
      {/* Search Bar */}

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {loading ? (
          <Box
            sx={{
              width: '100%',
              display: 'flex',
              height: '400px',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AnimateLogo1 />
          </Box>
        ) : (
          <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Search Bar + Column Manager */}
            <Box
              sx={{
                position: 'sticky',
                top: 0,
                zIndex: 2,
                backgroundColor: 'background.paper',
                borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                px: 2,
                py: 1,
              }}
            >
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <SearchInput
                  value={searchTerm}
                  placeholder="Search by Unit No, Opportunity ID, Applicant Name"
                  onChange={(value) => {
                    setSearchTerm(value);
                    table?.onResetPage?.();
                  }}
                />
                <ColumnManager {...columnManager} />
              </Box>
            </Box>


            {/* Table Content (Scrollable) */}
            <Scrollbar>
              <Box sx={{ minWidth: dynamicMinWidth }}>
                <Table
                  stickyHeader
                  size={table?.dense ? 'small' : 'medium'}
                  sx={{
                    borderCollapse: 'separate',
                    tableLayout: 'fixed',
                    ...getTableStyles(dynamicMinWidth),
                  }}
                >
                  <TableHeadCustom
                    order={table?.order}
                    orderBy={table?.orderBy}
                    headLabel={visibleColumns || TABLE_HEAD}
                    sx={{
                      '& .MuiTableCell-head': {
                        position: 'sticky',
                        top: 0,
                        zIndex: 1,
                        backgroundColor: 'background.paper',
                      },
                    }}
                  />

                  <TableBody>
                    {opportunityList?.map((row) => (
                      <OpportunitySelectionTableRow
                        key={row?.Id}
                        row={row}
                        selected={currentSelectedOpp?.Id === row?.Id}
                        onSelect={() => handleSelectOpportunity(row)}
                        columns={visibleColumns || TABLE_HEAD}
                      />
                    ))}
                    {!loading && notFound && (
                      <TableNoData notFound={notFound} colSpan={TABLE_HEAD.length} />
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Scrollbar>

            {/* Pagination (Sticky Bottom) */}
            {!notFound && (
              <Box
                sx={{
                  position: 'sticky',
                  bottom: 0,
                  zIndex: 2,
                  backgroundColor: 'background.paper',
                  borderTop: (theme) => `1px dashed ${theme.palette.divider}`,
                }}
              >
                <TablePaginationCustom
                  page={table?.page || 0}
                  count={totalRecords}
                  rowsPerPage={table?.rowsPerPage || 10}
                  onPageChange={table?.onChangePage}
                  onRowsPerPageChange={table?.onChangeRowsPerPage}
                  showResultsCount
                  totalResults={opportunityList?.length}
                />
              </Box>
            )}
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}
