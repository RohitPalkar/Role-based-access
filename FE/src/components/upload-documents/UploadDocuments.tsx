import * as yup from 'yup';
import { useFormik } from 'formik';
import { useState, useEffect } from 'react';

import InfoIcon from '@mui/icons-material/Info';
import { ArrowCircleRight } from '@mui/icons-material';
import { Box, Button, Switch, Divider, Tooltip, Typography, IconButton } from '@mui/material';

import { ROOTS } from 'src/routes/paths';
import { useParams, useRouter } from 'src/routes/hooks';

import { useBoolean } from 'src/hooks/use-boolean';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { PRIMARY_SOURCE, toaster_messages } from 'src/utils/constant';

import { setpreBookingStep } from 'src/redux/slices/rm-panel/dashboard-slice';
import {
  submitpreBooking,
  officeUseDetails,
  getApplicantDetails,
} from 'src/redux/actions/rm-panel/dashboard-actions';
import {
  uploadFile,
  deleteImage,
  getPresignedUrl,
  salesdeleteImage,
  saveBookingDocument,
  getBookingDocuments,
} from 'src/redux/actions/rm-panel/upload-actions';

import { toast } from 'src/components/snackbar';
import Dropzone from 'src/components/dropzone/Dropzone';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { BorderBox } from 'src/components/border-box/BorderBox';
import { FilledButton } from 'src/components/buttons/FilledButton';

import { AnimateLogo1 } from '../animate';
import plusCircle from '../../assets/images/plus-circle.svg';
// ----------------------------------------------------------------------
interface UploadPayload {
  presignedUrl: string;
  file: File;
}

interface UploadDocumentsValues {
  costSheet: File | string | null;
  allotmentLetter: File | string | null;
}
interface DropzoneData {
  path: string | undefined;
  fieldName: string;
  isDeleted: boolean;
  id: string;
}

