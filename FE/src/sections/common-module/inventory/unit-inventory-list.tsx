import type { AppDispatch } from "src/redux/store";
import type { UnitInventoryItemType } from "src/redux/slices/rm-panel/unit-inventory-slice";

import { toast } from "sonner";
import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from "react-redux";

import { Box, Card, Table, Radio, Button, Tooltip, TableRow, MenuList, MenuItem, TableBody, TableCell, IconButton, Typography, RadioGroup, CircularProgress, FormControlLabel } from '@mui/material';

import { useRouter } from "src/routes/hooks";

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { formatNumberWithCommas } from "src/utils/helper";
import { formatTableCellValue } from "src/utils/table-cell-display";
import { roleColumnsToDefinitions } from "src/utils/role-table-head";
import { INVENTORY_STATUS, generateRoleBasedRoute } from "src/utils/constant";
import { getTableStyles, tableContainerStyles, tableScrollbarStyles, calculateTableMinWidth, fixedFooterPaginationStyles, scrollableTableContentStyles } from "src/utils/table-styles";

import uiText from 'src/locales/langs/en/common.json';
import { updateUnitStatus, } from "src/redux/actions/rm-panel/unit-inventory-actions";

import { Label } from "src/components/label";
import { Iconify } from "src/components/iconify";
import { Scrollbar } from "src/components/scrollbar";
import { AnimateLogo1 } from "src/components/animate";
import { ConfirmDialog } from "src/components/custom-dialog";
import { CustomPopover } from "src/components/custom-popover";
import { useTable, TableNoData, TableHeadCustom, TablePaginationCustom } from "src/components/table";

import { UnitInventoryToolbar } from "./unit-inventory-components/unit-inventory-toolbar";
import { UnitInventoryFiltersResult } from "./unit-inventory-components/unit-inventory-filter-results";

import type { UnitInventoryFormValues } from "./unit-inventory-view";

/**
 * Unit Inventory — table list view. The List vs Tower tab strip is owned by the parent
 * `UnitInventoryView`, driven by `ROLE_BASED_PERMISSIONS[role].unitInventory` (`useTab`,
 * `unitInventoryTabs`) and `buildUnitInventoryTabStripOptions` in `role-based-permissions.ts`
 * (same pattern as EOI Records + `buildEoiRecordsTabOptions`).
 */
type UnitInventoryListProps = {
  search: string
  setSearch: React.Dispatch<React.SetStateAction<string>>
  page: number
  setPage: React.Dispatch<React.SetStateAction<number>>
  limit: number
  setLimit: React.Dispatch<React.SetStateAction<number>>
  canExport: boolean
  filters: UnitInventoryFormValues
  refetchUnitInventory: () => void;
}

type AgreementValue = string | null | undefined

