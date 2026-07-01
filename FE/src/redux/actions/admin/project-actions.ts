import type { UpdateProject, ProjectListResponse } from 'src/redux/type';

import { createAsyncThunk } from '@reduxjs/toolkit';

import {
  createProject,
  updateProject,
  getProjectById,
  getProjectList,
  getProjectPhase,
  fetchBillingEntities,
} from 'src/services/admin-services/project-service';

// Async thunk for fetching projects
export const fetchProjects = createAsyncThunk<
  ProjectListResponse,
  {
    page: number;
    search: string;
    limit: number;
    sortBy?: string;
    brandId?: number;
    cityId?: number;
    billingEntities?: string;
  }
>('projects/fetchProject', async (params, { rejectWithValue }) => {
  try {
    const response = await getProjectList(params);
    return response;
  } catch (error: any) {
    return rejectWithValue(error.response?.data || 'Something went wrong');
  }
});

export const fetchProjectId = createAsyncThunk(
  'project/fetchProjectId',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await getProjectById(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch project data');
    }
  }
);

// UPDATE Project Details
export const editProject = createAsyncThunk(
  'editProject',
  async ({ id, updatedData }: { id: number; updatedData: UpdateProject }, { rejectWithValue }) => {
    try {
      const response = await updateProject(id, updatedData);
      return response?.response?.data;
    } catch (error: any) {
      return rejectWithValue(error || 'Something went wrong');
    }
  }
);

export const fetchProjectPhase = createAsyncThunk(
  'project/fetchProjectPhase',
  async ({ brandId, cityId }: { brandId: number; cityId: number }, { rejectWithValue }) => {
    try {
      const response = await getProjectPhase({ brandId, cityId });
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addProject = createAsyncThunk(
  'createProject',
  async (projectData: any, { rejectWithValue }) => {
    try {
      const response = await createProject(projectData);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Something went wrong');
    }
  }
);

export const getBillingEntities = createAsyncThunk(
  'billingEntities/fetch',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchBillingEntities();
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Something went wrong');
    }
  }
);
