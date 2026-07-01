import axios from 'axios';
import { createAsyncThunk } from '@reduxjs/toolkit';

import Axios from 'src/services/axiosInterceptors';
import { GET, POST, PATCH } from 'src/services/axiosInstance';

import { route } from '../../../services/apiRoutes';
import {
  COMPRESS_IMAGE,
  BOOKING_DOCUMENT,
  UPDATE_SIGNATURE,
  GET_PRESIGNED_URL,
  EXTRACT_SIGNATURE,
  UPDATE_DELETE_IMAGE,
  SALES_GET_BOOKING_DOCUMENTS,
} from '../types';

interface UploadPayload {
  presignedUrl: string;
  file: File;
}
interface DeleteImagePayload {
  key: string;
}

interface CompressImagePayload {
  file: File;
  width: number;
  height: number;
}

interface CompressAndUploadPayload {
  file: File;
  width: number;
  height: number;
  presignedUrlPayload: any; // The payload needed for getPresignedUrl
}

interface ExtractSignaturePayload {
  file: File;
}

interface SignatureUploadPayload {
  file: File;
  presignedUrlPayload: any; // The payload needed for getPresignedUrl
}

interface UpdateSignaturePayload {
  signatureImage: string;
}

// Define the response type, if applicable
interface DeleteImageResponse {
  success: boolean;
  message?: string;
}

interface BookingDocument {
  data: any;
  id: number;
  opportunityId: string;
  name: string;
  path: string;
  type: 'office-use' | 'client-upload' | string;
  stage: 'pre_booking' | 'post_booking' | string;
  isOtherDoc: boolean;
  created_at: string;
  modified_at: string;
}

export interface BookingDocumentsResponse {
  data: BookingDocument[];
}

export const compressImage = createAsyncThunk(
  COMPRESS_IMAGE,
  // eslint-disable-next-line consistent-return
  async (payload: CompressImagePayload, thunkAPI: any) => {
    try {
      const formData = new FormData();
      formData.append('file', payload.file);
      formData.append('width', payload.width.toString());
      formData.append('height', payload.height.toString());

      const res = await Axios.post(route.COMPRESS_IMAGE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res?.status === 200) {
        return res?.data;
      }
    } catch (error) {
      return thunkAPI.rejectWithValue(error?.response?.data);
    }
  }
);

export const extractSignature = createAsyncThunk(
  EXTRACT_SIGNATURE,
  // eslint-disable-next-line consistent-return
  async (payload: ExtractSignaturePayload, thunkAPI: any) => {
    try {
      const formData = new FormData();
      formData.append('file', payload.file);

      const res = await Axios.post(route.EXTRACT_SIGNATURE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res?.status === 200) {
        return res?.data;
      }
    } catch (error) {
      return thunkAPI.rejectWithValue(error?.response?.data);
    }
  }
);

export const getPresignedUrl = createAsyncThunk(
  GET_PRESIGNED_URL,
  // eslint-disable-next-line consistent-return
  async (payload: any, thunkAPI: any) => {
    try {
      const res = await POST(route.GET_PRESIGNED_URL, payload);
      if (res?.response?.success) {
        return res?.response?.response;
      }
    } catch (error) {
      return thunkAPI.rejectWithValue(error?.response?.data);
    }
  }
);

export const uploadFile = createAsyncThunk<Response, UploadPayload, { rejectValue: any }>(
  'uploadFile',
  // eslint-disable-next-line consistent-return
  async (payload, thunkAPI) => {
    try {
      const res = await axios.put(payload.presignedUrl, payload.file, {
        headers: {
          'Content-Type': payload.file.type,
        },
      });

      if (res.status === 200) {
        return res.data; //
      }
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || 'Upload failed');
    }
  }
);
export const salesdeleteImage = createAsyncThunk(
  'deleteImage',
  // eslint-disable-next-line consistent-return
  async (payload: any, thunkAPI) => {
    try {
      const res = await POST(route.SALES_DELETE_BOOKING_DOCUMENTS, payload);
      if (res?.response?.success) {
        return res?.response;
      }
    } catch (error) {
      return thunkAPI.rejectWithValue(error?.response?.data);
    }
  }
);
export const saveBookingDocument = createAsyncThunk(
  BOOKING_DOCUMENT,
  // eslint-disable-next-line consistent-return
  async (
    payload: {
      opportunityId?: string;
      voucherId?: number;
      name: string;
      path: string;
      type: string;
      stage: string;
      isOtherDoc: boolean;
      // eslint-disable-next-line consistent-return
    },
    thunkAPI: any
    // eslint-disable-next-line consistent-return
  ) => {
    try {
      const res = await POST(route.BOOKING_DOCUMENT, payload);
      if (res?.response?.success) {
        return res?.response?.response;
      }
    } catch (error) {
      return thunkAPI.rejectWithValue(error?.response?.data);
    }
  }
);

