import type { UpdateProject, CreateProject, ProjectListResponse } from 'src/redux/type';

import { route } from '../apiRoutes';
import { adminRoutes } from '../adminRoutes';
import { GET, PUT, POST } from '../axiosInstance';

export const getProjectList = async (params: {
  page: number;
  search: string;
  limit: number;
  sortBy?: string;
  brandId?: number;
  cityId?: number;
  billingEntities?: string;
}): Promise<ProjectListResponse> => {
  try {
    const queryParams: Record<string, string> = {
      page: params.page.toString(),
      search: params.search || '',
      limit: params.limit.toString(),
    };

    if (params.brandId !== undefined) queryParams.brandId = params.brandId.toString();
    if (params.cityId !== undefined) queryParams.cityId = params.cityId.toString();
    if (params.billingEntities !== undefined)
      queryParams.billingEntities = params.billingEntities.toString();
    if (params.sortBy !== undefined) queryParams.sortBy = params.sortBy.toString();

    const queryString = new URLSearchParams(queryParams).toString();
    const response = await GET(`${route.GET_PROJECT_MASTER_LIST}?${queryString}`);

    if (response?.status === 200 || response?.status === 201) {
      return {
        projects: response?.response?.response?.data?.projects || [], // Fix key names
        totalCount: response?.response?.response?.data?.total || 0,
      };
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data || 'Something went wrong');
  }
};

export const getProjectById = async (id: number) => {
  try {
    const response = await GET(`${route.GET_PROJECT_BY_ID}${id}`);
    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.data;
    }
    throw new Error('Unexpected response status');
  } catch (error) {
    throw new Error(error.response?.data || 'Something went wrong');
  }
};

export const updateProject = async (id: number, payload: UpdateProject) => {
  try {
    const response = await PUT(`${route.UPDATE_PROJECT}${id}`, payload);
    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.data;
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data?.errors?.message || 'Something went wrong');
  }
};

// fetch project phase
export const getProjectPhase = async ({ brandId, cityId }: { brandId: number; cityId: number }) => {
  try {
    const params = new URLSearchParams({ brandId: String(brandId), cityId: String(cityId) });
    const response = await GET(`${adminRoutes.GET_PHASES_LIST_BY_BRAND_ID_AND_CITY_ID}?${params}`);
    if (response?.status === 200 || response?.status === 201) {
      return response.response.response.data;
    }
    throw new Error('Unexpected response status');
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'An error occurred while creating the project.'
    );
  }
};

// Service to create a project
export const createProject = async (projectData: CreateProject) => {
  try {
    const response = await POST(adminRoutes.CREATE_PROJECT, projectData);
    if (response?.status === 200 || response?.status === 201) {
      return response.response.data;
    }
    throw new Error('Unexpected response status');
  } catch (error) {
    throw new Error(error.response?.data?.errors?.message || 'Something went wrong');

  }
};

export const fetchBillingEntities = async () => {
  const response = await GET(adminRoutes.PROJECT_BILLING_ENTITES);
  if (response?.status === 200 || response?.status === 201) {
    return response.response.response.data;
  }
  throw new Error('Unexpected response status');
};
