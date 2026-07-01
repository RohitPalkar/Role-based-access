import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router';

import Link from '@mui/material/Link';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import {
  Box,
  Chip,
  Stack,
  Switch,
  Avatar,
  Divider,
  Tooltip,
  MenuList,
  MenuItem,
  Checkbox,
  TextField,
  Typography,
  IconButton,
} from '@mui/material';

import { useRouter, usePathname } from 'src/routes/hooks';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { ROLES, PRIMARY_SOURCE, BOOKING_FORM_STATUS } from 'src/utils/constant';

import { CONFIG } from 'src/config-global';
import { generateBookingFormUrl } from 'src/config/booking-form-urls';
import {
  getOpportunityList,
  getApplicantDetails,
  resetOpportunityData,
  getOpportunityDetails,
} from 'src/redux/actions/rm-panel/dashboard-actions';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { ShareFormDialog } from 'src/components/share-form-dialog';
import { usePopover, CustomPopover } from 'src/components/custom-popover';

import LinkActionBar from './link-action-bar';
import BookingFormDialog from './booking-form-dialog';
import locale from '../../../../locales/langs/en/common.json';
import PreFormIcon from '../../../../../public/assets/icons/PreForm.svg';
import OfficeUseIcon from '../../../../../public/assets/icons/OfficeUse.svg';
import BookingFormIcon from '../../../../../public/assets/icons/BookingForm.svg';

type Props = Readonly<{
  row: {
    status: string;
    unitno: string;
    Project: string;
    primarysource: string;
    Name: string;
    Id: string;
    enqrefno: string;
    Bokkingstage: string;
    SalesValue: string;
    BookingValue: string;
    isSelected?: boolean;
  };
  selected: boolean;
  onEditRow?: () => void;
  onSelectRow?: () => void;
  onDeleteRow?: () => void;
  columnVisibility?: Partial<Record<string, boolean>>;
  setIsPopupApiCall?: (value: boolean) => void;
  handleSelectRow: (checked: boolean, id: string) => void;
}>;

const STATUS_COLOR_MAP: Record<string, 'success' | 'info' | 'warning' | 'error' | 'secondary' | 'default'> = {
  [BOOKING_FORM_STATUS.SIGNED_DIGITALLY]: 'success',
  [BOOKING_FORM_STATUS.SIGNED_OFFLINE]: 'success',
  [BOOKING_FORM_STATUS.SIGNED_RM_UPLOAD]: 'info',
  [BOOKING_FORM_STATUS.PRE_BOOKING_UPLOADED]: 'info',
  [BOOKING_FORM_STATUS.FILLING_BY_RM]: 'info',
  [BOOKING_FORM_STATUS.SIGNED_OFFICE_USE]: 'info',
  [BOOKING_FORM_STATUS.IN_PROGRESS]: 'warning',
  [BOOKING_FORM_STATUS.PARTIALLY_SIGNED]: 'warning',
  [BOOKING_FORM_STATUS.NOT_SIGNED]: 'error',
  [BOOKING_FORM_STATUS.NEW]: 'secondary',
};

