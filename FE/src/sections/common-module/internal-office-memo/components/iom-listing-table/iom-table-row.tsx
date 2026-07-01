import type { ColumnDefinition } from 'src/hooks/use-column-manager';
import type { RoleAction, RoleActionContext } from 'src/config/role-based-permissions';
import type { IomTableRowItem } from 'src/sections/common-module/internal-office-memo/iom-config';

import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import {
  Stack,
  Tooltip,
  MenuList,
  MenuItem,
  Checkbox,
  Typography,
  IconButton,
} from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { useBoolean } from 'src/hooks/use-boolean';

import { formatDateIST } from 'src/utils/helper';
import { IomStatus, InvoiceStatus, IOM_REJECTED_STATUSES, generateRoleBasedRoute } from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';
import { isActionDisabled } from 'src/config/role-based-permissions';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { usePopover, CustomPopover } from 'src/components/custom-popover';

import { IomJourneyDialog } from '../dialog-boxes/iom-journey-dialog';

type Props = Readonly<{
  row: IomTableRowItem;
  selected: boolean;
  onSelectRow: (id: string) => void;
  visibleColumns: ColumnDefinition[];
  getRowActions: (row: IomTableRowItem, context?: RoleActionContext) => RoleAction[];
  actionContext: RoleActionContext;
  userRole: string | null;
}>;

  const isEditableIom = (row: IomTableRowItem): boolean =>
    Boolean(row.statusLabel && IOM_REJECTED_STATUSES.has(row.statusLabel as IomStatus));

  const getGenerateOrEditIomLabel = (row: IomTableRowItem, actionLabel?: string): string =>
    isEditableIom(row)
      ? uiText.internalOfficeMemo.actions.editIOM
      : actionLabel || uiText.internalOfficeMemo.actions.generateIOM;

const STATUS_COLOR_MAP: Record<string, string> = {
  [IomStatus.IOM_TO_BE_CREATED]: 'secondary',

  [IomStatus.CRM_TL_APPROVAL_PENDING]: 'warning',
  [IomStatus.CRM_HEAD_APPROVAL_PENDING]: 'warning',
  [IomStatus.CRM_TL_REJECTED]: 'error',
  [IomStatus.CRM_HEAD_REJECTED]: 'error',

  [IomStatus.FINANCE_MEMBER_VERIFICATION_PENDING]: 'warning',
  [IomStatus.FINANCE_APPROVER_APPROVAL_PENDING]: 'warning',
  [IomStatus.FINANCE_MEMBER_REJECTED]: 'error',
  [IomStatus.FINANCE_APPROVER_REJECTED]: 'error',

  [IomStatus.POINTS_TO_BE_UPLOADED]: 'info',
  [IomStatus.POINTS_UPLOADED]: 'success',

  [IomStatus.INVOICE_REQUESTED_FROM_VENDOR]: 'warning',
  [IomStatus.INVOICE_REJECTED_BY_FINANCE]: 'error',

  [IomStatus.IOM_CLOSED]: 'default',
  [IomStatus.DELETED]: 'error',
  [IomStatus.DRAFT]: 'default',

  // Invoice Status
  [InvoiceStatus.REQUESTED]: 'warning',
  [InvoiceStatus.PENDING]: 'warning',
  [InvoiceStatus.RAISED]: 'success',
};

const IOM_DATE_COLUMNS = new Set([
  'iomCreatedAt',
  'thresholdPaymentReceivedAt',
  'pointsUpdatedAt',
  'invoiceDate',
]);

const getStatusColor = (statusLabel?: string) => {
  if (statusLabel) {
    return STATUS_COLOR_MAP[statusLabel] || 'default';
  }

  return 'default';
};

const getDisplayValue = (value?: string | number | boolean | null) => {
  if (value === null || value === undefined || value === '') return '-';
  return value;
};