export const getBookingDocuments = createAsyncThunk<BookingDocumentsResponse, any>(
  SALES_GET_BOOKING_DOCUMENTS,
  async (payload, thunkAPI) => {
    try {
      const res = await GET(route.SALES_GET_BOOKING_DOCUMENTS, payload);
      if (res?.response?.success) {
        return res?.response?.response as BookingDocumentsResponse;
      }
      return thunkAPI.rejectWithValue('Failed to fetch booking documents');
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error?.response?.data || 'Unknown error');
    }
  }
);

export const deleteImage = createAsyncThunk<
  DeleteImageResponse,
  DeleteImagePayload,
  { rejectValue: string }
>('deleteImage', async (payload, thunkAPI) => {
  try {
    const res = await POST(route.DELETE_IMAGE, payload);

    if (res?.response?.success) {
      return res?.response;
    }

    return thunkAPI.rejectWithValue('Image deletion failed');
  } catch (error) {
    return thunkAPI.rejectWithValue(error?.response?.data || 'Unknown error occurred');
  }
});

export type UpdateDocumentImagePayload = {
  opportunityId: string;
  path: string;
  images: string[];
};

export const updateDocumentImage = createAsyncThunk<
  Record<string, unknown>,
  UpdateDocumentImagePayload,
  { rejectValue: string }
>(UPDATE_DELETE_IMAGE, async (payload, thunkAPI) => {
  try {
    const res = await POST(`${route.UPDATE_DELETE_IMAGE}`, payload);
    if (res?.response?.success) {
      return res?.response?.data || {};
    }
    return thunkAPI.rejectWithValue('Failed to update office use details');
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error?.response?.data || 'Unknown error');
  }
});

// Direct upload action (without compression) - for PDFs or when compression is not needed
export const directUploadFile = createAsyncThunk(
  'directUploadFile',
  async (payload: { file: File; presignedUrlPayload: any }, thunkAPI) => {
    try {
      // Step 1: Get presigned URL
      const presignedResult = await thunkAPI.dispatch(getPresignedUrl(payload.presignedUrlPayload));

      if (getPresignedUrl.rejected.match(presignedResult)) {
        return thunkAPI.rejectWithValue('Failed to get presigned URL');
      }

      const presignedResponse = presignedResult.payload;

      if (!presignedResponse || presignedResponse.statusCode !== 201) {
        return thunkAPI.rejectWithValue('Failed to get valid presigned URL');
      }

      const presignedUrl = presignedResponse.data?.signedUrl;

      if (!presignedUrl) {
        return thunkAPI.rejectWithValue('No presigned URL received');
      }

      // Step 2: Upload the original file
      const uploadResult = await thunkAPI.dispatch(
        uploadFile({
          presignedUrl,
          file: payload.file,
        })
      );

      if (uploadFile.rejected.match(uploadResult)) {
        return thunkAPI.rejectWithValue('File upload failed');
      }

      return {
        presignedResponse,
        uploadResult: uploadResult.payload,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(error?.message || 'Direct upload process failed');
    }
  }
);
function base64ToFile(base64: string, fileName: string, mimeType: string): File {
  const byteString = atob(base64.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i += 1) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ia], { type: mimeType });
  return new File([blob], fileName, { type: mimeType });
}

