import type { Voucher, VoucherResponse } from 'src/types/rm-panel/eoi';

import React, { useState, useEffect } from 'react'

import CloseIcon from '@mui/icons-material/Close';
import { Box , Grid, Dialog, Divider, IconButton, Typography } from '@mui/material';

import { applicantCountConstant } from 'src/utils/constant';

import { CONFIG } from 'src/config-global';
import uiText from 'src/locales/langs/en/common.json';

import ReviewInput from './review-input';

interface KYCDocumentsProps {
  voucherData: VoucherResponse;
}

type DocKey = "aadhaarImage" | "panCard" | "passportImage" | "ociImage";
type DocumentsMap = Record<DocKey, any[]>;

const KYCDocuments = ({ voucherData } : KYCDocumentsProps) => {
  const [openPopup, setOpenPopup] = useState(false);
  const [voucherList, setVoucherList] = useState<Voucher[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [selectedDocName, setSelectedDocName] = useState<string>("");
  const [selectedDocNumber, setSelectedDocNumber] = useState<string>("");
  const previewText = uiText.eoiPreview.kycDocuments;
  
  useEffect(() => {
    const obj = [];
    if (voucherData && voucherData?.applicant1 !== null) {
      obj?.push(voucherData?.applicant1);
    }
    if (voucherData && voucherData?.applicant2 !== null) {
      obj?.push(voucherData?.applicant2);
    }
    setVoucherList(obj);
  }, [voucherData]);

  const handleView = (name: DocKey, docs: DocumentsMap, docTitle: string, docNumber?: string) => {
    const rawImages = docs[name] || [];
    const fullURLs = rawImages
      .filter(Boolean) // remove empty strings
      .map(path => `${CONFIG.site.s3BasePath}/${path}`);
    setImages(fullURLs);  // now holds FULL URLs
    setSelectedDocName(docTitle);
    setSelectedDocNumber(docNumber || "");
    setOpenPopup(true);
  };

  return (
    <div className="kycDocument">
      <div className="applicantDetailsCard">
        <h3 className="titlePersonalHD marginBottom28">{previewText.title}</h3>
        {voucherList &&
          voucherList?.length > 0 &&
          voucherList?.map((data, index) => {
            const personal = data?.contactDetails;
            const documents = {
              aadhaarImage: personal?.aadhaarImage || [],
              panCard: personal?.panImage || [],
              passportImage: personal?.passportImage || [],
              ociImage: personal?.ociImage || [],
            };
            return (
              <React.Fragment key={data?.opportunityId}>
                <div className="editTitleRow">
                  <div className="btnApplicantTop">
                    {index === 0 ? (
                      'Primary Applicant'
                    ) : (
                      <>
                        {index + 1}
                        <sup>
                          {applicantCountConstant?.numberKeys[(index + 1) as 1 | 2 | 3 | 4]}
                        </sup>{' '}
                        {uiText.eoiPreview.applicantDetails.title}
                      </>
                    )}
                  </div>
                </div>

                <Grid container rowSpacing={2} columnSpacing={10}>
                  {(personal?.aadhaarImage?.length > 0 || personal?.isPhysicalAadhaar) && (
                    <Grid item xs={12} sm={6} md={6} lg={6}>
                      <ReviewInput
                        text={previewText.aadhaarCard}
                        name="aadhaarImage"
                        onView={(name) => handleView(name as DocKey, documents, previewText.aadhaarCard, data?.contactDetails?.aadhaarNumber)}
                        disabled={!documents?.aadhaarImage?.length}
                        isPhysicalDoc={personal?.isPhysicalAadhaar}
                        documentNumber={data?.contactDetails?.aadhaarNumber}
                      />
                    </Grid>
                  )}
                  {(personal?.panImage?.length > 0 || personal?.isPhysicalPan) && (
                    <Grid item xs={12} sm={6} md={6} lg={6}>
                      <ReviewInput
                        text={previewText.panCard}
                        name="panCard"
                        onView={(name) => handleView(name as DocKey, documents, previewText.panCard, data?.contactDetails?.panNumber)}
                        disabled={!documents?.panCard?.length}
                        isPhysicalDoc={personal?.isPhysicalPan}
                        documentNumber={data?.contactDetails?.panNumber}
                      />
                    </Grid>
                  )}

                  {(personal?.passportImage?.length > 0 || personal?.isPhysicalPassport) && (
                    <Grid item xs={12} sm={6} md={6} lg={6}>
                      <ReviewInput
                        text={previewText.passport}
                        name="passportImage"
                        onView={(name) => handleView(name as DocKey, documents, previewText.passport, data?.contactDetails?.passportNumber)}
                        disabled={!documents?.passportImage?.length}
                        isPhysicalDoc={personal?.isPhysicalPassport}
                        documentNumber={data?.contactDetails?.passportNumber}
                      />
                    </Grid>
                  )}

                  {(personal?.ociImage?.length > 0 || personal?.isPhysicalOCI) && (
                    <Grid item xs={12} sm={6} md={6} lg={6}>
                      <ReviewInput
                        text={previewText.oci}
                        name="ociImage"
                        onView={(name) => handleView(name as DocKey, documents, previewText.oci, data?.contactDetails?.ociNumber)}
                        disabled={!documents?.ociImage?.length}
                        isPhysicalDoc={personal?.isPhysicalOCI}
                        documentNumber={data?.contactDetails?.ociNumber}
                      />
                    </Grid>
                  )}
                </Grid>
                {index !== (voucherList?.length ?? 0) - 1 && (
                  <Divider sx={{ border: '1px dashed #D6D6D6', mb: 3, mt: 2 }} />
                )}
              </React.Fragment>
            );
          })}
      </div>
      {openPopup && (
        <Dialog open={openPopup} onClose={() => setOpenPopup(false)} maxWidth="md" fullWidth>
          <Box sx={{ p: 2, position: 'relative' }}>
            {/* Close Icon */}
            <IconButton
              aria-label="close"
              onClick={() => setOpenPopup(false)}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>

            {/* Title */}
            <Typography variant="h6" gutterBottom>
              {previewText.preview}
            </Typography>
            <Typography
              component="span"
              sx={{ fontSize: "14px", fontWeight: "400" }}
            >
              {selectedDocName}: &nbsp;
            </Typography>
            <Typography
              component="span"
              sx={{ fontSize: "14px", fontWeight: "600" }}
            >
              {selectedDocNumber}
            </Typography>
            {/* Image */}
            {images.map((img, idx) => (
              <img
                key={img}
                src={img}
                alt={`Preview ${idx + 1}`}
                style={{
                  width: '100%',
                  maxHeight: '80vh',
                  objectFit: 'contain',
                  marginBottom: images.length > 1 && idx === 0 ? '24px' : '0px',
                  borderRadius: '8px',
                  marginTop: '8px'
                }}
              />
            ))}
          </Box>
        </Dialog>
      )}
    </div>
  );
}

export default KYCDocuments