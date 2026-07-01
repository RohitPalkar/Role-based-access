/* eslint-disable jsx-a11y/label-has-associated-control */
import type { VoucherResponse } from 'src/types/rm-panel/eoi';

import React from 'react';

import uiText from 'src/locales/langs/en/common.json';

interface RefererDetailsProps {
  voucherData: VoucherResponse;
}

const ReferrerDetails = ({ voucherData }: RefererDetailsProps) => {
    const previewText = uiText.eoiPreview.referrerDetails;
    
    return (
    <div className="applicantDetailsCard">
      <h3 className="titlePersonalHD marginBottom10">{voucherData?.primarySource || "N/A"}</h3>
        <div className="lineDotted" />
            <h3 className="titlePersonalHD marginBottom10">
                {previewText.title}
            </h3>
            <div className="personalInfo width50">
                {voucherData?.sourceDetails?.name ? (
                <div className="personalInfoRow">
                    <label className="label200">{previewText.customerName}:</label>
                    <span
                    style={{
                        display: 'flex',
                        wordBreak: 'break-word', // Break long words
                        whiteSpace: 'normal', // Allow wrapping
                        maxWidth: '100%', // Ensure it respects container width
                    }}
                    >
                    {voucherData?.sourceDetails?.name || 'N/A'}
                    </span>
                </div>
                ) : null}

                {voucherData?.sourceDetails?.projectName ? (
                <div className="personalInfoRow">
                    <label className="label200">{previewText.project}:</label>
                    <span
                    style={{
                        display: 'flex',
                        wordBreak: 'break-word', // Break long words
                        whiteSpace: 'normal', // Allow wrapping
                        maxWidth: '100%', // Ensure it respects container width
                    }}
                    >
                    {voucherData?.sourceDetails?.projectName || 'N/A'}
                    </span>
                </div>
                ) : null}

                {voucherData?.sourceDetails?.contactNumber ? (
                <div className="personalInfoRow">
                    <label className="label200">{uiText.eoiPreview.applicantDetails.contactNo}</label>
                    <span
                    style={{
                        display: 'flex',
                        wordBreak: 'break-word', // Break long words
                        whiteSpace: 'normal', // Allow wrapping
                        maxWidth: '100%', // Ensure it respects container width
                    }}
                    >
                    {voucherData?.sourceDetails?.countryCode || 'N/A'}{voucherData?.sourceDetails?.contactNumber || 'N/A'}
                    </span>
                </div>
                ) : null}

                {voucherData?.sourceDetails?.unit ? (
                <div className="personalInfoRow">
                    <label className="label200">{previewText.unit}:</label>
                    <span
                    style={{
                        display: 'flex',
                        wordBreak: 'break-word', // Break long words
                        whiteSpace: 'normal', // Allow wrapping
                        maxWidth: '100%', // Ensure it respects container width
                    }}
                    >
                    {voucherData?.sourceDetails?.unit || 'N/A'}
                    </span>
                </div>
                ) : null}

                {voucherData?.sourceDetails?.email ? (
                <div className="personalInfoRow">
                    <label className="label200">{uiText.eoiPreview.applicantDetails.email}:</label>
                    <span
                    style={{
                        display: 'flex',
                        wordBreak: 'break-word', // Break long words
                        whiteSpace: 'normal', // Allow wrapping
                        maxWidth: '100%', // Ensure it respects container width
                    }}
                    >
                    {voucherData?.sourceDetails?.email || 'N/A'}
                    </span>
                </div>
                ) : null}

                {voucherData?.sourceDetails?.referredBy ? (
                <div className="personalInfoRow">
                    <label className="label200">{previewText.referredBy}:</label>
                    <span
                    style={{
                        display: 'flex',
                        wordBreak: 'break-word', // Break long words
                        whiteSpace: 'normal', // Allow wrapping
                        maxWidth: '100%', // Ensure it respects container width
                    }}
                    >
                    {voucherData?.sourceDetails?.referredBy || 'N/A'}
                    </span>
                </div>
                ) : null}

                {voucherData?.sourceDetails?.employeeName ? (
                <div className="personalInfoRow">
                    <label className="label200">{uiText.eoiPreview.previewThankYou.employeeName}:</label>
                    <span
                    style={{
                        display: 'flex',
                        wordBreak: 'break-word', // Break long words
                        whiteSpace: 'normal', // Allow wrapping
                        maxWidth: '100%', // Ensure it respects container width
                    }}
                    >
                    {voucherData?.sourceDetails?.employeeName || 'N/A'}
                    </span>
                </div>
                ) : null}

                {voucherData?.sourceDetails?.employeeId ? (
                <div className="personalInfoRow">
                    <label className="label200">{previewText.employeeId}:</label>
                    <span
                    style={{
                        display: 'flex',
                        wordBreak: 'break-word', // Break long words
                        whiteSpace: 'normal', // Allow wrapping
                        maxWidth: '100%', // Ensure it respects container width
                    }}
                    >
                    {voucherData?.sourceDetails?.employeeId || 'N/A'}
                    </span>
                </div>
                ) : null}

                {voucherData?.sourceDetails?.activityName ? (
                <div className="personalInfoRow">
                    <label className="label200">{previewText?.activityName}:</label>
                    <span
                    style={{
                        display: 'flex',
                        wordBreak: 'break-word', // Break long words
                        whiteSpace: 'normal', // Allow wrapping
                        maxWidth: '100%', // Ensure it respects container width
                    }}
                    >
                    {voucherData?.sourceDetails?.activityName || 'N/A'}
                    </span>
                </div>
                ) : null}
        </div>
    </div>
  )};

export default ReferrerDetails;
