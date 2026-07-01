import type { AppDispatch } from 'src/redux/store';

import { refreshUserDetailsFromApi } from 'src/utils/refresh-user-details';

import { updateSignature, uploadSignatureFile } from 'src/redux/actions/rm-panel/upload-actions';

interface SignatureUploadOptions {
  file: File;
  userId?: string;
  dispatch: AppDispatch;
  onSuccess?: (signatureImagePath: string) => void;
  onError?: (error: any) => void;
}

interface SignatureUpdateOptions {
  signatureImagePath: string;
  dispatch: AppDispatch;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  refreshUserDetails?: boolean; // Whether to call user details API after update
}

/**
 * Update signature with existing image path
 * Calls update-signature API directly
 */
export const updateSignatureImage = async ({
  signatureImagePath,
  dispatch,
  onSuccess,
  onError,
  refreshUserDetails = true,
}: SignatureUpdateOptions): Promise<boolean> => {
  try {
    await dispatch(
      updateSignature({
        signatureImage: signatureImagePath,
      })
    ).unwrap();

    if (refreshUserDetails) {
      await refreshUserDetailsFromApi(dispatch);
    }

    onSuccess?.();
    return true;
  } catch (error: any) {
    onError?.(error);
    return false;
  }
};

/**
 * Upload and update signature immediately
 * Handles: extract-signature → presign → upload → update-signature → user-details
 */
export const uploadAndUpdateSignature = async ({
  file,
  userId,
  dispatch,
  onSuccess,
  onError,
}: SignatureUploadOptions): Promise<string | null> => {
  try {
    // Step 2: Upload the signature file (extract-signature → presign → upload)
    // Note: uploadSignatureFile already handles extractSignature internally
    const uploadResult = await dispatch(
      uploadSignatureFile({
        file,
        presignedUrlPayload: undefined,
      })
    ).unwrap();

    // Step 3: Get the uploaded file path from the upload result
    const uploadedFilePath = uploadResult?.presignedResponse?.data?.key;

    // Validate that we have a valid file path
    if (!uploadedFilePath) {
      throw new Error('Failed to get uploaded file path from upload result');
    }

    // Step 4: Update signature in database
    await dispatch(
      updateSignature({
        signatureImage: uploadedFilePath,
      })
    ).unwrap();

    await refreshUserDetailsFromApi(dispatch);

    onSuccess?.(uploadedFilePath);
    return uploadedFilePath;
  } catch (error: any) {
    onError?.(error);
    return null;
  }
};

/**
 * Delete signature by calling update API with empty string
 */
export const deleteSignatureImage = async ({
  dispatch,
  onSuccess,
  onError,
}: Omit<SignatureUpdateOptions, 'signatureImagePath'>): Promise<boolean> => {
  try {
    // Call update signature API with empty string
    await dispatch(
      updateSignature({
        signatureImage: '',
      })
    ).unwrap();

    await refreshUserDetailsFromApi(dispatch);

    onSuccess?.();
    return true;
  } catch (error: any) {
    onError?.(error);
    return false;
  }
};
