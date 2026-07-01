import type { UpdateEmployeeParams } from 'src/types/finance-admin/employee-list';

import { toast } from 'sonner';
import { createAsyncThunk } from '@reduxjs/toolkit';

import {
  editEmployeeData,
  fetchFinanceData,
  fetchEmployeeById,
} from 'src/services/finance-admin/employee-list-service';

// Async action to fetch data
export const getEmployeeList = createAsyncThunk(
  'finance/getFinanceData',
  async (
    {
      page,
      limit,
      search,
      sortBy,
    }: { page: number; limit: number; search: string; sortBy: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetchFinanceData(page, limit, search, sortBy);
      return { employees: response.employees, total: response.total };
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'An error occurred');
    }
  }
);

// Async action to fetch employee by id
export const getEmployeeById = createAsyncThunk(
  'employee/fetchById',
  async (id: number, { rejectWithValue }) => {
    try {
      return await fetchEmployeeById(id);
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Something went wrong');
    }
  }
);

export const updateEmployeeData = createAsyncThunk(
  'update/updateEmployeeData',
  async ({ id, employeeDetails }: UpdateEmployeeParams, { rejectWithValue }) => {
    try {
      const response = await editEmployeeData(id, employeeDetails);
      return response;
    } catch (error: any) {
      toast.error(error.response.data.errors.message);
      return rejectWithValue(error.message);
    }
  }
);
