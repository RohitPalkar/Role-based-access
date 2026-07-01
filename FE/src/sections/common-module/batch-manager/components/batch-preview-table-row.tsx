import type { RoleAction } from 'src/config/role-based-permissions';
import type { ColumnDefinition } from 'src/hooks/use-column-manager';

import dayjs from 'dayjs';
import { toast } from 'sonner';
import { useForm, FormProvider } from 'react-hook-form';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { MenuList, MenuItem } from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { useAppDispatch } from 'src/hooks/use-redux';

import { STATUS_COLORS, SlotStatusEnum, type LabelColor, generateRoleBasedRoute } from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';
import { updateBatchSlotAction, deleteBatchSlotAction, updateBatchSlotStatusAction } from 'src/redux/actions/common-module/batch-manager-actions';

import { Label } from 'src/components/label';
import { Field } from 'src/components/hook-form';
import { Iconify } from 'src/components/iconify';
import { usePopover, CustomPopover } from 'src/components/custom-popover';

import BatchListingDialogBox from './batch-listing-dialog-box';
import { normalizeScheduleTimeToHm } from '../utils/batch-preview-build-rows';

import type { DialogType } from './batch-listing-dialog-box';
import type { BatchPreviewRow, BatchPreviewEditablePatch } from '../utils/batch-preview-build-rows';

/**
 * Preview table layout (Start / End time):
 * - MUI `Table` + `TableHeadCustom`: each logical field is its own column so **Column manager** can show/hide independently.
 * - Each row renders **one `TableCell` per visible column**; Start and End stay side-by-side when both columns are visible.
 * - **`Field.Time`** in `PreviewTimeInput` (isolated `FormProvider` per cell) matches batch configuration; **`onCommittedChange`** on `RHFTimePicker` updates local draft while editing.
 * - **Edit / Apply / Cancel**: Apply calls `onRowApply`; the parent should call the update API and replace `rows`.
 * - **Widths** come from `role-based-permissions` → `roleColumnsToDefinitions` → `calculateTableMinWidth` (scroll on narrow viewports).
 */
dayjs.extend(customParseFormat);

const timeColumnCellSx = {
  verticalAlign: 'middle',
  py: 1,
  minWidth: 180,
  maxWidth: 260,
} as const;

/** Action column: room for Edit, or Apply + Cancel without squashing; vertically centered vs row text. */
const actionColumnCellSx = {
  verticalAlign: 'middle',
  py: 1,
  px: 1,
  minWidth: 96,
  width: 'auto',
  whiteSpace: 'nowrap' as const,
} as const;

const actionIconButtonSx = {
  p: 0.75,
  borderRadius: 1,
} as const;

function toTimeInputValue(t: string): string {
  const s = t?.trim() ?? '';
  if (s.length >= 5) {
    return s.slice(0, 5);
  }
  return '09:00';
}

/**
 * Isolated `Field.Time`: local RHF state for the picker; **`value` prop** is the source of truth from the table row.
 * Pushes to the parent via **`onCommittedChange`** on `Field.Time` (accept / blur only), with a baseline ref so accept + blur does not double-fire before props catch up.
 */
function PreviewTimeInput({
  slotDate,
  value,
  label,
  onCommit,
  disabled = false,
}: Readonly<{
  /** Calendar day for this cell (`YYYY-MM-DD`); included so picker state resets when a row moves to the next date after midnight. */
  slotDate: string;
  value: string;
  label: string;
  onCommit: (hhmm: string) => void;
  disabled?: boolean;
}>) {
  const normalizedProp = normalizeScheduleTimeToHm(value);
  const baselineRef = useRef(normalizedProp);

  useEffect(() => {
    baselineRef.current = normalizedProp;
  }, [normalizedProp]);

  const methods = useForm<{ t: string }>({
    defaultValues: { t: toTimeInputValue(normalizedProp) },
  });
  const { reset } = methods;

  useEffect(() => {
    reset({ t: toTimeInputValue(normalizedProp) });
  }, [normalizedProp, slotDate, reset]);

  const handleCommitted = useCallback(
    (hhmm: string) => {
      const next = normalizeScheduleTimeToHm(hhmm || baselineRef.current);
      if (next === baselineRef.current) {
        return;
      }
      baselineRef.current = next;
      onCommit(next);
    },
    [onCommit]
  );

  return (
    <FormProvider {...methods}>
      <Box sx={{ width: 1, minWidth: 0 }}>
        <Field.Time name="t" label={label} hideLabel required onCommittedChange={handleCommitted} disabled={disabled} />
      </Box>
    </FormProvider>
  );
}

