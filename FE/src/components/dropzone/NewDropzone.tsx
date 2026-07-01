/* eslint-disable @typescript-eslint/no-shadow */
import type { AppDispatch } from 'src/redux/store';

import { toast } from 'sonner';
import { getIn } from 'formik';
import { useDispatch } from 'react-redux';
import React, { useState, useEffect } from 'react';

import CloseIcon from '@mui/icons-material/Close';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Box, Button, Dialog, Tooltip, TextField, IconButton, Typography } from '@mui/material';

import { getCompressionDimensions } from 'src/utils/upload-utils';

import { CONFIG } from 'src/config-global';
import { uploadFile, compressAndUploadFile } from 'src/redux/actions/rm-panel/upload-actions';

import ImageCropModal from '../image-crop-modal';
import ViewImg from '../../assets/images/view.svg';
import uploadImg from '../../assets/images/upload.svg';
import deleteRed from '../../assets/images/delete-red.svg';

/** Puravankara header blue — transparent logo preview in dialog (matches live header). */
const LOGO_PREVIEW_BACKDROP = 'rgb(26, 64, 125)';

interface NewDropzoneProps {
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
  handleupload?: (fieldName: any, file: any, isOther?: any, id?: any) => void;
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
  disabled?: boolean;
  showAsterik?: boolean;
  pdfMaxSize10MB?: boolean;
  customSx?: boolean;
  s3UploadFilePath?:string;
  uploadText?: string;
  customImageSize?: number;
  imgMinWidth?: number;
  imgMinHeight?: number;
  imgMaxWidth?: number;
  imgMaxHeight?: number;
  /** When set, shown instead of the default "Size: min–max W × … H px" line (e.g. aspect ratio + spec text). */
  dimensionHint?: string;
  /** Rich tooltip (info icon): required pixels, aspect ratio, optional format — used with brand/CMS image specs. */
  dimensionSpecTooltip?: {
    requiredDimensions: string;
    aspectRatio?: string;
    recommendedFormat?: string;
  };
  /** When true, accepts SVG (no crop; uploads as vector). Use for brand logo / project hero / JV logo. */
  allowSvg?: boolean;
  /** Brand blue backdrop in the preview dialog so transparent PNG/SVG logos read like production */
  previewContrastBg?: boolean;
  /** Left inset for validation text (theme spacing units; default `2` = 16px). */
  errorMarginLeft?: number;
}

interface UploadPayload {
  presignedUrl: string;
  file: File;
}

const DOCUMENT_OPTIONS = ['RERA Document', 'Modification Request', 'Other'];

