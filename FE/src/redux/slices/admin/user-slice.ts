import type { UserState } from 'src/redux/type';
import type { PayloadAction } from '@reduxjs/toolkit';

import { createSlice } from '@reduxjs/toolkit';

import {
  getRoles,
  fetchUser,
  fetchUserById,
  getUserGroups,
  getRolesDropdown,
  getUserDetailsList,
} from 'src/redux/actions/admin/user-actions';

const initialState: UserState = {
  users: [],
  loading: false,
  error: null,
  userDetails: null,
  totalCount: 0,
  count: 0,
  groups: [],
  roles: [],
  rmList: [],
  userDetailsList: null,
  rolesDropdown: []
};

const userSlice = createSlice({
  name: 'userSlice',
  initialState,
  reducers: {
    clearUserDetails: (state) => {
      state.userDetails = null; // Clear previous user details
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload.users;
        state.totalCount = action.payload.totalCount ?? 0;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        state.users = [];
        state.totalCount = 0;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchUserById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.loading = false;
        state.userDetails = action.payload;
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.loading = false;
        state.userDetails = null;
        state.error = action.payload as string;
      });

    // user group
    builder
      .addCase(getUserGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.groups = action.payload;
      })
      .addCase(getUserGroups.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.groups = [];
        state.error = action.payload;
      });

    // roles
    builder
      .addCase(getRoles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getRoles.fulfilled, (state, action) => {
        state.loading = false;
        state.roles = action.payload.role ?? [];
        state.count = action.payload.count ?? 0;
      })
      .addCase(getRoles.rejected, (state, action) => {
        state.loading = false;
        state.roles = [];
        state.count = 0;
        state.error = action.error.message || 'Failed to fetch roles';
      });

    // user details list
    builder
      .addCase(getUserDetailsList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserDetailsList.fulfilled, (state, action) => {
        state.loading = false;
        state.userDetailsList = action.payload;
      })
      .addCase(getUserDetailsList.rejected, (state, action) => {
        state.loading = false;
        state.userDetailsList = null;
        state.error = action.payload as string;
      });

    // roles dropdown
    builder
      .addCase(getRolesDropdown.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getRolesDropdown.fulfilled, (state, action) => {
        state.loading = false;
        state.rolesDropdown = action.payload;
      })
      .addCase(getRolesDropdown.rejected, (state, action) => {
        state.loading = false;
        state.rolesDropdown = [];
        state.error = action.payload as string;
      });

  },
});

export const { clearUserDetails } = userSlice.actions;
export default userSlice.reducer;
