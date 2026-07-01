import type { EmployeeListState } from 'src/types/finance-admin/employee-list';

import { createSlice } from '@reduxjs/toolkit';

import {
  getEmployeeById,
  getEmployeeList,
} from 'src/redux/actions/finance-admin/employee-list-actions';

const initialState: EmployeeListState = {
  employeeList: [],
  loading: false,
  error: null,
  total: null,
  employeeDetails: null,
};

const employeeListSlice = createSlice({
  name: 'employeeList',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getEmployeeList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getEmployeeList.fulfilled, (state, action) => {
        state.loading = false;
        state.employeeList = action.payload.employees;
        state.total = action.payload.total;
      })
      .addCase(getEmployeeList.rejected, (state, action) => {
        state.loading = false;
        state.employeeList = [];
        state.total = null;
        state.error = action.payload as string;
      });

    // Employee By Id
    builder
      .addCase(getEmployeeById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getEmployeeById.fulfilled, (state, action) => {
        state.loading = false;
        state.employeeDetails = action.payload;
      })
      .addCase(getEmployeeById.rejected, (state, action) => {
        state.loading = false;
        state.employeeDetails = null;
        state.error = action.payload as string;
      });
  },
});

export default employeeListSlice.reducer;
