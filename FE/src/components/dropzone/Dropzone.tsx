/* eslint-disable @typescript-eslint/no-shadow */
import { toast } from 'sonner';
import React, { useState, useEffect } from 'react';

import CloseIcon from '@mui/icons-material/Close';
import Autocomplete from '@mui/material/Autocomplete';
import { Box, Button, Dialog, TextField, IconButton, Typography } from '@mui/material';

import { CONFIG } from 'src/config-global';

import ImageCropModal from '../image-crop-modal';
import ViewImg from '../../assets/images/view.svg';
import uploadImg from '../../assets/images/upload.svg';
import deleteRed from '../../assets/images/delete-red.svg';

interface DropzoneProps {
  required?: boolean;
  label?: string;
  select?: boolean;
  file?: boolean;
  text?: string;
  deleteop?: string;
  ondelete?: (id: string) => void;
  placeholder?: string;
  title?: string;
  action?: any;
  fieldName?: any;
  fileValue?: any;
  documentType?: string;
  handleupload?: (fieldName: any, file: any, isOther?: any, id?: any) => Promise<void> | void;
  handledelete?: (fieldName: any, file: any, id?: string) => void;
  formik?: any;
  name: string;
  autoUpload?: boolean;
  id?: any;
  isOther?: any;
  documentName?: string;
  path?: string | any;
  placholderforBack?: string;
  onlyInput?: boolean;
  error?: string;
  touched?: boolean;
  // Optional override for maximum allowed PDF size (in bytes)
  maxPdfSizeBytes?: number;
}