function formatTimeForDisplay(t: string): string {
  const trimmed = t?.trim();
  if (!trimmed) {
    return '-';
  }
  const parsed = dayjs(trimmed, ['HH:mm', 'HH:mm:ss', 'h:mm A'], true);
  if (parsed.isValid()) {
    return parsed.format('hh:mm A');
  }
  return trimmed;
}


type RowDraft = {
  capacity: number;
  startTime: string;
  endTime: string;
};

function rowToDraft(r: BatchPreviewRow): RowDraft {
  return {
    capacity: r.capacity || 0,
    startTime: r.startTime,
    endTime: r.endTime,
  };
}

type Props = {
  row: BatchPreviewRow;
  /** Index in the full preview list (`editablePreview`); must be ≥ 0 for edits to apply. */
  rowIndex: number;
  visibleColumns: ColumnDefinition[];
  onRowApply?: (rowIndex: number, patch: BatchPreviewEditablePatch) => void;
  mode?: 'preview' | 'listing';
  userRole: string | null;
  roleActions?: RoleAction[];
  onRefresh?: () => void;
  isUserMapped: boolean;
};

type BatchPreviewTableCellProps = {
  col: ColumnDefinition;
  row: BatchPreviewRow;
  rowIndex: number;
  isEditing: boolean;
  isUpdating: boolean;
  draft: RowDraft;
  setDraft: React.Dispatch<React.SetStateAction<RowDraft>>;
  onRowApply?: (rowIndex: number, patch: BatchPreviewEditablePatch) => void;
  mode: 'preview' | 'listing';
  userRole: string | null;
  roleActions: RoleAction[];
  anchorRef: React.Ref<any>;
  menuActions: ReturnType<typeof usePopover>;
  canEditRow: boolean;
  applyEditing: () => void;
  cancelEditing: () => void;
  startEditing: () => void;
  onDelete: () => void;
  isUserMapped: boolean;
};


const getDisplayValue = (value?: number | string) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number' && value === 0) return '-';
  return value;
};

function ActionsCellContent({ mode,
  anchorRef,
  menuActions,
  canEditRow,
  isEditing,
  isUpdating,
  applyEditing,
  cancelEditing,
  startEditing,
  row,
  onDelete,
}: Readonly<any>) {
  if (mode === 'listing') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Tooltip title="Action">
          <IconButton
            ref={anchorRef}
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              menuActions.onOpen(e);
            }}
            size="small"
          >
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: 1,
      }}
    >
      <Box
        sx={{
          display: 'inline-flex',
          flexDirection: 'row',
          flexWrap: 'nowrap',
          alignItems: 'center',
          columnGap: 0.5,
        }}
      >
        {isEditing ? (
          <>
            <Tooltip title={uiText.button.apply} arrow enterDelay={400}>
              <IconButton
                type="button"
                size="small"
                color="primary"
                onClick={applyEditing}
                disabled={isUpdating}
                sx={actionIconButtonSx}
              >
                {isUpdating ? (
                  <Iconify icon="eos-icons:loading" width={20} />
                ) : (
                  <Iconify icon="eva:checkmark-fill" width={20} />
                )}
              </IconButton>
            </Tooltip>
            <Tooltip title={uiText.button.cancel} arrow enterDelay={400}>
              <IconButton
                type="button"
                size="small"
                color="inherit"
                onClick={cancelEditing}
                sx={actionIconButtonSx}
              >
                <Iconify icon="eva:close-fill" width={20} />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <>
            <Tooltip title={uiText.common.edit} arrow enterDelay={400}>
              <IconButton
                type="button"
                size="small"
                color="default"
                onClick={startEditing}
                sx={actionIconButtonSx}
              >
                <Iconify icon="solar:pen-bold" width={20} />
              </IconButton>
            </Tooltip>

            <Tooltip title={uiText.common.delete} arrow enterDelay={400}>
              <IconButton
                type="button"
                size="small"
                color={row?.capacity === 0 ? "error" : "default"}
                onClick={onDelete}
                disabled={row?.capacity !== 0}
                sx={actionIconButtonSx}
              >
                <Iconify icon="solar:trash-bin-trash-bold" width={20} />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>
    </Box>
  );
}

