import type { UserPayload } from 'src/types/admin/services/user';

import { toast } from 'sonner';

import { CONFIG } from 'src/config-global';

import { route } from '../apiRoutes';
import { adminRoutes } from '../adminRoutes';
import { GET, PATCH } from '../axiosInstance';

export const getUserList = async (params: {
  page: number;
  search: string;
  limit: number;
  role?: string;
  brandId?: number;
  groupId?: number;
  status?: string;
}) => {
  try {
    const queryParams: Record<string, string> = {
      page: params.page.toString(),
      search: params.search,
      limit: params.limit.toString(),
    };

    if (params.brandId !== undefined) {
      queryParams.brandId = params.brandId.toString();
    }
    if (params.groupId !== undefined) {
      queryParams.groupId = params.groupId.toString();
    }
    if (params.status !== undefined) {
      queryParams.status = params.status.toString();
    }
    if (params.role !== undefined) {
      queryParams.role = params.role.toString();
    }

    const queryString = new URLSearchParams(queryParams).toString();
    const response = await GET(`${route.GET_USER_LIST}?${queryString}`);

    if (response?.status === 200 || response?.status === 201) {
      const responseData = response?.response?.response?.data;
      return {
        users: responseData?.users || [],
        totalCount: responseData?.total || 0,
      };
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data || 'Something went wrong');
  }
};
export const getUserById = async (id: number) => {
  try {
    const response = await GET(`${route.GET_USER_BY_ID}${id}`);
    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.data || null;
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error?.response?.data || 'Something went wrong');
  }
};

export const updateUser = async (id: number, payload: UserPayload) => {
  // eslint-disable-next-line no-useless-catch
  try {
    const response = await PATCH(`${adminRoutes.UPDATE_USER}${id}`, payload);
    if (response?.status === 200 || response?.status === 201) {
      return response;
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw error;
  }
};

export const userRefresh = async () => {
  try {
    const response = await GET(adminRoutes.USER_REFRESH);
    if (response?.status === 200 || response?.status === 201) {
      return response;
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error?.response?.data || 'Something went wrong');
  }
};

export const exportUsersService = async (payload: any) => {
  try {
    const queryParams = new URLSearchParams(payload).toString();
    const response = await GET(`${adminRoutes.USER_EXPORT}?${queryParams}`);
    // Extract the S3 file key from the API response
    const responseData = response?.response?.response?.data;
    const s3Key = responseData?.s3Key;
    
    if (!s3Key) {
      throw new Error('S3 key not found in response');
    }
    
    const s3BaseUrl = CONFIG.site.s3BasePath;
    const fileUrl = `${s3BaseUrl}/${s3Key}`;
    const link = document.createElement('a');
    link.href = fileUrl;
    link.setAttribute('download', s3Key);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    const message = response?.response?.response?.message || 'Export completed successfully';
    toast.success(message);
    return true;
  } catch (error) {
    console.error('Error exporting users:', error);
    return false;
  }
};

export const fetchUserGroups = async () => {
  try {
    const response = await GET(adminRoutes.USER_GROUP);
    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.data || null;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user groups:', error);
    return null;
  }
};

export const fetchRoles = async (page: number, limit: number) => {
  try {
    const response = await GET(`roles?page=${page}&limit=${limit}`);
    if (response?.status === 200 || response?.status === 201) {
      const responseData = response?.response?.response?.data;
      return {
        role: responseData?.roles || [],
        count: responseData?.total || 0,
      };
    }
    return { role: [], count: 0 };
  } catch (error) {
    console.error('Error fetching roles:', error);
    return { role: [], count: 0 };
  }
};

export const fetchUserDetailsList = async (
  userId: number,
  params: { page: number; limit: number; search: string }
) => {
  try {
    const queryParams = new URLSearchParams(params as any).toString();

    const response = await GET(
      `${adminRoutes.GET_USER_GROUP_LIST}/${userId}?${queryParams}`
    );

    return response?.response?.response?.data ?? null;
  } catch (error) {
    console.error('Error fetching user groups:', error);
    return null;
  }
};

export const fetchRolesDropdown = async () => {
  const response = await GET(adminRoutes.ROLES_DROPDOWN);

  if (response?.status === 200 || response?.status === 201) {
    return response?.response?.response?.data;
  }

  return [];
};

