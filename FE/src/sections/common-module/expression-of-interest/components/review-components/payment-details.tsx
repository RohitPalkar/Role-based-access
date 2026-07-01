import React, { useState } from 'react';

import { Box, Tooltip, IconButton } from '@mui/material';

import { PAYMENT_MODE, EOIPaymentMode } from 'src/utils/constant';
import { formatDate, formatNumberWithCommas } from 'src/utils/helper';

import { CONFIG } from 'src/config-global';
import uiText from 'src/locales/langs/en/common.json';

import { Iconify } from 'src/components/iconify';

import DocumentViewModal from '../finance-components/document-view-modal';

interface BankStmtPopup {
  open: boolean;
  fileURL: string | null;
  documentName: string;
  modaltitle:string
}
const PaymentDetails = ({ voucherData }: any) => {
  const payments = voucherData?.payments || {};
  const jsonValue = uiText.paymentDetails;
  const [bankStmtPopup, setBankStmtPopup] = useState<BankStmtPopup>({
    open: false,
    fileURL: null,
    documentName: '',
    modaltitle:''
  });

  const toTitleCase = (str?: string) => {
    if (!str) return '';

    if (str !== str.toLowerCase()) {
      return str;
    }
    
    return str
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handlePayment = (mode: any) => {
    if (!mode) return null;

    switch (mode) {
      case EOIPaymentMode.GATEWAY:
        return PAYMENT_MODE.GATEWAY;

      case EOIPaymentMode.OFFLINE:
        return PAYMENT_MODE.OFFLINE;

      default:
        return 'N/A';
    }
  };

  const handleOpenBankStatementModal = (url: string, name: string, title: string) => {
    setBankStmtPopup({ open: true, fileURL: url, documentName: name, modaltitle: title });
  };

  const handleCloseViewer = () => {
    setBankStmtPopup({ open: false, fileURL: null, documentName: '', modaltitle: '' });
  };
  return (
    <>
      <div className="applicantDetailsCard">
        <h3 className="titlePersonalHD marginBottom28">{jsonValue.heading}</h3>
        <div className="tbResponsive">
          <table>
            <tr>
              <th style={{ color: '#1C252E' }}>{jsonValue.label.srNo}</th>
              <th style={{ color: '#1C252E' }}>{jsonValue.label.transaction}</th>
              <th style={{ color: '#1C252E' }}>{jsonValue.label.beingPaid}</th>
              <th style={{ color: '#1C252E' }}>{jsonValue.label.paymentMethod}</th>
              <th style={{ color: '#1C252E' }}>{jsonValue.label.dated}</th>
              <th style={{ color: '#1C252E' }}>{jsonValue.label.amount}</th>
              <th style={{ color: '#1C252E' }}>{jsonValue.label.paymentProof}</th>
              <th style={{ color: '#1C252E' }}>{jsonValue.label.chequeDepositSlip}</th>
            </tr>
            {payments?.length > 0 &&
              payments?.map((payment: any, index: number) => {
                const details = payment?.paymentDetails || {};

                return (
                  <tr key={payment?.id || index}>
                    <td>{index + 1}</td>
                    <td>{payment?.paymentMode ? handlePayment(payment?.paymentMode) : 'N/A'}</td>
                    <td>
                      {details?.transactionNumber ||
                        details?.gatewayPaymentId ||
                        details?.chequeNumber ||
                        'N/A'}
                    </td>
                    <td>
                      {details?.method?.toLowerCase().includes('upi')
                        ? 'UPI'
                        : toTitleCase(details?.method)}
                    </td>

                    <td>{payment?.date ? formatDate(payment?.date) : 'N/A'}</td>
                    <td>
                      <span>₹&nbsp;</span>
                      <span>
                        {formatNumberWithCommas(Number.parseFloat(payment?.paidAmount) || 0)}
                      </span>
                    </td>
                    <td>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {details?.paymentProof?.length ? (
                          <Tooltip title="View Payment Proof" placement="top" arrow>
                            <IconButton
                              onClick={() =>
                                handleOpenBankStatementModal(
                                  `${CONFIG.site.s3BasePath}/${details?.paymentProof?.[0]}`,
                                  details?.paymentProof?.[0].split('/').pop() || 'Payment Proof',
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
                    </td>
                    <td>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {details?.chequeDepositSlip?.length ? (
                          <Tooltip title="View Payment Proof" placement="top" arrow>
                            <IconButton
                              onClick={() =>
                                handleOpenBankStatementModal(
                                  `${CONFIG.site.s3BasePath}/${details?.chequeDepositSlip?.[0]}`,
                                  details?.chequeDepositSlip?.[0].split('/').pop() || 'Cheque Deposit Slip','Cheque Deposit Slip Preview'
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
                    </td>
                  </tr>
                );
              })}
          </table>
        </div>
      </div>
      <DocumentViewModal
        open={bankStmtPopup.open}
        fileURL={bankStmtPopup.fileURL}
        documentName={bankStmtPopup.documentName}
        onClose={handleCloseViewer}
        title={bankStmtPopup.modaltitle}
      />
    </>
  );
};

export default PaymentDetails;
