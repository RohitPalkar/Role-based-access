import type { IomMyTeamListingResponse } from 'src/sections/common-module/internal-office-memo/iom-config';

import { toast } from 'sonner';

import { CONFIG } from 'src/config-global';

import { route } from '../apiRoutes';
import { GET, POST } from '../axiosInstance';

export type MarkUserAvailablePayload = {
  userId: number;
};

export type MarkUserUnavailablePayload = {
  userId: number;
  unavailableFrom: string;
  unavailableTo: string;
};

export const fetchIOMListing = async (params: Record<string, any>) => {
  const filteredParams: Record<string, any> = {};
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value !== undefined && value !== null && value !== '') {
      filteredParams[key] = value;
    }
  });

  const queryString = new URLSearchParams(filteredParams).toString();
  const url = queryString ? `${route.IOM_LIST}?${queryString}` : route.IOM_LIST;

  try {
    const response = await GET(url);

    if (response?.status === 200) {
      const apiResponse = response.response;
      const rawData = apiResponse?.response?.data || {};
      const rawRecords = rawData?.items || [];

      return {
        data: rawRecords,
        total: rawData?.total ?? rawRecords?.length,
        page: rawData?.page ?? 1,
        pageSize: rawData?.limit ?? rawData?.pageSize ?? 10,
        pageCount: rawData?.totalPages ?? rawData?.pageCount ?? 1,
      };
    }

    throw new Error('Failed to fetch IOM listing');
  } catch (error: any) {
    console.error('IOM service error:', error);

    const message =
      error?.response?.data?.message || error?.message || 'Error while fetching IOM listing';
    throw new Error(message);
  }
};

export const exportIOMListing = async (payload: Record<string, any>): Promise<boolean> => {
  try {
    const response = await POST(route.IOM_LISTING_EXPORT, payload);

    if (response?.status !== 200 && response?.status !== 201) {
      throw new Error('Failed to export IOM listing');
    }

    const responseData = response?.response?.response;
    const data = responseData?.data;
    const message = responseData?.message;
    const filePath = data?.fileUrl || data?.filePath || data?.url;

    if (!filePath) {
      toast.error(message || 'Failed to export IOM listing');
      return false;
    }

    const basePath = data?.baseUrl || data?.basePath || CONFIG.site.s3BasePath || '';
    const normalizedBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
    const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    const fileUrl = `${normalizedBase}${normalizedPath}`;

    const link = document.createElement('a');
    link.href = fileUrl;
    link.setAttribute('download', filePath.split('/').pop() || 'iom-listing.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(message || 'IOM listing exported successfully.');
    return true;
  } catch (error: any) {
    toast.error(
      error?.response?.data?.errors?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Failed to export IOM listing'
    );
    return false;
  }
};

export const fetchIomFromSapService = async (): Promise<void> => {
  try {
    const response = await POST(route.FETCH_IOM_FROM_SAP);
    if (response?.status === 200 || response?.status === 201) {
      return;
    }

    throw new Error('Failed to generate IOM from SAP');
  } catch (error: any) {
    console.error('Generate IOM from SAP service error:', error);

    throw new Error(
      error?.response?.data?.errors?.message ||
        error?.response?.data?.message ||
        'Failed to generate IOM from SAP'
    );
  }
};

export const fetchMyTeamAvailabilityListing = async (
  params: Record<string, any>
): Promise<IomMyTeamListingResponse> => {
  const filteredParams: Record<string, any> = {};
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value !== undefined && value !== null && value !== '') {
      filteredParams[key] = value;
    }
  });

  const queryString = new URLSearchParams(filteredParams).toString();
  const url = queryString
    ? `${route.TEAM_AVAILABILITY_LIST}?${queryString}`
    : route.TEAM_AVAILABILITY_LIST;

  try {
    const response = await GET(url);

    if (response?.status === 200) {
      const responseData = response.response?.response || {};
      const listData = responseData.data || {};
      const records = Array.isArray(listData.items) ? listData.items : [];

      return {
        data: records,
        total: listData.total ?? records.length,
        page: listData.page ?? filteredParams.page ?? 1,
        pageSize: listData.limit ?? filteredParams.limit ?? 10,
        pageCount: listData.totalPages ?? 1,
      };
    }

    throw new Error('Failed to fetch team availability listing');
  } catch (error: any) {
    console.error('My team availability service error:', error);

    const message =
      error?.response?.data?.message || error?.message || 'Error while fetching My Team listing';
    throw new Error(message);
  }
};

export const exportMyTeamAvailability = async (): Promise<boolean> => {
  try {
    const response = await GET(route.TEAM_AVAILABILITY_EXPORT);
    const exportData = response?.response?.response?.data;
    const filePath = exportData?.url;
    const basePath = exportData?.basePath || CONFIG.site.s3BasePath;

    if (!filePath) {
      throw new Error('Export file path not found');
    }

    const fileUrl = `${basePath}${filePath}`;
    const link = document.createElement('a');
    link.href = fileUrl;
    link.setAttribute('download', filePath.split('/').pop() || 'team-availability.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(response?.response?.response?.message);
    return true;
  } catch (error: any) {
    toast.error(error?.response?.data?.errors?.message || error?.message);
    return false;
  }
};

export const exportIomAsPDF = async (iomId: string): Promise<boolean> => {
  try {
    const response = await GET(`${route.EXPORT_IOM_AS_PDF}/${iomId}/pdf`);
    const exportData = response?.response?.response?.data;
    const path = exportData?.filePath;

    if (!path) {
      throw new Error('Export file path not found');
    }

    const basePath = exportData?.basePath || CONFIG.site.s3BasePath;
    const fileUrl = `${basePath}${path}`;
    const fileResponse = await fetch(fileUrl);
    const blob = await fileResponse.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = path.split('/').pop() || 'iom-details.pdf';
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);

    toast.success(exportData?.message || 'IOM PDF exported successfully.');
    return true;
  } catch (error: any) {
    toast.error(error?.response?.data?.errors?.message || error?.message);
    return false;
  }
};

export const markUserAvailableService = async (payload: MarkUserAvailablePayload): Promise<void> => {
  try {
    const response = await POST(route.MARK_AVAILABLE, payload);

    if (response?.status === 200 || response?.status === 201) {
      return;
    }

    throw new Error('Failed to mark user as Available');
  } catch (error: any) {
    console.error('Mark user available service error:', error);

    throw new Error(
      error?.response?.data?.errors?.message || 'Failed to mark user as Available'
    );
  }
};

export const markUserUnavailableService = async (
  payload: MarkUserUnavailablePayload
): Promise<void> => {
  try {
    const response = await POST(route.MARK_UNAVAILABLE, payload);

    if (response?.status === 200 || response?.status === 201) {
      return;
    }

    throw new Error('Failed to mark user as Unavailable');
  } catch (error: any) {
    console.error('Mark user unavailable service error:', error);

    throw new Error(
      error?.response?.data?.errors?.message || 'Failed to mark user as Unavailable'
    );
  }
};
