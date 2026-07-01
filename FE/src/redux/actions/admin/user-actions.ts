import type { UserListResponse, FetchUserDetailsListArgs } from 'src/redux/type';

import { toast } from 'sonner';
import { createAsyncThunk } from '@reduxjs/toolkit';

import {
  fetchRoles,
  updateUser,
  getUserById,
  getUserList,
  userRefresh,
  fetchUserGroups,
  exportUsersService,
  fetchRolesDropdown,
  fetchUserDetailsList,
} from 'src/services/admin-services/user-service';

// Async thunk for fetching projects
export const fetchUser = createAsyncThunk<
  UserListResponse,
  {
    page: number;
    search: string;
    limit: number;
    role: string | undefined;
    brandId: number | undefined;
    groupId: number | undefined;
    status: string | undefined;
  }
>('user/fetchUser', async (params, { rejectWithValue }) => {
  try {
    const response = await getUserList(params);
    return response;
  } catch (error: any) {
    return rejectWithValue(error?.response?.data || 'Something went wrong');
  }
});

export const fetchUserById = createAsyncThunk(
  'userById',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await getUserById(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data || 'Something went wrong');
    }
  }
);

// Async thunk for editing a user
export const editUser = createAsyncThunk(
  'user/editUser',
  async (
    { userId, payload }: { userId: number; payload: { 
      roleId: number; 
      groupId: number; 
      groupStartDate: string;
      groupEndDate: string | null;
      projectId: number | null; 
      employeeStatus: string ,
      contactNumber: string ,
      countryCode: string ,
      regionIds: number[] | null;} },
    { rejectWithValue }
  ) => {
    try {
      const response = await updateUser(userId, payload);
      return response;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.errors?.message || 'Failed to update user');
    }
  }
);

export const fetchUserRefresh = createAsyncThunk(
  'fetchUserRefresh',
  async (_, { rejectWithValue }) => {
    try {
      const response = await userRefresh();
       toast.success(response?.response?.response?.message);
      return response;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data || 'Something went wrong');
    }
  }
);

// Async thunk for exporting users report
export const exportUsers = createAsyncThunk(
  'users/export',
  async (payload: any, { rejectWithValue }) => {
    try {
      const result = await exportUsersService(payload);
      return result; // this is boolean
    } catch (error: any) {
      return rejectWithValue(error?.response?.data || 'Download failed');
    }
  }
);

// Async thunk for fetching user groups
export const getUserGroups = createAsyncThunk('fetchGroups', async (_, { rejectWithValue }) => {
  try {
    const response = await fetchUserGroups();
    return response;
  } catch (error: any) {
    return rejectWithValue(error.response?.data || 'Something went wrong');
  }
});

// get roles
export const getRoles = createAsyncThunk(
  'roles/fetchRoles',
  async ({ page, limit }: { page: number; limit: number }, { rejectWithValue }) => {
    try {
      const response = await fetchRoles(page, limit);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Something went wrong');
    }
  }
);

// User Details Listing in edit
export const getUserDetailsList = createAsyncThunk(
  'user/fetchUserDetailsList',
  async ({ userId, params }: FetchUserDetailsListArgs, { rejectWithValue }) => {
    try {
      const data = await fetchUserDetailsList(userId, params);
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to fetch user details');
    }
  }
);

// Roles dropdown
export const getRolesDropdown = createAsyncThunk(
  'user/fetchRolesDropdown',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchRolesDropdown();
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error?.message || 'Failed to fetch roles dropdown'
      );
    }
  }
);
