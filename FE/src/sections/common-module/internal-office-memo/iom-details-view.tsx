import type { RootState, AppDispatch } from 'src/redux/store';

import dayjs from 'dayjs';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import React, { useRef, useMemo, useState, useEffect } from 'react';

import { Box, Card, Grid, Stack, Button, Typography } from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { formatIndianCurrency } from 'src/utils/helper';
import { resolveBrandCdnUrl } from 'src/utils/brand-asset-specs';
import {
  ROLES,
  IomAction,
  IomStatus,
  PointsAdjustmentType,
  IOM_REJECTED_STATUSES,
  IOM_EDITABLE_STATUSES,
  generateRoleBasedRoute,
  IOM_CANCELLABLE_STATUSES,
  IOM_APPROVAL_STATUS_BY_ROLE,
  IOM_SUBMITTABLE_STATUSES_BY_ROLE,
} from 'src/utils/constant';

import { CONFIG } from 'src/config-global';
import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import {
  clearIomDetails,
  setNavigatingBackFromPreview,
} from 'src/redux/slices/common-module/iom-management-slice';
import {
  approveIom,
  fetchIomDetails,
  exportIomAsPDFAction,
  submitIomForApprovalPatch,
} from 'src/redux/actions/common-module/iom-management-actions';

import { Iconify } from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { ConfirmDialog } from 'src/components/custom-dialog/confirm-dialog';

import SignatureCard from './components/signature-card';
import IomDetailsCard from './components/iom-details-card';
import SourceDetailsCard from './components/source-details-card';
import PaymentDetailsCard from './components/payment-details-card';
import ReferrerDetailsCard from './components/referrer-details-card';
import FinanceApprovalCard from './components/finance-approval-card';
import BusinessExceptionCard from './components/business-exception-card';
import { buildIomUpdatePayload, mapDetailsToFormValues } from './iom-form-utils';
import { TransactionRemarksDialog } from '../expression-of-interest/components/finance-components/transaction-remark-dialog';

const { view, generateIOM } = uiText.internalOfficeMemo;

const DATE_INPUT_FORMATS = ['DD/MM/YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY', 'DD-MM-YYYY'];

const formatDisplayDate = (value?: string | null): string => {
  if (!value) return '';
  const parsed = dayjs(value, DATE_INPUT_FORMATS);
  return parsed.isValid() ? parsed.format('DD MMM YYYY') : value;
};

const formatAgreementDate = (value?: string | null): string => {
  if (!value) return '';
  const parsed = dayjs(value, DATE_INPUT_FORMATS);
  return parsed.isValid() ? parsed.format('DD-MM-YYYY') : value;
};

const formatNumberValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  return formatIndianCurrency(num);
};

const formatPercentValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  return num.toFixed(2);
};

const formatPointsPercent = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  const formatted = Number.isInteger(num) ? String(num) : String(parseFloat(num.toFixed(2)));
  return `${formatted}%`;
};

