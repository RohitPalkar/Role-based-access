import type { Agreement } from 'src/types/crm/agreement';

import { toast } from 'sonner';
import { useState } from 'react';

import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import { Box , Stack, Button, Tooltip, Typography, IconButton } from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { useAppDispatch } from 'src/hooks/use-redux';

import { generateRoleBasedRoute } from 'src/utils/constant';

import { CONFIG } from 'src/config-global';
import uiText from 'src/locales/langs/en/common.json';
import { signInternalSignatory } from 'src/redux/slices/crm/agreement-slice';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { usePopover, CustomPopover } from 'src/components/custom-popover';

import Edit from '../../../../../public/assets/icons/pen-shape.svg';
import openIcon from '../../../../../public/assets/icons/OpenIcon.svg';
import copyIcon from '../../../../../public/assets/icons/copyIcon.svg';
import Signature from '../../../../../public/assets/icons/Signature.svg';
import LinkIcon from '../../../../../public/assets/icons/navbar/linkicon.svg';

// ----------------------------------------------------------------------

type Props = Readonly<{
  row: Agreement;
  selected: boolean;
  onEditRow?: () => void;
  onSelectRow?: () => void;
  onDeleteRow?: () => void;
  columnVisibility?: Partial<Record<string, boolean>>;
  actionPermissions?: Record<string, boolean>;
  userRole: string | null;
}>;

function formatToIST(isoString: string): string {
  if (!isoString) return '';

  const date = new Date(isoString);

  const formatted = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);

  // Ensure AM/PM is uppercase
  return formatted.replace(/\bam\b/, 'AM').replace(/\bpm\b/, 'PM');
}

const AgreementSignatorySignature = {
  SIGNED: 'Signed',
  NOT_SIGNED: 'Pending',
  SIGN_NOW: 'Sign Now',
  SENT_FOR_SIGNATURE: 'Sent for Signature',
};

const DocumentStatus = {
  IN_PROGRESS: 'Doc. Setup in Progress',
  SENT_FOR_SIGNATURE: 'Sent For Signature',
  CUSTOMER_PARTIALLY_SIGNED: 'Cx: Partially Signed',
  CUSTOMER_DIGITALLY_SIGNED: 'Cx: Signed',
  SIGNED: 'CRM: Signed',
};

const getStatusColor = (status: string) => {
  switch (status) {
    case AgreementSignatorySignature.NOT_SIGNED:
      return '#fff';
    case AgreementSignatorySignature.SIGN_NOW:
      return '#fff';
    case DocumentStatus.SENT_FOR_SIGNATURE:
      return 'rgba(81, 25, 183, 1)';
    case AgreementSignatorySignature.SIGNED:
      return '#fff';
    case DocumentStatus.CUSTOMER_DIGITALLY_SIGNED:
      return 'rgba(0, 120, 103, 1)';
    case DocumentStatus.CUSTOMER_PARTIALLY_SIGNED:
      return 'rgba(183, 110, 0, 1)';
    case DocumentStatus.SIGNED:
      return 'rgba(0, 120, 103, 1)';
    case DocumentStatus.IN_PROGRESS:
      return 'rgba(183, 110, 0, 1)';

    default:
      return 'default';
  }
};