function CapacityCell({ canEditRow, isEditing, value, onChange }: Readonly<any>) {
  if (canEditRow && isEditing) {
    return (
      <TextField
        size="small"
        value={value || ''}
        onChange={(e) => onChange(Number(e.target.value.replaceAll(/\D/g, '')) || 0)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
          }
        }}
        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', min: 1, style: { width: 72 } }}
        placeholder={uiText.common.formFields.recordsShort}
      />
    );
  }
  return <Typography variant="body2">{value}</Typography>;
}

function StatusCell({ status }: Readonly<{ status?: string }>) {
  const getStatusColor = (statusVal?: string): LabelColor => {
    if (!statusVal) return 'default';
    const normalized = String(statusVal).toLowerCase().trim();
    const match = Object.values(SlotStatusEnum).find(
      (enumVal) => enumVal.toLowerCase() === normalized
    );
    if (match && STATUS_COLORS.SLOT_STATUS[match]) {
      return STATUS_COLORS.SLOT_STATUS[match];
    }
    return 'default';
  };

  return (
    <Label variant="soft" color={getStatusColor(status)}>
      {getDisplayValue(status)}
    </Label>
  );
}

function TimeCell({ canEditRow, isEditing, row, value, label, onCommit, disabled, originalValue }: Readonly<any>) {
  if (canEditRow && isEditing) {
    return (
      <PreviewTimeInput
        slotDate={row.slotDate}
        value={value}
        label={label}
        onCommit={onCommit}
        disabled={disabled}
      />
    );
  }
  return <Typography variant="body2">{formatTimeForDisplay(originalValue)}</Typography>;
}

