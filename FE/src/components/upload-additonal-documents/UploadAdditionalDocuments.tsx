import { useFormik } from 'formik';
import { useParams } from 'react-router';
import React, { useState, useEffect } from 'react';
 
import { Box, Button } from '@mui/material';
import { ArrowCircleRight } from '@mui/icons-material';
 
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';
 
import { isNotImangeFile, getCompressionDimensions } from 'src/utils/upload-utils';

import {
  deleteImage,
  salesdeleteImage,
  directUploadFile,
  getBookingDocuments,
  saveBookingDocument,
  compressAndUploadFile,
} from 'src/redux/actions/rm-panel/upload-actions';
 
import { toast } from 'src/components/snackbar';
 
import Dropzone from '../dropzone/Dropzone';
import { BorderBox } from '../border-box/BorderBox';
import { FilledButton } from '../buttons/FilledButton';
import plusCircle from '../../assets/images/plus-circle.svg';
 
interface DocumentData {
  id: string;
  fieldName: string;
  path: string;
  isOther?: boolean;
  isDeleted?: boolean;
}
 
interface DropzoneData {
  isOther(fieldName: string, selectedFile: any, isOther: any, id: string): void;
  path: string | undefined;
  fieldName: string;
  isDeleted: boolean;
  id: string;
}

 
interface UploadAdditionalDocumentsProps {
  type?: string;
  stage?: string;
  showBorder?: boolean;
  isOfficeUseButton?: boolean;
  handleNext?: any;
  saveLoading?:any;
}
 
const UploadAdditionalDocuments: React.FC<UploadAdditionalDocumentsProps> = ({
  type,
  stage,
  showBorder,
  isOfficeUseButton,
  handleNext,
  saveLoading
}) => {
  // Local state to manage the list of documents for UI re-rendering.
  const [fetchedArray, setFetchedArray] = useState<any[]>([]);
 
  const { bookingDocuments } = useAppSelector((state) => state.dashboard);
  const dispatch = useAppDispatch();
  const { oppId } = useParams();
 
  // Initialize Formik with an array of additionalDocuments.
  const formik = useFormik({
    initialValues: {
      additionalDocuments: [] as DocumentData[],
    },
    onSubmit: (values) => { },
  });
 
  const handleAddDocument = () => {
    if (fetchedArray?.some((each) => each.path === '' || each.fieldName === '')) {
      toast.error(
        'Please provide a document name and complete the upload for the existing field before adding a new document.'
      );
      return; // Exit early if an empty field exists
    }
    if (fetchedArray.length < 10) {
      const newId = fetchedArray.length + 1;
      const newDocument = {
        id: `newId${newId}`,
        fieldName: ``,
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
 
  // Update the document's path and fieldName after a file is uploaded.
  // Replace URL.createObjectURL with your actual upload logic as needed.
  const handleUpload = async (fieldName: string, selectedFile: any, isOther: any, id: any) => {
    try {
      // Validate that document name is provided
      if (!fieldName || fieldName.trim() === '') {
        toast.error('Document name is mandatory. Please provide a document name before uploading.');
        return;
      }
      
      const isPDF = isNotImangeFile(selectedFile);
      const { width, height } = getCompressionDimensions(fieldName);
 
      const fileObjects = {
        folder: `documents/${oppId}`,
        key: selectedFile.name.replaceAll(/\s+/g, ''),
      };

      let result;
      
      if (isPDF) {
        // Use direct upload for PDFs (no compression)
        result = await dispatch(directUploadFile({
          file: selectedFile,
          presignedUrlPayload: fileObjects,
        })).unwrap();
      } else {
        // Use compress and upload flow for images
        result = await dispatch(compressAndUploadFile({
          file: selectedFile,
          width,
          height,
          presignedUrlPayload: fileObjects,
        })).unwrap();
      }
 
      if (result?.presignedResponse?.statusCode === 201) {
        const res = result.presignedResponse;
        const fileKey = res?.data?.key || fileObjects.key;
 
        const savePayload = {
          opportunityId: oppId as string,
          name: fieldName,
          path: fileKey,
          type: type || '',
          stage: stage || '',
          isOtherDoc: isOther,
        };
 
        const saveResponse = await dispatch(saveBookingDocument(savePayload)).unwrap();
        const fetchedResponse = saveResponse?.data;
        setFetchedArray((prev) =>
          prev.map((each) =>
            each.id === id
              ? { ...each, path: fetchedResponse?.path, id: fetchedResponse?.id || each.id }
              : each
          )
        );
 
        await dispatch(getBookingDocuments(`/${oppId}`));
        toast.success('Document uploaded successfully!');
      }
    } catch (error) {
      console.error('❌ Error during file upload or document save:', error);
      toast.error(
        `${error?.errors?.message?.[0] ? error?.errors?.message?.[0] : 'Error while uploading document'}`
      );
      dispatch(getBookingDocuments(`/${oppId}`));
    }
  };
  const handledelete = async (fieldName: any, fileValue: any, id?: any) => {
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
 
  useEffect(() => {
    dispatch(getBookingDocuments(`/${oppId}`));
  }, [dispatch, oppId]);

  useEffect(() => {
    if (bookingDocuments?.data?.length) {
      const { data } = bookingDocuments;
      const updatedArray: any[] = [];
 
      data?.forEach((each: any) => {
        if (each?.isOtherDoc === true && each?.type === type && each?.stage === stage) {
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
      setFetchedArray(updatedArray);
      if (updatedArray?.length === 0) {
        const newarray = [
          {
            id: 'newId1',
            fieldName: '',
            path: '',
            isOther: true,
            isDeleted: false,
          },
        ];
        setFetchedArray(newarray);
      }
    } else {
      const newarray = [
        {
          id: 'newId1',
          fieldName: '',
          path: '',
          isOther: true,
          isDeleted: false,
        },
      ];
      setFetchedArray(newarray);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingDocuments, oppId]);
  return (
    <div>
      <BorderBox
        sx={showBorder ? {} : { border: '1px solid #fff', padding: 0 }}
        title="Upload Other Documents"
        className='removePadding'
      >
        <Box className="UploadOtherDocuments">
          <div className="document-type-dropzone">
            {fetchedArray?.map(
              (dropzone: DropzoneData, index: number) =>
                !dropzone.isDeleted && (
                  <Dropzone
                    key={dropzone.id}
                    name=" "
                    ondelete={handleDeleteDocument}
                    select
                    deleteop="yes"
                    title="Upload Document"
                    fieldName={`${dropzone.fieldName}`}
                    fileValue={null}
                    isOther
                    handledelete={handledelete}
                    handleupload={handleUpload}
                    documentType="both"
                    path={dropzone.path}
                    id={dropzone.id}
                    onlyInput
                    formik={formik}
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
              border: "1px solid #1A407D",
              padding: "8px 20px",
              borderRadius: "8px",
            }}
            type="button"
            onClick={handleAddDocument}
          >
            <img src={plusCircle} alt="" /> Add Documents
          </Button>
        </Box>
 
 
      </BorderBox>
      {isOfficeUseButton && <div className="filledButtonAll gap-16">
        <FilledButton
          label="Office Use"
          width="20%"
          isLoading={saveLoading}
          onClick={handleNext}
          endIcon={<ArrowCircleRight />}
        />
      </div>}
    </div>
  );
};
 
export default UploadAdditionalDocuments;
 
 