const getStatusBgColor = (status: string) => {
  switch (status) {
    case AgreementSignatorySignature.SIGNED:
      return 'rgba(0, 167, 111, 1)';
    case AgreementSignatorySignature.NOT_SIGNED:
      return 'rgba(255, 86, 48, 1)';
    case AgreementSignatorySignature.SIGN_NOW:
      return 'rgba(0, 184, 217, 1)';
    case DocumentStatus.SENT_FOR_SIGNATURE:
      return 'rgba(142, 51, 255, 0.16)';
    case DocumentStatus.CUSTOMER_DIGITALLY_SIGNED:
      return 'rgba(0, 167, 111, 0.16)';
    case DocumentStatus.CUSTOMER_PARTIALLY_SIGNED:
      return 'rgba(255, 171, 0, 0.16)';
    case DocumentStatus.SIGNED:
      return 'rgba(0, 167, 111, 0.16)';
    case DocumentStatus.IN_PROGRESS:
      return 'rgba(255, 171, 0, 0.16)';

    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  if (status?.toLowerCase() === 'signed') {
    return 'Signed';
  }
  return status || 'Unknown';
};

const triggerDownload = (url: string) => {
  const fileName = url.split('/').pop() || 'Agreement.pdf';

  const a = document.createElement('a');
  a.href = url;
  a.setAttribute('download', fileName); // try to force save
  a.target = '_blank'; // fallback, ensures cross-origin works better
  document.body.appendChild(a);
  a.click();
  a.remove();
};

const handleDownload = async (fileName: string) => {
  const fileUrl = `${CONFIG.site.s3BasePath}/${fileName}`;
  triggerDownload(fileUrl);
};

const SignatorySignatureCell = ({ 
  row, 
  onSignNow, 
}: { 
  row: Agreement, 
  onSignNow: (id: number) => void,
}) => {
  if (!row?.internalSignatorySignature || row?.internalSignatorySignature === '-') {
    return <TableCell>-</TableCell>;
  }

  return (
    <TableCell>
      <Label
        variant="soft"
        sx={{
          color: getStatusColor(row.internalSignatorySignature),
          bgcolor: getStatusBgColor(row.internalSignatorySignature),
          cursor: row.internalSignatorySignature === 'Sign now' ? 'pointer' : 'default',
        }}
        onClick={() => {
          if (row.internalSignatorySignature === 'Sign now') {
            onSignNow(row.id);
          }
        }}
      >
        {getStatusLabel(row.internalSignatorySignature)}
      </Label>
    </TableCell>
  );
};

export function AgreementTableRow({
  row,
  selected,
  onEditRow,
  onSelectRow,
  onDeleteRow,
  columnVisibility = {},
  actionPermissions = {},
  userRole,
}: Props) {
  const { signNow, edit, download, viewLink } = actionPermissions;
  const popover = usePopover();
  const dispatch = useAppDispatch();
  const route = useRouter();
  const [linkModal, setLinkModal] = useState(false);

  const handleSignNow = async (id: number) => {
    dispatch(
      signInternalSignatory({
        id, // dynamic id
      })
    )
      .unwrap()
      .then((res) => {
        toast.success(res || `Signature process for Internal Signatory initiated successfully.`);
      })
      .catch((err) => {
        toast.error(`Signature process failed: ${err}`);
        console.error('❌ s:', err);
      });
  };


  return (
    <>
      <TableRow hover selected={selected}>
        {/* Project Name */}
        {columnVisibility.projectName && (
          <TableCell>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Stack>
                <Typography variant="subtitle2" noWrap>
                  {row.projectName || '-'}
                </Typography>
              </Stack>
            </Stack>
          </TableCell>
        )}

        {/* Opportunity Id */}
        {columnVisibility.opportunityId && (
          <TableCell>
            <Typography variant="body2" noWrap>
              {row.opportunityId || '-'}
            </Typography>
          </TableCell>
        )}

        {/* Unit Number */}
        {columnVisibility.unitNo && (
          <TableCell>
            <Typography variant="body2" noWrap>
              {row.unitNo || '-'}
            </Typography>
          </TableCell>
        )}  

        {/* Agreement Date */}
        {columnVisibility.applicantName && (
          <TableCell>
            <Typography variant="body2" noWrap>
              {row.applicantName ? row.applicantName : '-'}
            </Typography>
          </TableCell>
        )}

        {/* Agreement Value */}
        {columnVisibility.numberOfApplicants && (
          <TableCell>
            <Typography variant="body2" noWrap>
              {row.numberOfApplicants ? row.numberOfApplicants : '-'}
            </Typography>
          </TableCell>
        )}

        {/* Status */}

        {columnVisibility.documentType && (
          <TableCell>
            <Typography variant="body2" noWrap>
              {row?.documentType ? row?.documentType : '-'}
            </Typography>
          </TableCell>
        )}

        {columnVisibility.documentName && (
          <TableCell>
            <Typography variant="body2" noWrap>
              {row?.documentName ? row?.documentName : '-'}
            </Typography>
          </TableCell>
        )}
        {columnVisibility.documentStatus && (
          <TableCell>
            <Label
              variant="soft"
              sx={{
                color: getStatusColor(row.documentStatus),
                bgcolor: getStatusBgColor(row.documentStatus),
              }}
            >
              {getStatusLabel(row.documentStatus)}
            </Label>
          </TableCell>
        )}

        {columnVisibility.sentDate && (
          <TableCell>
            <Typography variant="body2" noWrap>
              {row.sentDate ? formatToIST(row.sentDate) : '-'}
            </Typography>
          </TableCell>
        )}
        {columnVisibility.signedAt && (
          <TableCell>
            <Typography variant="body2" noWrap>
              {row.signedAt ? formatToIST(row.signedAt) : '-'}
            </Typography>
          </TableCell>
        )}
        {columnVisibility.internalSignatory && (
          <TableCell>
            <Typography variant="body2" noWrap>
              {row.internalSignatory ? row.internalSignatory : '-'}
            </Typography>
          </TableCell>
        )}
        {columnVisibility.internalSignatorySignature && (
          <SignatorySignatureCell
            row={row}
            onSignNow={handleSignNow}
          />
        )}
        {columnVisibility.rmName && (
          <TableCell>
            <Typography variant="body2" noWrap>
              {row.rmName ? row.rmName : '-'}
            </Typography>
          </TableCell>
        )}


        {/* Actions */}
        {columnVisibility.Action && (
          <TableCell align="right">
            <Stack direction="row" alignItems="center">
              <IconButton color={popover.open ? 'inherit' : 'default'} onClick={popover.onOpen}>
                <Iconify icon="eva:more-vertical-fill" />
              </IconButton>
            </Stack>
          </TableCell>
        )}
      </TableRow>

      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <Stack>
          {signNow && (
            <Box
              component="div"
              onClick={() => {
                if (row.internalSignatoryRedirection) {
                  popover.onClose();
                  window.open(row.internalSignatoryRedirection, '_blank', 'noopener,noreferrer');
                }
              }}
              sx={{
                p: 1,
                gap: 1,
                display: 'flex',
                cursor: 'pointer',
                alignItems: 'center',
                '&:hover': { backgroundColor: 'action.hover' },
              }}
            >
              <Box
                component="img"
                src={Signature}
                alt="Edit"
                sx={{
                  width: 20,
                  height: 20,
                  opacity: row.internalSignatoryRedirection ? '1' : '0.4',
                }}
              />{' '}
              <Typography sx={{ color: row.internalSignatoryRedirection ? '#000' : '#A0A0A0' }}>
                Sign Now
              </Typography>
            </Box>
          )}
          {edit && (
            <Box
              component="div"
              onClick={() => {
                if (row.documentStatus === DocumentStatus?.IN_PROGRESS) {
                  route.push(generateRoleBasedRoute(userRole, `/dashboard/${row.id}`));
                }
              }}
              sx={{
                p: 1,
                gap: 1,
                display: 'flex',
                cursor: 'pointer',
                alignItems: 'center',
                '&:hover': { backgroundColor: 'action.hover' },
              }}
            >
              <Box
                component="img"
                src={Edit}
                alt="Edit"
                sx={{
                  width: 20,
                  height: 20,
                  opacity: row.documentStatus === DocumentStatus?.IN_PROGRESS ? '1' : '0.4',
                }}
              />{' '}
              <Typography
                sx={{
                  color: row.documentStatus === DocumentStatus?.IN_PROGRESS ? '#000' : '#A0A0A0',
                }}
              >
                Edit
              </Typography>
            </Box>
          )}

          {/* Sign Now */}

          {/* Download */}

          {download && (
            <Box
              component="div"
              onClick={() => {
                popover.onClose();
                if (row?.signedPdf) {
                  handleDownload(`${row?.signedPdf}`); // or any filename logic
                }
              }}
              sx={{
                p: 1,
                gap: 1,
                display: 'flex',
                cursor: 'pointer',
                alignItems: 'center',
                color: row.signedPdf ? '#000' : '#A0A0A0',
                '&:hover': { backgroundColor: 'action.hover' },
              }}
            >
              <Iconify icon="eva:download-fill" />
              Signed PDF
            </Box>
          )}

          {/* View Link */}
          {viewLink && (
            <Box
              component="div"
              onClick={() => {
                popover.onClose();
                setLinkModal(true)
              }}
              sx={{
                p: 1,
                gap: 1,
                display: 'flex',
                cursor: 'pointer',
                alignItems: 'center',
                '&:hover': { backgroundColor: 'action.hover' },
              }}
            >
              <Box
                component="img"
                src={LinkIcon}
                alt="View Link"
                sx={{
                  width: 20,
                  height: 20,
                }}
              />{' '}
              <Typography>
                View Link
              </Typography>
            </Box>
          )}
        </Stack>
      </CustomPopover>

      {/* View Link Modal */}
      <ConfirmDialog
        title="View Link"
        open={linkModal}
        onClose={() => setLinkModal(false)}
        showCancel={false}
        showDivider
        leftAlignTitle
        content={
          <Stack 
            spacing={2} 
            sx={{
              width: '100%',
              minWidth: { xs: '280px', sm: '400px' },
              maxWidth: { xs: '90vw', sm: '500px' },
            }}
          >
            {row?.inviteesData?.length ? (
              row?.inviteesData.map((invitee, index) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }} key={invitee?.signUrl || index}>
                <Typography sx={{ fontSize: '14px', fontWeight: 400 }}>
                  Applicant {index + 1}:{' '}
                  <Box component="span" sx={{ fontWeight: 600 }}>
                    {invitee?.name || 'N/A'}
                  </Box>
                </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {/* Copy Link */}
                    <Tooltip title="Copy URL">
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          if (!invitee?.signUrl) return;
                          navigator.clipboard.writeText(invitee?.signUrl);
                          toast.success("Link copied to clipboard");
                        }}
                        color="primary"
                        sx={{
                          flex: { xs: 1, sm: 'none' },
                          height: '36px',
                          padding: '6px',
                        }}
                      >
                        <Box
                          component="img"
                          src={copyIcon}
                          alt="Copy"
                          sx={{ width: 20, height: 20 }}
                        />
                      </Button>
                    </Tooltip>

                    {/* Open Link */}
                    <Tooltip title="Open in new tab">
                      <Button
                        variant="outlined"
                        size="small"
                        color="primary"
                        sx={{
                          flex: { xs: 1, sm: 'none' },
                          height: '36px',
                          padding: '6px',
                        }}
                        onClick={() => {
                          if (!invitee?.signUrl) return;
                          window.open(invitee?.signUrl, '_blank');
                        }}
                      >
                        <Box
                          component="img"
                          src={openIcon}
                          alt="Open"
                          sx={{ width: 20, height: 20 }}
                        />
                      </Button>
                    </Tooltip>
                  </Box>
                </Box>
              ))
            ) : (
              <Typography sx={{ fontSize: '14px' }}>No links available</Typography>
            )}
          </Stack>
        }
        action={
          <Button
            variant="outlined"
            sx={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#1A407D',
              minWidth: '120px',
              height: '48px',
              margin: 0,
            }}
            onClick={() => setLinkModal(false)}
          >
            {uiText.button.cancel}
          </Button>
        }
      />
    </>
  );
}