import type { AppDispatch } from 'src/redux/store';

import { toast } from 'sonner';
import { useParams } from 'react-router';
import { useDispatch } from 'react-redux';
import React, { useState, useEffect } from 'react';

import { Button , CircularProgress } from '@mui/material';

import { useAppSelector } from 'src/hooks/use-redux';

import { PRIMARY_SOURCE, SHOW_REFERRER_OPTIONS } from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import { getVoucherEOIById, eoiPreviewExportAsPDF, getEOICampaignDetailsById } from 'src/redux/actions/rm-panel/eoi-actions';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import exportIcon from '../../../assets/icons/export.svg';
import KYCDocuments from './components/review-components/kyc-documents';
import RefundDetails from './components/review-components/refund-details';
import PaymentDetails from './components/review-components/payment-details';
import ReferrerDetails from './components/review-components/referrer-details';
import PreviewThankYou from './components/review-components/preview-thank-you';
import ApplicantDetails from './components/review-components/applicant-details';
import { TermsAndConditions } from './components/review-components/terms-and-conditions';
import OtherApplicantDetails from './components/review-components/other-applicant-details';

const EOIPreviewView = () => {
  const { id } = useParams();
  const dispatch: AppDispatch = useDispatch();
  const [isExporting, setIsExporting] = useState(false);
  const { voucherData } = useAppSelector((state) => state.expressonOfInterest);
  const termsAndConditionsdData =   voucherData.termsAndCondition;

  useEffect(() => {
    if (id) {
      dispatch(getVoucherEOIById({ id: Number(id), maskEmailMobile: true }));
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (voucherData?.campaignId) {
      dispatch(getEOICampaignDetailsById({ id: Number(voucherData?.campaignId) }));
    }
  }, [dispatch, voucherData?.campaignId]);

  const handleExportAsPDF = async () => {
    if (!voucherData?.voucherId) {
      toast.error("Invalid voucher id");
      return;
    }
    try {
      setIsExporting(true);
      await dispatch(eoiPreviewExportAsPDF(voucherData?.voucherId)).unwrap();
    } catch (error) {
      console.log(error);
      toast.error("Error exporting PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={uiText.eoiPreview.title}
        sx={{
          mb: { xs: 0.5, sm: 2 },
          top: 0,
          zIndex: 10,
          backgroundColor: 'background.default',
          py: 0.25,
        }}
        action={
          <Button
            size="large"
            variant="contained"
            className="primaryBtn"
            startIcon={
              isExporting ? (
                <CircularProgress size={20} sx={{ color: 'white' }} />
              ) : (
                <img src={exportIcon} alt="export-icon" />
              )
            }
            onClick={handleExportAsPDF}
            sx={{ width: '160px' }}
            disabled={isExporting}
          >
            {isExporting ? uiText.eoiPreview.exporting : uiText.eoiPreview.export}
          </Button>
        }
      />

      <PreviewThankYou voucherData={voucherData} />
      <PaymentDetails voucherData={voucherData} />
      <ApplicantDetails voucherData={voucherData} />
      <OtherApplicantDetails voucherData={voucherData} />
      <KYCDocuments voucherData={voucherData} />
      {(
        SHOW_REFERRER_OPTIONS.includes(voucherData?.primarySource) ||
        voucherData?.primarySource === PRIMARY_SOURCE.PurvaChampion
      ) && (
        <ReferrerDetails voucherData={voucherData} />
      )}
      <RefundDetails voucherData={voucherData}/>
      <TermsAndConditions termsAndConditionsData={termsAndConditionsdData} />
    </DashboardContent>
  );
};

export default EOIPreviewView;
