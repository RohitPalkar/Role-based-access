import type { LabelColor} from 'src/utils/constant';
import type { RoleAction } from 'src/config/role-based-permissions';
import type { ColumnDefinition } from 'src/hooks/use-column-manager';
import type { DropdownIdNameType, BatchVouchersListData } from 'src/services/common-module/batch-manager-services';

import React, { useRef, useState } from 'react';

import { Box, Tooltip, TableRow, MenuList, MenuItem, TableCell, IconButton } from '@mui/material';

import { useAppDispatch } from 'src/hooks/use-redux';

import { STATUS_COLORS , BatchVoucherStatus} from 'src/utils/constant';

import { notifyBatchAction, moveBatchUserAction } from 'src/redux/actions/common-module/batch-manager-actions';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { usePopover, CustomPopover } from 'src/components/custom-popover';

import BatchListingDialogBox from '../batch-listing-dialog-box';

import type { DialogType, NotifySubmitPayload } from '../batch-listing-dialog-box';

type Props = {
  row: BatchVouchersListData;
  visibleColumns: ColumnDefinition[];
  roleActions: RoleAction[];
  onRefresh?: () => void;
  slotId?: string;
  batchSlotsDropdownData: DropdownIdNameType[]
};

type DialogState = {
  open: boolean;
  type: DialogType;
  onSubmit?: (
    values?: {
      firstBatch: string;
      secondBatch: string;
      comment?: string;
    }
  ) => void;

   onNotifySubmit?: (
    payload: NotifySubmitPayload
  ) => Promise<void> | void;

  enableScheduleOption?: boolean;
};

const BatchVoucherListRow: React.FC<Props> = ({ row, visibleColumns, roleActions, onRefresh, slotId, batchSlotsDropdownData }) => {
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const menuActions = usePopover();
  const [isNotifySubmitting, setIsNotifySubmitting] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>({
    open: false,
    type: 'MOVE',
  });

  const getDisplayValue = (value?: number | string) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number' && value === 0) return '-';
    return value;
  };

  const getStatusColor = (status?: string): LabelColor => {
    if (!status) { return 'default'; }

    return STATUS_COLORS?.CX_STATUS?.[status as BatchVoucherStatus] || 'default';
  };

  const dispatch = useAppDispatch();
  const handleMoveToSubmit = async (values?: { firstBatch: string; secondBatch: string; comment?: string }) => {
    if (!values?.secondBatch) {
      toast.error('Target slot is required');
      return;
    }

    try {
      const payload = {
        targetSlotId: values.secondBatch,
        comment: values.comment,
      };

      await dispatch(moveBatchUserAction({ voucherId: row.id, payload })).unwrap();
      toast.success('User moved successfully');
      setDialogState((prev) => ({
        ...prev,
        open: false,
      }));
      onRefresh?.();
    } catch (error: any) {
      toast.error(error || 'Failed to move user');
    }
  };

  const handleMoveTo = () => {
    setDialogState({
      open: true,
      type: 'MOVE',
      onSubmit: handleMoveToSubmit,
    });
  };

  const handleNotifyCxSubmit = async (
    payload: NotifySubmitPayload
  ) => {
    setIsNotifySubmitting(true);

    try {
      const body = {
        notifyAt:
          payload.mode === 'now'
            ? null
            : `${payload.date} ${payload.time}`,
      };

      await dispatch(
        notifyBatchAction({
          mappedUserId: String(row.id),
          body,
        })
      ).unwrap();

      toast.success('Notification sent successfully');

      setDialogState((prev) => ({
        ...prev,
        open: false,
      }));

      onRefresh?.();

    } catch (error: any) {
      toast.error(error || 'Failed to sent notification');
    } finally {
      setIsNotifySubmitting(false);
    }
  };

  const handleNotifyCx = () => {
    setDialogState({
      open: true,
      type: 'NOTIFY_CX',
      onNotifySubmit: handleNotifyCxSubmit,
      enableScheduleOption: false,
    });
  };

  // render menu  actions
  const actionHandlers: Record<string, () => void> = {
    moveTo: handleMoveTo,
    notifyCx: handleNotifyCx,
  };

   const disabledStatuses = new Set([
     BatchVoucherStatus.ATTENDED,
     BatchVoucherStatus.BOOKED,
     BatchVoucherStatus.AGREEMENT_SIGNED,
   ]);

   const isStatusActionDisabled = disabledStatuses.has(row?.cxStatus as BatchVoucherStatus);

   const disabledActionRules: Record<string, () => boolean> = {
     moveTo: () => isStatusActionDisabled || batchSlotsDropdownData.length === 0,
     notifyCx: () => isStatusActionDisabled,
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
          const isDisabled = disabledActionRules[action.id ?? '']?.() ?? false;
          return (
            <MenuItem
              key={action?.id}
              disabled={isDisabled}
              onClick={() => {
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
      <TableRow hover tabIndex={-1} sx={{ height: "41px" }}>
        {visibleColumns.map((col) => {
          const value = row[col.id as keyof BatchVouchersListData];

          // STATUS column
          if (col.id === 'cxStatus') {
            return (
              <TableCell key={col.id}>
                <Label variant="soft" color={getStatusColor(value as string)}>
                  {getDisplayValue(value as string)}
                </Label>
              </TableCell>
            );
          }

          // Action column
          if (col.id === 'action') {
            return (
              <TableCell key={col?.id}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Tooltip title="Action">
                    <IconButton
                      ref={anchorRef}
                      onClick={menuActions.onOpen}
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
              {getDisplayValue(value as number | string)}
            </TableCell>
          );
        })}
        {renderMenuActions()}
      </TableRow>

      <BatchListingDialogBox
        dialog={dialogState.open}
        setDialog={(val) =>
          setDialogState((prev) => ({
            ...prev,
            open: val,
          }))
        }
        type={dialogState.type}
        enableScheduleOption={dialogState.enableScheduleOption}
        selectedRow={{ name: row.customerName || '', batchName: row.slotName || '' }}
        onSubmit={dialogState.onSubmit}
        slotId={slotId}
        onNotifySubmit={
          dialogState.type === 'NOTIFY_CX'
            ? handleNotifyCxSubmit
            : undefined
        }
        isNotifySubmitting={isNotifySubmitting}
        batchSlotsDropdownData={batchSlotsDropdownData}
      />
    </>
  );
};

export default BatchVoucherListRow;
