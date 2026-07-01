import { toast } from 'sonner';

import { CONFIG } from 'src/config-global';
import { GET } from 'src/services/axiosInstance';
import { crmRoutes } from 'src/services/crmroutes';

export type AgreementExportParams = {
  search?: string;
  documentStatus?: string;
  documentType?: string;
  createdBy?: number | string;
  internalSignatory?: number | string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
};

/**
 * Export agreement list (CSV/Excel) with same filters as list API.
 * GET agreement-signature/export/agreement-list?query
 */
export const exportAgreementList = async (params: AgreementExportParams) => {
  const filtered: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      filtered[key] = String(value);
    }
  });

  const queryString = new URLSearchParams(filtered).toString();
  const url = queryString
    ? `${crmRoutes.EXPORT_AGREEMENT_LIST}?${queryString}`
    : crmRoutes.EXPORT_AGREEMENT_LIST;

  try {
    const response = await GET(url);
    const path = response?.response?.response?.data?.filePath;
    const s3BaseUrl = CONFIG.site.s3BasePath;
    if (path && s3BaseUrl) {
      const fileUrl = `${s3BaseUrl}/${path}`;
      const link = document.createElement('a');
      link.href = fileUrl;
      link.setAttribute('download', path);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    const message =
      response?.response?.response?.message ||
      response?.response?.message ||
      'Export started';
    toast.success(message);
    return true;
  } catch (error: any) {
    const msg =
      error?.response?.data?.errors?.message ||
      error?.response?.data?.message ||
      error?.message ||
      'Export failed';
    toast.error(msg);
    return false;
  }
};
