import '../../style.css';

import { toast } from 'sonner';
import { useParams } from 'react-router';
import React, { useEffect } from 'react';

import { Box, Grid, Stack, Switch, InputBase, Typography } from '@mui/material';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { OWNER_TYPE, RESIDING_AS } from 'src/utils/constant';

import { CONFIG } from 'src/config-global';
import ViewImg from 'src/assets/images/view.svg';
import {
  uploadFile,
  getPresignedUrl,
  saveBookingDocument,
} from 'src/redux/actions/rm-panel/upload-actions';

import { Field } from "src/components/hook-form";
import { BorderBox } from 'src/components/border-box/BorderBox';

import NewDropzone from '../dropzone/NewDropzone';
import { FilledButton } from '../buttons/FilledButton';
import ConditionalRadioField from '../conditional-radio-button/ConditionalRadioField';

interface ReferrerDetailsProps {
  primarySource: string;
  isPointsAdjustmentEnabled: boolean;
  handleToggleSwitch: any;
  formik: any;
  handledelete: (fieldName: string, selectedFile: any, id: any) => void;
  approvalProofPath: any;
  setApprovalProofPath: any;
}

interface UploadPayload {
  presignedUrl: string;
  file: File;
}
const ReferrerDetails: React.FC<ReferrerDetailsProps> = ({
  primarySource,
  isPointsAdjustmentEnabled,
  handleToggleSwitch,
  formik,
  handledelete,
  approvalProofPath,
  setApprovalProofPath
}) => {
  const { oppId } = useParams();
  const { applicantData } = useAppSelector((state) => state.dashboard);
  const dispatch = useAppDispatch();
  const url = `${CONFIG.site.referralForm}/${oppId}`;
  const referrerSignedPdf = `${CONFIG?.site?.s3BasePath}/${applicantData?.data?.referrerDetails?.signedPdf}`;

  useEffect(() => {
    if (formik?.values?.referralList?.ownerType === OWNER_TYPE.PRIMARY) {
      formik.setFieldValue("referralList.saleDeedDocument", "");
      formik.setFieldValue("referralList.isPhysicalSaleDeedDocument", false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik?.values?.referralList?.ownerType]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleUpload = async (fieldName: string, selectedFile: File) => {
    if (!selectedFile) {
      console.warn('No files selected for upload.');
      return;
    }
    try {
      const fileObjects = {
        folder: `documents/${oppId}`,
        key: selectedFile.name.replaceAll(/\s+/g, ''),
      };
      const res = await dispatch(getPresignedUrl(fileObjects)).unwrap();
      if (res?.statusCode === 201) {
        const payload: UploadPayload = {
          presignedUrl: res?.data?.signedUrl,
          file: selectedFile,
        };
        dispatch(uploadFile(payload))
          .unwrap()
          .then((uploadResponse: { status: number }) => {
            if (uploadResponse?.status === 200) {
              if (fieldName === 'Approval Proof') {
                formik.setFieldValue('documents.approvalProof', `${res.data.s3Basepath}${res.data.key}`);
              } else {
                formik.setFieldValue(`referralList.${fieldName}`, `${res.data.s3Basepath}${res.data.key}`);
              }
            }
          });

        const savePayload = {
          opportunityId: oppId || '',
          name: fieldName,
          path: `${res?.data?.key}`,
          type: 'referrer', // Changed to match your required payload
          stage: 'post_booking',
          isOtherDoc: true,
        };

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const saveResponse = await dispatch(saveBookingDocument(savePayload)).unwrap();
        const fetchedResponse = saveResponse?.data;
        if (fieldName === 'Approval Proof' && fetchedResponse?.stage === 'post_booking') {
          setApprovalProofPath((prev: any) => ({
            ...prev,
            id: fetchedResponse?.id,
            path: fetchedResponse?.path, // Optional update
          }));
        }
      }
    } catch (error) {
      console.error('❌ Error during file upload or document save:', error);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link Copied');
    } catch (err) {
      console.error(err);
      toast.error('Failed to copy link.');
    }
  };

  const ViewSignedreferrerpdf = () => {
    if (referrerSignedPdf) {
      window.open(referrerSignedPdf, '_blank');
    } else {
      toast.error('Signed PDF is not uploaded');
    }
  };

  const renderResidingDetails = () => {
    const residingAs = formik?.values?.referralList?.residingAs;

    if (residingAs === RESIDING_AS.OWNER) {
      return (
        <>
          <Grid item xs={12} sm={12} sx={{ pt: 0 }}>
            <ConditionalRadioField
              name="referralList.ownerType"
              value={formik?.values?.referralList?.ownerType}
              onChange={(e) => formik.setFieldValue("referralList.ownerType", e.target.value)}
              options={[
                { label: "Primary Owner - Purchased from Puravankara", value: OWNER_TYPE.PRIMARY },
                { label: "Secondary Owner - Bought on Resale", value: OWNER_TYPE.SECONDARY },
              ]}
              error={formik?.errors?.referralList?.ownerType}
              touched={formik?.touched?.referralList?.ownerType}
            />
          </Grid>

          {formik?.values?.referralList?.ownerType === OWNER_TYPE.SECONDARY && (
            <>
              <Grid
                item
                xs={12}
                sx={{
                  display: { xs: "none", sm: "none", md: "block" },
                }}
              />
              <Grid item xs={12} sm={12} md={6}>
                <Box className="referrerInputRow flexColumn">
                  <Typography className="labelReferrer width400" sx={{ mb: '8px !important' }}>Sale Deed Document<span style={{ color: 'red' }}>*</span></Typography>
                  <NewDropzone
                    name="referralList.saleDeedDocument"
                    id='saleDeedDocument'
                    fileValue={formik?.values?.referralList?.saleDeedDocument}
                    fieldName="saleDeedDocument"
                    placholderforBack="Click to upload"
                    handledelete={() => { handledelete('saleDeedDocument', formik?.values?.referralList?.saleDeedDocument, 'saleDeedDocument') }}
                    handleupload={handleUpload}
                    documentType="both"
                    path={formik?.values?.referralList?.saleDeedDocument[0]}
                    formik={formik}
                    required
                    customSx
                    error={formik?.errors?.referralList?.saleDeedDocument}
                    touched={formik?.touched?.referralList?.saleDeedDocument}
                    s3UploadFilePath={`documents/${oppId}`}
                  />
                </Box>
              </Grid>
            </>
          )}
        </>
      );
    }

    if (residingAs === RESIDING_AS.TENANT) {
      return (
        <>
          <Grid
            item
            xs={12}
            sx={{
              display: { xs: "none", sm: "none", md: "block" },
            }}
          />
          <Grid item xs={12} sm={12} md={6}>
            <Box className="referrerInputRow flexColumn">
              <Typography className="labelReferrer width400" sx={{ mb: '8px !important' }}>Rental Agreement<span style={{ color: 'red' }}>*</span></Typography>
              <NewDropzone
                name="referralList.rentalAgreement"
                id='rentalAgreement'
                fileValue={formik?.values?.referralList?.rentalAgreement}
                fieldName="rentalAgreement"
                placholderforBack="Click to upload"
                handledelete={() => { handledelete('rentalAgreement', formik?.values?.referralList?.rentalAgreement, 'rentalAgreement') }}
                handleupload={handleUpload}
                documentType="both"
                path={formik?.values?.referralList?.rentalAgreement[0]}
                formik={formik}
                required
                customSx
                error={formik?.errors?.referralList?.rentalAgreement}
                touched={formik?.touched?.referralList?.rentalAgreement}
                s3UploadFilePath={`documents/${oppId}`}
              />
            </Box>
          </Grid>
        </>
      );
    }

    return null;
  };

  return (
    <Stack className="referrer-wrapper">
      <BorderBox title="Referrer Information">
        <Box sx={{ display: 'flex' }} className="mb-8">
          <Typography sx={{ fontSize: '14px' }}>Primary Source &nbsp;</Typography>
          <Typography className="typographyTitle color-blue">{primarySource}</Typography>
        </Box>

        <Typography
          className="typographyTitle mb-16"
          sx={{ fontWeight: 600, fontSize: '16px', color: '#00368c', mb: 2 }}
        >
          Referrer Details
          {applicantData?.data?.referrerDetails?.signedPdf && (
            <span className="signed">Signed</span>
          )}
        </Typography>

        <Box
          sx={{ border: '1px dashed #DADADA', padding: '10px 16px', borderRadius: '8px', mb: 3 }}
        >
          <Box sx={{ display: 'flex' }} className="referrer-form-wrapper">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
                <Box className="referrerInputRow flexColumn">
                  <Typography className="labelReferrer">Name</Typography>
                  <Grid sx={{ width: '100%' }}>
                    <InputBase
                      className="referrerWidth65"
                      disabled
                      sx={{
                        pl: 1.5,
                        height: 44,
                        borderRadius: 1,
                        border: '1px solid #D0D5DD',
                        mt: 1,
                        '& .MuiInputBase-input': {
                          fontSize: '14px', // Apply font size to the input field
                        },
                        '&.Mui-disabled': {
                          bgcolor: '#F9FAFB', // Light gray background when disabled
                          color: '#919EAB', // Gray text color when disabled
                          boxShadow: '0px 1px 2px 0px #1018280D',
                        },
                      }}
                      value={formik?.values?.referralList?.name}
                      onChange={(e) => {
                        const alphaOnly = e.target.value.replaceAll(/[^a-zA-Z\s]/g, '');
                        formik.setFieldValue('referralList.name', alphaOnly);
                      }}
                    />
                    {formik?.touched?.referralList?.name && formik?.errors?.referralList?.name && (
                      <Typography color="red" sx={{ fontSize: '12px' }}>
                        {formik?.errors?.referralList?.name}
                      </Typography>
                    )}
                  </Grid>
                </Box>
              </Grid>

              <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
                <Box className="referrerInputRow flexColumn">
                  <Typography className="labelReferrer">Relationship with Referrer</Typography>
                  <Grid sx={{ width: '100%' }}>
                    <InputBase
                      disabled
                      className="referrerWidth65"
                      sx={{
                        pl: 1.5,
                        height: 44,
                        borderRadius: 1,
                        border: '1px solid #D0D5DD',
                        mt: 1,
                        '& .MuiInputBase-input': {
                          fontSize: '14px', // Apply font size to the input field
                        },
                        '&.Mui-disabled': {
                          bgcolor: '#F9FAFB', // Light gray background when disabled
                          color: '#919EAB', // Gray text color when disabled
                          boxShadow: '0px 1px 2px 0px #1018280D',
                        },
                      }}
                      value={formik?.values?.referralList?.relation}
                      onChange={(e) => {
                        const alphaOnly = e.target.value.replaceAll(/[^a-zA-Z\s]/g, '');
                        formik.setFieldValue('referralList.relation', alphaOnly);
                      }}
                    />
                    {formik?.touched?.referralList?.relation &&
                      formik?.errors?.referralList?.relation && (
                        <Typography color="red" sx={{ fontSize: '12px' }}>
                          {formik?.errors?.referralList?.relation}
                        </Typography>
                      )}
                  </Grid>
                </Box>
              </Grid>

              <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
                <Box className="referrerInputRow flexColumn">
                  <Typography className="labelReferrer">Property Name</Typography>
                  <Grid sx={{ width: '100%' }}>
                    <InputBase
                      disabled
                      className="referrerWidth65"
                      sx={{
                        pl: 1.5,
                        height: 44,
                        borderRadius: 1,
                        border: '1px solid #D0D5DD',
                        mt: 1,
                        bgcolor: 'white', // Default background
                        color: '#1C252E', // Default text color
                        '& .MuiInputBase-input': {
                          fontSize: '14px', // Apply font size to the input field
                        },
                        '&.Mui-disabled': {
                          bgcolor: '#F9FAFB', // Light gray background when disabled
                          color: '#919EAB', // Gray text color when disabled
                          boxShadow: '0px 1px 2px 0px #1018280D',
                        },
                      }}
                      value={formik?.values?.referralList?.propertyName}
                    />
                  </Grid>
                </Box>
              </Grid>

              <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
                <Box className="referrerInputRow flexColumn">
                  <Typography className="labelReferrer">Unit Number</Typography>
                  <Grid sx={{ width: '100%' }}>
                    <InputBase
                      disabled
                      className="referrerWidth65"
                      sx={{
                        pl: 1.5,
                        height: 44,
                        borderRadius: 1,
                        border: '1px solid #D0D5DD',
                        mt: 1,
                        bgcolor: 'white', // Default background
                        color: '#1C252E', // Default text color
                        '& .MuiInputBase-input': {
                          fontSize: '14px', // Apply font size to the input field
                        },
                        '&.Mui-disabled': {
                          bgcolor: '#F9FAFB', // Light gray background when disabled
                          color: '#919EAB', // Gray text color when disabled
                          boxShadow: '0px 1px 2px 0px #1018280D',
                        },
                      }}
                      value={formik?.values?.referralList?.unitNumber}
                    />
                  </Grid>
                </Box>
              </Grid>

              <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
                <Box className="referrerInputRow flexColumn">
                  <Typography className="labelReferrer">Email</Typography>
                  <Grid sx={{ width: '100%' }}>
                    <InputBase
                      disabled
                      fullWidth
                      className="referrerWidth65"
                      sx={{
                        pl: 1.5,
                        height: 44,
                        borderRadius: 1,
                        border: '1px solid #D0D5DD',
                        mt: '6px',
                        '& .MuiInputBase-input': {
                          fontSize: '14px', // Apply font size to the input field
                        },
                        '&.Mui-disabled': {
                          bgcolor: '#F9FAFB', // Light gray background when disabled
                          color: '#919EAB', // Gray text color when disabled
                          boxShadow: '0px 1px 2px 0px #1018280D',
                        },
                      }}
                      value={formik?.values?.referralList?.email}
                      onChange={(e) => formik.setFieldValue('referralList.email', e.target.value)}
                    />
                    {formik?.touched?.referralList?.email &&
                      formik?.errors?.referralList?.email && (
                        <Typography color="red" sx={{ fontSize: '12px' }}>
                          {formik?.errors?.referralList?.email}
                        </Typography>
                      )}
                  </Grid>
                </Box>
              </Grid>

              <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
                <Box className="referrerInputRow flexColumn">
                  <Typography className="labelReferrer">Mobile </Typography>
                  <Grid sx={{ width: '100%' }}>
                    <Field.Phone
                      name="referralList.mobileNumber"
                      countryCodeName="referralList.countryCode"
                      // label="Mobile"
                      country="IN"
                      formik={formik}
                      disabled
                    />
                    {formik?.touched?.referralList?.mobileNumber &&
                      formik?.errors?.referralList?.mobileNumber && (
                        <Typography color="red" sx={{ fontSize: '12px' }}>
                          {formik?.errors?.referralList?.mobileNumber}
                        </Typography>
                      )}
                  </Grid>
                </Box>
              </Grid>
              <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
                <Box className="referrerInputRow flexColumn">
                  <Typography className="labelReferrer">Current Address</Typography>
                  <InputBase
                    disabled
                    className="referrerWidth65"
                    multiline
                    sx={{
                      pl: 1.5,
                      borderRadius: 1,
                      border: '1px solid #D0D5DD',
                      mt: 1,
                      minHeight: 44,
                      '& .MuiInputBase-input': {
                        fontSize: '14px', // Apply font size to the input field
                      },
                      '&.Mui-disabled': {
                        bgcolor: '#F9FAFB', // Light gray background when disabled
                        color: '#919EAB', // Gray text color when disabled
                        boxShadow: '0px 1px 2px 0px #1018280D',
                      },
                    }}
                    value={formik?.values?.referralList?.address}
                    onChange={(e) => {
                      const alphaNumericOnly = e.target.value.replaceAll(/[^a-zA-Z0-9\s]/g, '');
                      formik.setFieldValue('referralList.address', alphaNumericOnly);
                    }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
                <Box className="referrerInputRow flexColumn">
                  <Typography className="labelReferrer">House Number</Typography>
                  <InputBase
                    disabled
                    className="referrerWidth65"
                    sx={{
                      pl: 1.5,
                      height: 44,
                      borderRadius: 1,
                      border: '1px solid #D0D5DD',
                      mt: 1,
                      '& .MuiInputBase-input': {
                        fontSize: '14px', // Apply font size to the input field
                      },
                      '&.Mui-disabled': {
                        bgcolor: '#F9FAFB', // Light gray background when disabled
                        color: '#919EAB', // Gray text color when disabled
                        boxShadow: '0px 1px 2px 0px #1018280D',
                      },
                    }}
                    value={formik?.values?.referralList?.houseNumber}
                    onChange={(e) => {
                      const alphaNumericOnly = e.target.value.replaceAll(/[^a-zA-Z0-9\s]/g, '');
                      formik.setFieldValue('referralList.houseNumber', alphaNumericOnly);
                    }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
                <Box className="referrerInputRow flexColumn">
                  <Typography className="labelReferrer">Tower</Typography>
                  <Grid sx={{ width: '100%' }}>
                    <InputBase
                      disabled
                      className="referrerWidth65"
                      sx={{
                        pl: 1.5,
                        height: 44,
                        borderRadius: 1,
                        border: '1px solid #D0D5DD',
                        mt: 1,
                        bgcolor: 'white', // Default background
                        color: '#1C252E', // Default text color
                        '& .MuiInputBase-input': {
                          fontSize: '14px', // Apply font size to the input field
                        },
                        '&.Mui-disabled': {
                          bgcolor: '#F9FAFB', // Light gray background when disabled
                          color: '#919EAB', // Gray text color when disabled
                          boxShadow: '0px 1px 2px 0px #1018280D',
                        },
                      }}
                      value={formik?.values?.referralList?.tower}
                    />
                  </Grid>
                </Box>
              </Grid>
              <Grid
                item
                xs={12}
                sx={{
                  display: { xs: "none", sm: "none", md: "block" },
                }}
              />
              <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
                <Box className="referrerInputRow flexColumn">
                  <Typography className="labelReferrer width400">You are residing in Purva home as?</Typography>
                  <Grid sx={{ width: '100%' }}>
                    <InputBase
                      className="referrerWidth65"
                      disabled
                      sx={{
                        pl: 1.5,
                        height: 44,
                        borderRadius: 1,
                        border: '1px solid #D0D5DD',
                        mt: 1,
                        bgcolor: 'white', // Default background
                        color: '#1C252E', // Default text color
                        '& .MuiInputBase-input': {
                          fontSize: '14px', // Apply font size to the input field
                        },
                        '&.Mui-disabled': {
                          bgcolor: '#F9FAFB', // Light gray background when disabled
                          color: '#919EAB', // Gray text color when disabled
                          boxShadow: '0px 1px 2px 0px #1018280D',
                        },
                      }}
                      value={formik?.values?.referralList?.residingAs}
                    />
                  </Grid>
                </Box>
              </Grid>

              {renderResidingDetails()}

              {applicantData?.data?.isCompleted &&
                applicantData?.data?.referrerDetails?.signedPdf && (
                  <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
                    <Box className="copyBtn" sx={{ marginTop: '20px', minHeight: '62px', display: 'flex', alignItems: 'center', }}>
                      <InputBase
                        disabled
                        fullWidth
                        sx={{
                          pl: 1.5,
                          height: 44,
                          borderRadius: 1,
                          width: '100%',
                          border: '1px solid #D0D5DD',
                          '& .MuiInputBase-input': {
                            fontSize: '14px',
                          },
                          '&.Mui-disabled': {
                            bgcolor: '#F9FAFB',
                            color: '#919EAB',
                            boxShadow: '0px 1px 2px 0px #1018280D',
                          },
                        }}
                        value={referrerSignedPdf}
                      />
                      <Box>
                        <FilledButton
                          icon={<img alt="ViewBtn" src={ViewImg} />}
                          label="View"
                          type="button"
                          width="120px"
                          onClick={ViewSignedreferrerpdf}
                          height="42px"
                        />
                      </Box>
                    </Box>
                  </Grid>
                )}
              {applicantData?.data?.isCompleted &&
                !applicantData?.data?.referrerDetails?.signedPdf && (
                  <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
                    <Box className="copyBtn" sx={{ marginTop: '20px', minHeight: '62px', display: 'flex', alignItems: 'center', }}>
                      <InputBase
                        disabled
                        fullWidth
                        sx={{
                          pl: 1.5,
                          height: 44,
                          borderRadius: 1,
                          width: '100%',
                          border: '1px solid #D0D5DD',
                          '& .MuiInputBase-input': {
                            fontSize: '14px',
                          },
                          '&.Mui-disabled': {
                            bgcolor: '#F9FAFB',
                            color: '#919EAB',
                            boxShadow: '0px 1px 2px 0px #1018280D',
                          },
                        }}
                        value={url}
                      />

                      <Box>
                        <FilledButton
                          label="Copy"
                          type="button"
                          width="120px"
                          onClick={handleCopyUrl}
                          height="42px"
                        />
                      </Box>
                    </Box>
                  </Grid>
                )}
            </Grid>
          </Box>
        </Box>

        {applicantData?.data?.isCompleted && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#212B36' }}>
              Points Adjustment through portal &nbsp;
            </Typography>
            <Box className="switchPortal">
              <Switch
                checked={isPointsAdjustmentEnabled}
                onChange={handleToggleSwitch}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#4caf50', // Checked thumb color
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#00368C', // Checked track color
                  },
                  '& .MuiSwitch-switchBase': {
                    color: 'green', // Unchecked thumb color
                  },
                  '& .MuiSwitch-switchBase + .MuiSwitch-track': {
                    backgroundColor: '#D0D5DD', // Unchecked track color
                  },
                }}
              />
            </Box>
          </Box>
        )}
        {!isPointsAdjustmentEnabled && (
          <Box>
            <NewDropzone
              name="documents.approvalProof"
              id={approvalProofPath?.id || 'approvalProof'}
              fileValue={formik?.values?.documents?.approvalProof}
              fieldName="Approval Proof"
              label="Approval Proof"
              required
              handledelete={() => { handledelete('approvalProof', formik.values.documents?.approvalProof, 'approvalProof') }}
              handleupload={handleUpload}
              documentType="pdf"
              title="Upload Approval Proof"
              path={approvalProofPath?.path}
              formik={formik}
              error={formik.errors.documents?.approvalProof}
              touched={formik.touched.documents?.approvalProof}
              customSx
              s3UploadFilePath={`documents/${oppId}`}
            />{" "}
          </Box>
        )}
      </BorderBox>
    </Stack>
  );
};

export default ReferrerDetails;