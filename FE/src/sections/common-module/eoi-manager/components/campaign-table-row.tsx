import type { EOICampaign } from 'src/services/admin-services/eoi-manager-services';

import { toast } from 'sonner';
import { useState } from 'react';

import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { Box , Chip ,
  Stack,
  Avatar,
  Button,
  Tooltip,
  MenuList,
  MenuItem,
  Typography,
  IconButton,
  CircularProgress,
} from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { useBoolean } from 'src/hooks/use-boolean';
import { useAppDispatch } from 'src/hooks/use-redux';

import { formatArrayToCommaString } from 'src/utils/helper';
import { generateRoleBasedRoute, CAMPAIGN_LIST_STATUS_OPTIONS } from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';
import { pushLeadsToSFDCAction, downloadExportVouchersReports } from 'src/redux/actions/admin/eoi-manager-actions';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { usePopover, CustomPopover } from 'src/components/custom-popover';

import Edit from '../../../../../public/assets/icons/pen-shape.svg';

type Props = Readonly<{
  row: EOICampaign;
  selected: boolean;
  columnVisibility?: Partial<Record<string, boolean>>;
  roleActions: any;
  userRole: any;
}>;

type SFDCActionType = 'convert' | 'create' | null;

export function CampaignTableRow({
  row,
  selected,
  columnVisibility = {},
  roleActions,
  userRole,
}: Props) {
  const confirm = useBoolean();
  const dispatch = useAppDispatch();
  const popover = usePopover();
  const router = useRouter();
  const [dataPushConfirmDialog, setDataPushConfirmDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sfdcActionType, setSfdcActionType] = useState<SFDCActionType>(null);
  const isPushToSFDCDisabled = row?.pushToSfdc === false && !row?.sfdcProjectName;
  const confirmDialogText =
  sfdcActionType === 'convert'
    ? uiText.campaignListing.convertConfirmDialog
    : uiText.campaignListing.createConfirmDialog;

  const handleExport = async (id: any) => {
    const payload: Record<string, any> = {
      ...(id ? { campaignId: id } : {}),
    };
    dispatch(downloadExportVouchersReports(payload));
  };

  const editAction = roleActions?.find((i: any) => i?.id === 'edit');
  const exportAction = roleActions?.find((i: any) => i?.id === 'export');
  const convertLeadsOnSFDCAction = roleActions?.find((i: any) => i?.id === 'convertLeadsOnSFDC');
  const createLeadsOnSFDCAction = roleActions?.find((i: any) => i?.id === 'createLeadsOnSFDC');

  const handlePushLeadsToSFDC = async () => {
    if (!row?.id || !sfdcActionType) return;

    const payload: { campaignId: number; pushConverted?: boolean } = {
      campaignId: row?.id,
    };

    if (sfdcActionType === 'convert') {
      payload.pushConverted = true;
    }

    try {
      setLoading(true);
      const res = await dispatch(pushLeadsToSFDCAction(payload)).unwrap();

      toast.success(res?.message || 'SFDC Lead Push Job initiated successfully');
      setDataPushConfirmDialog(false);
    } catch (error: any) {
      toast.error(error || 'Failed to push leads to SFDC');
    } finally {
      setLoading(false);
    }
  };

 
  const getStatusColor = (status?: string) => {
    if (!status) return 'default';
    if (
      status === CAMPAIGN_LIST_STATUS_OPTIONS.ACTIVE_EOI ||
      status === CAMPAIGN_LIST_STATUS_OPTIONS.ACTIVE_VOUCHER ||
      status === CAMPAIGN_LIST_STATUS_OPTIONS.ACTIVE_VOUCHER_AND_EOI
    ) {
      return 'success';
    }
    if (
      status === CAMPAIGN_LIST_STATUS_OPTIONS.INACTIVE_EOI ||
      status === CAMPAIGN_LIST_STATUS_OPTIONS.INACTIVE_VOUCHER ||
      status === CAMPAIGN_LIST_STATUS_OPTIONS.CANCELLED_AND_REFUNDED ||
      status === CAMPAIGN_LIST_STATUS_OPTIONS.INACTIVE_VOUCHER_AND_EOI
    ) {
      return 'error';
    }
    if (status === CAMPAIGN_LIST_STATUS_OPTIONS.PROJECT_LAUNCHED) {
      return 'secondary';
    }
    return 'default';
  };

  return (
    <>
    <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
      {/* Project Name */}
      {columnVisibility?.campaignName && (
        <TableCell>
          <Typography noWrap variant="body2">
            {row?.campaignName}
          </Typography>
        </TableCell>
      )}

      {/* Unit Number */}
      {columnVisibility?.city && (
        <TableCell>
          <Typography noWrap variant="body2">
            {row?.city}
          </Typography>
        </TableCell>
      )}

      {/* Opportunity Details */}
      {/* Opportunity Name */}
      {columnVisibility?.phaseLabel && (
        <TableCell>
          <Typography variant="body2" noWrap>
         {formatArrayToCommaString(row?.phaseLabel)}
          </Typography>
        </TableCell>
      )}

      {/* Opportunity ID */}
      {columnVisibility?.countCollected && (
        <TableCell>
          <Typography variant="body2" noWrap>
            {row?.countCollected || '-'}
          </Typography>
        </TableCell>
      )}

      {/* Enquiry Ref. No. */}
      {columnVisibility?.startDate && (
        <TableCell>
          <Typography noWrap variant="body2">
            {row?.startDate}
          </Typography>
        </TableCell>
      )}

      {/* Booking Stage */}
      {columnVisibility?.endDate && (
        <TableCell sx={{ minWidth: 180 }}>
          <Typography noWrap variant="body2">
            {row?.endDate}
          </Typography>
        </TableCell>
      )}

      {/* Status */}
      {columnVisibility?.status && (
        <TableCell sx={{ minWidth: 250 }}>
          <Label
            variant="soft"
            color={getStatusColor(row?.status)}
          >
            {row?.status}
          </Label>
        </TableCell>
      )}

      {/* Signature Status */}
      {columnVisibility?.['Signature Status'] && (
        <TableCell>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              variant="soft"
              clickable
              label="TL"
              avatar={
                <Avatar alt="TL" sx={{ bgcolor: 'success.main' }}>
                  <Iconify icon="eva:checkmark-outline" width={12} />
                </Avatar>
              }
              color="success"
              size="small"
            />
            <Chip
              variant="soft"
              clickable
              label="RSH"
              avatar={
                <Avatar alt="RSH" sx={{ bgcolor: 'success.main' }}>
                  <Iconify icon="eva:checkmark-outline" width={12} />
                </Avatar>
              }
              color="warning"
              size="small"
            />{' '}
            <Chip
              variant="soft"
              clickable
              label="BH"
              avatar={
                <Avatar alt="BH" sx={{ bgcolor: 'success.main' }}>
                  <Iconify icon="eva:checkmark-outline" width={12} />
                </Avatar>
              }
              color="warning"
              size="small"
            />
          </Stack>
        </TableCell>
      )}

      {/* Action */}
      {columnVisibility?.Action && (
        <TableCell>
          <Stack direction="row" alignItems="center">
            <Tooltip title="Action">
              <IconButton color={popover.open ? 'inherit' : 'default'} onClick={popover.onOpen}>
                <Iconify icon="eva:more-vertical-fill" />
              </IconButton>
            </Tooltip>
          </Stack>
          {/* Reset Confirmation Dialog */}
        </TableCell>
      )}
      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList>
          {editAction && (
            <MenuItem
              onClick={() => {
                confirm.onTrue();
                popover.onClose();
                router.push(generateRoleBasedRoute(userRole, 'eoi-manager/edit', String(row?.id)));
              }}
            >
              <img src={Edit} style={{ height: '20px', width: '20px' }} alt="edit" />
              {editAction?.label || uiText.campaignListing.actionsLabel.edit}
            </MenuItem>
          )}

          {exportAction && (
            <MenuItem
              onClick={() => {
                handleExport(row?.id);
                confirm.onTrue();
                popover.onClose();
              }}
            >
              <Iconify icon="solar:export-bold" />
              {exportAction?.label || uiText.campaignListing.actionsLabel.importExport}
            </MenuItem>
          )}

          {createLeadsOnSFDCAction && (
            <MenuItem
              disabled={isPushToSFDCDisabled}
              onClick={() => {
                setSfdcActionType('create');
                setDataPushConfirmDialog(true);
                confirm.onTrue();
                popover.onClose();
              }}
            >
              <CloudUploadIcon fontSize="small" />
              {createLeadsOnSFDCAction?.label || uiText.campaignListing.actionsLabel.createLeadsOnSFDC}
            </MenuItem>
          )}

          {convertLeadsOnSFDCAction && (
            <MenuItem
              disabled={isPushToSFDCDisabled}
              onClick={() => {
                setSfdcActionType('convert');
                setDataPushConfirmDialog(true);
                confirm.onTrue();
                popover.onClose();
              }}
            >
              <CloudSyncIcon fontSize="small" />
              {convertLeadsOnSFDCAction?.label || uiText.campaignListing.actionsLabel.convertLeadsOnSFDC}
            </MenuItem>
          )}
        </MenuList>
      </CustomPopover>
    </TableRow>
    <ConfirmDialog
      open={dataPushConfirmDialog}
      showCancel
      cancelLabel={uiText.button.cancel}
      showDivider
      onClose={() => {
        setDataPushConfirmDialog(false);
        setSfdcActionType(null);
      }}
      title={confirmDialogText.title}
      leftAlignTitle
      content={
        <Box sx={{ textAlign: 'left' }}>
          <Typography sx={{ fontSize: '14px', fontWeight: 400 }}>
            {confirmDialogText.desc1}
          </Typography>
          <Typography sx={{ fontSize: '14px', fontWeight: 400}}>
            {confirmDialogText.desc2}
          </Typography>
        </Box>
      }
      action={
        <Button
          variant="contained"
          color="error"
          sx={{
            fontSize: '15px',
            fontWeight: '600',
            color: '#fff',
            background: '#1A407D',
            minWidth: { xs: '120px', lg: '204px' },
            height: '48px',
            '&:hover': { background: '#1A407D', boxShadow: 'none' },
          }}
          disabled={loading}
          onClick={handlePushLeadsToSFDC}
        >
        {loading ? (
          <CircularProgress size={24} sx={{ color: '#fff' }} />
        ) : (
          uiText.button.confirm
        )}
        </Button>
      }
      />
    </>
  );
}
