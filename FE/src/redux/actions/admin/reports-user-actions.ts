import { toast } from 'sonner';
import { createAsyncThunk } from '@reduxjs/toolkit';

import {
  refreshBookings,
  fetchDropdownData,
  exportUsersReports,
  getReportsUserList,
  exportBookingsUsersReports,
} from 'src/services/admin-services/reports-user-services';

interface ReportsUserResponse {
  users: any[];
  totalCount: number;
}

// Get Reports User
export const fetchReportsUser = createAsyncThunk<ReportsUserResponse, any>(
  'ReportsUser',
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await getReportsUserList(payload);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Something went wrong');
    }
  }
);

export const downloadUserReports = createAsyncThunk(
  'downloadUserReport',
  async (payload: { page?: number; limit?: number; search?: string }, { rejectWithValue }) => {
    try {
      const response = await exportUsersReports(payload);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Something went wrong');
    }
  }
);

export const refreshUserBookings = createAsyncThunk(
  'refreshUserBookings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await refreshBookings();
      // @ts-ignore
      toast.success(response?.response?.response?.message);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Something went wrong');
    }
  }
);

export const fetchUserDetails = createAsyncThunk(
  'fetchUserDetails',
  async (selectedUser: any, { rejectWithValue }) => {
    try {
      return selectedUser;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Something went wrong');
    }
  }
);

export const downloadBookingsUserReports = createAsyncThunk(
  'downloadBookingsUserReports',
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await exportBookingsUsersReports(payload);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Something went wrong');
    }
  }
);

export const getRmDropdown = createAsyncThunk(
  'rmDropdown/fetch',
  async (search: string, { rejectWithValue }) => {
    try {
      const response = await fetchDropdownData(search);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);
