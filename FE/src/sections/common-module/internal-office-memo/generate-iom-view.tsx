import type { RootState, AppDispatch } from 'src/redux/store';

import dayjs from 'dayjs';
import { toast } from 'sonner';
import { useFormik } from 'formik';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import React, { useRef, useMemo, useState, useEffect } from 'react';

import { Box, Stack, Button, Typography } from '@mui/material';

import { useRouter, useParams } from 'src/routes/hooks';

import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { stickyBreadcrumbsStyles } from 'src/utils/table-styles';
import { resolveBrandCdnUrl } from 'src/utils/brand-asset-specs';
import {
  ROLES,
  IomAction,
  IomStatus,
  PointsAdjustmentType,
  IOM_EDITABLE_STATUSES,
  IOM_DELETABLE_STATUSES,
  generateRoleBasedRoute,
  IOM_APPROVAL_STATUS_BY_ROLE,
} from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';
import bookmarkIcon from 'src/assets/icons/bookmark.svg';
import { DashboardContent } from 'src/layouts/dashboard';
import { deleteImage } from 'src/redux/actions/rm-panel/upload-actions';
import { fetchIomDropdowns } from 'src/redux/actions/admin/common-actions';
import {
  clearIomDetails,
  setIomDetailsFromPreview,
} from 'src/redux/slices/common-module/iom-management-slice';
import {
  cancelIom,
  rejectIom,
  fetchIomDetails,
  deleteIomApprovalProof,
  submitIomForApprovalPatch,
} from 'src/redux/actions/common-module/iom-management-actions';

import { Iconify } from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { ConfirmDialog } from 'src/components/custom-dialog/confirm-dialog';

import SignatureCard from './components/signature-card';
import UserDetailsForm from './components/user-details-form';
import SourceDetailsCard from './components/source-details-card';
import FinanceApprovalCard from './components/finance-approval-card';
import BusinessExceptionCard from './components/business-exception-card';
import PaymentDetailsFormCard from './components/payment-details-form-card';
import { TransactionRemarksDialog } from '../expression-of-interest/components/finance-components/transaction-remark-dialog';
import {
  mergeIomEditedFlags,
  computePointsAmounts,
  computeIomEditedFlags,
  buildIomUpdatePayload,
  mapDetailsToFormValues,
  computeBrokerageAmount,
  buildPreviewIomDetails,
  isApprovalProofRequired,
  buildIomValidationSchema,
  getAdjustmentTypeOptions,
} from './iom-form-utils';

const { generateIOM, view } = uiText.internalOfficeMemo;
const uploadFileText = uiText.EOIJson.createEOI.form.moreDetails.paymentDetails;

const formatBookingDate = (value: string) =>
  value ? dayjs(value, ['DD/MM/YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY']).format('DD-MM-YYYY') : '';

