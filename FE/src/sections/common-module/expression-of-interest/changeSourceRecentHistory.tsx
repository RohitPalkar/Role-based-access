import type { Theme, SxProps } from '@mui/material';

import { useFormik } from 'formik';
import React, { useMemo, useState } from 'react';

import CloseIcon from '@mui/icons-material/Close';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import { Box , Card , Grid , Table ,  Dialog , Collapse, TableRow, TableBody, TableCell, Typography, CardHeader, IconButton, CardContent } from '@mui/material';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { SOURCE_CHANGE_REQUEST_OPTIONS } from 'src/utils/constant';
import { roleColumnsToDefinitions } from 'src/utils/role-table-head';
import { getTableStyles, calculateTableMinWidth, fixedFooterPaginationStyles, scrollableTableContentStyles } from 'src/utils/table-styles';

import { CONFIG } from 'src/config-global';
import uiText from 'src/locales/langs/en/common.json';

import { Label } from 'src/components/label';
import { Field } from 'src/components/hook-form';
import { Scrollbar } from 'src/components/scrollbar';
import { FormikTextField } from 'src/components/formik-textfield/formik-textfield';
import { TableNoData, TableHeadCustom, TablePaginationCustom } from 'src/components/table';

import ReviewInput from './components/review-components/review-input';

const getLabelFromValue = (value: string) =>  SOURCE_CHANGE_REQUEST_OPTIONS.find(
    option => option.value === value
  )?.label;

// get status bkg color
const getStatusColor = (
  column: string,
  statusValue: string
):
  | 'default'
  | 'primary'
  | 'secondary'
  | 'info'
  | 'success'
  | 'warning'
  | 'error' => {
  if (!statusValue || !column) return 'default';

  // For RecentHistory we only care about "status"
  if (column === 'status') {
    switch (statusValue) {
      case 'Approved':
        return 'success';
      case 'Rejected':
        return 'error';
      case 'Requested':
        return 'warning';
      default:
        return 'default';
    }
  }

  return 'default';
};

// table scrollbar styles
const tableScrollbarStyles: SxProps<Theme> = {
  '& .simplebar-content': {
    display: 'flex',
    flexDirection: 'column'
  }
};

