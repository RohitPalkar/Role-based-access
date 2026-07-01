import { toast } from 'sonner';

import { CONFIG } from 'src/config-global';

import { eoiRoutes } from '../EoiRoutes';
import { GET, POST } from '../axiosInstance';

export const getDevelopmentTypes = async () => {
  try {
    const response = await GET(eoiRoutes.GET_DEVELOPMENT_TYPES);
    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.data;
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data?.errors?.message || 'Something went wrong');
  }
};

export const getInventoryTypes = async (departmentIds?: number | string) => {
  try {
    const url = departmentIds
      ? `${eoiRoutes.GET_INVENTORY_TYPES}?departmentIds=${departmentIds}`
      : eoiRoutes.GET_INVENTORY_TYPES;
    const response = await GET(url);
    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.data?.[0]?.inventories || [];
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data?.errors?.message || 'Something went wrong');
  }
};

export interface EOICampaignListPayload {
  page: number;
  limit: number;
  city?: any[];
  status?: any[];
  search?: string;
}

export interface EOICampaign {
  id: number;
  campaignName: string;
  city: string;
  phaseLabel: string;
  countCollected: number;
  startDate: string;
  endDate: string;
  status?: string;
  pushToSfdc?: boolean;
  sfdcProjectName?: string;
}

export interface EOICampaignListResponse {
  campaigns: EOICampaign[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const getEOICampaignList = async (
  payload: EOICampaignListPayload
): Promise<EOICampaignListResponse> => {
  try {
    const response = await POST(`${eoiRoutes.EOI_CAMPAIGN_LIST}`, payload);
    console.log('service raw response', response);

    // ✅ Correctly extract nested structure
    const data =
      response?.response?.response?.data ||
      response?.response?.data?.data ||
      response?.response?.data ||
      {};

    if (response?.status === 200 || response?.status === 201) {
      return {
        campaigns: data?.campaigns || [],
        total: data?.total || 0,
        page: data?.page || 1,
        limit: data?.limit || 10,
        pages: data?.pages || 1,
      };
    }

    throw new Error('Unexpected response status');
  } catch (error: any) {
    console.error('EOI Campaign List Error:', error);
    throw new Error(
      error?.response?.data?.errors?.message || 'Something went wrong while fetching campaign list'
    );
  }
};
export const getEOICampaign = async (id: number) => {
  try {
    const response = await GET(`${eoiRoutes.GET_EOI_CAMPAIGN_BY_ID}${id}`);
    if (response?.status === 200 || response?.status === 201) {
    return response?.response?.response?.data;
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data?.errors?.message || 'Something went wrong');
  }
};

export const exportVouchersReports = async (payload: any) => {
  try {
    const queryParams = new URLSearchParams(payload as any)?.toString();
    const response = await GET(`${eoiRoutes.EXPORT_VOUCHERS_REPORTS}?${queryParams}`); 
    if (!response?.response?.response?.data) {
      toast.error(response?.response?.response?.message);
      return;
    }
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
  } catch (error) {
    toast.error(error?.response?.data?.errors?.message);
  }
};

export type PushLeadsToSFDCPayload = {
  /** EOI Manager – campaign scope */
  campaignId?: number;
  /** EOI Records – single voucher scope */
  voucherId?: number | string;
  pushConverted?: boolean;
};

export const pushLeadsToSFDC = async (payload: PushLeadsToSFDCPayload) => {
  try {
    const body: Record<string, unknown> = {};
    if (payload.campaignId != null) body.campaignId = payload.campaignId;
    if (payload.voucherId != null) body.voucherId = payload.voucherId;
    if (payload.pushConverted != null) body.pushConverted = payload.pushConverted;

    const response = await POST(eoiRoutes.PUSH_LEADS_TO_SFDC, body);
    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response;
    }

    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.errors?.message || 'Something went wrong'
    );
  }
};