const GenerateIomView = () => {
  const dispatch: AppDispatch = useDispatch();
  const router = useRouter();
  const navigate = useNavigate();
  const { id: routeId } = useParams() as { id?: string };
  const { userRole } = useRoleBasedPermissions({ module: 'iomManagement' });
  const isCRM = userRole === ROLES.CRM || userRole === ROLES.CRM_TL;

  const iomDetails = useSelector((state: RootState) => state.iomManagement.iomDetails);
  const detailsLoading = useSelector((state: RootState) => state.iomManagement.detailsLoading);
  const submitting = useSelector((state: RootState) => state.iomManagement.submitting);
  const cancelling = useSelector((state: RootState) => state.iomManagement.cancelling);
  const rejecting = useSelector((state: RootState) => state.iomManagement.rejecting);
  const iomDropdowns = useSelector((state: RootState) => state.common.iomDropdowns);
  const isNavigatingBackFromPreview = useSelector(
    (state: RootState) => state.iomManagement.isNavigatingBackFromPreview
  );

  const adjustmentTypeOptions = useMemo(
    () => getAdjustmentTypeOptions(iomDropdowns),
    [iomDropdowns]
  );

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectRemark, setRejectRemark] = useState<{ comments?: string }>({ comments: '' });

  // Preserves preview data (seeded via setIomDetailsFromPreview) across the
  // generate-view unmount that fires when we navigate to the details view.
  const isNavigatingToPreviewRef = useRef(false);
  const skipFetchForRouteId = useRef(isNavigatingBackFromPreview ? routeId : null);

  // Generate route is CRM-only; non-CRM users (verify-iom) reuse the same view in read mode.
  const isGenerateRoute =
    typeof window !== 'undefined' ? window.location.pathname.includes('/generate-iom/') : false;

  useEffect(() => {
    if (isGenerateRoute && userRole && !isCRM) {
      router.push(generateRoleBasedRoute(userRole, 'iom-management'));
    }
  }, [isGenerateRoute, userRole, isCRM, router]);

  useEffect(() => {
    if (skipFetchForRouteId.current === routeId) {
      // In React Strict Mode, the component mounts, unmounts, and remounts immediately.
      // We avoid dispatching the Redux flag reset here so the second mount still sees it as true.
      // We clear our local ref to ensure this only skips fetch on the initial navigation.
      // The Redux flag will be cleaned up naturally by `clearIomDetails` on unmount.
      skipFetchForRouteId.current = null;
    } else if (routeId) {
      dispatch(fetchIomDetails(routeId));
    }
    return () => {
      if (!isNavigatingToPreviewRef.current) {
        dispatch(clearIomDetails());
      }
      isNavigatingToPreviewRef.current = false;
    };
  }, [dispatch, routeId]);

  useEffect(() => {
    dispatch(fetchIomDropdowns(['adjustmentType']));
  }, [dispatch]);

  const initialValues = useMemo(() => mapDetailsToFormValues(iomDetails), [iomDetails]);

  const validationSchema = useMemo(
    () => buildIomValidationSchema(initialValues, iomDetails?.payment_details),
    [initialValues, iomDetails?.payment_details]
  );

  const status = iomDetails?.status as IomStatus | undefined;
  const isEditable = Boolean(
    status &&
      ((userRole === ROLES.CRM && IOM_EDITABLE_STATUSES.has(status)) ||
        (userRole === ROLES.CRM_TL && status === IomStatus.CRM_TL_APPROVAL_PENDING))
  );
  const canDeleteIom = Boolean(isCRM && status && IOM_DELETABLE_STATUSES.has(status));
  const canSaveDraft = userRole === ROLES.CRM && status === IomStatus.IOM_TO_BE_CREATED;
  const expectedApprovalStatus = userRole
    ? IOM_APPROVAL_STATUS_BY_ROLE[userRole as ROLES]
    : undefined;
  const canRejectIom = Boolean(
    (userRole === ROLES.CRM_TL ||
      userRole === ROLES.CRM_HEAD ||
      userRole === ROLES.FINANCE_USER ||
      userRole === ROLES.FINANCE_HEAD) &&
      status &&
      expectedApprovalStatus &&
      status === expectedApprovalStatus
  );

  const handleSaveDraftSubmit = async (values: typeof initialValues) => {
    try {
      const payload = buildIomUpdatePayload(
        values,
        computeIomEditedFlags(values, initialValues),
        undefined,
        'draft'
      );
      const result = await dispatch(
        submitIomForApprovalPatch({
          iomId: iomDetails?.iom_id ?? routeId ?? '',
          payload,
        })
      );
      if (submitIomForApprovalPatch.fulfilled.match(result)) {
        toast.success(generateIOM.saveDraftSuccess);
      } else {
        toast.error(generateIOM.saveDraftError);
      }
    } catch (error) {
      console.error('Error saving IOM draft:', error);
      toast.error(generateIOM.saveDraftError);
    }
  };

  const generateIomFormik = useFormik({
    initialValues,
    validationSchema,
    enableReinitialize: true,
    validateOnMount: true,
    onSubmit: handleSaveDraftSubmit,
  });

  /**
   * Highlight fires when EITHER the server already flagged the field as edited
   * (persisted `is_*_edited` on the GET response) OR the current value diverges
   * from the original value for the three CRM-editable inputs. All other inputs
   * (computed amounts, read-only text) intentionally stay un-highlighted.
   */
  const editedFlags = useMemo(
    () =>
      mergeIomEditedFlags(
        computeIomEditedFlags(generateIomFormik.values, initialValues),
        iomDetails
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      initialValues,
      generateIomFormik.values.basicSalePrice,
      generateIomFormik.values.brokeragePercent,
      generateIomFormik.values.pointsAdjustmentType,
      iomDetails?.payment_details?.is_basic_sale_price_edited,
      iomDetails?.payment_details?.is_brokerage_edited,
      iomDetails?.payment_details?.is_points_adjustment_edited,
    ]
  );

  // Reactive calculations: brokerageAmount + points distribution.
  const {
    basicSalePrice,
    brokeragePercent,
    pointsAdjustmentType,
    pointsRatioReferrer,
    pointsRatioReferee,
    approvalProof,
    isDeviation,
  } = generateIomFormik.values;

  const isApprovalProofMandatory = useMemo(
    () =>
      isApprovalProofRequired(
        { brokeragePercent, pointsAdjustmentType, isDeviation },
        initialValues,
        iomDetails?.payment_details
      ),
    [
      brokeragePercent,
      pointsAdjustmentType,
      isDeviation,
      initialValues,
      iomDetails?.payment_details,
    ]
  );

  const arePaymentFieldsEmpty = useMemo(() => {
    const isEmpty = (v: unknown) => v === '' || v === null || v === undefined;
    const isOther = pointsAdjustmentType === PointsAdjustmentType.OTHER;
    const ratiosMissing =
      isOther && !isDeviation && (isEmpty(pointsRatioReferrer) || isEmpty(pointsRatioReferee));
    const proofMissing = isApprovalProofMandatory && isEmpty(approvalProof);
    return (
      isEmpty(basicSalePrice) ||
      isEmpty(brokeragePercent) ||
      isEmpty(pointsAdjustmentType) ||
      ratiosMissing ||
      proofMissing
    );
  }, [
    basicSalePrice,
    brokeragePercent,
    pointsAdjustmentType,
    pointsRatioReferrer,
    pointsRatioReferee,
    approvalProof,
    isDeviation,
    isApprovalProofMandatory,
  ]);

  useEffect(() => {
    const brokerage = computeBrokerageAmount(basicSalePrice, brokeragePercent);
    if (generateIomFormik.values.brokerageAmount !== brokerage) {
      generateIomFormik.setFieldValue('brokerageAmount', brokerage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basicSalePrice, brokeragePercent]);



  useEffect(() => {
    const brokerage = computeBrokerageAmount(basicSalePrice, brokeragePercent);
    const amounts = computePointsAmounts(
      brokerage,
      pointsAdjustmentType,
      pointsRatioReferrer,
      pointsRatioReferee
    );

    if (generateIomFormik.values.pointsToReferrer !== amounts.pointsToReferrer) {
      generateIomFormik.setFieldValue('pointsToReferrer', amounts.pointsToReferrer);
    }
    if (generateIomFormik.values.pointsToReferee !== amounts.pointsToReferee) {
      generateIomFormik.setFieldValue('pointsToReferee', amounts.pointsToReferee);
    }
    if (generateIomFormik.values.pointsReferrerAmount !== amounts.pointsReferrerAmount) {
      generateIomFormik.setFieldValue('pointsReferrerAmount', amounts.pointsReferrerAmount);
    }
    if (generateIomFormik.values.pointsRefereeAmount !== amounts.pointsReferreeAmount) {
      generateIomFormik.setFieldValue('pointsRefereeAmount', amounts.pointsReferreeAmount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    basicSalePrice,
    brokeragePercent,
    pointsAdjustmentType,
    pointsRatioReferrer,
    pointsRatioReferee,
  ]);

  const handleOpenDeleteDialog = () => {
    setIsDeleteConfirmOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteConfirmOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (cancelling) return;
    try {
      const result = await dispatch(cancelIom(iomDetails?.iom_id ?? routeId ?? ''));
      if (cancelIom.fulfilled.match(result)) {
        toast.success(generateIOM.deleteSuccess);
        setIsDeleteConfirmOpen(false);
        router.push(generateRoleBasedRoute(userRole, 'iom-management'));
      } else {
        toast.error(generateIOM.deleteError);
      }
    } catch (error) {
      console.error('Error deleting IOM:', error);
      toast.error(generateIOM.deleteError);
    }
  };

  const handleRejectRemark = (value: Partial<{ comments?: string }>) => {
    setRejectRemark((prev) => ({ ...prev, ...value }));
  };

  const handleOpenRejectDialog = () => {
    setRejectRemark({ comments: '' });
    setIsRejectDialogOpen(true);
  };

  const handleCloseRejectDialog = () => {
    setIsRejectDialogOpen(false);
  };

  const handleConfirmReject = async () => {
    if (rejecting) return;
    try {
      const result = await dispatch(
        rejectIom({
          iomId: iomDetails?.iom_id ?? routeId ?? '',
          reason: rejectRemark.comments?.trim() ?? '',
        })
      );
      if (rejectIom.fulfilled.match(result)) {
        toast.success(view.rejectSuccess);
        setIsRejectDialogOpen(false);
        setRejectRemark({ comments: '' });
        router.push(generateRoleBasedRoute(userRole, 'iom-management'));
      } else {
        const payload = rejectIom.rejected.match(result) ? result.payload : undefined;
        toast.error(payload || view.rejectError);
      }
    } catch (error) {
      console.error('Error rejecting IOM:', error);
      toast.error(view.rejectError);
    }
  };

  const handleBack = () => {
    router.push(generateRoleBasedRoute(userRole, 'iom-management'));
  };

  const handlePreview = () => {
    const previewId = iomDetails?.iom_id ?? routeId ?? '';
    const target = generateRoleBasedRoute(userRole, 'iom-management/view', String(previewId));
    const previewDetails = buildPreviewIomDetails(generateIomFormik.values, iomDetails);
    // Seed the preview snapshot + flag in Redux BEFORE navigating, then keep
    // the cleanup of this view from wiping them out as it unmounts.
    isNavigatingToPreviewRef.current = true;
    dispatch(setIomDetailsFromPreview(previewDetails));
    navigate(target);
  };

  const handleDelete = async (fieldName: any, _index: any, deleteKey?: any) => {
    try {
      await dispatch(deleteImage({ key: deleteKey }));
      if (iomDetails?.iom_id && deleteKey) {
        await dispatch(
          deleteIomApprovalProof({
            iomId: iomDetails.iom_id,
            approvalProofUrl: String(deleteKey),
          })
        );
      }
      generateIomFormik.setFieldValue(fieldName, null);
      toast?.success(generateIOM.deleteProofSuccess);
    } catch (error) {
      toast.error(uploadFileText.fileErrorMsg);
      console.error('Error deleting file:', error);
    }
  };

  const showBusinessException =
    pointsAdjustmentType && pointsAdjustmentType !== PointsAdjustmentType.ONE_ONE;

  const businessExceptionDescription = useMemo(() => {
    const referrerPercent = Number(generateIomFormik.values.pointsToReferrer) || 0;
    return generateIOM.businessExceptionText.replace('{percent}', String(referrerPercent));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generateIomFormik.values.pointsToReferrer]);

  if (detailsLoading || !iomDetails) {
    return (
      <DashboardContent>
        <LoadingScreen />
      </DashboardContent>
    );
  }

  const brandLogoUrl = resolveBrandCdnUrl(iomDetails.brand);

  return (
    <DashboardContent>
      <Box sx={{ ...stickyBreadcrumbsStyles, mb: 2 }}>
        <CustomBreadcrumbs
          heading={`${isCRM ? generateIOM.generate : generateIOM.verify} ${generateIOM.iom}`}
          links={[
            {
              name: uiText.internalOfficeMemo.title,
              href: generateRoleBasedRoute(userRole, 'iom-management'),
            },
            {
              name: `${isCRM ? generateIOM.generate : generateIOM.verify} ${generateIOM.iom}`,
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
      </Box>
      <form onSubmit={generateIomFormik.handleSubmit}>
        <Stack spacing={2}>
          <UserDetailsForm
            title={view.referrerDetails}
            formik={generateIomFormik}
            fieldPrefix="referrer"
          />
          <UserDetailsForm
            title={view.refereeDetails}
            formik={generateIomFormik}
            fieldPrefix="referee"
          />
          <PaymentDetailsFormCard
            formik={generateIomFormik}
            isEditable={isEditable}
            isCRM={isCRM}
            onDelete={handleDelete}
            editedFlags={editedFlags}
            adjustmentTypeOptions={adjustmentTypeOptions}
            isApprovalProofMandatory={isApprovalProofMandatory}
          />
          <SignatureCard
            preparedBy={iomDetails.prepared_by ?? { name: '', role: '' }}
            verifiedBy={iomDetails.verified_by ?? { name: '', role: '' }}
            approvedBy={iomDetails.approved_by ?? { name: '', role: '' }}
          />
          {showBusinessException && (
            <BusinessExceptionCard variant="view" description={businessExceptionDescription} />
          )}
          <FinanceApprovalCard
            verifiedBy={iomDetails.finance_verified_by ?? { name: '', role: '' }}
            approvedBy={iomDetails.finance_approved_by ?? { name: '', role: '' }}
          />
          <SourceDetailsCard
            sourceInSAP={iomDetails.sap_source}
            sourceInSalesforce={iomDetails.sfdc_source}
            agreementDone={formatBookingDate(iomDetails.agreement_date)}
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
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                sx={{ width: { xs: '100%', md: 'auto' } }}
              >
                {canSaveDraft && (
                  <Button
                    size="large"
                    type="submit"
                    variant="outlined"
                    startIcon={
                      <img src={bookmarkIcon} alt="save-draft" style={{ width: 20, height: 20 }} />
                    }
                    sx={{ width: { xs: '100%', md: '160px' } }}
                    disabled={submitting || arePaymentFieldsEmpty || !generateIomFormik.isValid}
                  >
                    {generateIOM.labels.saveDraft}
                  </Button>
                )}
                <Button
                  size="large"
                  variant="outlined"
                  sx={{ width: { xs: '100%', md: '160px' } }}
                  onClick={handleBack}
                >
                  {generateIOM.labels.cancel}
                </Button>
              </Stack>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                sx={{ width: { xs: '100%', md: 'auto' } }}
              >
                {canDeleteIom && (
                  <Button
                    size="large"
                    variant="outlined"
                    color="inherit"
                    startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={20} />}
                    sx={{ width: { xs: '100%', md: '160px' } }}
                    onClick={handleOpenDeleteDialog}
                    disabled={cancelling}
                  >
                    {generateIOM.labels.delete}
                  </Button>
                )}
                {canRejectIom && (
                  <Button
                    size="large"
                    variant="outlined"
                    color="error"
                    sx={{ width: { xs: '100%', md: '160px' } }}
                    onClick={handleOpenRejectDialog}
                    disabled={rejecting}
                  >
                    {view.reject}
                  </Button>
                )}
                <Button
                  size="large"
                  variant="contained"
                  className="primaryBtn"
                  sx={{ width: { xs: '100%', md: '160px' } }}
                  onClick={handlePreview}
                  disabled={submitting || arePaymentFieldsEmpty || !generateIomFormik.isValid}
                >
                  {generateIOM.labels.preview}
                </Button>
              </Stack>
            </Box>
        </Stack>
      </form>
      <ConfirmDialog
        open={isDeleteConfirmOpen}
        onClose={handleCloseDeleteDialog}
        title={generateIOM.deleteConfirmTitle}
        content={<Typography variant="body2">{generateIOM.deleteConfirmContent}</Typography>}
        cancelLabel={uiText.button.no}
        action={
          <Button
            variant="contained"
            className="primaryBtn"
            onClick={handleConfirmDelete}
            disabled={cancelling}
            sx={{ minWidth: { xs: 120, lg: 204 }, height: 48 }}
          >
            {uiText.button.yes}
          </Button>
        }
      />
      <TransactionRemarksDialog
        open={isRejectDialogOpen}
        action={IomAction.REJECT_IOM}
        remark={rejectRemark}
        setRemark={handleRejectRemark}
        onClose={handleCloseRejectDialog}
        onSubmit={handleConfirmReject}
        minCommentLength={3}
        commentsHelperText={view.rejectMinLengthHint}
      />
    </DashboardContent>
  );
};

export default GenerateIomView;
