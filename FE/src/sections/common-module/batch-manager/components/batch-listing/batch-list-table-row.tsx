import type { RoleAction } from 'src/config/role-based-permissions';
import type { ColumnDefinition } from 'src/hooks/use-column-manager';
import type { BatchListData } from 'src/services/common-module/batch-manager-services';

import dayjs from 'dayjs';
import { toast } from 'sonner';
import React, { useRef, useState } from 'react';

import { Box, Tooltip, TableRow, MenuList, MenuItem, TableCell, IconButton } from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { useAppDispatch } from 'src/hooks/use-redux';

import { formatDateIST } from 'src/utils/helper';
import { generateRoleBasedRoute } from 'src/utils/constant';

import { deleteBatchAction, notifyBatchAction, mapBatchVouchersAction } from 'src/redux/actions/common-module/batch-manager-actions';

import { Iconify } from 'src/components/iconify';
import { usePopover, CustomPopover } from 'src/components/custom-popover';

import BatchListingDialogBox from '../batch-listing-dialog-box';

import type { DialogType, NotifySubmitPayload } from '../batch-listing-dialog-box';

type Props = {
  row: BatchListData;
  visibleColumns: ColumnDefinition[];
  userRole: string | null;
  roleActions: RoleAction[];
  onRefresh?: () => void;
};

const BatchListTableRow: React.FC<Props> = ({ row, visibleColumns, userRole, roleActions, onRefresh }) => {
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const [dialog, setDialog] = useState(false);
  const [dialogType, setDialogType] = useState<DialogType>('DELETE');
  const [isNotifySubmitting, setIsNotifySubmitting] = useState(false);
  const [onSubmit, setOnSubmit] = useState<((values?: { firstBatch: string; secondBatch: string }) => void) | undefined>();
  const menuActions = usePopover();
  const route = useRouter();
  const dispatch = useAppDispatch();
  const getDisplayValue = (value?: number | string | boolean | null) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number' && value === 0) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return value;
  };

  const handleRowClick = () => {
    if (menuActions.open) {
      return;
    } route.push(generateRoleBasedRoute(userRole, `batch/listing/slot-details/${row.id}`))
  }

  const openNotifyDialog = () => {
    setDialogType('NOTIFY_CX');
    setDialog(true);
  };

  const handleMapEois = async () => {
    try {
      await dispatch(mapBatchVouchersAction({ batchId: String(row.id) })).unwrap();
      toast.success('EOI mapped successfully');
      onRefresh?.();
    } catch (error: any) {
      toast.error(error || 'Failed to map EOI');
    }
  };

  const handleEditBatch = () => { route.push(generateRoleBasedRoute(userRole, `batch/listing/edit/${row.id}`)) }

  const handleDeleteSubmit = async () => {
    try {
      await dispatch(deleteBatchAction(String(row.id))).unwrap();
      toast.success('Batch deleted successfully');
      onRefresh?.();
      setDialog(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete batch');
      setDialog(false);
    }
  }

  const handleNotifySubmit = async (payload: NotifySubmitPayload) => {
    setIsNotifySubmitting(true);
    try {
      const body = {
        notifyAt: payload.mode === 'now' ? undefined : dayjs(`${payload.date} ${payload.time}`).toISOString(),
      };
      await dispatch(notifyBatchAction({ batchId: String(row.id), body })).unwrap();
      toast.success('Customers notified successfully');
      setDialog(false);
      onRefresh?.();
    } catch (error: any) {
      toast.error(error || 'Failed to notify customers');
    } finally {
      setIsNotifySubmitting(false);
    }
  };

  const handleNotifyCx = () => {
    openNotifyDialog();
  };

  const handleDeleteBatch = () => {
    setDialogType('DELETE');
    setOnSubmit(() => handleDeleteSubmit);
    setDialog(true);
  }
  // render menu  actions
  const actionHandlers: Record<string, () => void> = {
    mapEois: handleMapEois,
    notifyCx: handleNotifyCx,
    editBatch: handleEditBatch,
    deleteBatch: handleDeleteBatch,
  };

  const renderMenuActions = () => (
    <CustomPopover
      open={menuActions.open}
      anchorEl={menuActions.anchorEl}
      onClose={menuActions.onClose}
      slotProps={{ arrow: { placement: 'right-top' } }}
    >
      <MenuList>
        {roleActions?.map((action, index) => {
          const disabledActionRules: Record<string, () => boolean> = {
            mapEois: () => row.isUserMapped,
            editBatch: () => row.isUserMapped,
            notifyCx: () => !row.isUserMapped || row.isNotified,
            deleteBatch: () => row.isAttended,
          };

          const isDisabled = disabledActionRules[action.id ?? '']?.() ?? false;


          return (
            <MenuItem
              key={action?.id}
              disabled={isDisabled}
              onClick={(e) => {
                e.stopPropagation();
                if (!isDisabled) {
                  actionHandlers[action?.id || index]?.();
                  menuActions.onClose();
                }
              }}
            >
              {action?.label}
            </MenuItem>
          );
        })}
      </MenuList>
    </CustomPopover>
  );

  return (
    <>
      <TableRow hover tabIndex={-1} sx={{ height: "41px", cursor: 'pointer' }} onClick={handleRowClick}>
        {visibleColumns.map((col) => {
          const value = row[col.id as keyof BatchListData];

          // DATE columns (startDate, endDate)
          if (col.id === 'startDate' || col.id === 'endDate') {
            return (
              <TableCell key={col.id}>{getDisplayValue(formatDateIST(value as string, {hideTime: true}))}</TableCell>
            );
          }

          // slotDurtion
          if (col.id === 'slotDuration') {
            return (
              <TableCell key={col.id}>{getDisplayValue(value)} mins</TableCell>
            );
          }

          // Action column
          if (col.id === 'actions') {
            return (
              <TableCell key={col?.id} onClick={(e) => e.stopPropagation()}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Tooltip title="Action">
                    <IconButton
                      ref={anchorRef}
                      onClick={(e) => {
                        e.stopPropagation();
                        menuActions.onOpen(e);
                      }}
                      size="small"
                    >
                      <Iconify icon="eva:more-vertical-fill" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            );
          }

          // DEFAULT cell
          return (
            <TableCell key={col.id}>
              {getDisplayValue(value)}
            </TableCell>
          );
        })}
        {renderMenuActions()}
      </TableRow>
      <BatchListingDialogBox
        dialog={dialog}
        setDialog={setDialog}
        type={dialogType}
        onSubmit={onSubmit}
        onNotifySubmit={dialogType === 'NOTIFY_CX' ? handleNotifySubmit : undefined}
        isNotifySubmitting={isNotifySubmitting}
      />
    </>
  );
};

export default BatchListTableRow;
