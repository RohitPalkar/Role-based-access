import type { EOIDashboardCampaign } from 'src/services/admin-services/eoi-dashboard-service';

import React from 'react';

import { Box, Button, Tooltip, TableRow, TableCell, Typography, IconButton } from '@mui/material';

import { convertNumberToShortForm } from 'src/utils/helper';
import { EOIFormStatus, EOIFinanceStatus, EOIPaymentStatus } from 'src/utils/constant';

import { Iconify } from 'src/components/iconify';
import { usePopover, CustomPopover } from 'src/components/custom-popover';

type Props = {
  row: EOIDashboardCampaign;
  isDefaultView: boolean;
  columnVisibility?: Partial<Record<string, boolean>>;
  setListFilters?: React.Dispatch<React.SetStateAction<any>>;
  onModalOpen?: () => void;
};

export const DashboardCellButton = ({
  disabled,
  tooltip = 'No records found',
  onClick,
  children,
}: {
  disabled: boolean;
  tooltip?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) => {
  const button = (
    <Button
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onClick?.();
      }}
    >
      <Typography noWrap variant="body2">
        {children}
      </Typography>
    </Button>
  );

  // Tooltip only when disabled
  if (disabled) {
    return (
      <Tooltip title={tooltip} placement="top">
        <span>{button}</span>
      </Tooltip>
    );
  }

  return button;
};