const formatCellValue = (colId: string, value?: string | number | boolean | null) => {
  if (IOM_DATE_COLUMNS.has(colId)) {
    return formatDateIST(value as string | null, { hideTime: true });
  }

  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (colId === 'referralPointsEdited' && typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (colId === 'saleValue' && typeof value === 'number') {
    return value.toLocaleString('en-IN');
  }

  if (colId === 'referralSplitType' && typeof value === 'string') {
    return value.replace(/^['"]+|['"]+$/g, '');
  }

  return value;
};

export function IomTableRow({
  row,
  selected,
  onSelectRow,
  visibleColumns,
  getRowActions,
  actionContext,
  userRole,
}: Props) {
  const confirm = useBoolean();
  const popover = usePopover();
  const router = useRouter();
  const journeyDialog = useBoolean();

  const rowActions = getRowActions(row, actionContext);
  const viewAction = rowActions.find((action) => action.id === 'view');
  const generateIomAction = rowActions.find((action) => action.id === 'generateIOM');
  const verifyIomAction = rowActions.find((action) => action.id === 'verifyIOM');
  const verifyGeneratedIomAction = rowActions.find(
    (action) => action.id === 'verifyGeneratedIOM'
  );
  const addLoyaltyPointsAction = rowActions.find((action) => action.id === 'addLoyaltyPoints');
  const closeInvoiceAction = rowActions.find((action) => action.id === 'closeInvoice');

  const isGenerateIomDisabled = isActionDisabled(generateIomAction, row, userRole, actionContext);
  const isVerifyIomDisabled = isActionDisabled(verifyIomAction, row, userRole, actionContext);
  const isViewDisabled = isActionDisabled(viewAction, row, userRole, actionContext);
  const isVerifyGeneratedIomHidden = isActionDisabled(
    verifyGeneratedIomAction,
    row,
    userRole,
    actionContext
  );

  const isEditable = isEditableIom(row);

  const handleNavigateToGenerateIom = () => {
    confirm.onTrue();
    popover.onClose();
    router.push(
      generateRoleBasedRoute(
        userRole,
        isEditable ? 'iom-management/edit-iom' : 'iom-management/generate-iom',
        String(row?.id)
      )
    );
  };

  const renderCell = (col: ColumnDefinition) => {
    if (col.id === 'select') {
      return (
        <TableCell key={col.id} padding="checkbox">
          <Checkbox
            checked={selected}
            onChange={() => onSelectRow(String(row.id))}
          />
        </TableCell>
      );
    }

    if (col.id === 'statusLabel' || col.id === 'invoiceStatus' || col.id === 'invoice_status') {
      const value =
        col.id === 'statusLabel'
          ? row.statusLabel
          : (row[col.id as keyof IomTableRowItem] as string | undefined);

      return (
        <TableCell key={col.id} sx={{ minWidth: 250 }}>
          <Label
            variant="soft"
            color={getStatusColor(row.statusLabel) as any}
          >
            {value || '-'}
          </Label>
        </TableCell>
      );
    }

    if (col.id === 'action') {
      return (
        <TableCell key={col.id}>
          <Stack direction="row" alignItems="center">
            <Tooltip title="Action">
              <IconButton color={popover.open ? 'inherit' : 'default'} onClick={popover.onOpen}>
                <Iconify icon="eva:more-vertical-fill" />
              </IconButton>
            </Tooltip>
          </Stack>
        </TableCell>
      );
    }

    if (col.id === 'amt_collected') {
      const value = row[col.id as keyof IomTableRowItem];

      return (
        <TableCell key={col.id} sx={{ minWidth: 180 }}>
          <Typography noWrap variant="body2">
            {getDisplayValue(value as string)}
          </Typography>
        </TableCell>
      );
    }

    if (col.id === 'ageing') {
      const value = row[col.id as keyof IomTableRowItem];

      return (
        <TableCell key={col.id}>
          <Typography
            noWrap
            variant="body2"
            onClick={journeyDialog.onTrue}
            sx={{
              cursor: 'pointer',
              color: 'primary.main',
              textDecoration: 'underline',
              '&:hover': { color: 'primary.dark' },
            }}
          >
            {getDisplayValue(formatCellValue(col.id, value as string | number | boolean | null))}
          </Typography>
        </TableCell>
      );
    }

    const value = row[col.id as keyof IomTableRowItem];

    return (
      <TableCell key={col.id}>
        <Typography noWrap variant="body2">
          {getDisplayValue(formatCellValue(col.id, value as string | number | boolean | null))}
        </Typography>
      </TableCell>
    );
  };

  return (
    <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
      {visibleColumns.map((col) => renderCell(col))}

      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList>
          {generateIomAction && (
            <MenuItem
              disabled={isGenerateIomDisabled}
              onClick={() => {
                if (isGenerateIomDisabled) {
                  return;
                }
                handleNavigateToGenerateIom();
              }}
            >
              {getGenerateOrEditIomLabel(row, generateIomAction.label)}
            </MenuItem>
          )}

          {verifyGeneratedIomAction && !isVerifyGeneratedIomHidden && (
            <MenuItem onClick={handleNavigateToGenerateIom}>
              {verifyGeneratedIomAction.label ||
                uiText.internalOfficeMemo.actions.verifyGeneratedIOM}
            </MenuItem>
          )}

          {verifyIomAction && (
            <MenuItem
              disabled={isVerifyIomDisabled}
              onClick={() => {
                if (isVerifyIomDisabled) {
                  return;
                }
                confirm.onTrue();
                popover.onClose();
                router.push(
                  generateRoleBasedRoute(userRole, 'iom-management/verify-iom', String(row?.id))
                );
              }}
            >
              {verifyIomAction.label || uiText.internalOfficeMemo.actions.verifyIOM}
            </MenuItem>
          )}

          {viewAction && (
            <MenuItem
              disabled={isViewDisabled}
              onClick={() => {
                if (isViewDisabled) {
                  return;
                }
                confirm.onTrue();
                popover.onClose();
                router.push(generateRoleBasedRoute(userRole, 'iom-management/view', String(row?.id)));
              }}
            >
              {viewAction.label || uiText.internalOfficeMemo.actions.view}
            </MenuItem>
          )}

          {addLoyaltyPointsAction && (
            <MenuItem
              onClick={() => {
                confirm.onTrue();
                popover.onClose();
                router.push(generateRoleBasedRoute(userRole, 'iom-management/add-loyalty-points', String(row?.id)));
              }}
            >
              {addLoyaltyPointsAction.label || uiText.internalOfficeMemo.actions.addLoyaltyPoints}
            </MenuItem>
          )}

          {closeInvoiceAction && (
            <MenuItem
              onClick={() => {
                popover.onClose();
                router.push(
                  generateRoleBasedRoute(userRole, 'iom-management/close-invoice', String(row.id))
                );
              }}
            >
              {closeInvoiceAction.label || uiText.internalOfficeMemo.actions.closeInvoice}
            </MenuItem>
          )}
        </MenuList>
      </CustomPopover>

      <IomJourneyDialog
        open={journeyDialog.value}
        onClose={journeyDialog.onFalse}
        row={row}
      />
    </TableRow>
  );
}