export default function UploadDocuments() {
  const confirm = useBoolean();
  const dispatch = useAppDispatch();
  const { oppId } = useParams();
  const router = useRouter();
  const { preBookingStep, bookingDocuments, applicantData, opportunity, officeUseData } =
    useAppSelector((state) => state.dashboard);
  const [fetchedArray, setFetchedArray] = useState<any[]>([]);
  const [costSheetObj, setCostSheetObj] = useState<any>();
  const [allotmentObj, setAllotmentObj] = useState<any>();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrimarySourceVisible, setIsPrimarySourceVisible] = useState<boolean>(true);

  useEffect(() => {
    dispatch(getBookingDocuments(`/${oppId}`));
  }, [dispatch, oppId]);

  const [initialValues, setInitialValues] = useState<UploadDocumentsValues>({
    costSheet: null,
    allotmentLetter: null,
  });
  useEffect(() => {
    if (bookingDocuments?.data) {
      const costSheet = costSheetObj?.path || null;
      const allotmentLetter = allotmentObj?.path || null;
      setInitialValues({ costSheet, allotmentLetter });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costSheetObj, allotmentObj]); // Only upd
  const uploadDocumentsFormik = useFormik<UploadDocumentsValues>({
    initialValues,
    enableReinitialize: true,
    validationSchema: yup.object().shape({
      costSheet: yup.mixed().required('Cost Sheet is required'),
      allotmentLetter: yup.mixed().notRequired(),
    }),
    onSubmit: (values) => { },
  });
  const popupFunction = () => {
    confirm.onFalse();
    router.push(`${ROOTS.RM_PANEL}/bookings`);
  };

  const handleSubmitOnNo = async () => {
    const payload = {
      isPreBookingSubmitted: true,
      primarySourceDisabled: !isPrimarySourceVisible,
    };
    setIsSubmitting(true);
    try {
      await dispatch(submitpreBooking({ payload, oppId: oppId ?? '' }));
      confirm.onFalse();
      router.push(`${ROOTS.RM_PANEL}/bookings`);
      toast.success('Booking submitted successfully!');
    } catch (error) {
      console.error(error)
      toast.error(toaster_messages.errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    dispatch(getApplicantDetails(`/${oppId}`));
    dispatch(officeUseDetails(`/${oppId}`));
  }, [applicantData?.data?.primarySourceDisabled, bookingDocuments?.data, dispatch, oppId]);

  useEffect(() => {
    if (officeUseData?.data?.primarySourceDisabled) {
      setIsPrimarySourceVisible(false);
    }
    else {
      setIsPrimarySourceVisible(true);
    }
  }, [officeUseData?.data?.primarySourceDisabled]);

  const handleUpload = async (fieldName: string, selectedFile: any, isOther: any, id: any) => {
    try {
      setIsLoading(true); // Start loading

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

        await dispatch(uploadFile(payload)).unwrap();

        const savePayload = {
          opportunityId: oppId as string,
          name: fieldName,
          path: `${res?.data?.key}`,
          type: 'pre_booking',
          stage: 'pre_booking',
          isOtherDoc: isOther,
        };

        const saveResponse = await dispatch(saveBookingDocument(savePayload)).unwrap();
        const fetchedResponse = saveResponse?.data;

        if (fieldName === 'Cost Sheet' && !isOther && fetchedResponse?.id) {
          setCostSheetObj((prev: any) => ({
            ...prev,
            id: fetchedResponse?.id,
            path: fetchedResponse?.path,
          }));
        } else if (fieldName === 'Allotment Letter' && !isOther && fetchedResponse?.id) {
          setAllotmentObj((prev: any) => ({
            ...prev,
            id: fetchedResponse?.id,
            path: fetchedResponse?.path,
          }));
        } else {
          setFetchedArray((prev) =>
            prev.map((each) =>
              each.id === id ? { ...each, path: fetchedResponse?.path, id } : each
            )
          );
        }

        await dispatch(getBookingDocuments(`/${oppId}`));
        toast.success('Document uploaded successfully!');
      }
    } catch (error) {
      console.error('❌ Error during file upload or document save:', error);
      toast.error(
        `${error?.errors?.message?.[0] ? error?.errors?.message?.[0] : 'Error while uploading document'}`
      );
    } finally {
      setIsLoading(false); // Ensure loading stops after completion
    }
  };
  const handleAddDocument = () => {
    if (fetchedArray.length < 10) {
      const newId = fetchedArray.length + 1;
      const newDocument = {
        id: `newId${newId}`,
        fieldName: '',
        path: '',
        isOther: true,
        isDeleted: false,
      };

      setFetchedArray((prevArray) => [...prevArray, newDocument]);
    } else {
      toast.error('You can only add up to 10 documents.');
    }
  };
  const handleDeleteDocument = (id: string) => {
    const updatedFetchedArray = fetchedArray?.map((doc) =>
      doc.id === id ? { ...doc, isDeleted: true } : doc
    );
    const updatedArray = updatedFetchedArray?.filter((doc) => doc.id !== id);
    setFetchedArray(updatedArray);
  };

  const handledelete = async (fieldName: any, fileValue: any, id?: any) => {
    if (fieldName === 'Cost Sheet') {
      setCostSheetObj({});
    }
    if (fieldName === 'Allotment Letter') {
      setAllotmentObj({});
    }

    try {
      let deleteKey: string | null = null;
      if (bookingDocuments?.data && Array.isArray(bookingDocuments.data)) {
        bookingDocuments.data.forEach((each) => {
          if (each?.id === id && each?.path) {
            deleteKey = each.path;
          }
        });
      }
      if (deleteKey) {
        await dispatch(deleteImage({ key: deleteKey }));
        toast.success('File deleted successfully!');
      }
      if (id) {
        await dispatch(salesdeleteImage({ documentId: id }));
      }
    } catch (error) {
      toast.error('An error occurred while deleting the file.');
      console.error('Error deleting file:', error);
    }
  };
  const SaveFiles = async () => {
    await uploadDocumentsFormik.setTouched({
      costSheet: true,
      allotmentLetter: true,
    });
    const errors = await uploadDocumentsFormik.validateForm();
    if (Object.keys(errors).length === 0) {
      if (applicantData?.data?.paymentDetails && !applicantData?.data?.isCompleted) {
        confirm.onTrue();
      } else {
        const payload = {
          isPreBookingSubmitted: true,
          primarySourceDisabled: !isPrimarySourceVisible,
        };
        setIsSubmitting(true);
        try {
          await dispatch(submitpreBooking({ payload, oppId: oppId ?? '' }));
          router.push(`${ROOTS.RM_PANEL}/bookings`);
        } catch (error) {
          console.error(error)
          toast.error(toaster_messages.errorMessage);
        } finally {
          setIsSubmitting(false);
        }
      }
    } else { /* empty */ }
  };

  useEffect(() => {
    if (bookingDocuments?.data?.length) {
      const { data } = bookingDocuments;
      const updatedArray: any[] = [];

      data.forEach((each: any) => {
        if (each.isOtherDoc === true && each.type === 'pre_booking') {
          const newObj = {
            id: each.id,
            fieldName: each.name,
            path: each.path,
            isOther: each.isOtherDoc,
            isDeleted: false,
          };
          updatedArray.push(newObj);
        }
      });
      setFetchedArray(updatedArray); // This should work now
    }
  }, [bookingDocuments]);
  useEffect(() => {
    if (!costSheetObj && !allotmentObj && bookingDocuments?.data) {
      bookingDocuments.data.forEach((doc) => {
        if (doc.name === 'Cost Sheet' && doc.isOtherDoc === false) {
          setCostSheetObj(doc);
        }
        if (doc.name === 'Allotment Letter' && doc.isOtherDoc === false) {
          setAllotmentObj(doc);
        }
      });
    }
  }, [allotmentObj, bookingDocuments.data, costSheetObj]);

  const handNext = async () => {
    setIsLoading(true);
    const payload = {
      primarySourceDisabled: !isPrimarySourceVisible,
      isPreBookingSubmitted: true,
    };
    try {
      const response = await dispatch(submitpreBooking({ payload, oppId: oppId ?? '' })).unwrap();
      if (response?.response?.statusCode === 200) {
        dispatch(setpreBookingStep(1));
        toast.success('Draft saved!');
      } else {
        throw new Error(response?.message || 'Something went wrong');
      }
    } catch (error) {
      console.error('Error in submitpreBooking:', error);
      toast.error('Failed to save draft!');
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  const handleSwitchChange = (checked: boolean) => {
    setIsPrimarySourceVisible(checked);
  };
  return (
    <>
      {isLoading ? (
        <Box
          sx={{
            width: '100%',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AnimateLogo1 />
        </Box>
      ) : (
        <Box>
          <BorderBox title="Upload Documents" className="uploadDocumentWrapper" sx={{ mb: 5 }}>
            {preBookingStep === 0 && (
              <form
                onSubmit={uploadDocumentsFormik.handleSubmit}
                onReset={uploadDocumentsFormik.handleReset}
              >
                <Dropzone
                  name="costSheet"
                  file
                  label="Cost Sheet"
                  required
                  title="Upload Cost Sheet"
                  fieldName="Cost Sheet"
                  // fileValue={uploadCostSheetImage}
                  fileValue={uploadDocumentsFormik?.values?.costSheet}
                  handleupload={handleUpload}
                  handledelete={handledelete}
                  documentType="pdf"
                  isOther={false}
                  path={costSheetObj?.path}
                  id={costSheetObj?.id}
                  action={<Button variant="contained">Yes</Button>}
                  formik={uploadDocumentsFormik}
                />

                <Dropzone
                  name="allotmentLetter"
                  file
                  label="Allotment Letter"
                  title="Upload Allotment Letter"
                  fieldName="Allotment Letter"
                  fileValue={uploadDocumentsFormik?.values?.allotmentLetter}
                  handleupload={handleUpload}
                  handledelete={handledelete}
                  documentType="pdf"
                  isOther={false}
                  action={<Button variant="contained">Yes</Button>}
                  id={allotmentObj?.id}
                  path={allotmentObj?.path}
                  formik={uploadDocumentsFormik}
                />

                <div className="document-type-dropzone">
                  {bookingDocuments?.data?.some((each: any) => each?.isOtherDoc === true)
                    ? fetchedArray.length > 0 && (
                      <Typography sx={{ fontSize: '14px', fontWeight: '600', mb: 2 }}>
                        Document Type
                      </Typography>
                    )
                    : ''}
                  {fetchedArray?.map(
                    (dropzone: DropzoneData, index: number) =>
                      !dropzone.isDeleted && (
                        <Dropzone
                          key={dropzone?.id} // Ensure to use a unique key for each component in a list
                          name=" "
                          ondelete={handleDeleteDocument}
                          file
                          select
                          deleteop="yes"
                          title="Upload Document"
                          fieldName={dropzone?.fieldName}
                          fileValue={null}
                          isOther
                          handledelete={handledelete}
                          handleupload={handleUpload}
                          documentType="pdf"
                          path={dropzone?.path}
                          id={dropzone?.id}
                          documentName="Other"
                          action={<Button variant="contained">Yes</Button>}
                          formik={uploadDocumentsFormik}
                        />
                      )
                  )}
                </div>
                <Button
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    margin: '10px auto',
                    color: '#1A407D',
                    fontWeight: '600',
                    fontSize: '14px',
                    gap: 1,
                    '&:hover': {
                      backgroundColor: 'transparent', // Remove the background color on hover
                    },
                  }}
                  type="button"
                  onClick={handleAddDocument}
                >
                  <img src={plusCircle} alt="" /> Add Documents
                </Button>
                {opportunity?.data?.primarySource !== PRIMARY_SOURCE?.PurvaPrivilege &&
                  opportunity?.data?.primarySource !== PRIMARY_SOURCE?.ProvidentPremiere &&
                  opportunity?.data?.primarySource !== PRIMARY_SOURCE?.PrivilegeNRI && (
                    <Box>
                      <Divider sx={{ mt: 2, borderStyle: 'dashed', borderColor: '#DADADA' }} />
                      <Typography
                        sx={{ fontSize: '16px', fontWeight: 600, textAlign: 'center', mt: 5 }}
                      >
                        Show/Hide Primary Source
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          gap: '10px',
                          marginTop: '20px',
                          alignItems: 'center',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            flexWrap: {
                              xs: 'wrap',
                              sm: 'wrap',
                              md: 'wrap',
                              lg: 'wrap',
                            },
                          }}
                        >
                          <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#212B36' }}>
                            Primary Source &nbsp;
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: '14px',
                              fontWeight: 500,
                              color: isPrimarySourceVisible ? '#00368C' : '#667085',
                            }}
                          >
                            {opportunity?.data?.primarySource}
                          </Typography>
                        </Box>
                        {opportunity?.data?.primarySource === PRIMARY_SOURCE?.ChannelPartner && (
                          <Box
                            sx={{
                              display: 'flex',
                              flexWrap: {
                                xs: 'wrap',
                                sm: 'wrap',
                                md: 'wrap',
                                lg: 'wrap',
                              },
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: '14px',
                                fontWeight: 500,
                                color: '#212B36',
                                display: {
                                  xs: 'none',
                                  sm: 'block',
                                  md: 'block',
                                  lg: 'block',
                                },
                              }}
                            >
                              |
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: '14px',
                                fontWeight: 500,
                                color: '#212B36',
                                marginLeft: '10px',
                              }}
                            >
                              Channel Partner Name &nbsp;
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: '14px',
                                fontWeight: 500,
                                color: isPrimarySourceVisible ? '#00368C' : '#667085',
                                marginLeft: {
                                  xs: '10px',
                                  sm: '10px',
                                  md: '10px',
                                  lg: '10px',
                                },
                              }}
                            >
                              {opportunity?.data?.referredbyChannelPartnerREAPName}
                            </Typography>
                          </Box>
                        )}
                        <Switch
                          checked={isPrimarySourceVisible}
                          onChange={(event) => handleSwitchChange(event.target.checked)}
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

                        <Tooltip
                          enterTouchDelay={0}
                          title="Disabling this option will hide the Booking Source field in the Booking Application Form" placement="right"
                        >
                          <IconButton sx={{ ml: 1 }}> <InfoIcon /> </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  )}
                {preBookingStep === 0 && (
                  <div className="btnSave">
                    <FilledButton
                      label="Office Use"
                      width="20%"
                      onClick={handNext}
                      endIcon={<ArrowCircleRight />} // Adds the icon after the text
                    />
                    <FilledButton
                      type="submit"
                      label="Submit"
                      width="20%"
                      onClick={SaveFiles}
                      isLoading={isSubmitting}
                    />
                  </div>
                )}
              </form>
            )}
          </BorderBox>
        </Box>
      )}
      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        showCancel={false}
        title="Booking Form in Progress"
        content="A customer is currently working on this booking form.
        Would you like to wait until they complete it before making any updates?"
        action={
          <Box sx={{ display: 'flex', gap: 2 }}>

            <Button
              variant="contained"
              onClick={popupFunction}
              sx={{
                fontSize: '15px',
                fontWeight: '600',
                color: '#fff',
                background: '#1A407D',
                minWidth: {
                  xs: '120px',
                  lg: '204px',
                },
                height: '48px',
                margin: '0',
              }}
            >
              Yes
            </Button>
             <Button
              variant="outlined"
              onClick={handleSubmitOnNo}
              disabled={isSubmitting}
              sx={{
                fontSize: '15px',
                fontWeight: '600',
                minWidth: {
                  xs: '120px',
                  lg: '204px',
                },
                height: '48px',
                margin: '0',
              }}
            >
              {isSubmitting ? 'loading...' : 'No'}
            </Button>
          </Box>
        }
      />{' '}
    </>
  );
}