const EOIDashboardTableRow = ({
  row,
  isDefaultView,
  columnVisibility = {},
  setListFilters,
  onModalOpen,
}: Props) => {
  const popover = usePopover();

  const isClickable = (value?: number) => typeof value === 'number' && value > 0;

  const handleFilterUpdate = (filterOverrides: any) => {
    if (onModalOpen) {
      onModalOpen();
    }
    if (setListFilters) {
      setListFilters((prev: any) => ({
        ...prev,
        campaignId: row?.campaignId,
        primarySource: '',
        leadStatus: '',
        formStatus: '',
        paymentStatus: '',
        financeStatus: '',
        sortBy: '',
        deletionStatus: '',
        rmPending: '',
        queueIdAllotted: '',
        eoiCollected: '',
        totalEoiAmount: '',
        isEoiDashboard: true,
        crmPending: '',
        misPending: '',
        eoiCollectedPartiallyPaid: '',
        totalEoiAmountCollected: '',
        ...filterOverrides,
      }));
    }
  };

  const renderCell = (
    key: string,
    label: React.ReactNode,
    value: number | undefined,
    filterOverrides: any
  ) => {
    if (!columnVisibility?.[key]) return null;

    return (
      <TableCell key={key}>
        <DashboardCellButton
          disabled={!isClickable(value)}
          onClick={() => handleFilterUpdate(filterOverrides)}
        >
          {label}
        </DashboardCellButton>
      </TableCell>
    );
  };

  const commonColumns = [
    {
      key: 'campaign',
      label: row?.campaign || '-',
      value: row?.campaignId,
      filter: {},
    },
    {
      key: 'collectedEoiCount',
      label: row?.collectedEoiCount || '-',
      value: row?.collectedEoiCount,
      filter: { eoiCollected: true },
    },
    {
      key: 'paidEoiCollectedCounts',
      label: row?.paidEoiCollectedCounts || '-',
      value: row?.paidEoiCollectedCounts,
      filter: {    
            formStatus: Object.values(EOIFormStatus).filter(
          (status) =>
            ![
              EOIFormStatus.CREATED,
              EOIFormStatus.CANCELLED_NOT_REALISED,
              EOIFormStatus.CANCELLED,
            ].includes(status)
        ), paymentStatus: [EOIPaymentStatus.PAID] },
    },
    {
      key: 'partiallyPaidEoiCollectedCounts',
      label: row?.partiallyPaidEoiCollectedCounts || '-',
      value: row?.partiallyPaidEoiCollectedCounts,
      filter: {eoiCollectedPartiallyPaid: true },
    },
    {
      key: 'inProgressEoiCount',
      label: row?.inProgressEoiCount || '-',
      value: row?.inProgressEoiCount,
      filter: {
        formStatus: [EOIFormStatus.IN_PROGRESS],
        paymentStatus: [EOIPaymentStatus.PENDING, EOIPaymentStatus.REFUNDED],
      },
    },
    {
      key: 'totalEoiAmount',
      label: row?.totalEoiAmount ? `₹ ${convertNumberToShortForm(row?.totalEoiAmount)}` : '-',
      value: row?.totalEoiAmount,
      filter: { totalEoiAmount: true },
    },
    {
      key: 'totalEoiAmountCollected',
      label: row?.totalEoiAmountCollected
        ? `₹ ${convertNumberToShortForm(row?.totalEoiAmountCollected)}`
        : '-',
      value: row?.totalEoiAmountCollected,
      filter: {totalEoiAmountCollected: true },
    },
  ];

  const defaultViewColumns = [
    {
      key: 'allotedIdCount',
      label: row?.allotedIdCount || '-',
      value: row?.allotedIdCount,
      filter: { queueIdAllotted: true },
    },
    {
      key: 'activeEoiCount',
      label: row?.activeEoiCount || '-',
      value: row?.activeEoiCount,
      filter: { formStatus: [EOIFormStatus.ACTIVE] },
    },
    {
      key: 'pendingMISCount',
      label: row?.pendingMISCount || '-',
      value: row?.pendingMISCount,
      filter: { misPending: true },
    },
    {
      key: 'pendingCRMCount',
      label: row?.pendingCRMCount || '-',
      value: row?.pendingCRMCount,
      filter: { crmPending: true },
    },
    {
      key: 'pendingFINCount',
      label: row?.pendingFINCount || '-',
      value: row?.pendingFINCount,
        filter: {
          formStatus: [EOIFormStatus.MIS_VERIFIED],
          paymentStatus: [EOIPaymentStatus.PAID],
          financeStatus: [EOIFinanceStatus.UNVERIFIED],
      },
    },
    {
      key: 'pendingRMCount',
      label: row?.pendingRMCount || '-',
      value: row?.pendingRMCount,
      filter: { rmPending: true },
    },
  ];

  return (
    <TableRow hover tabIndex={-1}>
      {/* Campaign - Common for both views */}
      {commonColumns.map((col) => renderCell(col.key, col.label, col.value, col.filter))}

      {/* Default View Columns */}
      {isDefaultView && (
        <>
          {defaultViewColumns.map((col) => renderCell(col.key, col.label, col.value, col.filter))}

          {columnVisibility?.cancellationCount && (
            <TableCell>
              {row?.cancellationCount?.totalCount ? (
                <Typography noWrap variant="body2">
                  {row?.cancellationCount?.totalCount}

                  <Tooltip title="Status">
                    <IconButton
                      color={popover.open ? 'inherit' : 'default'}
                      onClick={popover.onOpen}
                      sx={{
                        p: 0,
                      }}
                    >
                      <Iconify icon="eva:chevron-down-fill" />
                    </IconButton>
                  </Tooltip>
                </Typography>
              ) : (
                '-'
              )}
            </TableCell>
          )}
        </>
      )}

      {/* Source Wise View Columns */}
      {!isDefaultView && (
        <>
          {['channelPartner', 'loyalty', 'purvaChampion', 'direct', 'digital'].map((key) => {
            if (!columnVisibility?.[key]) return null;
            const value = (row as any)?.[key];
            return (
              <TableCell key={key}>
                <Tooltip title={value || '-'}>
                  <Typography noWrap variant="body2">
                    {value || '-'}
                  </Typography>
                </Tooltip>
              </TableCell>
            );
          })}
        </>
      )}

      <CustomPopover
        open={popover.open}
        onClose={popover.onClose}
        anchorEl={popover.anchorEl}
        slotProps={{ arrow: { placement: 'top-right' } }}
      >
        <Box
          sx={{
            py: 2,
            px: 1.5,
            width: 201,
            height: 138,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {[
            {
              label: 'Processed',
              value: row?.cancellationCount?.processed || 0,
              formStatus: [EOIFormStatus.CANCELLED], // 19
            },
            {
              label: 'In Progress',
              value: row?.cancellationCount?.inProgress || 0,
              formStatus: [
                EOIFormStatus.CANCEL_ACCEPTED, // 16
                EOIFormStatus.CANCEL_APPROVED, // 17
                EOIFormStatus.REFUND_INITIATED, // 18
              ],
            },
            {
              label: 'Requested',
              value: row?.cancellationCount?.requested || 0,
              formStatus: [EOIFormStatus.CANCEL_REQUESTED], // 15
            },
          ].map((item) => (
            <Button
              key={item?.label}
              onClick={() => handleFilterUpdate({ formStatus: item.formStatus })}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                <Typography variant="body2" fontWeight="bold">
                  {item.label}
                </Typography>
                <Typography variant="body2">{item.value}</Typography>
              </Box>
            </Button>
          ))}
        </Box>
      </CustomPopover>
    </TableRow>
  );
};

export default EOIDashboardTableRow;
