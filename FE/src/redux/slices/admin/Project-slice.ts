import { createSlice } from '@reduxjs/toolkit';

import {
  editProject,
  fetchProjects,
  fetchProjectId,
  fetchProjectPhase,
  getBillingEntities,
} from '../../actions/admin/project-actions';

import type { ProjectState } from '../../type';

// Initial state
const initialState: ProjectState = {
  projects: [],
  loading: false,
  error: null,
  projectDetails: null,
  phase: null,
  billingEntites: [],
  totalCount: 0,
};

// Create slice
const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = action.payload.projects;
        state.totalCount = action.payload.totalCount;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // get by id
    builder
      .addCase(fetchProjectId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjectId.fulfilled, (state, action) => {
        state.loading = false;
        state.projectDetails = action.payload;
      })
      .addCase(fetchProjectId.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Something went wrong';
      })

      // Update project
      .addCase(editProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editProject.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = action.payload;
      })
      .addCase(editProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Get project phase
      .addCase(fetchProjectPhase.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjectPhase.fulfilled, (state, action) => {
        state.loading = false;
        state.phase = action.payload;
      })
      .addCase(fetchProjectPhase.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(getBillingEntities.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBillingEntities.fulfilled, (state, action) => {
        state.loading = false;
        state.billingEntites = action.payload;
      })
      .addCase(getBillingEntities.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default projectSlice.reducer;
