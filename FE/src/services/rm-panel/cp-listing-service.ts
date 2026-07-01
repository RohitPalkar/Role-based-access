import { toast } from 'sonner';

import { CONFIG } from 'src/config-global';

import { route } from '../apiRoutes';
import { GET } from '../axiosInstance';
import { eoiRoutes } from '../EoiRoutes';

export interface ChannelPartnerData {
  id: number;
  cpName: string;
  cpType: string | null;
  status: string;
  campaignName: string;
  linkId?: string; // for constructing CP link
  noOfVouchers: number | null;
  voucherValue: number | null;
  collected: number | null;
  lastCollected: string | null;
  createAt: string | null;
  createdByName: string | null;
}

export const fetchChannelPartners = async (params: Record<string, any>) => {
  const filteredParams: Record<string, any> = {};
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value !== undefined && value !== null && value !== '') {
      filteredParams[key] = value;
    }
  });

  const queryString = new URLSearchParams(filteredParams).toString();
  const url = queryString ? `${route.CHANNEL_PARTNERS}?${queryString}` : route.CHANNEL_PARTNERS;

  try {
    const response = await GET(url);

    if (response?.status === 200) {
      const apiResponse = response.response;
      const rawData = apiResponse?.response?.data?.result || [];

      const mappedData: ChannelPartnerData[] = rawData?.map((item: any) => ({
        id: item?.id,
        cpName: item?.cpName,
        cpType: item?.cpType,
        status: item?.status,
        campaignName: item?.campaignName,
        linkId: item?.linkId,
        noOfVouchers: item?.noOfVouchers,
        voucherValue: item?.voucherValue,
        amountCollected: item?.amountCollected,
        lastCollectedDate: item?.lastCollectedDate,
        createdAt: item?.createdAt,
        createdByName: item?.createdByName,
      }));

      return {
        data: mappedData,
        total:apiResponse?.response?.data?.total,
        page: 1,
        pageSize: mappedData.length,
        pageCount: 1,
      };
    }

    throw new Error('Failed to fetch channel partners');
  } catch (error: any) {
    console.error('Channel Partners service error:', error);

    const message =
      error?.response?.data?.message || error?.message || 'Error while fetching channel partners';

    throw new Error(message);
  }
};

export const exportCPReports = async (payload: {
  page: number;
  limit: number;
  search: string;
}) => {
  try {
    const queryParams = new URLSearchParams(payload as any).toString();
    const response = await GET(`${eoiRoutes.EXPORT_CHANNEL_PARTNER}?${queryParams}`);
    const path = response?.response?.response?.data?.filePath;
    const s3BaseUrl = CONFIG.site.s3BasePath;
    const fileUrl = `${s3BaseUrl}/${path}`;
    const link = document.createElement('a');
    link.href = fileUrl;
    link.setAttribute('download', path);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(response?.response?.response?.message);
    return true;
  } catch (error) {
    toast.error(error?.response?.data?.errors?.message);
    return false;
  }
};