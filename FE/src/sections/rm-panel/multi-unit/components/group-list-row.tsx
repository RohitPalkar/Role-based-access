import { toast } from 'sonner';
import { useState } from 'react';

import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import { Box, Stack, Tooltip, MenuList, MenuItem, Typography, IconButton } from '@mui/material';

import { paths } from 'src/routes/paths';
import { useRouter, usePathname } from 'src/routes/hooks';

import { useAppDispatch } from 'src/hooks/use-redux';

import { MULTI_BOOKING_GROUP_STATUS } from 'src/utils/constant';

import { sendGroupLinkThunk } from 'src/redux/actions/rm-panel/multi-unit-actions';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { ShareFormDialog } from 'src/components/share-form-dialog';
import { usePopover, CustomPopover } from 'src/components/custom-popover';

import locale from '../../../../locales/langs/en/common.json';
import OfficeUseIcon from '../../../../../public/assets/icons/OfficeUse.svg';
import BookingFormIcon from '../../../../../public/assets/icons/BookingForm.svg';

type Props = Readonly<{
  row: {
    id: string;
    groupName: string;
    enqRefNo: string;
    primaryApplicant: string;
    noOfUnits: string;
    project: string;
    unitNo: string;
    amount: any;

    paymentMethod: string;
    status: string;
  };

  selected: boolean;

  columnVisibility?: Partial<Record<string, boolean>>;
  setIsPopupApiCall?: React.Dispatch<React.SetStateAction<boolean>>; //  Added
}>;

const STATUS_COLOR_MAP: Record<string, 'success' | 'info' | 'error' | 'default'> = {
  [MULTI_BOOKING_GROUP_STATUS.SIGNED]: 'success',
  [MULTI_BOOKING_GROUP_STATUS.PARTIALLY_SIGNED]: 'info',
  [MULTI_BOOKING_GROUP_STATUS.NOT_SIGNED]: 'error',
};

export function GroupListTableRow({
  row,
  selected,
  columnVisibility = {},
  setIsPopupApiCall,
}: Props) {
  const popover = usePopover();
  const pathname = usePathname();

  const menuItems = locale.muiltiBooking.actionMenu;
  const route = useRouter();
  const dispatch = useAppDispatch();
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [groupId, setGroupId] = useState('');
  const [emailLists, setEmailLists] = useState([]);

  const handleSendGroupLink = async () => {
    const payload = {
      id: groupId,
      emailIds: emailLists?.join(','),
    };
    try {
      const res = await dispatch(sendGroupLinkThunk(payload)).unwrap();
      if (res?.success) {
        toast.success('Group link sent successfully.');
        setShowShareDialog(false);
      }
      return res;
    } catch (error) {
      console.error('Failed to send group link:', error);
      toast.error(error || 'Failed to send group link.');
      return null; // ensures consistent return
    }
  };

  return (
    <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
      {/* project Name */}
      {columnVisibility?.groupName && (
        <TableCell>
          <Typography noWrap variant="body2">
            {row?.groupName || '-'}
          </Typography>
        </TableCell>
      )}

      {/* Unit Number */}
      {columnVisibility?.enqRefNo && (
        <TableCell>
          <Typography noWrap variant="body2">
            {row?.enqRefNo || '-'}
          </Typography>
        </TableCell>
      )}

      {/* Primary Applicant */}
      {columnVisibility?.primaryApplicant && (
        <TableCell>
          <Typography variant="body2" noWrap>
            {row?.primaryApplicant || '-'}
          </Typography>
        </TableCell>
      )}

      {/* Opportunity ID */}
      {columnVisibility?.noOfUnits && (
        <TableCell>
          <Typography variant="body2" noWrap>
            {row?.noOfUnits || '-'}
          </Typography>
        </TableCell>
      )}

      {/* Enquiry Ref. No. */}
      {columnVisibility?.project && (
        <TableCell>
          <Typography noWrap variant="body2">
            {row?.project || '-'}
          </Typography>
        </TableCell>
      )}

      {/* Booking Stage */}
      {columnVisibility?.unitNo && (
        <TableCell sx={{ minWidth: 180 }}>
          <Typography noWrap variant="body2">
            {row?.unitNo || '-'}
          </Typography>
        </TableCell>
      )}

      {/* Booking Stage */}
      {columnVisibility?.paymentMethod && (
        <TableCell sx={{ minWidth: 180 }}>
          <Typography noWrap variant="body2">
            {row?.paymentMethod || '-'}
          </Typography>
        </TableCell>
      )}
      {/* Status */}
      {columnVisibility?.status && (
        <TableCell sx={{ minWidth: 250 }}>
          <Label
            variant="soft"
            color={STATUS_COLOR_MAP[row?.status] || 'default'}
          >
            {row?.status || '-'}
          </Label>
        </TableCell>
      )}

      {columnVisibility?.Action && (
        <TableCell>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Tooltip title="View" placement="top" arrow>
              <IconButton
                color="default"
                onClick={() => {
                  if (!row?.id) {
                    toast.error('Invalid row data');
                    return;
                  }
                  route.push(paths.rm.groupList.edit(row?.id?.toString()));
                }}
              >
                <Iconify icon="tabler:eye" />
              </IconButton>
            </Tooltip>

            {/* Edit Button */}
            <Tooltip title="Action">
              <IconButton color={popover.open ? 'inherit' : 'default'} onClick={popover.onOpen}>
                <Iconify icon="eva:more-vertical-fill" />
              </IconButton>
            </Tooltip>
          </Stack>
        </TableCell>
      )}

      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList>
          <MenuItem
            onClick={() => {
              setGroupId(row?.id);
              popover.onClose();
              setShowShareDialog(true);
            }}
          >
            <Box
              component="img"
              src={BookingFormIcon}
              alt={menuItems.sendLink}
              sx={{ width: 20, height: 20, mr: 0.1 }}
            />
            {menuItems.sendLink}
          </MenuItem>

          <MenuItem
            onClick={() => {
              window.location.href = `${window.location.origin}${pathname}/edit-multi-unit/${row?.id}`;
            }}
          >
            <Box
              component="img"
              src={OfficeUseIcon}
              alt={menuItems.editgroup}
              sx={{ width: 20, height: 20, mr: 0.1 }}
            />
            {menuItems.editgroup}
          </MenuItem>
        </MenuList>
      </CustomPopover>
      <ShareFormDialog
        open={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        opportunityId={groupId || ''}
        formType="booking"
        title="Share"
        isGroupShare
        setEmailLists={setEmailLists}
        handleSend={handleSendGroupLink}
      />
    </TableRow>
  );
}