const UnitInventoryList = ({ search, setSearch, page, setPage, limit, setLimit, canExport, filters, refetchUnitInventory } : UnitInventoryListProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const route = useRouter();
  const { unitInventoryData, total, loading } = useSelector(
    (state: any) => state.unitInventory
  );

  const [popovers, setPopovers] = useState<Record<string, HTMLElement | SVGElement | null>>({});
  const [unitStatusLoading, setUnitStatusLoading] = useState(false);
  const [changeStatusDialog, setChangeStatusDialog] = useState<{
    open: boolean;
    id: string | null;
  }>({
    open: false,
    id: null,
  });
  const [selectedOption, setSelectedOption] = useState(INVENTORY_STATUS.AVAILABLE);
  const table = useTable()
  const { columns: roleColumns, actions: roleActions, userRole } = useRoleBasedPermissions({ module: 'unitInventory' });
  const tableHeadFromRole = useMemo(
    () => roleColumnsToDefinitions(roleColumns),
    [roleColumns]
  );
  const columnManager = useColumnManager(tableHeadFromRole);
  const { visibleColumns } = columnManager;
  const dynamicMinWidth = calculateTableMinWidth(visibleColumns || tableHeadFromRole);

  // can reset
  const canReset = !!search;

  // ACTIONS
  const updateStatusAction = roleActions?.find((i: any) => i?.id === 'updateStatus');
  const mapUnitToVoucherAction = roleActions?.find((i: any) => i?.id === 'mapUnitToVoucher');

  // Open popover
  const handlePopoverOpen = (
    event: React.MouseEvent<HTMLElement | SVGElement>,
    rowId: string,
    type: string
  ) => {
    const key = `${rowId}-${type}`;
    setPopovers((prev) => ({ ...prev, [key]: event.currentTarget }));
  };

  // Close popover
  const handlePopoverClose = (rowId: string, type: string) => {
    const key = `${rowId}-${type}`;
    setPopovers((prev) => ({ ...prev, [key]: null }));
  };

  const handleUpdateUnitStatus = () => {
    if (!changeStatusDialog.id) return;

    setUnitStatusLoading(true);
    dispatch(
      updateUnitStatus({
        id: changeStatusDialog.id,
        status: selectedOption,
      })
    )
      .unwrap()
      .then((res) => {
        toast.success(res || 'dsfsd');

        setChangeStatusDialog({ open: false, id: null });

        // refresh table
        refetchUnitInventory();
      })
      .catch((err) => {
        toast.error(err || 'Failed to update unit status');
        setChangeStatusDialog({ open: false, id: null });
      })
      .finally(() => {
        setUnitStatusLoading(false);
      });
  };

  const selectedRow = unitInventoryData?.find(
    (item: UnitInventoryItemType) => item.id === changeStatusDialog.id
  );

  const handleResetToFirstPage = () => {
    table.onResetPage();
    setPage(1);
  };

  const formatAgreementValue = (value: AgreementValue): string => {
    if (value === null || value === undefined) return '-';

    const num = Number(value);

    if (Number.isNaN(num)) return value;

    return `₹ ${formatNumberWithCommas(num)}`;
  };

  return (
    <>
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
        <Card sx={{ ...tableContainerStyles, mt: 2}}> 
            {/* search and filter toolbar */}
            <UnitInventoryToolbar 
              search={search} 
              setSearch={setSearch} 
              columnManager={columnManager}
              canExport={canExport}
              filters={filters}
              page={page}
              limit={limit}
              onResetPage={handleResetToFirstPage}
              disabledExport={unitInventoryData.length < 1}
            />

            {/* filter results */}
            {canReset && <UnitInventoryFiltersResult
              search={search}
              setSearch={setSearch}
              totalResults={unitInventoryData.length ?? 0}
              onResetPage={handleResetToFirstPage}
            />}    

          {/* Table */}
          <Box sx={scrollableTableContentStyles}>
            <Scrollbar sx={tableScrollbarStyles}>
              <Table stickyHeader size="small" sx={getTableStyles(dynamicMinWidth)}>
                <TableHeadCustom
                  headLabel={visibleColumns}
                  orderBy={table.orderBy}
                  order={table.order}
                  onSort={table.onSort}
                  numSelected={0}
                  rowCount={unitInventoryData.length}
                />
                <TableBody>
                  {unitInventoryData?.length > 0 ? (
                    unitInventoryData?.map((row: UnitInventoryItemType) => (
                      <TableRow hover key={row.id} sx={!updateStatusAction ? { height: 40 } : {}} >
                        {visibleColumns.map((col) => {
                          const value = row[col.id as keyof typeof row];

                          if (col.id === 'agreementValue') {
                            return (
                              <TableCell key={col.id} sx={{ minWidth: 150 }}>
                                  {formatAgreementValue(value as AgreementValue)}
                              </TableCell>
                            );
                          }

                          // Status column
                          if (col.id === 'status') {
                            const normalizedValue = (value as string)?.trim();
                            const getStatusColor = (status: string | undefined) => {
                              switch (status) {
                                case INVENTORY_STATUS.AVAILABLE:
                                  return 'success';
                                case INVENTORY_STATUS.BLOCKED_BY_RM:
                                case INVENTORY_STATUS.BLOCKED_BY_MANAGEMENT:
                                  return 'error';

                                default:
                                  return 'default';
                              }
                            };
                            return (
                              <TableCell key={col.id}>
                                <Label variant="soft" color={getStatusColor(normalizedValue)}>
                                  {normalizedValue || '-'}
                                </Label>
                              </TableCell>
                            );
                          }

                          if (col.id === 'action') {
                            return (
                              <TableCell key={col.id}>
                                <Tooltip title={row?.isMapped ? "Unit mapped by RM cannot be edited" : ""}>
                                  <span>
                                    <IconButton
                                      disabled={row?.isMapped}
                                      onClick={(e) => handlePopoverOpen(e, row?.id, 'actions')}
                                    >
                                      <Iconify icon="eva:more-vertical-fill" />
                                    </IconButton>
                                  </span>
                                </Tooltip>

                                <CustomPopover
                                  open={Boolean(popovers[`${row.id}-actions`])}
                                  anchorEl={popovers[`${row.id}-actions`]}
                                  onClose={() => handlePopoverClose(row?.id, 'actions')}
                                  slotProps={{ arrow: { placement: 'right-top' } }}
                                >
                                  <MenuList>
                                    {updateStatusAction && (
                                      <MenuItem
                                        onClick={() => {
                                          if (!row?.id) {
                                            toast.error("Invalid row data");
                                            handlePopoverClose(row?.id, 'actions');
                                            return;
                                          }
                                          setSelectedOption(row.status || INVENTORY_STATUS.AVAILABLE);
                                          setChangeStatusDialog({
                                            open: true,
                                            id: row.id,
                                          });
                                          handlePopoverClose(row.id, 'actions');
                                        }}
                                      >
                                        <Typography variant="body2">{row.status === INVENTORY_STATUS.AVAILABLE ? uiText.unitInventory.updateStatus : uiText.unitInventory.editStatus}</Typography>
                                      </MenuItem>
                                    )}

                                    {mapUnitToVoucherAction && (
                                      <MenuItem
                                        onClick={() => {
                                          if (!row?.id) {
                                            toast.error("Invalid row data");
                                            handlePopoverClose(row?.id, 'actions');
                                            return;
                                          }
                                          route.push(generateRoleBasedRoute(userRole, `inventory/map-unit-to-voucher/${row?.id}`));
                                          handlePopoverClose(row?.id, 'actions');
                                        }}
                                      >
                                        <Typography variant="body2">{uiText.unitInventory.mapUnitToVoucher}</Typography>
                                      </MenuItem>
                                    )}
                                  </MenuList>
                                </CustomPopover>
                              </TableCell>
                            );
                          }

                          return (
                            <TableCell key={col.id} sx={{ minWidth: 150 }}>
                              {formatTableCellValue(value)}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  ) : (
                    <TableNoData notFound colSpan={visibleColumns?.length || tableHeadFromRole?.length} />
                  )}
                </TableBody>
              </Table>
            </Scrollbar>
          </Box>

          {/* Pagination */}
          <Box sx={fixedFooterPaginationStyles}>
            <TablePaginationCustom
              page={page - 1}
              count={total}
              rowsPerPage={limit}
              onPageChange={(e, newPage) => setPage(newPage + 1)}
              onRowsPerPageChange={(e) => {
                setLimit(Number.parseInt(e.target.value, 10));
                setPage(1);
              }}
              showResultsCount
              totalResults={total}
            />
          </Box>
        </Card>
      )}

      {changeStatusDialog.open && (
        <ConfirmDialog
          open={changeStatusDialog?.open}
          onClose={() =>
            setChangeStatusDialog({
              open: false,
              id: null,
            })
          }
          title={
            selectedRow?.status === INVENTORY_STATUS.AVAILABLE
              ? uiText.unitInventory.changeStatusDialog.title
              : uiText.unitInventory.changeStatusDialog.editTitle
          }
          content={
            <Box width="100%" >
              <Typography sx={{ fontSize: '14px', fontWeight: 500, textAlign: 'left' }}>
                {uiText.unitInventory.changeStatusDialog.select}:
              </Typography>
              <RadioGroup
                row
                name="unitStatus"
                value={selectedOption}
                onChange={(e) => setSelectedOption(e.target.value)}
                sx={{ ml: 1 }}
              >
                <FormControlLabel
                  value={INVENTORY_STATUS.AVAILABLE}
                  control={<Radio size="medium" />}
                  label={INVENTORY_STATUS.AVAILABLE}
                />
                <FormControlLabel
                  value={INVENTORY_STATUS.BLOCKED_BY_MANAGEMENT}
                  control={<Radio size="medium" />}
                  label={uiText.unitInventory.changeStatusDialog.block}
                />
              </RadioGroup>
            </Box>
          }
          showDivider
          leftAlignTitle
          showCancel
          cancelLabel={uiText.button.cancel}
          action={
            <Button
              variant="contained"
              sx={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#fff',
                background: '#1A407D',
                minWidth: { xs: '120px', lg: '204px' },
                height: '48px',
                margin: 0,
                '&:hover': {
                  background: '#1A407D',
                  boxShadow: 'none',
                },
              }}
              disabled={unitStatusLoading}
              onClick={handleUpdateUnitStatus}
            >
              {unitStatusLoading ? (
                <CircularProgress size={22} sx={{ color: '#fff' }} />
              ) : (
                uiText.button.submit
              )}
            </Button>
          }
        />
      )}
    </>
  )
};

export default UnitInventoryList;