function BatchPreviewTableCell({
  col,
  row,
  rowIndex,
  isEditing,
  isUpdating,
  draft,
  setDraft,
  onRowApply,
  mode,
  userRole,
  roleActions,
  anchorRef,
  menuActions,
  canEditRow,
  applyEditing,
  cancelEditing,
  startEditing,
  onDelete,
  isUserMapped,
}: Readonly<BatchPreviewTableCellProps>) {
  const commonSx = col.id === 'startTime' || col.id === 'endTime' ? timeColumnCellSx : {};
  const isActions = col.id === 'actions';
  const capacityValue = isUserMapped ? row.filledCount : row.capacity;
  return (
    <TableCell
      key={col.id}
      align={isActions ? 'center' : 'left'}
      sx={{ ...commonSx, ...(isActions ? actionColumnCellSx : {}) }}
      onClick={mode === 'listing' && isActions ? (e) => e.stopPropagation() : undefined}
    >
      {(() => {
        switch (col.id) {
          case 'sequence':
            return <Typography variant="body2">{row.name}</Typography>;

          case 'actions':
            return canEditRow || mode === 'listing' ? (
              <ActionsCellContent
                mode={mode}
                anchorRef={anchorRef}
                menuActions={menuActions}
                canEditRow={canEditRow}
                isEditing={isEditing}
                isUpdating={isUpdating}
                applyEditing={applyEditing}
                cancelEditing={cancelEditing}
                startEditing={startEditing}
                row={row}
                onDelete={onDelete}
              />
            ) : (
              <Typography variant="body2" color="text.disabled" component="span" align="center">—</Typography>
            );
          case 'capacity':
            return (
              <CapacityCell
                canEditRow={canEditRow}
                isEditing={isEditing}
                value={isEditing ? draft.capacity : capacityValue}
                onChange={(val: number) => setDraft((d) => ({ ...d, capacity: val }))}
              />
            );
          case 'attended':
            return <Typography variant="body2">{getDisplayValue((row as any).attended)}</Typography>;
          case 'headCount':
            return <Typography variant="body2">{getDisplayValue((row as any).headCount)}</Typography>;
          case 'status':
            return <StatusCell status={(row as any).status} />;
          case 'date':
            return <Typography variant="body2">{row.dateLabel}</Typography>;
          case 'startTime':
            return (
              <TimeCell
                canEditRow={canEditRow}
                isEditing={isEditing}
                row={row}
                value={draft.startTime}
                originalValue={row.startTime}
                label={uiText.common.formFields.startTime}
                onCommit={(hhmm: string) => setDraft((d) => ({ ...d, startTime: hhmm }))}
                disabled
              />
            );
          case 'endTime':
            return (
              <TimeCell
                canEditRow={canEditRow}
                isEditing={isEditing}
                row={row}
                value={draft.endTime}
                originalValue={row.endTime}
                label={uiText.common.formFields.endTime}
                onCommit={(hhmm: string) => setDraft((d) => ({ ...d, endTime: hhmm }))}
              />
            );
          default:
            return <Typography variant="body2">-</Typography>;
        }
      })()}
    </TableCell>
  );
}