const Dropzone: React.FC<DropzoneProps> = (props) => {
  const {
    required,
    label,
    select,
    deleteop,
    ondelete,
    fieldName,
    placeholder,
    handleupload,
    handledelete,
    documentType,
    formik,
    name,
    autoUpload,
    id,
    isOther,
    documentName,
    path,
    placholderforBack,
    onlyInput,
    error,
    touched,
    maxPdfSizeBytes,
  } = props;

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileURL, setFileURL] = useState<string | null>(null);
  const [autocompleteValue, setAutocompleteValue] = useState<string>('');
  const [fetchedPath, setFetchedPath] = useState<string | any>();
  const [customValue, setCustomValue] = useState<string>('');
 const [showCropModal, setShowCropModal] = useState<boolean>(false);
  const [tempImageFile, setTempImageFile] = useState<File | null>(null);
  const [tempImageURL, setTempImageURL] = useState<string | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  let uploadClass = 'upload-input-div upload-click-width';
  if (autocompleteValue === 'Other') {
    if (onlyInput) {
      uploadClass = 'upload-input-width upload-input-div';
    } else {
      uploadClass = 'upload-input-div upload-click-width upload-click-width-reduce';
    }
  }

  let displayText = "Click to upload";
  if (uploadedFile) {
    displayText = uploadedFile.name;
  } else if (fetchedPath) {
    displayText = (fetchedPath as string)?.split("/").pop() || "";
  } else if (placeholder || placholderforBack) {
    displayText = placholderforBack || '';
  }

  let helperText = 'JPEG, PNG, JPG (Max. file size: 10 MB)';
  const pdfMaxSize = maxPdfSizeBytes
    ? maxPdfSizeBytes / (1024 * 1024)
    : 2;

  if (documentType === 'pdf') {
    helperText = `PDF only (Max. file size: ${pdfMaxSize} MB)`;
  } else if (documentType === 'both') {
    helperText = `JPEG, PNG, JPG (Max: 10 MB), PDF (Max: ${pdfMaxSize} MB)`;
  }

  let acceptTypes = 'image/jpeg, image/jpg, image/png';
  if (documentType === 'pdf') {
    acceptTypes = 'application/pdf';
  } else if (documentType === 'both') {
    acceptTypes = 'image/jpeg, image/jpg, image/png, application/pdf';
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const options = ['RERA Document', 'Modification Request', 'Other'];

  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_PDF_SIZE = (typeof maxPdfSizeBytes === 'number' ? maxPdfSizeBytes : 2 * 1024 * 1024); // default 2MB, can override via props

const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event?.target?.files?.[0];

  if (!file) return;

  // Reset input so the same file can be re-selected later
  event.target.value = '';

  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  const isImage = imageTypes.includes(file.type);
  const isPDF = file.type === 'application/pdf';
  const allowedTypes = [...imageTypes, 'application/pdf'];

  let maxFileSize = 0;

  if (documentType === 'image') {
    maxFileSize = MAX_IMAGE_SIZE;

    if (!isImage) {
      toast.error('Invalid file type. Only JPEG, JPG, and PNG images are allowed.');
      return;
    }

    if (file.size > maxFileSize) {
      toast.error('Image size exceeds 10 MB. Please select a smaller file.');
      return;
    }
  } else if (documentType === 'pdf') {
    maxFileSize = MAX_PDF_SIZE;

    if (!isPDF) {
      toast.error('Invalid file type. Only PDF files are allowed.');
      return;
    }

    if (file.size > maxFileSize) {
      toast.error(`PDF size exceeds ${maxFileSize / (1024 * 1024)}MB. Please select a smaller file.`);
      return;
    }

    await processFileUpload(file);
    return;
  } else if (documentType === 'both') {
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Only JPEG, PNG, or PDF files are allowed.');
      return;
    }

    maxFileSize = isPDF ? MAX_PDF_SIZE : MAX_IMAGE_SIZE;

    if (file.size > maxFileSize) {
      toast.error(
        `${isPDF ? 'PDF' : 'Image'} size exceeds ${maxFileSize / (1024 * 1024)}MB. Please select a smaller file.`
      );
      return;
    }

    if (isPDF) {
      await processFileUpload(file);
      return;
    }
  } else {
    maxFileSize = MAX_IMAGE_SIZE;

    if (!isImage) {
      toast.error('Invalid file type. Only JPEG, JPG, and PNG images are allowed.');
      return;
    }

    if (file.size > maxFileSize) {
      toast.error('Image size exceeds 10 MB. Please select a smaller file.');
      return;
    }
  }

  // Show crop modal for image files
  const imageUrl = URL.createObjectURL(file);
  setTempImageFile(file);
  setTempImageURL(imageUrl);
  setShowCropModal(true);
};


 const processFileUpload = async (file: File, inputElement?: HTMLInputElement) => {
    // Validate document name before upload
    const documentNameToUse = autocompleteValue === 'Other' ? customValue : autocompleteValue || fieldName;
    
    if (isOther && (!documentNameToUse || documentNameToUse.trim() === '')) {
      toast.error('Document name is mandatory. Please provide a document name before uploading.');
      if (inputElement) inputElement.value = '';
      return;
    }

    // Set the file in UI
    if (formik) {
      formik.setFieldValue(name, file);
    }
    setUploadedFile(file);
    setFileURL(URL.createObjectURL(file));

    // Upload
    if (handleupload) {
      try {
        await handleupload(
          documentNameToUse,
          file,
          isOther,
          id
        );
      // eslint-disable-next-line @typescript-eslint/no-shadow
      } catch (error) {
        console.error(error);
        toast.error('Upload failed. Please try again.');
        clearFileFromUI();
        if (inputElement) inputElement.value = '';
      }
    }

    if (autoUpload && handleupload) {
      try {
        await handleupload(fieldName, file);
      } catch (error) {
        console.error(error);
        toast.error('Upload failed. Please try again.');
        clearFileFromUI();
        if (inputElement) inputElement.value = '';
      }
    }
  };

  const clearFileFromUI = () => {
    if (formik) {
      formik.setFieldValue(name, '');
      formik.setFieldError(name, undefined);
    }
    setUploadedFile(null);
    setFileURL(null);
    setFetchedPath('');
  };
  const handleCropSave = async (croppedImageFile: File) => {
    // Process the cropped image
    await processFileUpload(croppedImageFile);
    
    // Clean up temp states
    setTempImageFile(null);
    if (tempImageURL) {
      URL.revokeObjectURL(tempImageURL);
    }
    setTempImageURL(null);
    setShowCropModal(false);
  };

  const handleCropCancel = () => {
    // Clean up temp states
    setTempImageFile(null);
    if (tempImageURL) {
      URL.revokeObjectURL(tempImageURL);
    }
    setTempImageURL(null);
    setShowCropModal(false);
  };

  const handleFileDelete = () => {
    if (formik) {
      formik.setFieldValue(name, '');
      formik.setFieldError(name, undefined);
    }
    handledelete?.(fieldName, uploadedFile, id);

    setUploadedFile(null);
    setFileURL(null);
    setFetchedPath('');
  };

  const DeleteFunc = () => {
    if (ondelete && id) {
      ondelete(id);
      handleFileDelete();
      setAutocompleteValue('');
    }
  };
  useEffect(() => {
    if (documentName === options[0]) {
      setAutocompleteValue(options[0]);
    }
    if (documentName === options[2]) {
      setAutocompleteValue(options[2]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (fetchedPath) {
      const encodedPath = fetchedPath.split('/').map(encodeURIComponent).join('/');
      setFileURL(`${CONFIG.site.s3BasePath}/${encodedPath}`);
    }
  }, [fetchedPath, id]);

  useEffect(() => {
    if (path) {
      setFetchedPath(path);
    }
  }, [path]);

  useEffect(() => {
    // Check if fieldName doesn't match any value in options
    if (fieldName && isOther && !options.includes(fieldName)) {
      setAutocompleteValue(options[2]); // Set autocomplete value to fieldName
      setCustomValue(fieldName); // Set custom value to fieldName
    }
    if (fieldName && isOther && options.includes(fieldName)) {
      setAutocompleteValue(fieldName);
    }
  }, [fieldName, isOther, options]);
  useEffect(() => {
    if (fieldName === '') {
      setAutocompleteValue('');
    }
    if (onlyInput) {
      setAutocompleteValue('Other');
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

const handleFileView = () => {
  if (fileURL) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const lowerUrl = fileURL.toLowerCase();

    const isImageUrl = imageExtensions.some((ext) => lowerUrl.endsWith(ext));

    if (isImageUrl) {
      setPreviewDialogOpen(true); // Open image preview
    } else {
      window.open(fileURL, '_blank'); // Open PDF or other files
    }
  } else {
    document.getElementById(`${fieldName}-file-upload`)?.click();
  }
};


  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', mb: 3, overflow: 'hidden' }} className="dropzone-row">
      {label && (
        <Typography
          className="typographyTitle"
          style={{
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '12px',
          }}
        >
          {label}
          {required && <span style={{ color: 'red' }}> *</span>}
        </Typography>
      )}

      <div className="upload-input-row">
        {deleteop && (
          <Button
            onClick={DeleteFunc}
            sx={{
              minWidth: '2%',
              height: '40px',
              padding: '0px',
              textAlign: 'left',
              display: 'block',
              flexShrink: 0,
              '&:hover': {
                backgroundColor: 'transparent',
                transform: 'none',
              },
            }}
          >
            <img src={deleteRed} alt="" />
          </Button>
        )}
        {select && !onlyInput && (
          <div className="documentSelect">
            <Autocomplete
              disableClearable
              fullWidth
              sx={{
                height: '44px',
                border: '1px solid lightgrey',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '400',
                padding: '0px',
              }}
              value={autocompleteValue}
              options={options}
              onChange={(event, newValue) => {
                setAutocompleteValue(newValue || ''); // Update Autocomplete value
                if (newValue !== 'Other') {
                  setCustomValue(''); // Reset custom input if not "Other"
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  InputProps={{
                    ...params.InputProps,
                    style: { padding: 0, height: '100%' },
                    sx: {
                      '& .MuiAutocomplete-input': { padding: '0px' },
                      '& .MuiInputBase-input': {
                        fontSize: '14px',
                        fontWeight: '400',
                        padding: '0px 0px 0px 14px !important',
                        height: '42px',
                      },
                    },
                  }}
                  placeholder={autocompleteValue === '' ? 'Select' : undefined} // Show 'Select' placeholder when empty
                />
              )}
            />
          </div>
        )}
        {autocompleteValue === 'Other' && (
          <TextField
            placeholder="Enter Document Name"
            sx={{
              width: {
                xs: '100%',
                // sm: '40%',
                // md: '40%',
                sm: '29.5%',
                md: '32.5%',
              },
              height: '44px',
              borderRadius: '8px',
              fontSize: '14px',
              flexShrink: 0,
              fontWeight: '400',
              border: '1px solid lightgrey',
              color: 'rgba(102, 112, 133, 1)',
              '& .MuiInputBase-input': {
                fontSize: '14px', // Font size for the input field
                fontWeight: '400', // Font weight for the input field
                padding: '0px 0px 0px 14px', // Adjust padding if needed
                height: '44px',
              },
            }}
            value={customValue}
            onChange={(e) => {
              const { value } = e.target;
              // Only allow alphabets and numbers using a regex.
              // Adjust the regex if you want to allow spaces or other characters.
              const regex = /^[A-Za-z0-9\s]*$/;
              if (value.length <= 50 && regex.test(value)) {
                setCustomValue(value);
              }
            }}
          />
        )}
        <div className={uploadClass}>
        <Box sx={{ position: "relative", width: "100%" }}>
        {/* Upload Button */}
        <Button
          variant="outlined"
          fullWidth
          sx={{
            display: "flex",
            height: 44,
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 400,
            borderColor: "lightgrey",
            color: "rgba(102, 112, 133, 1)",
            backgroundColor: "white",
            justifyContent: "flex-start",
            textTransform: "none",
            padding: "10px",
            overflow: "hidden",
            minWidth: 0, // Allow button to shrink
          }}
          onClick={() => {
            if (!uploadedFile && !fetchedPath) {
              document.getElementById(`${fieldName}-file-upload`)?.click();
            }
          }}
        >
          <Typography
            sx={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              width: "90%",
              textAlign: "left",
              fontSize:'14px'
            }}
          >
            {displayText}
          </Typography>
        </Button>
      
        {/* Delete Button */}
        {(uploadedFile || fetchedPath) && (
          <Button
            sx={{
              position: "absolute",
              right: 0,
              top: "35%",
              transform: "translateY(-50%)",
              minWidth: "54px",
            }}
            onClick={handleFileDelete}
          >
            <img
              src={`${CONFIG.site.basePath}/assets/images/primary-shape.png`}
              alt="Delete"
            />
          </Button>
        )}
      
        {/* Helper Text (File Type Info) */}
        <Typography sx={{ fontSize: '12px', color: 'rgba(102, 112, 133, 1)', mt: 0.3 }}>
          {helperText}
        </Typography>
      </Box>
        </div>
        <button className="btn-upload" type="button" onClick={handleFileView}>
          <span className="upload-img">
            <p className="upload-text">
              {fileURL ? <img src={ViewImg} alt="" /> : <img src={uploadImg} alt="" />}
            </p>
          </span>
          <p className="upload-text">{fileURL ? 'View' : 'Upload'}</p>
        </button>
        <input
          id={`${fieldName}-file-upload`}
          type="file"
          style={{ display: 'none' }}
          accept={acceptTypes}
          onChange={handleFileUpload}
        />
      </div>
      {((formik?.touched[name] && formik.errors[name]) || (touched && error)) && (
        <Typography color="red" fontSize="12px">
          {formik?.errors[name] || error}
        </Typography>
      )}
            {/* Image Crop Modal */}
      {showCropModal && tempImageURL && tempImageFile && (
        <ImageCropModal
          open={showCropModal}
          onClose={handleCropCancel}
          imageUrl={tempImageURL}
          onSave={handleCropSave}
          fileName={tempImageFile.name}
        />
      )}
      {/* Preview Dialog */}
<Dialog open={previewDialogOpen} onClose={() => setPreviewDialogOpen(false)} maxWidth="md" fullWidth>
  <Box sx={{ p: 2, position: 'relative' }}>
    {/* Close Icon */}
    <IconButton
      aria-label="close"
      onClick={() => setPreviewDialogOpen(false)}
      sx={{
        position: 'absolute',
        right: 8,
        top: 8,
        color: (theme) => theme.palette.grey[500],
      }}
    >
      <CloseIcon />
    </IconButton>

    {/* Title */}
    <Typography variant="h6" gutterBottom>
      Preview
    </Typography>

    {/* Image */}
    <img
      src={(fileURL ?? '') || (tempImageURL ?? '') || ''}
      alt="Preview"
      style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }}
    />
  </Box>
</Dialog>


    </Box>
  );
};

export default Dropzone;
