import type { IPhaseItem } from 'src/types/admin/feature/phase';
import type { PhaseResponse } from 'src/types/admin/services/phase';
import type { CreateOrEditPhasePayloadInterface } from 'src/services/admin-services/phase-service';

import { createAsyncThunk } from '@reduxjs/toolkit';

import {  getPhaseById, getPhaseList, createOrEditPhase } from 'src/services/admin-services/phase-service';



export const fetchPhases = createAsyncThunk<PhaseResponse, any>(
  'Phases/fetchPhases',
  async (payload: any, { rejectWithValue }) => {
    try {
      const result = await getPhaseList(payload);
      return result;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to fetch phases');
    }
  }
);

// get phase by id thunk // change types
export const getPhaseByIdThunk = createAsyncThunk<IPhaseItem, any>(
  'Phases/getPhaseById',
  async (id: number, { rejectWithValue }) => {
    try {
      const result = await getPhaseById(id);
      return result;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to fetch phase');
    }
  }
);

// create or edit phase thunk
export const createOrEditPhaseThunk = createAsyncThunk<
  any,
  { payload: CreateOrEditPhasePayloadInterface; id?: string }
>(
  'Phases/createOrEditPhase',
  async ({ payload, id }, { rejectWithValue }) => {
    try {
      const result = await createOrEditPhase(payload, id);
      return result;
    } catch (error: any) {
      return rejectWithValue(
        error?.message || 'Failed to edit phase'
      );
    }
  }
);




