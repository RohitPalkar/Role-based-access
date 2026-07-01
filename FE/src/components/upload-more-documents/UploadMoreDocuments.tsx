import { useParams } from 'react-router';
import React, { useState, useEffect } from 'react';

import { Button } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

import { useAppDispatch } from 'src/hooks/use-redux';

import { deleteImage } from 'src/redux/actions/rm-panel/upload-actions';

import NewDropzone from '../dropzone/NewDropzone';

interface UploadMoreDocumentsProps {
  formik: any;
}

interface DropzoneData {
  path: string;
  fieldName: string;
  isDeleted: boolean;
  id: string;
  isOther?: boolean;
}

const UploadMoreDocuments: React.FC<UploadMoreDocumentsProps> = ({ formik }) => {
  const dispatch = useAppDispatch();
  const { oppId } = useParams();
  const [fetchedArray, setFetchedArray] = useState<DropzoneData[]>([
    {
      id: `newId${Date.now()}`,
      fieldName: '',
      path: '',
      isDeleted: false,
    },
  ]);

  useEffect(() => {
    if (formik.values.documents?.chequeImages?.length) {
      const mappedArray = formik.values.documents.chequeImages.map((doc: any, index: number) => ({
        id: doc.id || `${index}_${Date.now()}`,
        path: doc.path || doc, // handle if doc is string or object
        fieldName: '',
        isDeleted: false,
      }));
      setFetchedArray(mappedArray);
    } else {
      setFetchedArray([{ id: `newId${Date.now()}`, fieldName: '', path: '', isDeleted: false }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add new document
  const handleAddDocument = () => {
    const newId = `newId${Date.now()}`;
    const newDocument: DropzoneData = {
      id: newId,
      fieldName: '',
      path: '',
      isDeleted: false,
      isOther: true,
    };

    const updated = [...fetchedArray, newDocument];
    setFetchedArray(updated);

    // Only send array of paths to Formik
    const onlyPaths = updated.map((doc) => doc.path).filter(Boolean);
    formik.setFieldValue('documents.chequeImages', onlyPaths);
  };

  // Delete document
  const handleDeleteDocument = (id: string) => {
    const updatedArray = fetchedArray.filter((doc) => doc.id !== id);
    setFetchedArray(updatedArray);

    // Only pass array of paths
    const onlyPaths = updatedArray.map((doc) => doc.path).filter(Boolean);
    formik.setFieldValue('documents.chequeImages', onlyPaths);
  };

  // Update path after upload (key received from child)
  const handleUploadWithPath = (
    fieldName: string,
    uploadedKey: string,
    isOther?: boolean,
    id?: string
  ) => {
    if (!id || !uploadedKey) return;

    const index = fetchedArray.findIndex((doc) => doc.id === id);
    if (index === -1) return;

    // update in state
    const updatedArray = [...fetchedArray];
    updatedArray[index] = { ...updatedArray[index], path: uploadedKey, fieldName };
    setFetchedArray(updatedArray);

    // Only send array of paths to Formik
    const onlyPaths = updatedArray.map((doc) => doc.path).filter(Boolean);
    formik.setFieldValue('documents.chequeImages', onlyPaths);
  };

  const handledelete = async (pathKey: string) => {
    if (pathKey) {
      dispatch(deleteImage({ key: pathKey }));
    }
  };

  return (
    <div>
      {fetchedArray.map((dropzone, index) =>
        !dropzone.isDeleted ? (
          <NewDropzone
            key={dropzone.id}
            name={`documents.chequeImages[${index}].path`}
            fieldName={`documents.chequeImages[${index}].path`}
            id={dropzone.id}
            fileValue={null}
            formik={formik}
            handleupload={(fieldName, fileKey, isOther, id) =>
              handleUploadWithPath(fieldName, fileKey, isOther, id)
            }
            path={dropzone.path}
            documentType="both"
            handledelete={(fieldName, uploadedFile, id) => {
              handledelete(dropzone.path);
            }}
            required
            ondelete={handleDeleteDocument}
            deleteop={index !== 0 ? 'yes' : undefined}
            customSx
            error={formik?.errors?.documents?.chequeImages}
            touched={formik.touched.documents?.chequeImages}
            s3UploadFilePath={`documents/${oppId}`}
          />
        ) : null
      )}

      {fetchedArray.length < 5 && (
        <Button
          sx={{
            fontSize: 14,
            fontWeight: 400,
            textDecoration: 'underline',
            '&:hover': { textDecoration: 'underline' },
            mt: -1,
          }}
          startIcon={<AddCircleOutlineIcon fontSize="small" sx={{ color: '#1A407D' }} />}
          onClick={handleAddDocument}
        >
          Upload More
        </Button>
      )}
    </div>
  );
};

export default UploadMoreDocuments;
