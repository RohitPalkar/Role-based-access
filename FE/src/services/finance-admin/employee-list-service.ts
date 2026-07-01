import type { UpdateFinanceData } from 'src/types/finance-admin/employee-list';

import { GET, PATCH } from '../axiosInstance';
import { financeAdminRoutes } from '../financeAdminRoutes';

export const fetchFinanceData = async (
  page: number,
  limit: number,
  search: string,
  sortBy: string
) => {
  const response = await GET(
    `${financeAdminRoutes.EMPLOYEE_LIST}?${sortBy ? `sortBy=${sortBy}&` : ''}${search ? `search=${search}&` : ''}page=${page}&limit=${limit}`
  );

  if (response?.status === 200 || response?.status === 201) {
    return response.response.response.data;
  }

  return null;
};

export const fetchEmployeeById = async (id: number) => {
  const response = await GET(`${financeAdminRoutes.GET_EMPLOYEE_BY_ID}${id}`);

  if (response?.status === 200 || response?.status === 201) {
    return response.response.response.data.employee;
  }
  return null;
};

export const editEmployeeData = async (
  id: string | undefined,
  employeeDetails: UpdateFinanceData
) => {
  const response = await PATCH(
    `${financeAdminRoutes.UPDATE_EMPLOYEE_DETAILS}${id}`,
    employeeDetails
  );  
  if (response?.status === 200 || response?.status === 201) {
    return response.response.data;
  }
  return null;
};
