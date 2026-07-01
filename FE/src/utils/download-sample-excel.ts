import { CONFIG } from 'src/config-global';

/**
 * Sample Excel APIs return a signed S3 key at `data.s3Path` on the standard GET wrapper shape.
 * Triggers a browser download and returns the inner API body for toast handling, or `null` if the key was missing.
 */
export function downloadSampleExcelFromApiResponse(response: any): any {
  const s3Key = response?.response?.response?.data?.s3Path;
  if (!s3Key || typeof s3Key !== 'string') {
    return null;
  }
  const fileUrl = `${CONFIG.site.s3BasePath}/${s3Key}`;
  const link = document.createElement('a');
  link.href = fileUrl;
  link.setAttribute('download', s3Key);
  document.body.appendChild(link);
  link.click();
  link.remove();
  return response?.response?.response ?? null;
}
