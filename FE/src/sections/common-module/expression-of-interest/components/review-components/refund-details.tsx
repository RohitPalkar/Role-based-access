/* eslint-disable jsx-a11y/label-has-associated-control */
import type { VoucherResponse } from 'src/types/rm-panel/eoi';

import React, { useState } from 'react';

import { Button } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';

import { DOC_MESSAGE } from 'src/utils/constant';

import { CONFIG } from 'src/config-global';
import uiText from 'src/locales/langs/en/common.json';

import DocumentViewModal from '../finance-components/document-view-modal';

interface RefererDetailsProps {
  voucherData: VoucherResponse;
}
interface BankStmtPopup {
  open: boolean;
  fileURL: string | null;
  documentName: string;
}
const RefundDetails = ({ voucherData }: RefererDetailsProps) => {
  const previewText = uiText.eoiPreview.refundDetails;
  const data = voucherData?.paymentDetails?.recoveryAccountDetails;
  const [bankStmtPopup, setBankStmtPopup] = useState<BankStmtPopup>({
    open: false,
    fileURL: null,
    documentName: '',
  });
  const handleOpenBankStatementModal = (url: string, name: string) => {
    setBankStmtPopup({ open: true, fileURL: url, documentName: name });
  };

  const handleCloseViewer = () => {
    setBankStmtPopup({ open: false, fileURL: null, documentName: '' });
  };
  return (
    <div className="applicantDetailsCard">
      <h3 className="titlePersonalHD marginBottom10">{previewText.title}</h3>
      <div className="personalInfo width50">
        {data?.payeeName ? (
          <div className="personalInfoRow">
            <label className="label200">{previewText.payeeName}:</label>
            <span
              style={{
                display: 'flex',
                wordBreak: 'break-word', // Break long words
                whiteSpace: 'normal', // Allow wrapping
                maxWidth: '100%', // Ensure it respects container width
              }}
            >
              {data?.payeeName || 'N/A'}
            </span>
          </div>
        ) : null}

        {data?.bankName ? (
          <div className="personalInfoRow">
            <label className="label200">{previewText.bankName}:</label>
            <span
              style={{
                display: 'flex',
                wordBreak: 'break-word', // Break long words
                whiteSpace: 'normal', // Allow wrapping
                maxWidth: '100%', // Ensure it respects container width
              }}
            >
              {data?.bankName || 'N/A'}
            </span>
          </div>
        ) : null}

        {data?.ifscCode ? (
          <div className="personalInfoRow">
            <label className="label200">{previewText.ifscCode}:</label>
            <span
              style={{
                display: 'flex',
                wordBreak: 'break-word', // Break long words
                whiteSpace: 'normal', // Allow wrapping
                maxWidth: '100%', // Ensure it respects container width
              }}
            >
              {data?.ifscCode || 'N/A'}
            </span>
          </div>
        ) : null}

        {data?.swiftCode ? (
          <div className="personalInfoRow">
            <label className="label200">{previewText.swiftCode}:</label>
            <span
              style={{
                display: 'flex',
                wordBreak: 'break-word', // Break long words
                whiteSpace: 'normal', // Allow wrapping
                maxWidth: '100%', // Ensure it respects container width
              }}
            >
              {data?.swiftCode || 'N/A'}
            </span>
          </div>
        ) : null}

        {data?.accountNumber ? (
          <div className="personalInfoRow">
            <label className="label200">{previewText.accountNumber}:</label>
            <span
              style={{
                display: 'flex',
                wordBreak: 'break-word', // Break long words
                whiteSpace: 'normal', // Allow wrapping
                maxWidth: '100%', // Ensure it respects container width
              }}
            >
              {data?.accountNumber || 'N/A'}
            </span>
          </div>
        ) : null}

        {data?.accountType ? (
          <div className="personalInfoRow">
            <label className="label200">{previewText.accountType}:</label>
            <span
              style={{
                display: 'flex',
                wordBreak: 'break-word', // Break long words
                whiteSpace: 'normal', // Allow wrapping
                maxWidth: '100%', // Ensure it respects container width
              }}
            >
              {data?.accountType || 'N/A'}
            </span>
          </div>
        ) : null}

        {data?.cancelledCheque && data?.cancelledCheque?.length > 0 ? (
          <div className="personalInfoRow">
            <label className="label200">{previewText.cancelledCheque}:</label>
            <Button
              size="large"
              sx={{
                textTransform: 'none',
                color: '#1A407D',
                fontWeight: 400,
                fontSize: '14px',
                border: `1px solid ${data?.cancelledCheque?.length === 0 ? '#BDBDBD' : '#1A407D'}`,
                borderRadius: '8px',
                px: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              onClick={() =>
                handleOpenBankStatementModal(
                  `${CONFIG.site.s3BasePath}/${data?.cancelledCheque?.[0]}`,
                  data?.cancelledCheque?.[0]?.split('/')?.pop() || 'Cancelled Cheque'
                )
              }
            >
              <VisibilityIcon
                sx={{ color: data?.cancelledCheque?.length > 0 ? undefined : '#1A407D' }}
              />
              View
            </Button>
          </div>
        ) : null}
        {data?.isPhysicalCancelledCheque && data?.cancelledCheque?.length === 0 ? (
          <div className="personalInfoRow">
            <label className="label200">{previewText.cancelledCheque}:</label>
            <span
              style={{
                display: 'flex',
                wordBreak: 'break-word', // Break long words
                whiteSpace: 'normal', // Allow wrapping
                maxWidth: '100%', // Ensure it respects container width
              }}
            >
              {DOC_MESSAGE}
            </span>
          </div>
        ) : null}
      </div>

      <DocumentViewModal
        open={bankStmtPopup.open}
        fileURL={bankStmtPopup.fileURL}
        documentName={bankStmtPopup.documentName}
        onClose={handleCloseViewer}
        title={previewText.cancelledCheque}
      />
    </div>
  );
};

export default RefundDetails;
