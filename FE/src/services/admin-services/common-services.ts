import type {
  IomDropdowns,
  IomDropdownType,
  IProjectPayload,
  IomDropdownGroup,
} from 'src/types/admin/services/common';

import { downloadSampleExcelFromApiResponse } from 'src/utils/download-sample-excel';

import { route } from '../apiRoutes';
import { GET, POST } from '../axiosInstance';
import { adminRoutes } from '../adminRoutes';

export const getUnmappedProjects = async () => {
  try {
    const response = await GET(route.UNMAPPED_PROJECTS);
    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.data;
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data || 'Something went wrong');
  }
};

export const getCityListByBrandId = async (id: string | number) => {
  try {
    const response = await GET(route.GET_CITY_LIST_BY_BRAND_ID(id));
    if (response?.status === 200) {
      return response?.response?.response?.data;
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data || 'Something went wrong');
  }
};

export const getBrandLists = async () => {
  try {
    const response = await GET(route.BRANDS);
    if (response?.status === 200) {
      return response?.response?.response?.data;
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data || 'Something went wrong');
  }
};

export const getProjectByBrandIdAndCityId = async (payload: any) => {
  try {
    const brandId = payload.brand;
    const cityIds = payload?.city?.join(',') || '';

    const response = await GET(route.GET_PROJECT_LIST_BY_BRAND_ID_AND_CITY_ID(brandId, cityIds));
    if (response?.status === 200) {
      return response?.response?.response?.data;
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data || 'Something went wrong');
  }
};

export const getAllCities = async () => {
  try {
    const response = await GET(route.GET_ALL_CITIES);
    if (response?.status === 200) {
      return response?.response?.response?.data;
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data || 'Something went wrong');
  }
};

export const getPhasesByBrandIdAndCityId = async (payload: any) => {
  try {
    const brandId = payload.brand;
    const cityIds = payload.city;

    const response = await GET(route.GET_PHASES_LIST_BY_BRAND_ID_AND_CITY_ID(brandId, cityIds));
    if (response?.status === 200) {
      return response?.response?.response?.data;
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data || 'Something went wrong');
  }
};

export const getUnmappedProjectByBrandIdAndCityId = async (payload: IProjectPayload) => {
  try {
    const { brandId } = payload;
    const cityIds = payload.cityIds.join(',');

    const response = await GET(
      route.GET_UNMAPPED_PROJECT_BY_BRAND_ID_AND_CITY_ID(brandId, cityIds)
    );
    if (response?.status === 200) {
      return response?.response?.response?.data;
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data || 'Something went wrong');
  }
};

export const getUserGroups = async () => {
  try {
    const response = await GET(adminRoutes.USER_GROUP);
    if (response?.status === 200) {
      return response?.response?.response?.data;
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data || 'Something went wrong');
  }
};

export const downloadSampleSalaryExcel = async () => {
  try {
    const response = await GET(route.DOWNLOAD_SAMPLE_SALARY_DOCUMENT);
    return downloadSampleExcelFromApiResponse(response);
  } catch (error) {
    console.error('Error exporting sample salary excel file:', error);
    return null;
  }
};

export const downloadSampleBookingDateExcel = async () => {
  try {
    const response = await GET(route.DOWNLOAD_SAMPLE_BOOKING_DATE_DOCUMENT);
    return downloadSampleExcelFromApiResponse(response);
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getCompanyList = async () => {
  try {
    const response = await GET(route.GET_COMPANY_LIST);
    if (response?.status === 200) {
      return response?.response?.response?.data;
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data || 'Something went wrong');
  }
};

const EMPTY_IOM_DROPDOWNS: IomDropdowns = {
  projects: [],
  adjustmentType: [],
  InvoiceStatus: [],
  IomStatus: [],
};

const normalizeIomDropdowns = (groups: IomDropdownGroup[]): IomDropdowns => {
  const dropdowns: IomDropdowns = { ...EMPTY_IOM_DROPDOWNS };

  groups.forEach((group) => {
    if (group.type in dropdowns) {
      dropdowns[group.type] = group.items ?? [];
    }
  });

  return dropdowns;
};

export const getIomDropdowns = async (payload: { type: IomDropdownType[] }) => {
  try {
    const response = await POST(route.GET_IOM_DROPDOWNS, payload);
    const statusCode = response?.response?.response?.statusCode ?? response?.response?.statusCode;

    if (statusCode === 201 || response?.status === 200) {
      const data = response?.response?.response?.data ?? response?.response?.data;

      if (Array.isArray(data)) {
        return normalizeIomDropdowns(data as IomDropdownGroup[]);
      }

      return (data as IomDropdowns) ?? EMPTY_IOM_DROPDOWNS;
    }

    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data || 'Something went wrong');
  }
};