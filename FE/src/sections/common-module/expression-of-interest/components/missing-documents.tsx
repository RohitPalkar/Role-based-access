import type { FormikProps } from 'formik';

import React from 'react';

import { Grid , Divider, Typography } from '@mui/material';

import uiText from 'src/locales/langs/en/common.json';

import { DocumentBlock } from './document-block';

type MissingDocumentsProps = {
  formik: FormikProps<any>;
  applicant1?: any;
  applicant2?: any;
  handledelete: (fieldName: any, index: any, deleteKey?: any) => void;
};

/** True when at least one applicant needs physical Aadhaar/PAN uploads (parent can skip empty section). */
export function hasMissingDocumentsToShow(applicant1?: any, applicant2?: any): boolean {
  const applicants = [applicant1, applicant2].filter(Boolean);
  return applicants.some((a) => {
    const { isPhysicalAadhaar, isPhysicalPan } = a?.contactDetails || {};
    return Boolean(isPhysicalAadhaar || isPhysicalPan);
  });
}

const MissingDocuments = ({ formik, applicant1, applicant2, handledelete }: MissingDocumentsProps) => {
  const applicants = [
    { label: 'Applicant 1', data: applicant1, originalIndex: 0 },
    { label: 'Applicant 2', data: applicant2, originalIndex: 1 },
  ].filter((a) => a.data);

  const blocks = applicants
    .map((applicant) => {
      const { isPhysicalAadhaar, isPhysicalPan } = applicant?.data?.contactDetails || {};
      if (!isPhysicalAadhaar && !isPhysicalPan) return null;
      return { ...applicant, isPhysicalAadhaar, isPhysicalPan };
    })
    .filter((b): b is NonNullable<typeof b> => b != null);

  return (
    <>
      {blocks.map((applicant, i) => (
        <React.Fragment key={applicant.originalIndex}>
          {i > 0 && (
            <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
              <Divider sx={{ borderColor: '#DADADA', borderStyle: 'dashed' }} />
            </Grid>
          )}

          <Grid item xs={12}>
            <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>{applicant.label}</Typography>
          </Grid>

          {applicant.isPhysicalAadhaar && (
            <DocumentBlock
              title={uiText.eoiPreview.applicantDetails.aadhaarNumber}
              inputName={`kycDetails.${applicant.originalIndex}.aadhaarNumber`}
              dropzoneName={`kycDetails.${applicant.originalIndex}.aadhaarImage`}
              formik={formik}
              maxLength={12}
              handledelete={handledelete}
              isAadhaar
            />
          )}

          {applicant.isPhysicalPan && (
            <DocumentBlock
              title={uiText.eoiPreview.applicantDetails.panNumber}
              inputName={`kycDetails.${applicant.originalIndex}.panNumber`}
              dropzoneName={`kycDetails.${applicant.originalIndex}.panImage`}
              formik={formik}
              maxLength={10}
              handledelete={handledelete}
            />
          )}
        </React.Fragment>
      ))}
    </>
  );
};

export default MissingDocuments;
