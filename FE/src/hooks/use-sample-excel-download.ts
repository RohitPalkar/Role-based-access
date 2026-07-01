import { toast } from 'sonner';
import { useState, useCallback } from 'react';

export type UseSampleExcelDownloadOptions = {
  /** Service that GETs the sample URL and triggers the shared S3 download. */
  fetchSample: () => Promise<unknown>;
  errorMessage: string;
  /**
   * When the API returns a truthy body without `message` (but download succeeded), show this toast.
   * Use for endpoints that omit a success message.
   */
  successFallbackMessage?: string;
};

/**
 * Shared loading + toast behaviour for “Sample Excel” downloads across finance, salary, booking date, inventory, etc.
 */
export function useSampleExcelDownload({
  fetchSample,
  errorMessage,
  successFallbackMessage,
}: UseSampleExcelDownloadOptions) {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadSample = useCallback(async () => {
    try {
      setIsDownloading(true);
      const res = (await fetchSample()) as { message?: string } | null | undefined;

      if (res?.message) {
        toast.success(String(res.message));
        return;
      }
      if (res && successFallbackMessage) {
        toast.success(successFallbackMessage);
        return;
      }
      if (res) {
        toast.error(errorMessage);
        return;
      }
      toast.error(errorMessage);
    } catch (error: unknown) {
      const err = error as { message?: string; errors?: { message?: string } };
      toast.error(
        `${err?.message || err?.errors?.message || errorMessage}`
      );
    } finally {
      setIsDownloading(false);
    }
  }, [fetchSample, errorMessage, successFallbackMessage]);

  return { isDownloading, downloadSample };
}