const NewDropzone: React.FC<NewDropzoneProps> = (props) => {
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
    id,
    isOther,
    documentName,
    path,
    placholderforBack,
    onlyInput,
    error,
    touched,
    disabled = false,
    showAsterik = false,
    pdfMaxSize10MB = false,
    customSx = false,
    s3UploadFilePath='',
    uploadText = "Click to upload",
    customImageSize,
    imgMinWidth,
    imgMaxWidth,
    imgMinHeight,
    imgMaxHeight,
    dimensionHint,
    dimensionSpecTooltip,
    allowSvg = false,
    previewContrastBg = false,
    errorMarginLeft=2,
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
  const [isUploading, setIsUploading] = useState(false);
  const dispatch: AppDispatch = useDispatch();

  let uploadClass = 'upload-input-div upload-click-width';
  if (autocompleteValue === 'Other') {
    if (onlyInput) {
      uploadClass = 'upload-input-width upload-input-div';
    } else {
      uploadClass = 'upload-input-div upload-click-width upload-click-width-reduce';
    }
  }

  let displayText: React.ReactNode = (
    <>
      {uploadText}&nbsp;
      {showAsterik && <span style={{ color: "#FF0000" }}>*</span>}
    </>
  );

  if (uploadedFile) {
    displayText = uploadedFile.name;
  } else if (fetchedPath) {
    displayText = (fetchedPath as string)?.split("/").pop() || "";
  } else if (placeholder || placholderforBack) {
    displayText = placholderforBack || '';
  }

  const baseImageTypes = `image/jpeg, image/jpg, image/png${allowSvg ? ', image/svg+xml' : ''}`;
  let acceptTypes = baseImageTypes;

  if (documentType === 'pdf') {
    acceptTypes = 'application/pdf';
  } else if (documentType === 'both') {
    acceptTypes = `${baseImageTypes}, application/pdf`;
  }

  // DOCUMENT_OPTIONS is defined outside the component

  const MAX_IMAGE_SIZE = customImageSize || 10 * 1024 * 1024; // 10MB
  const MAX_PDF_SIZE = pdfMaxSize10MB ? 10 * 1024 * 1024 : 2 * 1024 * 1024; // 2MB
  const customSize = customImageSize ? `${(customImageSize / (1024 * 1024)).toFixed(0)} MB` : '10 MB';
  const hasDimensions =
  imgMinWidth != null ||
  imgMaxWidth != null ||
  imgMinHeight != null ||
  imgMaxHeight != null;

  const dimensionText = hasDimensions
    ? `Size: ${imgMinWidth ?? "-"}–${imgMaxWidth ?? "-"} W × ${imgMinHeight ?? "-"}–${imgMaxHeight ?? "-"} H px`
    : '';

  const helperDimensionText = dimensionHint ?? dimensionText;
  const validateImageDimensions = (
    file: File
  ): Promise<{ valid: boolean; width: number; height: number }> =>
    new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        const { width, height } = img;

        const isValid =
          (!imgMinWidth || width >= imgMinWidth) &&
          (!imgMaxWidth || width <= imgMaxWidth) &&
          (!imgMinHeight || height >= imgMinHeight) &&
          (!imgMaxHeight || height <= imgMaxHeight);

        URL.revokeObjectURL(url);

        resolve({
          valid: isValid,
          width,
          height,
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({
          valid: false,
          width: 0,
          height: 0,
        });
      };

      img.src = url;
    });

const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event?.target?.files?.[0];

  if (!file) return;

  // Reset input so the same file can be re-selected later
  event.target.value = '';

  const rasterImageTypes = ['image/jpeg', 'image/jpg', 'image/png'] as const;
  const imageTypes = new Set<string>(allowSvg ? [...rasterImageTypes, 'image/svg+xml'] : rasterImageTypes);
  const isSvgFile =
    allowSvg &&
    (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name));
  const isImage =
    imageTypes.has(file.type) ||
    (file.type === '' &&
      (allowSvg
        ? /\.(jpe?g|png|svg)$/i.test(file.name)
        : /\.(jpe?g|png)$/i.test(file.name)));
  const isPDF = file.type === 'application/pdf';

  const runRasterDimensionCheck = async (): Promise<boolean> => {
    if (isSvgFile) return true;
    const result = await validateImageDimensions(file);
    if (!result.valid) {
      toast.error(
        `Image size is outside the allowed range. ` +
          `Width: ${imgMinWidth ?? '—'}–${imgMaxWidth ?? '—'} px · ` +
          `Height: ${imgMinHeight ?? '—'}–${imgMaxHeight ?? '—'} px. ` +
          `Uploaded: ${result.width} × ${result.height} px`
      );
      return false;
    }
    return true;
  };

  let maxFileSize = 0;

  if (documentType === 'image') {
      maxFileSize = MAX_IMAGE_SIZE;

    if (!isImage) {
      toast.error(
        allowSvg
          ? 'Invalid file type. Only JPEG, JPG, PNG, and SVG images are allowed.'
          : 'Invalid file type. Only JPEG, JPG, and PNG images are allowed.'
      );
      return;
    }

    if (file.size > maxFileSize) {
      toast.error(
        `Image size exceeds ${customSize}. Please select a smaller file.`
      );
      return;
    }

    if (!(await runRasterDimensionCheck())) {
      return;
    }

    if (isSvgFile) {
      await processFileUpload(file);
      return;
    }

  } else if (documentType === 'pdf') {
    maxFileSize = MAX_PDF_SIZE;

    if (!isPDF) {
      toast.error('Invalid file type. Only PDF files are allowed.');
      return;
    }

      if (file.size > maxFileSize) {
        toast.error(
          `PDF size exceeds ${pdfMaxSize10MB ? '10MB' : '2MB'}. Please select a smaller file.`
        );
        return;
      }

    await processFileUpload(file);
    return;
  } else if (documentType === 'both') {
    if (!isPDF && !isImage) {
      toast.error(
        allowSvg
          ? 'Invalid file type. Only JPEG, PNG, JPG, SVG, or PDF files are allowed.'
          : 'Invalid file type. Only JPEG, PNG, JPG, or PDF files are allowed.'
      );
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

    if (!(await runRasterDimensionCheck())) {
      return;
    }

    if (isSvgFile) {
      await processFileUpload(file);
      return;
    }
  } else {
    maxFileSize = MAX_IMAGE_SIZE;

    if (!isImage) {
      toast.error(
        allowSvg
          ? 'Invalid file type. Only JPEG, JPG, PNG, and SVG images are allowed.'
          : 'Invalid file type. Only JPEG, JPG, and PNG images are allowed.'
      );
      return;
    }

    if (file.size > maxFileSize) {
      toast.error(`Image size exceeds ${customSize}. Please select a smaller file.`);
      return;
    }

    if (!(await runRasterDimensionCheck())) {
      return;
    }

    if (isSvgFile) {
      await processFileUpload(file);
      return;
    }
  }

  // Show crop modal for raster image files
  const imageUrl = URL.createObjectURL(file);
  setTempImageFile(file);
  setTempImageURL(imageUrl);
  setShowCropModal(true);
};