export function UserTableRow({
  row,
  selected,
  onEditRow,
  onSelectRow,
  onDeleteRow,
  columnVisibility = {},
  setIsPopupApiCall,
  handleSelectRow,
}: Props) {
  const popover = usePopover();
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const location = useLocation();
  const router = useRouter()

  const isCreateMultiUnit =
    location.pathname.includes('/create-multi-unit') ||
    location.pathname.includes('/edit-multi-unit');

  const { applicantData } = useAppSelector((state) => state.dashboard);
  const { user : userDetails } = useAppSelector((state) => state.auth);
  const [showBookingPopup, setShowBookingPopup] = useState(false);
  const [editReason, setEditReason] = useState('');
  const [referralEditReason, setReferralEditReason] = useState('');
  const [bookingError, setBookingError] = useState(false);
  const [isDraftEditEnabled, setIsDraftEditEnabled] = useState(false);

  const [isLoadingBookingData, setIsLoadingBookingData] = useState(false);
  const [bookingFormUrl, setBookingFormUrl] = useState('');
  const [missingValues, setMissingValues] = useState<string[]>([]);
  const [referralFormUrl] = useState('');
  const [isDraftReferralEditEnabled, setIsDraftReferralEditEnabled] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareFormType, setShareFormType] = useState<'booking' | 'referral'>('booking');
  const missingText = missingValues.join(' & ');
  const menuItems = locale.bookings.actionMenu;
  const isGroupDetailByID = location.pathname.includes('/group-details');
  const { id: groupId } = useParams(); 

  const BOOKING_FORM_DISABLED_STATUSES = [BOOKING_FORM_STATUS.NEW];

  const PRE_FORM_VISIBLE_STATUSES = [
    BOOKING_FORM_STATUS.PRE_BOOKING_UPLOADED,
    BOOKING_FORM_STATUS.NEW,
    BOOKING_FORM_STATUS.IN_PROGRESS,
  ];

  const OFFICE_USE_VISIBLE_STATUSES = [
    BOOKING_FORM_STATUS.SIGNED_DIGITALLY,
    BOOKING_FORM_STATUS.SIGNED_OFFLINE,
    BOOKING_FORM_STATUS.SIGNED_RM_UPLOAD,
    BOOKING_FORM_STATUS.SIGNED_OFFICE_USE,
  ];

  const isBookingFormDisabled =
    isLoadingBookingData || BOOKING_FORM_DISABLED_STATUSES.includes(row?.status);

  const isRM = userDetails?.role === ROLES.RM;
  const showPreForm = PRE_FORM_VISIBLE_STATUSES.includes(row?.status) && isRM;
  const showOfficeUse = OFFICE_USE_VISIBLE_STATUSES.includes(row?.status) && isRM;

  useEffect(() => {
    setIsCompleted(!!applicantData?.data?.isCompleted);
  }, [applicantData]);

  // Helper functions for better code organization and reusability
  const isReferralEligible = (): boolean =>
    row?.primarysource === PRIMARY_SOURCE.PurvaPrivilege ||
    row?.primarysource === PRIMARY_SOURCE.ProvidentPremiere;

  const hasReferrerDetails = (): boolean => !!applicantData?.data?.referrerDetails;

  const hasReferralDocuments = (): boolean => {
    const referrerDetails = applicantData?.data?.referrerDetails;
    return !!(
      referrerDetails?.signedPdf ||
      referrerDetails?.unsignedPdf ||
      referrerDetails?.isSignedOffline
    );
  };

  const shouldShowReferralForm = (): boolean => isReferralEligible();

  const shouldShowReferralEditToggle = (): boolean =>
    isReferralEligible() && hasReferrerDetails() && hasReferralDocuments();

  const hasOfficeUsePdf = (): boolean => !!applicantData?.data?.officeUsePdf && isRM;

  const handleFormEditSubmission = async (isReferral: boolean): Promise<void> => {
    try {
      await handleReset(isReferral);

      if (isReferral) {
        setReferralEditReason('');
        setIsDraftReferralEditEnabled(false);
        toast.success('Referral form reset request submitted');
      } else {
        setEditReason('');
        setIsDraftEditEnabled(false);
        toast.success('Booking form reset request submitted');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit form reset request');
    }
  };

  const handleDraftEditToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setIsDraftEditEnabled(isChecked);
    if (isChecked) {
      setIsDraftReferralEditEnabled(false);
    }
  };

  const handleDraftReferralEditToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setIsDraftReferralEditEnabled(isChecked);
    if (isChecked) {
      setIsDraftEditEnabled(false);
    }
  };
  interface ApplicantDetailsResponse {
    errors: any;
    isCompleted: boolean;
  }

  interface ResetOpportunityPayload {
    reason: string;
  }
  /* eslint-disable @typescript-eslint/no-unused-vars */

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleNavigation = async (user: any) => {
    const opportunityResponse = await dispatch(getOpportunityDetails(`/${user?.Id}`));
    const opportunitydetail = opportunityResponse?.payload as any;

    if (opportunitydetail?.error === null) {
      const response = await dispatch(getApplicantDetails(`/${user?.Id}`));
      const payload = response?.payload as ApplicantDetailsResponse;

      if (payload?.errors?.statusCode === 404 || payload?.isCompleted !== undefined) {
        const route = payload?.isCompleted
          ? `${pathname}/post-booking-form/${user?.Id}`
          : `${pathname}/pre-booking-form/${user?.Id}`;

        window.location.href = `${window.location.origin}${route}`;
      } else {
        toast.error('Something went wrong, please try again');
      }
    } else {
      toast.error('Failed to retrieve opportunity details. Please try again.');
    }
  };

  const handleReset = async (isReferral: boolean = false): Promise<void> => {
    try {
      if (!row?.Id) {
        toast.error('Invalid opportunity ID.');
        return;
      }

      const reason = isReferral ? referralEditReason : editReason;
      const payload: ResetOpportunityPayload = { reason };

      const response = await dispatch(
        resetOpportunityData({ isReferral, payload, opportunityId: row?.Id })
      );

      const result = response?.payload as { data: unknown; error: any };

      if (result?.error === null) {
        toast.success('Opportunity data reset successfully');

        // Refresh the opportunity list to reflect the changes
        dispatch(
          getOpportunityList({
            page: 1,
            limit: 10,
            search: '',
          })
        );
      } else {
        toast.error('Failed to reset opportunity data. Please try again.');
      }
    } catch (error) {
      console.error(error);
      toast.error('An unexpected error occurred. Please try again.');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleRefresh = async (user: any) => {
    try {
      const response = await dispatch(getOpportunityDetails(`/${user?.Id}`));
      const result = response?.payload as any;

      if (result?.error === null) {
        toast.success('Sales values refreshed successfully');

        dispatch(
          getOpportunityList({
            page: 1,
            limit: 10,
            search: '',
          })
        );
      } else {
        toast.error('Failed to refresh sales values');
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred while refreshing sales values');
    }
  };

  const handleShareBookingForm = (user: any) => {
    setShareFormType('booking');
    setShowShareDialog(true);
  };

  const handleShareReferralForm = (user: any) => {
    setShareFormType('referral');
    setShowShareDialog(true);
  };

  const handleCloseShareDialog = () => {
    setShowShareDialog(false);
  };

  // Helper function to get the correct URL based on available PDFs (excluding office use PDF)
  const getBookingFormUrl = (): string => {
    if (applicantData?.data?.mergedPdf) {
      return `${CONFIG?.site?.s3BasePath}/${applicantData?.data?.mergedPdf}`;
    }
    if (applicantData?.data?.signedPdf) {
      return `${CONFIG?.site?.s3BasePath}/${applicantData?.data?.signedPdf}`;
    }
    if (
      applicantData?.data?.unsignedPdf &&
      BOOKING_FORM_STATUS?.SIGNED_OFFLINE === applicantData?.data?.bookingFormStatus
    ) {
      return `${CONFIG?.site?.s3BasePath}/${applicantData?.data?.unsignedPdf}`;
    }
    return bookingFormUrl;
  };

  // Helper function to get office use PDF URL
  const getOfficeUsePdfUrl = (): string => {
    if (applicantData?.data?.officeUsePdf) {
      return `${CONFIG?.site?.s3BasePath}/${applicantData?.data?.officeUsePdf}`;
    }
    return '';
  };

  const handleOpen = (user: any) => {
    const url = getBookingFormUrl();
    window.open(url, '_blank');

    if (applicantData?.data?.mergedPdf) {
      toast.success('Opening Merged PDF');
    } else if (applicantData?.data?.signedPdf) {
      toast.success('Opening Signed PDF');
    } else if (
      applicantData?.data?.unsignedPdf &&
      BOOKING_FORM_STATUS?.SIGNED_OFFLINE === applicantData?.data?.bookingFormStatus
    ) {
      toast.success('Opening Unsigned PDF');
    } else {
      toast.success('Opening Booking Form');
    }
  };

  const handleOpenOfficeUsePdf = () => {
    const url = getOfficeUsePdfUrl();
    if (url) {
      window.open(url, '_blank');
      toast.success('Opening Office Use PDF');
    }
  };

  // Helper function to get the correct referral form URL based on available PDFs
  const getReferralFormUrl = (): string => {
    const referrerDetails = applicantData?.data?.referrerDetails;

    if (!hasReferrerDetails()) {
      return referralFormUrl || `${CONFIG.site.referralForm}/${row?.Id}`;
    }

    // Prioritize signed PDF first
    if (referrerDetails?.signedPdf) {
      return `${CONFIG?.site?.s3BasePath}/${referrerDetails.signedPdf}`;
    }

    // Then unsigned PDF if signed offline
    if (referrerDetails?.unsignedPdf && referrerDetails?.isSignedOffline) {
      return `${CONFIG?.site?.s3BasePath}/${referrerDetails.unsignedPdf}`;
    }

    // Fallback to referral form URL
    return referralFormUrl || `${CONFIG.site.referralForm}/${row?.Id}`;
  };

  const handleOpenReferral = (user: any) => {
    if (!applicantData?.data) {
      toast.error('No applicant data available. Please try refreshing.');
      return;
    }

    const url = getReferralFormUrl();
    window.open(url, '_blank');

    // Show appropriate toast message based on which PDF is being opened
    const referrerDetails = applicantData?.data?.referrerDetails;
    if (referrerDetails?.signedPdf) {
      toast.success('Opening Referral Form Signed PDF');
    } else if (referrerDetails?.unsignedPdf && referrerDetails?.isSignedOffline) {
      toast.success('Opening Referral Form Unsigned PDF');
    } else {
      toast.success('Opening Referral Form');
    }
  };

  const handleBookingForm = async (user: any) => {
    setIsLoadingBookingData(true);

    // Mark this as a popup API call to prevent global loader
    if (setIsPopupApiCall) {
      setIsPopupApiCall(true);
    }

    // Call opportunity API to get fresh data
    try {
      const response = await dispatch(getOpportunityDetails(`/${user?.Id}`));
      const result = response?.payload as any;
      const applicantResponse = await dispatch(getApplicantDetails(`/${user?.Id}`));
      const applicantResult = applicantResponse?.payload as any;

      if (result?.error === null) {
        // Check if booking amount is missing from fresh data
        const freshBookingValue = result?.data?.data?.BookingAmountAsPerAgreement;    // Booking Amount
        const saleValue = result?.data?.data?.TotalAgreementValue;                    // Sale Value
                   
        const hasBookingError = freshBookingValue === 'N/A' || !freshBookingValue;
        const hasSalesError = saleValue === 'N/A' || !saleValue;

        const missingFields: string[] = [];
        if (hasSalesError) missingFields?.push('Sale Value');
        if (hasBookingError) missingFields?.push('Booking Amount');

        if (missingFields?.length > 0) {
          setMissingValues(missingFields);
          setBookingError(true); // open Error Popup
        } else {
          setBookingError(false);
          setShowBookingPopup(true); // open Booking Form Popup
        }

        const dynamicUrl = generateBookingFormUrl(
          result?.data?.data?.projectBrandName,
          user?.Id,
          isGroupDetailByID ? groupId : undefined
        );       
      setBookingFormUrl(dynamicUrl);
      } else {
        setBookingError(false); // Set error to true when API fails
        setBookingFormUrl('');
        toast.error('Failed to fetch latest opportunity data');
      }
    } catch (error) {
      console.error(error);
      setBookingError(false); // Set error to true when exception occurs
      setBookingFormUrl('');
      toast.error('Error fetching opportunity data');
    } finally {
      setIsLoadingBookingData(false);
      if (setIsPopupApiCall) {
        setIsPopupApiCall(false);
      }
      popover.onClose();
    }
  };

  return (
    <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
      {/* Project Name */}
      {isCreateMultiUnit && (
        <TableCell>
          <Checkbox
            sx={{ width: '40px' }}
            checked={row?.isSelected}
            onChange={(e) => {
              handleSelectRow(e.target.checked, row.Id);
            }}
            disabled={row?.status !==BOOKING_FORM_STATUS.NEW}
          />
        </TableCell>
      )}
      {columnVisibility?.project_name && (
        <TableCell>
          <Typography noWrap variant="body2">
            {row?.Project}
          </Typography>
        </TableCell>
      )}

      {/* Unit Number */}
      {columnVisibility?.unit_number && (
        <TableCell>
          <Typography noWrap variant="body2">
            {row?.unitno}
          </Typography>
        </TableCell>
      )}

      {/* Opportunity Details */}
      {/* Opportunity Name */}
      {columnVisibility?.oppName && (
        <TableCell>
          <Typography variant="body2" noWrap>
            {row?.Name || '-'}
          </Typography>
        </TableCell>
      )}

      {/* Opportunity ID */}
      {columnVisibility?.oppId && (
        <TableCell>
          {/* <Link
            color="#1A407D"
            underline="always"
            sx={{
              cursor: 'pointer',
              display: 'block',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            // onClick={() => handleNavigation(row)}
            onClick={() => {}}
          >
            {row?.Id || '-'}
          </Link> */}
          <Typography variant="body2" noWrap>
            {row?.Id || '-'}
          </Typography>
        </TableCell>
      )}

      {/* Enquiry Ref. No. */}
      {columnVisibility?.enqRefNo && (
        <TableCell>
          <Typography noWrap variant="body2">
            {row?.enqrefno}
          </Typography>
        </TableCell>
      )}

      {/* Booking Stage */}
      {columnVisibility?.bookingStage && (
        <TableCell sx={{ minWidth: 180 }}>
          <Typography noWrap variant="body2">
            {row?.Bokkingstage}
          </Typography>
        </TableCell>
      )}

      {/* Status */}
      {columnVisibility?.status && (
        <TableCell sx={{ minWidth: 250 }}>
          <Label
            variant="soft"
            color={STATUS_COLOR_MAP[row?.status] || 'default'}
          >
            {row?.status}
          </Label>
        </TableCell>
      )}

      {/* Sales & Booking Value */}
      {columnVisibility?.['Sales & Booking Value'] && (
        <TableCell>
          <Stack>
            <Typography variant="body2" noWrap>
              SV: {row?.SalesValue !== 'N/A' ? `₹ ${row?.SalesValue} Cr.` : 'N/A'}
            </Typography>
            <Typography variant="body2" noWrap>
              BV: {row?.BookingValue !== 'N/A' ? `₹ ${row?.BookingValue} Cr.` : 'N/A'}
            </Typography>
          </Stack>
        </TableCell>
      )}

      {/* Signature Status */}
      {columnVisibility?.['Signature Status'] && (
        <TableCell>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              variant="soft"
              clickable
              label="TL"
              avatar={
                <Avatar alt="TL" sx={{ bgcolor: 'success.main' }}>
                  <Iconify icon="eva:checkmark-outline" width={12} />
                </Avatar>
              }
              color="success"
              size="small"
            />
            <Chip
              variant="soft"
              clickable
              label="RSH"
              avatar={
                <Avatar alt="RSH" sx={{ bgcolor: 'success.main' }}>
                  <Iconify icon="eva:checkmark-outline" width={12} />
                </Avatar>
              }
              color="warning"
              size="small"
            />{' '}
            <Chip
              variant="soft"
              clickable
              label="BH"
              avatar={
                <Avatar alt="BH" sx={{ bgcolor: 'success.main' }}>
                  <Iconify icon="eva:checkmark-outline" width={12} />
                </Avatar>
              }
              color="warning"
              size="small"
            />
          </Stack>
        </TableCell>
      )}

      {/* Action */}
      {!isCreateMultiUnit && columnVisibility?.Action && (
        <TableCell>
          <Stack direction="row" alignItems="center">
            <Tooltip title="Action">
              <IconButton color={popover.open ? 'inherit' : 'default'} onClick={popover.onOpen}>
                <Iconify icon="eva:more-vertical-fill" />
              </IconButton>
            </Tooltip>
          </Stack>
          {/* Reset Confirmation Dialog */}
          {showBookingPopup && (
            <BookingFormDialog
              open={showBookingPopup}
              onClose={() => {
                setShowBookingPopup(false);
                setEditReason(''); // Clear edit reason when dialog is closed
                setIsDraftEditEnabled(false); // Reset draft edit toggle
              }}
              title='Booking Form'
              formStatusLabel={row?.status === BOOKING_FORM_STATUS.IN_PROGRESS ? 'Form fill in progress' : undefined}
              content={
                <>
                {/* 1. Section: Customer Booking Form */}
                <LinkActionBar
                  title={isCompleted ? 'Filled out form link (Customer)' : 'Booking Form link'}
                  bookingError={bookingError}
                  showQRCode
                  getUrl={getBookingFormUrl}
                  handleOpen={() => handleOpen(row)}
                  handleShare={() => handleShareBookingForm(row)}
                  copyMessageFn={() => {
                    if (applicantData?.data?.mergedPdf) return 'Merged PDF URL copied to clipboard';
                    if (applicantData?.data?.signedPdf) return 'Signed PDF URL copied to clipboard';
                    if (
                      applicantData?.data?.unsignedPdf &&
                      BOOKING_FORM_STATUS?.SIGNED_OFFLINE === applicantData?.data?.bookingFormStatus
                    )
                      return 'Unsigned PDF URL copied to clipboard';
                    return 'Booking Form URL copied to clipboard';
                  }}
                />
                {/* 2. Section: Referral Form - Only show if referral is eligible */}
                {shouldShowReferralForm() && (
                  <LinkActionBar
                    title="Referral Form"
                    bookingError={bookingError}
                    getUrl={getReferralFormUrl}
                    handleOpen={() => handleOpenReferral(row)}
                    handleShare={() => handleShareReferralForm(row)}
                    copyMessageFn={() => {
                      const referrer = applicantData?.data?.referrerDetails;
                      if (referrer?.signedPdf) return 'Referral Form Signed PDF URL copied to clipboard';
                      if (referrer?.unsignedPdf && referrer?.isSignedOffline)
                        return 'Referral Form Unsigned PDF URL copied to clipboard';
                      return 'Referral Form URL copied to clipboard';
                    }}
                  />
                  )
                }
                {/* 3. Section: Office Use PDF - Only show if office use PDF exists */}
                {hasOfficeUsePdf() && (
                  <LinkActionBar
                    title="Office Use PDF"
                    bookingError={bookingError}
                    getUrl={getOfficeUsePdfUrl}
                    handleOpen={handleOpenOfficeUsePdf}
                    hideShare
                    copyMessageFn={() => 'Office Use PDF URL copied to clipboard'}
                  />
                )}
                {isRM && isCompleted && (
                    <>
                      <Divider sx={{ mt: 2, borderStyle: 'dashed', borderColor: '#DADADA' }} />
                      {/* Edit booking form draft */}
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Switch
                          checked={isDraftEditEnabled}
                          onChange={handleDraftEditToggle}
                          disabled={bookingError}
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': { color: '#00368C' },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: '#00368C',
                            },
                            '&.Mui-disabled': {
                              opacity: 1, // keep visible
                            },
                            '&.Mui-disabled .MuiSwitch-thumb': {
                              color: '#BDBDBD', // gray thumb when disabled
                            },
                            '&.Mui-disabled .MuiSwitch-track': {
                              backgroundColor: '#E0E0E0', // light gray track
                              opacity: 1,
                            },
                          }}
                        />
                        <Typography
                          variant="body2"
                          color={bookingError ? 'text.disabled' : 'text.primary'}
                        >
                          Edit booking form draft
                        </Typography>
                      </Stack>

                      {/* Hint text below switch */}
                      {applicantData?.data?.isPhysicalDocSubmitted &&
                        (applicantData?.data?.signedPdf || applicantData?.data?.unsignedPdf) && (
                          <Typography
                            variant="body2"
                            sx={{ color: '#6B7280', fontSize: '0.75rem', textAlign: 'left' }}
                          >
                            Before proceeding to edit the booking application form, please upload
                            the KYC documents or payment proof submitted offline by the customer.
                            This will ensure the form is complete and up to date before it is edited
                            and sent to the applicants for signature.{' '}
                            <Link
                              href={`${pathname}/post-booking-form/${row?.Id}`}
                              underline="hover"
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ fontWeight: 'bold' }}
                            >
                              Link
                            </Link>
                          </Typography>
                        )}
                    </>
                  )}

                  {/* Referral Form Toggle - Only show if referral edit is eligible */}
                  {shouldShowReferralEditToggle() && (
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Switch
                        checked={isDraftReferralEditEnabled}
                        onChange={handleDraftReferralEditToggle}
                        disabled={bookingError}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': { color: '#00368C' },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: '#00368C',
                          },
                          '&.Mui-disabled': {
                            opacity: 1, // keep visible
                          },
                          '&.Mui-disabled .MuiSwitch-thumb': {
                            color: '#BDBDBD', // gray thumb when disabled
                          },
                          '&.Mui-disabled .MuiSwitch-track': {
                            backgroundColor: '#E0E0E0', // light gray track
                            opacity: 1,
                          },
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                        color={bookingError ? 'text.disabled' : 'text.primary'}
                      >
                        Edit referral form draft
                      </Typography>
                    </Stack>
                  )}

                  {/* Conditional Form Edit Section */}
                  {(isDraftEditEnabled || isDraftReferralEditEnabled) && (
                    <Box sx={{ borderRadius: 1 }}>
                      {/* Instruction text */}
                      <Typography
                        variant="body2"
                        sx={{ fontSize: '0.875rem', textAlign: 'left', fontWeight: 'bold' }}
                      >
                        Write the reason for edit in the{' '}
                        {isDraftEditEnabled ? 'Booking' : 'Referral'} Form.
                      </Typography>

                      {/* Text field for reason */}
                      <TextField
                        fullWidth
                        placeholder="Enter reason"
                        multiline
                        rows={4}
                        value={isDraftEditEnabled ? editReason : referralEditReason}
                        onChange={(e) =>
                          isDraftEditEnabled
                            ? setEditReason(e.target.value)
                            : setReferralEditReason(e.target.value)
                        }
                        inputProps={{ maxLength: 500 }}
                        helperText={`${(isDraftEditEnabled ? editReason : referralEditReason).length}/500 characters`}
                        sx={{ my: 1 }}
                      />

                      {/* Submit button */}
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                        <Button
                          variant="contained"
                          disabled={isDraftEditEnabled ? !editReason : !referralEditReason}
                          onClick={() => handleFormEditSubmission(!isDraftEditEnabled)}
                          sx={{
                            bgcolor: '#1A407D',
                            color: 'white',
                            fontSize: '0.875rem',
                            height: '42px',
                            width: { xs: '100%', sm: '120px' },
                          }}
                        >
                          Submit
                        </Button>
                      </Box>
                    </Box>
                  )}
              </>
              }
              action={null}
            /> 
          )}
        </TableCell>
      )}
      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList>
          {showPreForm && (
            <MenuItem
              onClick={() => {
                popover.onClose();
                window.location.href = `${window.location.origin}/rm-panel/bookings/pre-booking-form/${row?.Id}`;
              }}
            >
              <Box
                component="img"
                src={PreFormIcon}
                alt={menuItems.preForm}
                sx={{ width: 20, height: 20, mr: 0.1 }}
              />
              {menuItems.preForm}
            </MenuItem>
          )}

          <MenuItem
            disabled={isBookingFormDisabled}
            onClick={async () => {
              handleBookingForm(row);
            }}
          >
            <Box
              component="img"
              src={BookingFormIcon}
              alt={menuItems.bookingForm}
              sx={{ width: 20, height: 20, mr: 0.1 }}
            />
            {isLoadingBookingData ? 'Loading...' : menuItems.bookingForm}
          </MenuItem>

          {(!isGroupDetailByID && isRM) && (
            <MenuItem
              onClick={() => router.push(`/rm-panel/manage-applicants/${row?.Id}`)}
              disabled={
                row?.status === BOOKING_FORM_STATUS?.IN_PROGRESS ||
                row?.status === BOOKING_FORM_STATUS.NEW ||
                row?.status === BOOKING_FORM_STATUS.PRE_BOOKING_UPLOADED
              }
            >
              <Box
                component="img"
                src={OfficeUseIcon}
                alt={menuItems.manageApplicants}
                sx={{ width: 20, height: 20, mr: 0.1 }}
              />
              {menuItems.manageApplicants}
            </MenuItem>
          )}

          {showOfficeUse && (
            <MenuItem
              onClick={() => {
                popover.onClose();
               window.location.href = `${window.location.origin}/rm-panel/bookings/post-booking-form/${row?.Id}`;
              }}
            >
              <Box
                component="img"
                src={OfficeUseIcon}
                alt={menuItems.officeUse}
                sx={{ width: 20, height: 20, mr: 0.1 }}
              />
              {menuItems.officeUse}
            </MenuItem>
          )}
        </MenuList>
      </CustomPopover>

      <ShareFormDialog
        open={showShareDialog}
        onClose={handleCloseShareDialog}
        opportunityId={row?.Id}
        formType={shareFormType}
        title="Share"
      />
      <BookingFormDialog
        open={bookingError}
        onClose={() => setBookingError(false)}
        title={locale.bookingFormLinkDialog.title}
        content={
          <Typography sx={{ fontSize: '14px', fontWeight: 400, mb: 2, textAlign: 'justify' }}>
              {locale.bookingFormLinkDialog.description1} {missingText} {locale.bookingFormLinkDialog.description2} 
          </Typography>
        }
        action={
          <Button
            variant="contained"
            size='large'
            onClick={() => setBookingError(false)}
            sx={{ textTransform: 'none', 
              backgroundColor: "#1A407D",
              px: 6,
              '&:hover': {
                  backgroundColor: '#174A9D',
              },
           }}
          >
            {locale.bookingFormLinkDialog.action}
          </Button>
        }
      />
    </TableRow>
  );
}