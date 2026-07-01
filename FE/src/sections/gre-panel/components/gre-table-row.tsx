/* eslint-disable @typescript-eslint/no-unused-vars */
import type { FormFilledStatusEnum} from 'src/utils/constant';

import dayjs from 'dayjs';

import { AddCircle } from '@mui/icons-material';
import InfoIcon from '@mui/icons-material/Info';
import {
  Box,
  Stack,
  Tooltip,
  TableRow,
  MenuItem,
  TableCell,
  Typography,
  IconButton,
} from '@mui/material';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { STATUS_COLORS } from 'src/utils/constant';

import { Label } from 'src/components/label';
import { usePopover } from 'src/components/custom-popover';

import PenShapeIcon from '../../../../public/assets/icons/pen-shape.svg';

type Props = Readonly<{
  row: Record<string, any>;
  selected: boolean;
  columnVisibility?: Record<string, boolean>;
  onCopyLink?: (row: any) => void;
  onResendLink?: (row: any) => void;
  onDownloadPdf?: (row: any) => void;
  handleOpenPopup: (type: 'GRE' | 'CX' | null, id: string, projectName: string) => void;
}>;

function exitTime(time?: string | null): string {
  if (!time) return '-';
  
  const parsed = dayjs(time);

  if (!parsed.isValid()) return '-';

  return parsed.format('hh:mm A');
}

export function GRETableRow({
  row,
  selected,
  columnVisibility = {},
  onCopyLink,
  onResendLink,
  onDownloadPdf,
  handleOpenPopup,
}: Props) {
  const popover = usePopover();
  const router = useRouter();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleCopyLink = () => {
    if (row.link) onCopyLink?.(row);
    popover.onClose();
  };

  const handleResendLink = () => {
    if (row.link) onResendLink?.(row);
    popover.onClose();
  };

  const handleDownloadPdf = () => {
    if (row.pdfUrl) onDownloadPdf?.(row);
    popover.onClose();
  };

  const handleEdit = () => {
    if (row?.enquiryId) {
      router.push(paths.gre.dashboard.edit(row?.enquiryId.toString()));
    }
  };

  return (
    <TableRow hover selected={selected} tabIndex={-1}>
      {Object.keys(columnVisibility).map((key) => {
        if (!columnVisibility?.[key]) return null;

        if (key === 'Action') {
          return (
            <TableCell key={key}>
              <Stack direction="row">
                <MenuItem onClick={handleEdit}>
                  <Box
                    component="img"
                    src={PenShapeIcon}
                    alt="Edit Form"
                    sx={{ width: 20, height: 20, mr: 1 }}
                  />
                </MenuItem>
              </Stack>
            </TableCell>
          );
        }

        if (key === 'svDate') {
          const formattedDateTime = row?.Time_of_Visit
            ? new Date(row.Time_of_Visit).toLocaleString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true, // 12-hour format with AM/PM
              })
            : '';
          const formattedDateTimeDashed = formattedDateTime.replaceAll(/\//g, '-').replace(',', '');

          return (
            <TableCell key={key}>
              <Stack direction="row">
                <Typography variant="body2" noWrap>
                  {formattedDateTimeDashed}
                </Typography>
              </Stack>
            </TableCell>
          );
        }

        if (key === 'cxFields') {
          return (
            <TableCell key={key}>
              <Stack direction="row" spacing={1} alignItems="center">
                <AddCircle
                  color="disabled"
                  onClick={() =>
                    handleOpenPopup('CX', row?.Enquiry_Ref_No, row?.Project_Interested)
                  }
                  sx={{ cursor: 'pointer' }}
                />
                <Typography variant="body2">
                  {row?.rmCounts}
                </Typography>
              </Stack>
            </TableCell>
          );
        }

        if (key === 'greRMFields') {
          return (
            <TableCell key={key}>
              <Stack direction="row" spacing={1} alignItems="center">
                <AddCircle
                  color="disabled"
                  onClick={() =>
                    handleOpenPopup('GRE', row?.Enquiry_Ref_No, row?.Project_Interested)
                  }
                  sx={{ cursor: 'pointer' }}
                />
                <Typography variant="body2">
                  {row?.greCounts}
                </Typography>
              </Stack>
            </TableCell>
          );
        }

        if (key === 'outTime') {
          return (
            <TableCell key={key}>
              <Stack direction="row">
                <Typography variant="body2" noWrap>
                  {exitTime(row?.Exit_Time)}
                </Typography>
              </Stack>
            </TableCell>
          );
        }

        if (key === 'formStatus') {
          // Define colors based on payment status
  const getPaymentStatusColor = (status: string) => {
    // Normalize status to match enum values
    const normalizedStatus = status as FormFilledStatusEnum;
    return STATUS_COLORS.GRE_FORM_STATUS[normalizedStatus] || 'default';
  };

          const statusComponent = (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Label variant="soft" color={getPaymentStatusColor(row?.formFilledStatus)}>
                {row?.formFilledStatus || 'pending'}
              </Label>
              {row?.paymentStatusMessage && (
                <Tooltip title={row.paymentStatusMessage} arrow>
                  <IconButton size="small" sx={{ ml: 0.5 }}>
                    <InfoIcon sx={{ fontSize: '16px' }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          );

          return <TableCell key={key}>{statusComponent}</TableCell>;
        }

        return (
          <TableCell key={key}>
            <Typography variant="body2" noWrap>
              {row[key] ?? '-'}
            </Typography>
          </TableCell>
        );
      })}
    </TableRow>
  );
}