function BatchPreviewTableRow({ row, rowIndex, visibleColumns, onRowApply, mode = 'preview', userRole, roleActions = [], onRefresh, isUserMapped }: Readonly<Props>) {
  const canEditRow = Boolean(onRowApply) && rowIndex >= 0;
  const noVoucherMapped = !(row?.isVoucherMapped);
  const listingCursorType = noVoucherMapped ? 'not-allowed' : 'pointer';
  const cursorType = (mode === 'listing') ? listingCursorType : 'default'
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<RowDraft>(() => rowToDraft(row));
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const disableOpenBatch = (row.status !== SlotStatusEnum.LOCKED || !dayjs(row.dateLabel, 'DD-MM-YYYY').isSame(dayjs(), 'day') || noVoucherMapped)
  const anchorRef = useRef<HTMLButtonElement | null>(null);

  const menuActions = usePopover();

  const [dialog, setDialog] = useState(false);

  const [dialogType, setDialogType] = useState<DialogType>('OPEN_BATCH');

  const [onSubmit, setOnSubmit] = useState<
    ((values?: { firstBatch: string; secondBatch: string }) => void) | undefined
  >();

  useEffect(() => {
    if (!isEditing) {
      setDraft(rowToDraft(row));
    }
  }, [row, isEditing]);

  const startEditing = useCallback(() => {
    setDraft(rowToDraft(row));
    setIsEditing(true);
  }, [row]);

  const cancelEditing = useCallback(() => {
    setDraft(rowToDraft(row));
    setIsEditing(false);
  }, [row]);

  const applyEditing = useCallback(async () => {
    if (!onRowApply || rowIndex < 0) {
      return;
    }

    setIsUpdating(true);
    try {
      const payload = {
        endTime: draft.endTime,
        capacity: draft.capacity,
      };

      await dispatch(updateBatchSlotAction({ id: row.id, payload })).unwrap();

      // After successful API call, we can exit editing mode
      onRefresh?.();
      setIsEditing(false);
    } catch (error: any) {
      console.error('Update batch slot failed:', error);
      toast.error(error)
      // You might want to show a toast error message here
      // For now, just log the error
    } finally {
      setIsUpdating(false);
    }
  }, [draft, onRowApply, rowIndex, dispatch, row.id, onRefresh]);

  const handleDelete = useCallback(async () => {
    try {
      await dispatch(deleteBatchSlotAction(row.id)).unwrap();
      toast.success('Batch deleted successfully');
      onRefresh?.();
    } catch (error: any) {
      console.error('Delete batch failed:', error);
      toast.error(error || 'Failed to delete batch');
    }
  }, [dispatch, row.id, onRefresh]);

  const handleRowClick = () => {
    if (mode !== 'listing' || !isUserMapped || noVoucherMapped) return;

    router.push(
      generateRoleBasedRoute(
        userRole,
        `batch/listing/batch-voucher-list/${row.id}`
      )
    );
  };

  const handleOpenBatchSubmit = async () => {
    try {
      await dispatch(updateBatchSlotStatusAction({ id: row.id, status: SlotStatusEnum.OPEN })).unwrap();
      toast.success('Batch opened successfully');
      onRefresh?.();
    } catch (error: any) {
      console.error('Open batch failed:', error);
      toast.error(error || 'Failed to open batch');
    }
  };

  const handleOpenBatch = () => {
    setDialogType('OPEN_BATCH');
    setOnSubmit(() => handleOpenBatchSubmit);
    setDialog(true);
  };
  const handleLockBatchSubmit = async () => {
    try {
      await dispatch(updateBatchSlotStatusAction({ id: row.id, status: SlotStatusEnum.LOCKED })).unwrap();
      toast.success('Batch Locked successfully');
      onRefresh?.();
    } catch (error: any) {
      console.error('Lock batch failed:', error);
      toast.error(error || 'Failed to Lock batch');
    }
  };

  const handleLockBatch = () => {
    setDialogType('LOCK');
    setOnSubmit(() => handleLockBatchSubmit);
    setDialog(true);
  };


  const actionHandlers: Record<string, () => void> = {
    openBatch: handleOpenBatch,
    lockBatch: handleLockBatch,
  };

  return (
    <>
      <TableRow
        hover
        tabIndex={-1}
        onClick={mode === 'listing' ? handleRowClick : undefined}
        sx={{
          cursor: cursorType,
        }}
      >
        {visibleColumns.map((col) => (
          <BatchPreviewTableCell
            key={col.id}
            col={col}
            row={row}
            rowIndex={rowIndex}
            isEditing={isEditing}
            isUpdating={isUpdating}
            draft={draft}
            setDraft={setDraft}
            onRowApply={onRowApply}
            mode={mode}
            userRole={userRole}
            roleActions={roleActions}
            anchorRef={anchorRef}
            menuActions={menuActions}
            canEditRow={canEditRow}
            applyEditing={applyEditing}
            cancelEditing={cancelEditing}
            startEditing={startEditing}
            onDelete={handleDelete}
            isUserMapped={isUserMapped}
          />
        ))}
      </TableRow>
      <CustomPopover
        open={menuActions.open}
        anchorEl={menuActions.anchorEl}
        onClose={menuActions.onClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList>
          {roleActions?.map((action, index) => (
            <MenuItem
              key={action?.id}
              disabled={
                (action?.id === 'openBatch' && disableOpenBatch) ||
                (action?.id === 'lockBatch' && row.status !== SlotStatusEnum.OPEN)
              }
              onClick={(e) => {
                e.stopPropagation();

                actionHandlers[action?.id || index]?.();

                menuActions.onClose();
              }}
            >
              {action?.label}
            </MenuItem>
          ))}
        </MenuList>
      </CustomPopover>

      <BatchListingDialogBox
        dialog={dialog}
        setDialog={setDialog}
        type={dialogType}
        onSubmit={onSubmit}
      />
    </>
  );
}

export { BatchPreviewTableRow };