export const compressAndUploadFile = createAsyncThunk(
  'compressAndUploadFile',
  async (payload: CompressAndUploadPayload, thunkAPI) => {
    try {
      const isPDF = payload.file.type === 'application/pdf';
      const isSvg =
        payload.file.type === 'image/svg+xml' ||
        (typeof payload.file.name === 'string' &&
          payload.file.name.toLowerCase().endsWith('.svg'));
      let compressedImageData = null;
      let fileToUpload = payload.file;
      let presignedPayload = payload?.presignedUrlPayload;

      if (!isPDF && !isSvg) {
        // Step 1: Compress image
        const compressResult = await thunkAPI.dispatch(
          compressImage({
            file: payload.file,
            width: payload.width,
            height: payload.height,
          })
        );

        if (compressImage.rejected.match(compressResult)) {
          return thunkAPI.rejectWithValue('Image compression failed');
        }

        const { data: base64Str, filename: compressedKeyFromAPI } = compressResult.payload || {};

        if (!base64Str || !compressedKeyFromAPI) {
          return thunkAPI.rejectWithValue('Invalid compression result');
        }

        const mimeType = 'image/webp';
        const dataUrl = `data:${mimeType};base64,${base64Str}`;
        const compressedFile = base64ToFile(dataUrl, payload.file?.name, mimeType);

        compressedImageData = {
          base64: base64Str,
          compressedFile,
        };

        fileToUpload = compressedFile;

        // Step 1.5: Override key from compression result
        presignedPayload = {
          ...presignedPayload,
          key: compressedKeyFromAPI,
        };
      }

      // Step 2: Get presigned URL
      const presignedResult = await thunkAPI.dispatch(getPresignedUrl(presignedPayload));

      if (getPresignedUrl.rejected.match(presignedResult)) {
        return thunkAPI.rejectWithValue('Failed to get presigned URL');
      }

      const presignedResponse = presignedResult?.payload;

      if (!presignedResponse || presignedResponse.statusCode !== 201) {
        return thunkAPI.rejectWithValue('Failed to get valid presigned URL');
      }

      const presignedUrl = presignedResponse.data?.signedUrl;

      if (!presignedUrl) {
        return thunkAPI.rejectWithValue('No presigned URL received');
      }

      // Step 3: Upload the file
      const uploadResult = await thunkAPI.dispatch(
        uploadFile({
          presignedUrl,
          file: fileToUpload,
        })
      );

      if (uploadFile.rejected.match(uploadResult)) {
        return thunkAPI.rejectWithValue('File upload failed');
      }

      return {
        compressionResult: compressedImageData,
        presignedResponse,
        uploadResult: uploadResult?.payload,
        isPDF,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(error?.message || 'Upload process failed');
    }
  }
);

// Signature upload action (extract-signature → presign → upload)
export const uploadSignatureFile = createAsyncThunk(
  'uploadSignatureFile',
  async (payload: SignatureUploadPayload, thunkAPI) => {
    try {
      // Step 1: Extract signature
      const extractResult = await thunkAPI.dispatch(
        extractSignature({
          file: payload.file,
        })
      );

      if (extractSignature.rejected.match(extractResult)) {
        return thunkAPI.rejectWithValue('Signature extraction failed');
      }

      const extractedData = extractResult.payload;
      let fileToUpload = payload.file;
      let presignedPayload = payload.presignedUrlPayload;

      // If extraction returns processed file data, use it
      if (extractedData?.data && extractedData?.filename) {
        const { data: base64Str, filename: extractedKeyFromAPI } = extractedData;
        
        // Convert base64 to file if needed
        if (base64Str) {
          const mimeType = payload.file.type || 'image/png';
          const dataUrl = `data:${mimeType};base64,${base64Str}`;
          fileToUpload = base64ToFile(dataUrl, payload.file.name, mimeType);
        }

        // Update presigned payload with extracted key while preserving other properties
        presignedPayload = {
          ...presignedPayload,
          folder: 'users',
          key: extractedKeyFromAPI,
        };
      }

      // Step 2: Get presigned URL
      const presignedResult = await thunkAPI.dispatch(getPresignedUrl(presignedPayload));

      if (getPresignedUrl.rejected.match(presignedResult)) {
        return thunkAPI.rejectWithValue('Failed to get presigned URL');
      }

      const presignedResponse = presignedResult.payload;

      if (!presignedResponse || presignedResponse.statusCode !== 201) {
        return thunkAPI.rejectWithValue('Failed to get valid presigned URL');
      }

      const presignedUrl = presignedResponse.data?.signedUrl;

      if (!presignedUrl) {
        return thunkAPI.rejectWithValue('No presigned URL received');
      }

      // Step 3: Upload the file
      const uploadResult = await thunkAPI.dispatch(
        uploadFile({
          presignedUrl,
          file: fileToUpload,
        })
      );

      if (uploadFile.rejected.match(uploadResult)) {
        return thunkAPI.rejectWithValue('File upload failed');
      }

      return {
        extractionResult: extractedData,
        presignedResponse,
        uploadResult: uploadResult.payload,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(error?.message || 'Signature upload process failed');
    }
  }
);
// Update signature API call
export const updateSignature = createAsyncThunk(
  UPDATE_SIGNATURE,
  async (payload: UpdateSignaturePayload, thunkAPI) => {
    try {
      const res = await PATCH(route.UPDATE_SIGNATURE, payload);
      if (res?.response?.success) {
        return res?.response;
      }
      return thunkAPI.rejectWithValue('Failed to update signature');
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error?.response?.data || 'Unknown error');
    }
  }
);