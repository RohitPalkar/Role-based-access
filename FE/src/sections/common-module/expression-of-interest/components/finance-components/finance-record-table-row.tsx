import type { FinanceRecordTableItem } from 'src/types/finance-admin/eoi-finance-record-details';

import dayjs from 'dayjs';
import { useParams } from 'react-router-dom';
import React, { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import {  MenuList , MenuItem } from '@mui/material';

import { useAppDispatch } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { ROLES, STATUS_COLORS, EOIPaymentMode, EOIFinanceStatus } from 'src/utils/constant';

import { CONFIG } from 'src/config-global';
import { uploadReceipt, updateTransactionAction, fetchTransactionsListAction } from 'src/redux/actions/rm-panel/eoi-finance-actions';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { usePopover, CustomPopover } from 'src/components/custom-popover';

import DocumentViewModal from './document-view-modal';
import UploadReceiptDialog from './upload-receipt-dialog-box';
import { TransactionRemarksDialog } from './transaction-remark-dialog';

// ----------------------------------------------------------------------

type Props = Readonly<{
  row: FinanceRecordTableItem;
  selected: boolean;
  editHref: string;
  columnVisibility?: Record<string, boolean>;
  currentPage?: number;
  rowsPerPage?: number;
}>;

interface BankStmtPopup {
  open: boolean;
  fileURL: string | null;
  documentName: string;
  title: string;
}

export function FinanceRecordTableRow({ 
  row, 
  selected, 
  editHref, 
  columnVisibility = {},
  currentPage = 0,
  rowsPerPage = 10
}: Props) {
  const dispatch = useAppDispatch();
  const popover = usePopover();
  const { id } = useParams<{ id: string }>();
  const [remarkDialog, setRemarkDialog] = useState<{
    open: boolean;
    id: number | null;
    reason: { realisationDate?: string; receiptNo?: number; comments?: string };
    action: EOIFinanceStatus.VERIFIED | EOIFinanceStatus.REVERSED | EOIFinanceStatus.REJECTED;
  }>({
    open: false,
    id: null,
    reason: {},
    action: EOIFinanceStatus.VERIFIED,
  });

  const [bankStmtPopup, setBankStmtPopup] = React.useState<BankStmtPopup>({
    open: false,
    fileURL: null, 
    documentName: '',
    title: '',
  });
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadModal, setUploadModal] = useState(false);
  const { userRole } = useRoleBasedPermissions({ module: 'financeRecordDetails' });

  const setRemark = useCallback(
    (val: { realisationDate?: string; receiptNo?: number; comments?: string; }) =>
      setRemarkDialog((prev) => ({ ...prev, reason: { ...prev.reason, ...val } })),
    [],
  )

  // Early return if row is null or undefined
  if (!row?.id) {
    console.warn('FinanceRecordTableRow: Invalid row data', row);
    return null;
  }

  const isColumnVisible = (columnId: string) => {
    if (!columnVisibility || typeof columnVisibility !== 'object') {
      return true;
    }
    return columnVisibility[columnId] !== false;
  };

  // Get status color using FINANCE_STATUS enum
  const getPaymentStatusColor = (status: string) => {
    // Normalize status to match enum values
    const normalizedStatus = status as EOIFinanceStatus;
    return STATUS_COLORS.FINANCE_STATUS[normalizedStatus] || 'default';
  };

  // Determine which actions are allowed based on status and conditions
const getAvailableActions = (
  status: string,
  realisationDate?: string,
  paymentMode?: string
) => {
  const currentStatus = status as EOIFinanceStatus;

  // REJECTED or REFUNDED → no actions
  if ([EOIFinanceStatus.REJECTED, EOIFinanceStatus.REFUNDED].includes(currentStatus)) {
    return [EOIFinanceStatus.REJECTED];
  }

  // VERIFIED cases
  if (currentStatus === EOIFinanceStatus.VERIFIED) {
    if (realisationDate) {
      return [EOIFinanceStatus.VERIFIED]; // can view and update realization details
    }
    if (paymentMode === EOIPaymentMode.GATEWAY) {
      return [EOIFinanceStatus.VERIFIED, EOIFinanceStatus.REVERSED]; // special gateway case
    }
    return [EOIFinanceStatus.VERIFIED, EOIFinanceStatus.REVERSED]; // default verified (not realised, non-gateway)
  }

  // REVERSED → only verify
  if (currentStatus === EOIFinanceStatus.REVERSED) {
    return [EOIFinanceStatus.VERIFIED];
  }

  // Default (e.g. UNVERIFIED, PENDING) → all actions
  return [EOIFinanceStatus.VERIFIED, EOIFinanceStatus.REVERSED, EOIFinanceStatus.REJECTED];
};

const isCRM = userRole === ROLES.CRM;
const isRealized = row?.status === EOIFinanceStatus.VERIFIED;
const disableCRMAction = isCRM && !isRealized;

const availableActions = isCRM
  ? ['UPLOAD_RECEIPT']
  : getAvailableActions(row?.status, row?.realisationDate, row?.paymentMode);

  const handleRemarkSubmit = async (reason: {
    realisationDate?: string;
    receiptNo?: number;
    comments?: string;
  }) => {
    if (!remarkDialog.id) return;

    try {
      let targetStatus: EOIFinanceStatus = EOIFinanceStatus.REJECTED;
      if (remarkDialog.action === EOIFinanceStatus.VERIFIED) {
        targetStatus = EOIFinanceStatus.VERIFIED;
      } else if (remarkDialog.action === EOIFinanceStatus.REVERSED) {
        targetStatus = EOIFinanceStatus.REVERSED;
      }

      // Prepare payload based on action
      const payload = {
        comments: reason.comments || '',
        status: targetStatus,
        ...(remarkDialog.action === EOIFinanceStatus.VERIFIED && {
          realisationDate: reason?.realisationDate || '',
          receiptNo: reason?.receiptNo?.toString() || '',
        }),
      } as const;

      // Call the update API
      await dispatch(
        updateTransactionAction({
          transactionId: remarkDialog.id,
          payload,
        })
      ).unwrap();

      // Refresh the transactions list after successful update
      if (id) {
        dispatch(fetchTransactionsListAction({
          id,
          params: {
            page: currentPage + 1, // API is 1-based, table is 0-based
            limit: rowsPerPage,
          }
        }));
      }

      // Close dialog
      setRemarkDialog({ open: false, id: null, reason: {}, action: EOIFinanceStatus.VERIFIED });
    } catch (error) {
      console.error(error);
      // Error is already handled by the action (toast shown)
    }
  };

  const handleUploadReceipt = async (values: { receiptImage: string }) => {
    try {
      setUploadLoading(true);
      const res = await dispatch(
        uploadReceipt({
          id: row.id,
          payload: {
            receiptImage: values.receiptImage,
          },
        })
      ).unwrap();

      const message = res?.response?.message || 'Receipt uploaded successfully';
      toast.success(message);

      if (id) {
        dispatch(
          fetchTransactionsListAction({
            id,
            params: {
              page: currentPage + 1,
              limit: rowsPerPage,
            },
          })
        );
      }
      setUploadModal(false);
    } catch (error: any) {
      toast.error(error || 'Upload failed');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleOpenBankStatementModal = (url: string, name: string, title: string) => {
    setBankStmtPopup({ open: true, fileURL: url, documentName: name, title });
  };

  const handleCloseViewer = () => {
    setBankStmtPopup({ open: false, fileURL: null, documentName: '', title: '' });
  };

  return (
    <>
    <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
      {isColumnVisible('srNo') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row?.srNo || '-'}</TableCell>
      )}

      {isColumnVisible('paymentMode') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row?.paymentMode || '-'}</TableCell>
      )}

      {isColumnVisible('date') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {row?.date ? dayjs(row?.date).format('DD-MM-YYYY') : '-'}
        </TableCell>
      )}

      {isColumnVisible('transactionId') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row?.transactionId || '-'}</TableCell>
      )}

      {isColumnVisible('amount') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row?.paidAmount || '-'}</TableCell>
      )}

      {isColumnVisible('realisationDate') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {row?.realisationDate ? dayjs(row?.realisationDate).format('DD-MM-YYYY') : '-'}
        </TableCell>
      )}

      {isColumnVisible('receiptNo') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row?.receiptNo || '-'}</TableCell>
      )}

      {isColumnVisible('comments') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row?.comments || '-'}</TableCell>
      )}

      {isColumnVisible('paymentProof') && (
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {row?.paymentProof?.length ? (
              <Tooltip title="View Payment Proof" placement="top" arrow>
                <IconButton
                  onClick={() =>
                    handleOpenBankStatementModal(
                      `${CONFIG.site.s3BasePath}/${row?.paymentProof?.[0]}`,
                      (typeof row?.paymentProof?.[0] === 'string'
                        ? row.paymentProof[0].split('/').pop()
                        : undefined) || 'Payment Proof',
                        'Payment Proof Preview'
                    )
                  }
                >
                  <Iconify icon="eva:file-text-outline" />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Payment Proof Not Available" placement="top" arrow>
                <span>
                  <IconButton disabled>
                    <Iconify icon="eva:file-text-outline" />
                  </IconButton>
                </span>
              </Tooltip>

            )}
          </Box>
        </TableCell>
      )}

      {isColumnVisible('chequeDepositSlip') && (
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {row?.chequeDepositSlip?.length ? (
              <Tooltip title="View Cheque deposit Slip" placement="top" arrow>
                <IconButton
                  onClick={() =>
                    handleOpenBankStatementModal(
                      `${CONFIG.site.s3BasePath}/${row?.chequeDepositSlip?.[0]}`,
                      (typeof row?.chequeDepositSlip?.[0] === 'string'
                        ? row.chequeDepositSlip[0].split('/').pop()
                        : undefined) || 'Cheque Deposit Slip',
                        'Cheque Deposit Slip Preview'
                    )
                  }
                >
                  <Iconify icon="eva:file-text-outline" />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Cheque deposit Slip Not Available" placement="top" arrow>
                <span>
                  <IconButton disabled>
                    <Iconify icon="eva:file-text-outline" />
                  </IconButton>
                </span>
              </Tooltip>

            )}
          </Box>
        </TableCell>
      )}

      {isColumnVisible('receiptImage') && (
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {row?.receiptImage ? (
              <Tooltip title="View Receipt" placement="top" arrow>
                <IconButton
                  onClick={() =>
                    handleOpenBankStatementModal(
                      `${CONFIG.site.s3BasePath}/${row?.receiptImage}`,
                      typeof row?.receiptImage === 'string'
                        ? row.receiptImage.split('/').pop() || 'Receipt'
                        : 'Receipt',
                        'Receipt Preview'
                    )
                  }
                >
                  <Iconify icon="eva:file-text-outline" />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Receipt Not Available" placement="top" arrow>
                <span>
                  <IconButton disabled>
                    <Iconify icon="eva:file-text-outline" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Box>
        </TableCell>
      )}

      {isColumnVisible('status') && (
        <TableCell>
          <Label variant="soft" color={getPaymentStatusColor(row?.status || 'Unknown')}>
            {row?.status || 'Unknown'}
          </Label>
        </TableCell>
      )}

      {isColumnVisible('Action') && (
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {availableActions.length > 0 ? (
              <Tooltip title="Action" placement="top" arrow>
                <IconButton color={popover.open ? 'inherit' : 'default'} onClick={popover.onOpen}>
                  <Iconify icon="eva:more-vertical-fill" />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="No actions available" placement="top" arrow>
                <IconButton disabled>
                  <Iconify icon="eva:more-vertical-fill" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </TableCell>
      )}
      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList>
          {availableActions.map((action) => {
            if (action === 'UPLOAD_RECEIPT') {
              return (
                <MenuItem
                  key="UPLOAD_RECEIPT"
                  onClick={() => {
                    popover.onClose();
                    setUploadModal(true);
                  }}
                  disabled={disableCRMAction}
                >
                  Upload Receipt
                </MenuItem>
              );
            }

            return (
            <MenuItem
              key={action}
              onClick={() => {
                popover.onClose();
                setRemarkDialog({
                  open: true,
                  id: row.id,
                  reason: {
                    realisationDate: row.realisationDate,
                    receiptNo: row.receiptNo,
                    comments: row.comments,
                  },
                  action: action as EOIFinanceStatus.VERIFIED | EOIFinanceStatus.REVERSED | EOIFinanceStatus.REJECTED,
                });
              }}
            >
              {action.charAt(0).toUpperCase() + action.slice(1)}
            </MenuItem>
            );
          })}
        </MenuList>
      </CustomPopover>
      <DocumentViewModal
        open={bankStmtPopup.open}
        fileURL={bankStmtPopup.fileURL}
        documentName={bankStmtPopup.documentName}
        onClose={handleCloseViewer}
        title={bankStmtPopup.title} 
      />
      {/* Transaction Remark Dialog */}
      {remarkDialog.open && (
        <TransactionRemarksDialog
          open={remarkDialog.open}
          action={remarkDialog.action}
          remark={remarkDialog.reason}
          setRemark={setRemark}
          onClose={() => setRemarkDialog({ open: false, id: null, reason: {}, action: EOIFinanceStatus.VERIFIED })}
          onSubmit={() => handleRemarkSubmit(remarkDialog.reason)}
          showAllFields={remarkDialog.action === EOIFinanceStatus.VERIFIED}
        />
      )}
    </TableRow>
    {uploadModal && (
      <UploadReceiptDialog
        open={uploadModal}
        onClose={() => {
          if (!uploadLoading) {
            setUploadModal(false);
          }
        }}
        row={row}
        loading={uploadLoading}
        onSubmit={handleUploadReceipt}
      />
    )}
    </>
  );
}
