import type { AppDispatch } from 'src/redux/store';

import * as yup from 'yup';
import { toast } from 'sonner';
import { useFormik } from 'formik';
import React, { useEffect } from 'react'
import { useDispatch } from 'react-redux';

import { RemoveCircleOutline } from '@mui/icons-material';
import { Box , Grid , Card, Button, Divider, IconButton, Typography } from '@mui/material';

import { useParams, useRouter } from 'src/routes/hooks';

import { useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { generateRoleBasedRoute } from 'src/utils/constant';
import { stickyBreadcrumbsStyles } from 'src/utils/table-styles';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import { getPreBookingDocuments, updatePreBookingDetails } from 'src/redux/actions/rm-panel/eoi-actions';
import { deleteImage, salesdeleteImage, saveBookingDocument } from 'src/redux/actions/rm-panel/upload-actions';

import { AnimateLogo1 } from 'src/components/animate';
import NewDropzone from 'src/components/dropzone/NewDropzone';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { FormikTextField } from 'src/components/formik-textfield/formik-textfield';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';

type PreBookingDoc = {
  type: string;
  name: string;
  url: string;
  documentId?: string;
};

const jsonValue = uiText.EOIJson.preBookingDetails;
const COST_SHEET = jsonValue?.options?.costSheet;
const ALLOTMENT_LETTER = jsonValue?.options?.allotmentLetter;
const MAX_DOCUMENTS = 10;

const DOCUMENT_TYPE_OPTIONS = [
  jsonValue?.options?.allotmentLetter,
  jsonValue?.options?.reraDocument,
  jsonValue?.options?.modificationRequest,
  jsonValue?.options?.consentLetter,
  jsonValue?.options?.others,
].map((opt) => ({
  label: opt,
  value: opt,
}));


const PreBookingFormView = () => {
  const dispatch: AppDispatch = useDispatch();
  const route = useRouter();
  const { id } = useParams();
  const rolePermissions = useRoleBasedPermissions({ module: 'eoi' });
  const { userRole } = rolePermissions;
  const { preBookingDocuments } = useAppSelector((state) => state.expressonOfInterest);
  
  const preBookingFormFormik = useFormik<{
    agreementValue: string;
    bookingAmount: string;
    costSheet: {
      name: string;
      url: string;
      documentId?: string;
    };
    preBookingDocs: PreBookingDoc[];
  }>({
    initialValues: {
      agreementValue: '',
      bookingAmount: '',
      costSheet: {
        name: COST_SHEET,
        url: '',
        documentId: '',
      },
      preBookingDocs: [],
    },
    validationSchema: yup.object({
      agreementValue: yup.string().required(jsonValue?.validations?.agreementValue).test(
        'greater-than-zero',
        jsonValue?.validations?.agreementValueGreaterThanZero,
        (value) => Number(value) > 0
      ),
      bookingAmount: yup.string().nullable().notRequired(),
      costSheet: yup.object().shape({
        url: yup.string().required(jsonValue?.validations?.costSheet),
      }),
      preBookingDocs: yup.array().of(
        yup.object().shape({
          type: yup.string(),
          name: yup.string(),
          url: yup.string(),
        }).test(
          'optional-doc-validation',
          jsonValue?.validations?.completeDocDetails,
          (doc) => {
            if (!doc) return true;

            const hasAnyValue =
              doc.type || doc.name || doc.url;

            // completely empty → ignore
            if (!hasAnyValue) return true;

            // partially filled → enforce all
            return !!(doc.type && doc.name && doc.url);
          }
        )
      ),
    }),
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        const payload = {
          agreementValue: Number(values.agreementValue),
          bookingAmount: values.bookingAmount
            ? Number(values.bookingAmount)
            : 0,
        };

        await dispatch(
          updatePreBookingDetails({
            id: Number(id),
            payload,
          })
        ).unwrap();

        route.push(generateRoleBasedRoute(userRole, 'eoi-records'));
        toast.success(jsonValue?.successMsg || 'Pre-booking details updated successfully');

      } catch (error) {
        console.error('Update failed:', error);
        toast.error(jsonValue?.errorMesg || 'Failed to update pre-booking details');
      }
    },
  });

  const hasAddedDoc = preBookingFormFormik.values.preBookingDocs.length > 0;
  
  useEffect(() => {
    dispatch(getPreBookingDocuments(Number(id)));
  }, [dispatch, id]);

  useEffect(() => {
    if (!preBookingDocuments?.data) return;
    const { data } = preBookingDocuments;

    const costSheetDoc = data.find(
      (doc: any) => doc.name === COST_SHEET
    );

    const otherDocs = data.filter(
      (doc: any) => doc.name !== COST_SHEET
    );

    //  Set cost sheet
    preBookingFormFormik.setFieldValue('costSheet', {
      name: COST_SHEET,
      url: costSheetDoc?.path || '',
      documentId: costSheetDoc?.id || '',
    });

    // Set other docs
    const optionValues = new Set(DOCUMENT_TYPE_OPTIONS.map(opt => opt.value));
    const mappedDocs = otherDocs.map((doc: any) => ({
      type: optionValues.has(doc.name)
      ? doc.name
      : jsonValue?.options?.others,
      name: doc.name,
      url: doc.path,
      documentId: doc.id,
    }));

    preBookingFormFormik.setFieldValue(
      'preBookingDocs',
      mappedDocs.length > 0 ? mappedDocs : []
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preBookingDocuments]);

  const handleDocumentTypeChange = (index: number, type: string) => {
    const list = [...preBookingFormFormik.values.preBookingDocs];

    const existing = list[index] || {
      type: '',
      name: '',
      url: '',
      documentId: '',
    };

    list[index] = {
      ...existing,
      type,
      name: type === jsonValue?.options?.others ? '' : type,
    };

    preBookingFormFormik.setFieldValue('preBookingDocs', list);
  };

  const handleUpload = async (
    fieldName: string,
    fileKey: string, 
    _isOther: boolean,
    index: number
  ) => {
    try {

      const currentDoc = preBookingFormFormik.values.preBookingDocs[index];
      if (!currentDoc) return;
      const isOther = currentDoc?.type !== jsonValue?.options?.allotmentLetter;

      const savePayload = {
        voucherId: Number(id),
        name: fieldName,
        path: fileKey,
        type: 'pre_booking',
        stage: 'pre_booking',
        isOtherDoc: !!isOther,
      };

      const saveResponse = await dispatch(saveBookingDocument(savePayload)).unwrap();

      const list = [...preBookingFormFormik.values.preBookingDocs];

      list[index] = {
        ...list[index],
        url: fileKey,
        documentId: saveResponse?.data?.id,
      };

      preBookingFormFormik.setFieldValue('preBookingDocs', list);

    } catch (error) {
      console.error('Save API failed', error);
    }
  };

  const handleDeleteDocument = async (
    fieldName: string,
    file: any,
    index: number
  ) => {
    const list = [...preBookingFormFormik.values.preBookingDocs];
    if (!list[index]) return;
    const doc = list[index];

    try {
      if (doc?.url) {
        await dispatch(deleteImage({ key: doc.url }));
      }

      if (doc?.documentId) {
        await dispatch(salesdeleteImage({ documentId: doc.documentId }));
      }

      list[index] = {
        ...list[index],
        url: '',
        documentId: '',
      };

      preBookingFormFormik.setFieldValue('preBookingDocs', list);

    } catch (error) {
      console.error('Delete failed', error);
    }
  };

  const handleCostSheetUpload = async (
    fieldName: string,
    fileKey: string
  ) => {
    try {
      const savePayload = {
        voucherId: Number(id),
        name: COST_SHEET,
        path: fileKey,
        type: 'pre_booking',
        stage: 'pre_booking',
        isOtherDoc: false,
      };

      const res = await dispatch(saveBookingDocument(savePayload)).unwrap();

      preBookingFormFormik.setFieldValue('costSheet', {
        name: COST_SHEET,
        url: fileKey,
        documentId: res?.data?.id,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleCostSheetDelete = async () => {
    const doc = preBookingFormFormik.values.costSheet;

    try {
      if (doc?.url) {
        await dispatch(deleteImage({ key: doc.url }));
      }

      if (doc?.documentId) {
        await dispatch(salesdeleteImage({ documentId: doc.documentId }));
      }

      preBookingFormFormik.setFieldValue('costSheet', {
        name: COST_SHEET,
        url: '',
        documentId: '',
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddDocument = () => {
    const list = preBookingFormFormik.values.preBookingDocs;
    if (list.length >= MAX_DOCUMENTS) return;

    const newDoc =
      list.length === 0
        ? {
            type: ALLOTMENT_LETTER,
            name: ALLOTMENT_LETTER,
            url: '',
            documentId: '',
          }
        : {
            type: '',
            name: '',
            url: '',
            documentId: '',
          };

    preBookingFormFormik.setFieldValue('preBookingDocs', [
      ...list,
      newDoc,
    ]);
  };

  const handleRemoveDocument = (index: number) => {
    const list = [...preBookingFormFormik.values.preBookingDocs];
    list.splice(index, 1);
    preBookingFormFormik.setFieldValue('preBookingDocs', list);
  };

  return preBookingDocuments.loading ? (
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          height: '80vh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AnimateLogo1 />
      </Box>
    ) : (
    <DashboardContent>
        <Box sx={stickyBreadcrumbsStyles}>
          <CustomBreadcrumbs heading={jsonValue.title} />
        </Box>
        <form onSubmit={preBookingFormFormik?.handleSubmit}>
          <Card sx={{ px: '20px', py: '24px' }}>
            <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={12}>
                  <FormikTextField
                    formik={preBookingFormFormik}
                    name="agreementValue"
                    label={jsonValue.label.agreementValue}
                    required
                    noGrid
                    formatAsNumber
                  />
                </Grid>
                <Grid item xs={12} sm={12}>
                  <FormikTextField
                    formik={preBookingFormFormik}
                    name="bookingAmount"
                    label={jsonValue.label.bookingAmount}
                    noGrid
                    formatAsNumber
                  />
                </Grid>
            </Grid>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>
                  {jsonValue.upload}
                </Typography>

                <Typography sx={{ fontSize: '14px', fontWeight: 500, mb: -1 }}>
                  {jsonValue?.options?.costSheet} <span style={{ color: 'red'}}>*</span>
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                  <Box sx={{ flex: 2 }}>
                    <NewDropzone
                      name="costSheet.url"
                      file
                      required
                      fieldName={COST_SHEET}
                      fileValue={preBookingFormFormik.values.costSheet.url}
                      path={preBookingFormFormik.values.costSheet.url}
                      handleupload={(fieldName, fileKey) =>
                        handleCostSheetUpload(fieldName, fileKey)
                      }
                      handledelete={() => handleCostSheetDelete()}
                      documentType="pdf"
                      formik={preBookingFormFormik}
                    />
                  </Box>
                </Box>

              {(preBookingFormFormik.values.preBookingDocs || []).map((doc, index) => (
                <>
                  <Box
                    key={doc.documentId || index}
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', md: 'row' },
                      gap: 2,
                      alignItems: 'flex-start',
                      width: '100%',
                    }}
                  >
                    {/* Remove button */}
                    {hasAddedDoc && (
                      <IconButton color="error" onClick={() => handleRemoveDocument(index)}>
                        <RemoveCircleOutline />
                      </IconButton>
                    )}

                    {/* Document Type */}
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <ControlledAutocomplete
                        label={jsonValue.label.docType}
                        options={DOCUMENT_TYPE_OPTIONS}
                        value={doc.type || ''}
                        onChange={(val) =>
                          handleDocumentTypeChange(index, typeof val === 'string' ? val : '')
                        }
                      />
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      {/* Document Name */}
                      <FormikTextField
                        formik={preBookingFormFormik}
                        name={`preBookingDocs[${index}].name`}
                        label={jsonValue.label.docName}
                      />
                    </Box>

                    <Box sx={{ flex: 2 }}>
                      {/* Upload */}
                      <NewDropzone
                        name={`preBookingDocs[${index}].url`}
                        file
                        fieldName={doc.name || ''}
                        fileValue={doc.url || ''}
                        path={doc.url}
                        handleupload={(fieldName, fileKey, isOther) =>
                          handleUpload(fieldName, fileKey, isOther, index)
                        }
                        handledelete={(fieldName, file) =>
                          handleDeleteDocument(fieldName, file, index)
                        }
                        documentType="pdf"
                        id={index}
                        formik={preBookingFormFormik}
                      />
                    </Box>
                  </Box>
                  {typeof preBookingFormFormik.errors.preBookingDocs?.[index] === 'string' && (
                    <Typography color="error" variant="caption">
                      {preBookingFormFormik.errors.preBookingDocs[index]}
                    </Typography>
                  )}
                </>
              ))}

                {/* Add Button */}
                <Button
                onClick={handleAddDocument}
                disabled={preBookingFormFormik.values.preBookingDocs.length >= MAX_DOCUMENTS}
                sx={{
                    margin: '10px auto 0',
                    color: '#1A407D',
                    fontWeight: 600,
                }}
                >
                + {jsonValue.label.addDoc}
                </Button>
            </Box>
            <Divider sx={{ border: '1px dotted #DADADA', mt: 2 }} />
              <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
                <Button
                  size='large'
                  variant="outlined"
                  color="inherit"
                  sx={{ px: 5 }}
                  onClick={() => {
                    route.push(generateRoleBasedRoute(userRole, 'eoi-records'));
                  }}
                >
                  {uiText.button.cancel}
                </Button>
                <Button 
                  type="submit" 
                  size='large' 
                  variant="contained" 
                  sx={{
                    px: 5,
                    backgroundColor: '#1A407D',
                    '&:hover': {
                      backgroundColor: '#174A9D',
                    },
                  }}
                >
                  {uiText.button.submit}
                </Button>
            </Box>
          </Card>
        </form>
    </DashboardContent>
    )
}

export default PreBookingFormView