const ChangeSourceRecentHistory = ({ History, voucherData }: any) => {
  const [open, setOpen] = React.useState(true);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [openRowId, setOpenRowId] = useState<number | null>(null);
  const [openProofDialog, setOpenProofDialog] = useState(false);
  const [proofImage, setProofImage] = useState<string>('');
  const { changeSource } = uiText.EOIJson;
  const { basicDetails } = uiText.EOIJson.createEOI.form;
  // History Row Type
  type HistoryRowType = typeof History[number];

  const {
    columns: roleColumns = [],
  } = useRoleBasedPermissions({ module: 'ChangeSourceRecentHistory' });

  const tableHeadFromRole = useMemo(
    () => roleColumnsToDefinitions(roleColumns),
    [roleColumns]
  );
  const columnManager = useColumnManager(tableHeadFromRole);
  const { visibleColumns } = columnManager;
  const dynamicMinWidth = calculateTableMinWidth(visibleColumns || tableHeadFromRole);

  // paginated data 
  const paginatedData = History?.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  // formik initialization
    const recentHistoryFormik = useFormik({
    initialValues: {
        changeSource: '',
        reason: '',
        reviewerRemark: '',
        reviewedAt: '',
        createdAt: '',
        status: '',
        approvalProof: '',
        currentData: {
            countryCode: '+91',
            contactNumber: '',
            uniqueReferenceId: '',
            firstName: '',
            lastName: '',
            emailId: '',
            primarySource: '',
            amountPaid: 0,
        },
        newData: {
            countryCode: '+91',
            contactNumber: '',
            uniqueReferenceId: '',
            firstName: '',
            lastName: '',
            emailId: '',
            primarySource: '',
            amountPaid: 0,
        },
        targetPRID: '',
        targetEnquiryId: '',
    },
        onSubmit: (values) => {},
    });

    // toggle row to see details
    const handleToggleRow = (row: HistoryRowType) => {
    const isOpening = openRowId !== row.id;

    setOpenRowId((prev) => (prev === row.id ? null : row.id));

    // Load values on expand row
    if (isOpening) {
        recentHistoryFormik.setValues({
        changeSource: row.changeSource,
        reason: row.reason,
        reviewerRemark: row.reviewerRemark,
        status: row.status,
        approvalProof: row.approvalProof,
        reviewedAt: row.reviewedAt,
        createdAt: row.createdAt,
        targetPRID: row.targetPRID,
        targetEnquiryId: row.targetEnquiryId,
        currentData: {
            countryCode: row.currentData?.countryCode || '+91',
            contactNumber: row.currentData?.contactNumber || '',
            uniqueReferenceId: row.currentData?.uniqueReferenceId || '',
            firstName: row.currentData?.firstName || '',
            lastName: row.currentData?.lastName || '',
            emailId: row.currentData?.emailId || '',
            primarySource: row.currentData?.primarySource || '',
            amountPaid: row.currentData?.amountPaid || 0,
        },
        newData: {
            countryCode: row.newData?.countryCode || '+91',
            contactNumber: row.newData?.contactNumber || '',
            uniqueReferenceId: row.newData?.uniqueReferenceId || '',
            firstName: row.newData?.firstName || '',
            lastName: row.newData?.lastName || '',
            emailId: row.newData?.emailId || '',
            primarySource: row.newData?.primarySource || '',
            amountPaid: row.newData?.amountPaid || 0,
        },
        });
    }
    };

  // handle view approval proof
  const handleViewApprovalProof = (file?: string) => {
    if (!file) return;

    const fullURL = `${CONFIG.site.s3BasePath}/${file}`;
    setProofImage(fullURL);
    setOpenProofDialog(true);
  };


  return (
    <Card sx={{ mt: 2 }}>
      <CardHeader
        sx={{ px: 3, py: 3, cursor: 'pointer',}}
        title={
          <Typography sx={{ fontSize: '16px', fontWeight: 600 }}>
              Recent History
          </Typography>
        }
        onClick={() => setOpen(!open)}
        action={
          <IconButton>
            {open ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        }
      />

      <Collapse in={open} timeout="auto" unmountOnExit>
        <CardContent sx={{ p: 0 }}>
          <Box sx={scrollableTableContentStyles}>
              <Scrollbar sx={tableScrollbarStyles}>
                <Table
                  stickyHeader 
                  size="small" 
                  sx={{
                    ...getTableStyles(dynamicMinWidth),
                    '& .MuiTableBody-root .MuiTableCell-root': {
                      pt: 1,
                      pb: 1,
                    },
                  }}
                 >
                    <TableHeadCustom
                      headLabel={visibleColumns}
                      orderBy={undefined}
                      order="asc"
                      numSelected={0}
                      rowCount={History?.length}
                    />
                    <TableBody>
                    {paginatedData?.length > 0 ? ( 
                      paginatedData?.map((row: HistoryRowType) => {  
                        const swappedFields =  row?.swappedFields;
                        const isRowOpen = openRowId === row?.id;
                        return (
                          <React.Fragment key={row?.id}>
                            {/* Main row */}
                            <TableRow hover>
                              {visibleColumns?.map((col) => {
                              if (col?.id === 'expand') {
                                return (
                                  <TableCell key="expand" align="right">
                                    <IconButton size="small" onClick={() => handleToggleRow(row)}>
                                      {isRowOpen ? <ExpandLess /> : <ExpandMore />}
                                    </IconButton>
                                  </TableCell>
                                );
                              }
                              
                           const getvalue = () => {
                                if (!col?.id) return '-';

                                const columnKeyMap: Record<string, string> = {
                                    requestedDate: 'createdAt',
                                    reviewedDate: 'reviewedAt',
                                    changeReason: 'reason',
                                    reviewerRemark: 'reviewerRemark',
                                };

                                const key = columnKeyMap[col.id] ?? col.id;

                                const value = (row as any)[key];

                                if (!value || value.trim() === '') return '-';

                                return value.trim();
                           };

                              const value = getvalue();
                             

                              if (col?.id === 'status') {
                                const normalizedValue = value && typeof value === 'string' ? value?.trim() : '';

                                return (
                                  <TableCell key={col?.id}>
                                    {normalizedValue ? (
                                      <Label
                                        variant="soft"
                                        color={getStatusColor(col?.id, normalizedValue)}
                                      >
                                        {normalizedValue}
                                      </Label>
                                    ) : (
                                      '-'
                                    )}
                                  </TableCell>
                                );
                              }

                              return (
                                <TableCell key={col?.id}>
                                  <Typography noWrap sx={{ fontSize: '14px', fontWeight: 400 }}>
                                    {typeof value === 'string' || typeof value === 'number' ? value : '-'}
                                  </Typography>
                                </TableCell>
                              );
                            })}
                            </TableRow>

                            {/* Expanded content row */}
                            {isRowOpen && (
                            <TableRow>
                              <TableCell colSpan={visibleColumns?.length} sx={{ p: 0 }}>
                                <Collapse 
                                  in={isRowOpen} 
                                  timeout="auto" 
                                  unmountOnExit
                                  easing="ease-in-out"
                                >
                                 {/* Changed from fields */}
                                  <Card sx={{ p: 2,  bgcolor: '#FFFFFF', borderRadius: '8px', boxShadow: 'none' }}>
                                    <Typography sx={{ fontSize: '14px', mb: 4 }}>
                                      {changeSource.changeFrom}: <span style={{ fontSize: '14px', fontWeight: 600 }}>{changeSource.label.paymentRefId} ({voucherData?.uniqueReferenceId ? voucherData?.uniqueReferenceId : 'N/A'})</span>
                                    </Typography>

                                    <Grid container spacing={2}>
                                        {/* First Name */}
                                        {swappedFields?.includes('firstName') && (
                                          //  <Grid item xs={12} sm={6} md={6} lg={6}>
                                            <FormikTextField
                                            name="currentData.firstName"
                                            label={basicDetails.label.firstName}
                                            formik={recentHistoryFormik}
                                            disabled
                                            />
                                          //  </Grid>
                                         )}
                                        {/* Last Name */}
                                        {swappedFields?.includes('lastName') && (
                                        <FormikTextField
                                          name="currentData.lastName"
                                          label={basicDetails.label.lastName}
                                          formik={recentHistoryFormik}
                                          disabled
                                        />
                                        )}
                                        {/* Email ID */}
                                        {swappedFields?.includes('emailId') && (
                                        <FormikTextField
                                          name="currentData.emailId"
                                          label={changeSource.label.emailId}
                                          formik={recentHistoryFormik}
                                          disabled
                                        />
                                        )}
                                        {/* Mobile Number */}
                                        {swappedFields?.includes('contactNumber') && (
                                          <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                                            <Field.Phone
                                              name="currentData.contactNumber"
                                              countryCodeName="currentData.countryCode"
                                              placeholder="Mobile Number"
                                              country="IN"
                                              formik={recentHistoryFormik}
                                              disabled
                                            />
                                          </Grid>
                                        )}
                                        {/* Primary Source */}
                                        {swappedFields?.includes('primarySource') && (
                                          <FormikTextField
                                            name="currentData.primarySource"
                                            label={basicDetails.label.primarySource}
                                            formik={recentHistoryFormik}
                                            disabled
                                          />
                                        )}
                                        {/* Amount paid */}
                                        {swappedFields?.includes('amountPaid') && (
                                          <FormikTextField
                                            name="currentData.amountPaid"
                                            label={changeSource.label.amount}
                                            formik={recentHistoryFormik}
                                            disabled
                                            textFieldType="number"
                                          />
                                        )}
                                    
                                    {/* Changed to new data fields */}
                                      <Grid item xs={12}>
                                        <Typography sx={{ fontSize: '14px', fontWeight: 400, mt: 1, mb: 1 }}>
                                          {changeSource.changeTo}: {' '}
                                          <span style={{ fontSize: '14px', fontWeight: 600 }}>
                                            {getLabelFromValue(recentHistoryFormik.values.changeSource)  ?? 'N/A'}{recentHistoryFormik.values.targetPRID ? ` (${recentHistoryFormik.values.targetPRID})` : recentHistoryFormik.values.targetEnquiryId && ` (${recentHistoryFormik.values.targetEnquiryId})`}
                                          </span>
                                        </Typography>
                                      </Grid>
                                      {/* First Name */}
                                      {swappedFields?.includes('firstName') && (
                                       <FormikTextField
                                          name="newData.firstName"
                                          label={basicDetails.label.firstName}
                                          formik={recentHistoryFormik}
                                          disabled
                                        />
                                      )}
                                        {/* Last Name */}
                                        {swappedFields?.includes('lastName') && (
                                        <FormikTextField
                                          name="newData.lastName"
                                          label={basicDetails.label.lastName}
                                          formik={recentHistoryFormik}
                                          disabled
                                        />
                                        )}
                                        {/* Email ID */}
                                        {swappedFields?.includes('emailId') && (
                                        <FormikTextField
                                          name="newData.emailId"
                                          label={changeSource.label.emailId}
                                          formik={recentHistoryFormik}
                                          disabled
                                        />
                                        )}
                                        {/* Mobile Number */}
                                        {swappedFields?.includes('contactNumber') && (
                                          <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                                            <Field.Phone
                                              name="newData.contactNumber"
                                              countryCodeName="newData.countryCode"
                                              placeholder="Mobile Number"
                                              country="IN"
                                              formik={recentHistoryFormik}
                                              disabled
                                            />
                                          </Grid>
                                        )}
                                        {/* Primary Source */}
                                        {swappedFields?.includes('primarySource') && (
                                          <FormikTextField
                                            name="newData.primarySource"
                                            label={basicDetails.label.primarySource}
                                            formik={recentHistoryFormik}
                                            disabled
                                          />
                                        )}
                                        {/* Amount paid */}
                                        {swappedFields?.includes('amountPaid') && (
                                          <FormikTextField
                                            name="newData.amountPaid"
                                            label={changeSource.label.amount}
                                            formik={recentHistoryFormik}
                                            disabled
                                            textFieldType="number"
                                          />
                                        )}
                                        
                                       {/* Approval Proof */}
                                       {recentHistoryFormik?.values?.approvalProof && ( 
                                        <Grid item xs={12} sm={3} md={3} lg={3}>
                                          <ReviewInput
                                            text="Approval Proof"
                                            name="approvalProof"
                                            onView={() => handleViewApprovalProof(recentHistoryFormik?.values?.approvalProof)}
                                            disabled={!recentHistoryFormik?.values?.approvalProof}
                                          />
                                        </Grid>)}
                                    </Grid>
                                  </Card>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <TableNoData notFound colSpan={visibleColumns?.length || tableHeadFromRole.length} />
                    )}
                  </TableBody>
                 </Table>
              </Scrollbar>
            </Box>

            {/* Pagination */}
            <Box sx={fixedFooterPaginationStyles}>
              <TablePaginationCustom
                page={page - 1}
                count={History?.length}
                rowsPerPage={rowsPerPage}
                onPageChange={(e, newPage) => setPage(newPage + 1)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(Number.parseInt(e.target.value, 10));
                  setPage(1);
                }}
                showResultsCount
                totalResults={History?.length}
              />
            </Box>
        </CardContent>
      </Collapse>

      {/* Approval Proof Dialog */}
      {openProofDialog && (
        <Dialog open={openProofDialog} onClose={() => setOpenProofDialog(false)} maxWidth="md" fullWidth>
          <Box sx={{ p: 2, position: 'relative' }}>
            <IconButton
              aria-label="close"
              onClick={() => setOpenProofDialog(false)}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>

            <Typography variant="h6" gutterBottom>
              {changeSource.label.preview}
            </Typography>

            {proofImage && (
              <img
                src={proofImage}
                alt="Approval Proof"
                style={{
                  width: '100%',
                  maxHeight: '80vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  marginTop: '8px',
                }}
              />
            )}
          </Box>
        </Dialog>
      )}
    </Card>
  );
};

export default ChangeSourceRecentHistory