const processFileUpload = async (file: File, inputElement?: HTMLInputElement) => {
  try {
    setIsUploading(true);
    const documentNameToUse = autocompleteValue === 'Other' ? customValue : autocompleteValue || fieldName;

    if (isOther && (!documentNameToUse || documentNameToUse.trim() === '')) {
      toast.error('Document name is mandatory. Please provide a document name before uploading.');
      if (inputElement) inputElement.value = '';
      return;
    }

    const { width, height } = getCompressionDimensions(fieldName);
    const folderPath  = s3UploadFilePath  || 'documents'
    const fileObjects = {
            folder: folderPath,
            key: file.name.replace(/\s+/g, ''),
          };

    const result = await dispatch(compressAndUploadFile({
      file,
      width,
      height,
      presignedUrlPayload: fileObjects,
    })).unwrap();


    setUploadedFile(file);
    setFileURL(URL.createObjectURL(file));

    if (result?.presignedResponse?.statusCode === 201) {
      const res = result.presignedResponse;

      const payload: UploadPayload = {
        presignedUrl: res?.data?.signedUrl,
        file,
      };

      await dispatch(uploadFile(payload)).unwrap();
      toast.success('Document uploaded successfully!');

      // // Set the file in UI
      if (formik) {
      formik.setFieldValue(name, res?.data?.key);
      }

      // ✅ Pass only the uploaded file path to parent
      handleupload?.(documentNameToUse, res?.data?.key, isOther, id);
    } else {
      throw new Error('Failed to get presigned URL');
    }
  } catch (error: any) {
    console.error('❌ Error during file upload:', error);
    toast.error(
      `${error?.errors?.message?.[0] || 'Error while uploading document'}`
    );
    clearFileFromUI();
    if (inputElement) inputElement.value = '';
  } finally {
    setIsUploading(false);
  }
};

  const clearFileFromUI = () => {
    if (formik) {
      formik.setFieldValue(name, null);
      formik.setFieldError(name, undefined);
    }
    setUploadedFile(null);
    setFileURL(null);
    setFetchedPath('');
  };

  const handleCropSave = async (croppedImageFile: File) => {
    try {
      // Process the cropped image
      await processFileUpload(croppedImageFile);

      // Clean up temp states
      setTempImageFile(null);
      if (tempImageURL) {
        URL.revokeObjectURL(tempImageURL);
      }
      setTempImageURL(null);

      // Close only on success
      setShowCropModal(false);

    } catch (err) {
      console.error(err);
    }
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
      formik.setFieldValue(name, null);
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
    if (documentName === DOCUMENT_OPTIONS[0]) {
      setAutocompleteValue(DOCUMENT_OPTIONS[0]);
    }
    if (documentName === DOCUMENT_OPTIONS[2]) {
      setAutocompleteValue(DOCUMENT_OPTIONS[2]);
    }
  }, [documentName, id]);

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
    if (fieldName && isOther && !DOCUMENT_OPTIONS.includes(fieldName)) {
      setAutocompleteValue(DOCUMENT_OPTIONS[2]); // Set autocomplete value to fieldName
      setCustomValue(fieldName); // Set custom value to fieldName
    }
    if (fieldName && isOther && DOCUMENT_OPTIONS.includes(fieldName)) {
      setAutocompleteValue(fieldName);
    }
  }, [fieldName, isOther]);
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
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
    const lowerUrl = fileURL.toLowerCase();

    const isImageUrl = imageExtensions.some((ext) => lowerUrl.endsWith(ext));

    if (isImageUrl) {
      setPreviewDialogOpen(true); // Open image preview
    } else {
      globalThis.open(fileURL, '_blank'); // Open PDF or other files
    }
  } else {
    // Use the unique form field name to target the correct input per instance
    document.getElementById(`${name}-file-upload`)?.click();
  }
};

  const renderHelperText = () => {
    if (documentType === 'pdf') {
      return (
        <Typography sx={{ fontSize: '12px', color: '#9B9EAB', mt: 0.9, ml: 1.9, textAlign: 'left' }}>
          {`PDF Only (Max. File Size: ${pdfMaxSize10MB ? 10 : 2} MB)`}
        </Typography>
      );
    }

    if (documentType === 'both') {
      return (
        <Typography sx={{ fontSize: '12px', color: '#9B9EAB', mt: 0.9, ml: 1.9, textAlign: 'left' }}>
          {`${allowSvg ? 'JPEG, PNG, JPG, SVG' : 'JPEG, PNG, JPG'} (Max: ${customSize}), PDF (Max: 2 MB)`}
        </Typography>
      );
    }

    return (
      <Box sx={{ mt: 0.9, ml: 1.9, textAlign: 'left' }}>
        <Typography component="span" sx={{ fontSize: '12px', color: '#9B9EAB', verticalAlign: 'middle' }}>
          {`${allowSvg ? 'JPEG, PNG, JPG, SVG' : 'JPEG, PNG, JPG'} (Max. file size: ${customSize})`}
          {!dimensionSpecTooltip && helperDimensionText ? ` · ${helperDimensionText}` : ''}
          {dimensionSpecTooltip ? (
            <Tooltip
              arrow
              placement="top"
              title={
                <Box sx={{ py: 0.25, maxWidth: 320 }}>
                  <Typography variant="caption" component="div" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                    Required dimensions
                  </Typography>
                  <Typography
                    variant="caption"
                    component="div"
                    sx={{
                      display: 'block',
                      mb:
                        dimensionSpecTooltip.aspectRatio || dimensionSpecTooltip.recommendedFormat
                          ? 1.25
                          : 0,
                    }}
                  >
                    {dimensionSpecTooltip.requiredDimensions}
                  </Typography>
                  {dimensionSpecTooltip.aspectRatio ? (
                    <Typography variant="caption" component="div" sx={{ display: 'block', mb: dimensionSpecTooltip.recommendedFormat ? 1.25 : 0 }}>
                      <Typography
                        component="span" variant="caption"
                        sx={{ fontWeight: 600 }}
                      >
                        Aspect ratio :
                      </Typography>{' '} {` ${dimensionSpecTooltip.aspectRatio}`}
                    </Typography>
                  ) : null}
                  {dimensionSpecTooltip.recommendedFormat ? (() => {
                    const parts = dimensionSpecTooltip.recommendedFormat.split('-');
                    const label = parts[0];
                    const value = parts.slice(1).join('-');
                    return (
                      <Typography
                        variant="caption"
                        component="div"
                        sx={{ display: 'block' }}
                      >
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{ fontWeight: 600 }}
                        >
                          {label?.trim()}
                        </Typography>
                        {value && (
                          <Typography
                            variant="caption"
                            component="div"
                          >
                            {value.trim()}
                          </Typography>
                        )}
                      </Typography>
                    );
                  })() : null}
                </Box>
              }
            >
              <Box
                component="span"
                sx={{ display: 'inline-flex', verticalAlign: 'text-bottom', ml: 0, lineHeight: 0 }}
              >
                <InfoOutlinedIcon sx={{ fontSize: 16, color: '#9B9EAB' }} />
              </Box>
            </Tooltip>
          ) : null}
        </Typography>
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }} className="dropzone-row">
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
              options={DOCUMENT_OPTIONS}
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
            height: customSx ? 44 : 54,
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 400,
            borderColor: "#E1E5E7",
            color: "#9B9EAB",
            backgroundColor: "white",
            justifyContent: "flex-start",
            textTransform: "none",
            padding: "10px",
            overflow: "hidden",
            minWidth: 0, // Allow button to shrink
          }}
          disabled={disabled}
          onClick={() => {
            if (!uploadedFile && !fetchedPath) {
              // Use the unique form field name to target the correct input per instance
              document.getElementById(`${name}-file-upload`)?.click();
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
              top: '22px',
              transform: "translateY(-50%)",
              minWidth: "54px",
               "&:disabled": {
                opacity: 0.7,
                cursor: "not-allowed",
                pointerEvents: "none",
              },
            }}
            onClick={handleFileDelete}
            disabled={disabled}
          >
            <img
              src={`${CONFIG.site.basePath}/assets/images/primary-shape.png`}
              alt="Delete"
            />
          </Button>
        )}

        {/* Helper Text (File Type Info) */}
        {renderHelperText()}
      </Box>
        </div>
        <button
          className="btn-upload"
          style={customSx ? { height: 44 } : { height: 52 }}
          type="button"
          onClick={handleFileView}
          disabled={isUploading || (!fileURL && disabled)}
        >
          {isUploading ? (
            <CircularProgress size={20} sx={{ color: "#fff" }} />
          ) : (
            <>
              <span className="upload-img">
                <p className="upload-text">
                  {fileURL ? <img src={ViewImg} alt="" /> : <img src={uploadImg} alt="" />}
                </p>
              </span>
              <p className="upload-text">{fileURL ? 'View' : 'Upload'}</p>
            </>
          )}
        </button>
        <input
          id={`${name}-file-upload`}
          type="file"
          style={{ display: 'none' }}
          accept={acceptTypes}
          onChange={handleFileUpload}
          disabled={disabled}
        />
      </div>
      {((formik &&
        name &&
        getIn(formik.touched, name) &&
        getIn(formik.errors, name)) ||
        (touched && error)) && (
        <Typography
          color="error"
          variant="caption"
          component="div"
          sx={(theme) => ({
            display: 'block',
            mt: 0.5,
            ml: theme.spacing(errorMarginLeft ?? 2),
            fontSize: '12px',
          })}
        >
          {formik && name ? getIn(formik.errors, name) : error}
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
          isUploading={isUploading}
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

    {/* Image — brand blue behind transparent PNG/SVG */}
    {previewContrastBg ? (
      <Box
        sx={{
          p: 2,
          borderRadius: 1,
          bgcolor: LOGO_PREVIEW_BACKDROP,
        }}
      >
        <img
          src={(fileURL ?? '') || (tempImageURL ?? '') || ''}
          alt="Preview"
          style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block' }}
        />
      </Box>
    ) : (
      <img
        src={(fileURL ?? '') || (tempImageURL ?? '') || ''}
        alt="Preview"
        style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }}
      />
    )}
  </Box>
</Dialog>


    </Box>
  );
};

export default NewDropzone;
