import type { GREDashboardTableData } from 'src/redux/slices/gre/gre-slice';

import { buildQueryParams } from 'src/utils/helper';

import { route } from '../apiRoutes';
import { GET } from '../axiosInstance';

// Interface for GRE Dashboard List Response
export interface GREDashboardListItem {
  id: string;
  firstName: string;
  lastName: string;
  gender: string | null;
  maritalStatus: string | null;
  purchaseReason: string | null;
  currentResidenceType: string | null; // <-- fixed key name
  alternateMobile: string;
  assignedRM: string | null;
  createdAt: string;
  enquiryId: string;
  projectName: string;
  headCount: number;
  exitTime: string | null;
  sourcingRm: string | null;
  sourcingRmName: string | null;
  assignedRmName: string | null;
}

export interface GREDashboardListResponse {
  success: boolean;
  response: {
    statusCode: number;
    data: {
      data: GREDashboardListItem[]; // actual list
      page: number;
      limit: number;
      totalCount: number;
    };
  };
  message?: string;
}

export interface GREDashboardListParams {
  page?: number;
  limit?: number;
  search?: string;
  projectName?: string;
  assignedRM?: string;
  [key: string]: any;
  sourcingRm?: string | number;
  startDate?: string; // Add this
  endDate?: string; // Add this
}

/**
 * Fetch GRE Dashboard List Data
 * @param params - Query parameters for filtering and pagination
 * @returns Promise<{ data: GREDashboardListItem[], total?: number }>
 *
 * @example
 * // Basic usage
 * const data = await fetchGREDashboardList();
 *
 * // With parameters
 * const filteredData = await fetchGREDashboardList({
 *   page: 1,
 *   limit: 10,
 *   search: 'John',
 *   projectName: 'Windermere',
 *   assignedRM: 'RM001'
 * });
 */
export const fetchGREDashboardList = async (
  params: GREDashboardListParams = {}
): Promise<{ data: GREDashboardTableData; total: number }> => {
  try {
    const queryString = buildQueryParams(params);
    const response = await GET<GREDashboardListResponse>(`${route.GET_VISIT_LIST}${queryString}`);

    if (response?.status === 200 && response?.response?.success) {
      return {
        data: response.response.response.data, // contains { data: [...], page, limit, totalPages }
        total: response.response.response.data.data.length, // or backend "total" if available
      };
    }

    throw new Error(response?.response?.message || 'Failed to fetch GRE dashboard data');
  } catch (error: any) {
    console.error('Error fetching GRE dashboard list:', error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        'Something went wrong while fetching GRE dashboard data'
    );
  }
};

/**
 * Fetch single GRE Dashboard item by ID
 * @param id - The ID of the GRE dashboard item
 * @returns Promise<GREDashboardListItem>
 *
 * @example
 * const item = await fetchGREDashboardItem('09b798aa-22c5-4aa9-b84e-5d5d07619936');
 */
export const fetchGREDashboardItem = async (id: string): Promise<GREDashboardListItem> => {
  try {
    const response = await GET<{
      success: boolean;
      response: {
        statusCode: number;
        data: GREDashboardListItem;
      };
      message?: string;
    }>(`${route.GET_VISIT_LIST}/${id}`);

    if (response?.status === 200 && response?.response?.success) {
      return response?.response?.response?.data;
    }

    throw new Error(response?.response?.message || 'Failed to fetch GRE dashboard item');
  } catch (error: any) {
    console.error('Error fetching GRE dashboard item:', error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        'Something went wrong while fetching GRE dashboard item'
    );
  }
};