const IomDetailsView = () => {
  const dispatch: AppDispatch = useDispatch();
  const router = useRouter();
  const { id } = useParams();
  const { userRole } = useRoleBasedPermissions({ module: 'iomManagement' });
  const isCRM = userRole === ROLES.CRM || userRole === ROLES.CRM_TL;

  const iomDetails = useSelector((state: RootState) => state.iomManagement.iomDetails);
  const detailsLoading = useSelector((state: RootState) => state.iomManagement.detailsLoading);
  const submitting = useSelector((state: RootState) => state.iomManagement.submitting);
  const approving = useSelector((state: RootState) => state.iomManagement.approving);

  // If Redux already has the matching IOM (e.g. Generate IOM seeded a preview
  // snapshot before navigating here), skip the network call and render that
  // data instead. The ref freezes the decision on first mount so React 18
  // StrictMode's mount → unmount → remount cycle cannot flip it after a later
  // dispatch (e.g. cleanup of a sibling effect) wipes the cached entry.
  const hasCachedDetails = Boolean(
    iomDetails?.iom_id && String(iomDetails.iom_id) === String(id ?? '')
  );
  const usePreviewRef = useRef(hasCachedDetails);
  const usePreview = usePreviewRef.current;

  const iomStatus = iomDetails?.status as IomStatus | undefined;
  const canCancelIom = Boolean(isCRM && iomStatus && IOM_CANCELLABLE_STATUSES.has(iomStatus));
  const expectedApprovalStatus = userRole
    ? IOM_APPROVAL_STATUS_BY_ROLE[userRole as ROLES]
    : undefined;
  // Approve button is restricted to:
  // - CRM_HEAD when status is CRM_HEAD_APPROVAL_PENDING
  // - FINANCE_USER when status is FINANCE_MEMBER_VERIFICATION_PENDING
  // - FINANCE_HEAD when status is FINANCE_APPROVER_APPROVAL_PENDING
  const isApproverRole =
    userRole === ROLES.CRM_HEAD ||
    userRole === ROLES.FINANCE_USER ||
    userRole === ROLES.FINANCE_HEAD;
  const canApprove = Boolean(
    isApproverRole && iomStatus && expectedApprovalStatus && iomStatus === expectedApprovalStatus
  );
  const submittableStatusesForRole = userRole
    ? IOM_SUBMITTABLE_STATUSES_BY_ROLE[userRole as ROLES]
    : undefined;
  const canSubmitForApproval = Boolean(
    iomStatus && submittableStatusesForRole?.has(iomStatus)
  );

  const [isExporting, setIsExporting] = useState(false);
  const [cancelIomDialog, setCancelIomDialog] = useState({
    isOpen: false,
    iomId: id || '',
  });
  const [cancelRemark, setCancelRemark] = useState<{ comments?: string }>({ comments: '' });
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);

  useEffect(() => {
    if (usePreview) {
      // Preview path: Redux already has the matching IOM, skip the API call.
      return undefined;
    }
    if (id) {
      dispatch(fetchIomDetails(id));
    }
    return () => {
      dispatch(clearIomDetails());
    };
  }, [dispatch, id, usePreview]);

  // Native browser refresh prompt while unsaved preview values are being shown.
  useEffect(() => {
    if (!usePreview) return undefined;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [usePreview]);

  const handleCancelRemark = (value: Partial<{ comments?: string }>) => {
    setCancelRemark((prev) => ({ ...prev, ...value }));
  };

  const handleOpenCancelDialog = () => {
    setCancelIomDialog({
      isOpen: true,
      iomId: id || '',
    });
  };

  const handleCloseCancelDialog = () => {
    setCancelIomDialog({
      isOpen: false,
      iomId: '',
    });
  };

  const handleCancelSubmit = () => {
    handleCloseCancelDialog();
  };

  const handleConfirmApprove = async () => {
    if (approving) return;
    try {
      const result = await dispatch(approveIom(iomDetails?.iom_id ?? id ?? ''));
      if (approveIom.fulfilled.match(result)) {
        toast.success(view.approveSuccess);
        setIsApproveConfirmOpen(false);
        router.push(generateRoleBasedRoute(userRole, 'iom-management'));
      } else {
        toast.error(view.approveError);
      }
    } catch (error) {
      console.error('Error approving IOM:', error);
      toast.error(view.approveError);
    }
  };

  const handleBack = () => {
    if (usePreview) {
      const isEditableCrmStatus =
        userRole === ROLES.CRM &&
        iomStatus &&
        IOM_EDITABLE_STATUSES.has(iomStatus as IomStatus);
      const isEditableCrmTlStatus =
        userRole === ROLES.CRM_TL && iomStatus === IomStatus.CRM_TL_APPROVAL_PENDING;

      if (isEditableCrmStatus || isEditableCrmTlStatus) {
        dispatch(setNavigatingBackFromPreview(true));
      }

      // Return users to the originating editor route. CRM uses `generate-iom`,
      // while CRM_TL / CRM_HEAD reuse the same view under `verify-iom`.
      if (userRole === ROLES.CRM) {
        router.push(generateRoleBasedRoute(userRole, 'iom-management/generate-iom', String(id)));
        return;
      }
      if (userRole === ROLES.CRM_TL || userRole === ROLES.CRM_HEAD) {
        router.push(generateRoleBasedRoute(userRole, 'iom-management/verify-iom', String(id)));
        return;
      }
    }
    router.push(generateRoleBasedRoute(userRole, 'iom-management'));
  };

  const handleConfirmSubmit = async () => {
    try {
      const values = mapDetailsToFormValues(iomDetails);
      const editedFlags = {
        basicSalePrice: Boolean(iomDetails?.payment_details?.is_basic_sale_price_edited),
        brokerage: Boolean(iomDetails?.payment_details?.is_brokerage_edited),
        pointsAdjustmentType: Boolean(iomDetails?.payment_details?.is_points_adjustment_edited),
      };
      // For CRM, choose `resubmit` when the IOM is coming from a rejected/deleted
      // state and `submit` for fresh / draft submissions.
      const submitAction =
        userRole === ROLES.CRM && iomStatus && IOM_REJECTED_STATUSES.has(iomStatus)
          ? 'resubmit'
          : 'submit';
      const payload = buildIomUpdatePayload(values, editedFlags, undefined, submitAction);
      const result = await dispatch(
        submitIomForApprovalPatch({
          iomId: iomDetails?.iom_id ?? id ?? '',
          payload,
        })
      );
      if (submitIomForApprovalPatch.fulfilled.match(result)) {
        toast.success(generateIOM.submitSuccess);
        setIsSubmitConfirmOpen(false);
        dispatch(clearIomDetails());
        router.push(generateRoleBasedRoute(userRole, 'iom-management'));
      } else {
        toast.error(generateIOM.submitError);
      }
    } catch (error) {
      console.error('Error submitting IOM:', error);
      toast.error(generateIOM.submitError);
    }
  };

  const handleViewApprovalProof = () => {
    const url = iomDetails?.payment_details?.approval_proof_url;
    if (!url) return;
    // Redux preview seeds this with the raw S3 key (from NewDropzone's upload
    // response), while the API may eventually return either a key or a full
    // URL. Normalize to an absolute URL before opening so we never end up on a
    // 404 page from a relative-path navigation.
    const isAbsolute = /^https?:\/\//i.test(url);
    const fullUrl = isAbsolute ? url : `${CONFIG.site.s3BasePath}/${url.replace(/^\/+/, '')}`;
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  };

  const handleExportAsPDF = async () => {
    const iomId = iomDetails?.iom_id ?? id;
    if (!iomId) {
      toast.error(view.exportError);
      return;
    }
    try {
      setIsExporting(true);
      await dispatch(exportIomAsPDFAction(iomId)).unwrap();
    } catch (error) {
      console.error('Error exporting IOM PDF:', error);
      toast.error(view.exportError);
    } finally {
      setIsExporting(false);
    }
  };

  const approvalProofUrl = iomDetails?.payment_details?.approval_proof_url || null;

  const businessExceptionDescription = useMemo(() => {
    const referrerPercent = Number(iomDetails?.payment_details?.pts_to_referer) || 0;
    return generateIOM.businessExceptionText.replace('{percent}', String(referrerPercent));
  }, [iomDetails?.payment_details?.pts_to_referer]);

  const showBusinessException = Boolean(
    iomDetails?.payment_details?.points_adjustment_type &&
      iomDetails.payment_details.points_adjustment_type !== PointsAdjustmentType.ONE_ONE
  );

  const isIomEdited = Boolean(
    iomDetails?.payment_details?.is_basic_sale_price_edited ||
      iomDetails?.payment_details?.is_brokerage_edited ||
      iomDetails?.payment_details?.is_points_adjustment_edited
  );

  const isDeviation = Boolean(iomDetails?.payment_details?.is_deviation);
  const showPendingVerification = Boolean(
    isCRM &&
      iomStatus &&
      (iomStatus === IomStatus.IOM_TO_BE_CREATED ||
        iomStatus === IomStatus.CRM_HEAD_APPROVAL_PENDING)
  );

  if (detailsLoading || !iomDetails) {
    return (
      <DashboardContent>
        <LoadingScreen />
      </DashboardContent>
    );
  }

  const payment = iomDetails.payment_details;
  const referer = iomDetails.referer_details;
  const referee = iomDetails.referee_details;
  const brandLogoUrl = resolveBrandCdnUrl(iomDetails.brand);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        sx={{ mb: 2 }}
        links={[
          {
            name: uiText.internalOfficeMemo.title,
            href: generateRoleBasedRoute(userRole, 'iom-management'),
          },
          {
            name: iomDetails.iom_no || iomDetails.iom_id || id || '',
            href: '#',
          },
        ]}
        action={
          brandLogoUrl ? (
            <Box
              component="img"
              src={brandLogoUrl}
              alt="brand-logo"
              sx={{
                maxHeight: { xs: 36, md: 48 },
                maxWidth: { xs: 140, md: 200 },
                objectFit: 'contain',
              }}
            />
          ) : null
        }
      />
      <Stack spacing={2}>
        <IomDetailsCard
          iomId={iomDetails.iom_no || iomDetails.iom_id || ''}
          status={iomDetails.status ?? ''}
          generatedOn={formatDisplayDate(iomDetails.agreement_date)}
          iomDate={formatDisplayDate(iomDetails.agreement_date)}
          createdBy={iomDetails.prepared_by?.name ?? ''}
          isExporting={isExporting}
          showDeviation={isDeviation}
          showPendingVerification={showPendingVerification}
          isEdited={isIomEdited}
          onExport={handleExportAsPDF}
        />
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <ReferrerDetailsCard
              title={view.referrerDetails}
              data={{
                customerName: referer?.customer_name ?? '',
                bpCode: referer?.bp_code ?? '',
                project: referer?.project_name ?? '',
                location: referer?.project_location ?? '',
                unitNo: referer?.unit_number ?? '',
                bookingDate: formatDisplayDate(referer?.booking_date),
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <ReferrerDetailsCard
              title={view.refereeDetails}
              data={{
                customerName: referee?.customer_name ?? '',
                bpCode: referee?.bp_code ?? '',
                project: referee?.project_name ?? '',
                location: referee?.project_location ?? '',
                unitNo: referee?.unit_number ?? '',
                bookingDate: formatDisplayDate(referee?.booking_date),
              }}
            />
          </Grid>
        </Grid>
        <PaymentDetailsCard
          basicSalePrice={formatNumberValue(payment?.basic_sale_price)}
          brokeragePercent={formatPercentValue(payment?.brokerage)}
          brokerageAmount={formatNumberValue(payment?.brokerage_amt)}
          pointsAdjustmentType={payment?.points_adjustment_type ?? ''}
          pointsToReferrer={formatPointsPercent(payment?.pts_to_referer)}
          pointsReferrerAmount={formatNumberValue(payment?.pts_referer_amount)}
          pointsToReferee={formatPointsPercent(payment?.pts_to_referee)}
          pointsRefereeAmount={formatNumberValue(payment?.pts_referee_amount)}
          editedFlags={{
            basicSalePrice: Boolean(payment?.is_basic_sale_price_edited),
            brokerage: Boolean(payment?.is_brokerage_edited),
            pointsAdjustmentType: Boolean(payment?.is_points_adjustment_edited),
          }}
        />
        {approvalProofUrl && (
          <Card sx={{ p: 2 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              justifyContent="space-between"
              spacing={2}
            >
              <Typography sx={{ fontSize: 16, fontWeight: 600 }}>
                {generateIOM.approvalProof}
              </Typography>
              <Button
                variant="contained"
                className="primaryBtn"
                startIcon={<Iconify icon="solar:eye-bold" width={20} />}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
                onClick={handleViewApprovalProof}
              >
                {uiText.internalOfficeMemo.actions.view}
              </Button>
            </Stack>
          </Card>
        )}
        <SignatureCard
          preparedBy={iomDetails.prepared_by ?? { name: '', role: '' }}
          verifiedBy={iomDetails.verified_by ?? { name: '', role: '' }}
          approvedBy={iomDetails.approved_by ?? { name: '', role: '' }}
        />
        {showBusinessException && (
          <BusinessExceptionCard description={businessExceptionDescription} />
        )}
        <FinanceApprovalCard
          verifiedBy={iomDetails.finance_verified_by ?? { name: '', role: '' }}
          approvedBy={iomDetails.finance_approved_by ?? { name: '', role: '' }}
        />
        <SourceDetailsCard
          sourceInSAP={iomDetails.sap_source ?? ''}
          sourceInSalesforce={iomDetails.sfdc_source ?? ''}
          agreementDone={formatAgreementDate(iomDetails.agreement_date)}
          referrerPaid={`${iomDetails.refer_paid ?? 0}%`}
          refereePaid={`${iomDetails.referee_paid ?? 0}%`}
        />
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column-reverse', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', md: 'center' },
            gap: 2,
          }}
        >
          <Button
            size="large"
            variant="outlined"
            sx={{ width: { xs: '100%', md: '160px' } }}
            onClick={handleBack}
          >
            {generateIOM.labels.back}
          </Button>
          {(canCancelIom || canSubmitForApproval || canApprove) && (
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              sx={{ width: { xs: '100%', md: 'auto' } }}
            >
              {canCancelIom && (
                <Button
                  size="large"
                  variant="outlined"
                  sx={{ width: { xs: '100%', md: '160px' } }}
                  onClick={handleOpenCancelDialog}
                >
                  {view.cancelIom}
                </Button>
              )}
              {canApprove && (
                <Button
                  size="large"
                  variant="contained"
                  className="primaryBtn"
                  sx={{ width: { xs: '100%', md: '160px' } }}
                  onClick={() => setIsApproveConfirmOpen(true)}
                >
                  {view.approve}
                </Button>
              )}
              {canSubmitForApproval && (
                <Button
                  size="large"
                  variant="contained"
                  className="primaryBtn"
                  sx={{ width: { xs: '100%', md: 'auto' } }}
                  onClick={() => setIsSubmitConfirmOpen(true)}
                  disabled={submitting}
                >
                  {generateIOM.labels.submit}
                </Button>
              )}
            </Stack>
          )}
        </Box>
      </Stack>
      <TransactionRemarksDialog
        open={cancelIomDialog.isOpen}
        action={IomAction.CANCEL_IOM}
        remark={cancelRemark}
        setRemark={handleCancelRemark}
        onClose={handleCloseCancelDialog}
        onSubmit={handleCancelSubmit}
      />
      <ConfirmDialog
        open={isSubmitConfirmOpen}
        onClose={() => setIsSubmitConfirmOpen(false)}
        title={generateIOM.submitConfirmTitle}
        content={<Typography variant="body2">{generateIOM.submitConfirmContent}</Typography>}
        cancelLabel={uiText.button.no}
        action={
          <Button
            variant="contained"
            className="primaryBtn"
            onClick={handleConfirmSubmit}
            disabled={submitting}
            sx={{ minWidth: { xs: 120, lg: 204 }, height: 48 }}
          >
            {uiText.button.yes}
          </Button>
        }
      />
      <ConfirmDialog
        open={isApproveConfirmOpen}
        onClose={() => setIsApproveConfirmOpen(false)}
        title={view.approveConfirmTitle}
        content={<Typography variant="body2">{view.approveConfirmContent}</Typography>}
        cancelLabel={uiText.button.no}
        action={
          <Button
            variant="contained"
            className="primaryBtn"
            onClick={handleConfirmApprove}
            disabled={approving}
            sx={{ minWidth: { xs: 120, lg: 204 }, height: 48 }}
          >
            {uiText.button.yes}
          </Button>
        }
      />
    </DashboardContent>
  );
};

export default IomDetailsView;
