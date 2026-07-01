import type { SendGroupLinkPayload, SendGroupLinkResponse, MultiBookingListPayload, MultiBookingGroupPayload, CreateMultiBookingGroupPayload, CreateMultiBookingGroupResponse,  } from 'src/services/rm-panel/multi-unit-service';

import { createAsyncThunk } from '@reduxjs/toolkit';

import {  sendGroupLink, editMultiBookingGroup, fetchMultiBookingGroup, createMultiBookingGroup, fetchMultiBookingListService } from 'src/services/rm-panel/multi-unit-service';

export const fetchMultiBookingListThunk = createAsyncThunk(
  'bookings/get-multi-booking-group',
  async (payload: MultiBookingListPayload, { rejectWithValue }) => {
    try {
      const response = await fetchMultiBookingListService(payload);
      return { data: response.groups, totalRecords: response.totalRecords };
    } catch (error: any) {
      const errorMessage =
        error?.message || 'Something went wrong while fetching multi-booking group data.';
      return rejectWithValue({ message: errorMessage });
    }
  }
);

export const createMultiBookingGroupThunk = createAsyncThunk<
  CreateMultiBookingGroupResponse, // return type
  CreateMultiBookingGroupPayload,  // argument type
  { rejectValue: string }           // rejected value type
>(
  'bookings/createMultiBookingGroup',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await createMultiBookingGroup(payload);
      console.log('createMultiBookingGroup',response)
      return response;
    } catch (error: any) {
      // Handle error properly, adapt based on your error response format
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const editMultiBookingGroupThunk = createAsyncThunk<
  CreateMultiBookingGroupResponse, // return type
  CreateMultiBookingGroupPayload & { id: string }, // add id
  { rejectValue: string }
>(
  'bookings/editMultiBookingGroup',
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      const response = await editMultiBookingGroup(id, payload);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchMultiBookingGroupThunk = createAsyncThunk<
  Awaited<ReturnType<typeof fetchMultiBookingGroup>>, // Return type
  MultiBookingGroupPayload, // Payload includes id + pagination params
  { rejectValue: string }
>(
  'bookings/fetchMultiBookingGroup',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await fetchMultiBookingGroup(payload);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch multi-booking group data');
    }
  }
);


export const sendGroupLinkThunk = createAsyncThunk<
  SendGroupLinkResponse, // return type
  SendGroupLinkPayload,  // argument type
  { rejectValue: string }           // rejected value type
>(
  'bookings/sendGroupLink',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await sendGroupLink(payload);
      console.log('sendGroupLink',response)
      return response;
    } catch (error: any) {
      // Handle error properly, adapt based on your error response format
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);