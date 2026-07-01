
import type { PayloadAction } from "@reduxjs/toolkit";
import type { PhaseResponse } from "src/types/admin/services/phase";
import type { IPhaseItem, PhaseDataInterface } from "src/types/admin/feature/phase";

import { createSlice } from "@reduxjs/toolkit";

import { fetchPhases, getPhaseByIdThunk } from "src/redux/actions/admin/phase-actions";

interface PhaseState {
  phasesList: IPhaseItem[];
  phaseData: PhaseDataInterface | null;
  total:number
  loading: boolean;
  error: string | null;
}
// Initial state
const initialState: PhaseState = {
  phasesList: [],
  phaseData: null,
  total: 5,
  loading: false,
  error: null,
};



const phaseSlice = createSlice({
    name: 'Phases',
    initialState,
    reducers: {
        // clear phase data
        clearPhaseData: (state) => {
            state.phaseData = null;
        },
    },
    extraReducers: (builder) => {
        builder
        .addCase(fetchPhases.pending, (state)=> {
            state.loading =true;
            state.error = null;
        })
        .addCase(fetchPhases.fulfilled, (state, action: PayloadAction<PhaseResponse>)=> {
            state.loading = false;
            state.phasesList = action.payload.phases;
            state.total = action?.payload?.total || 0
        })
        .addCase(fetchPhases.rejected, (state, action)=> {
            state.loading= false;
            state.phasesList = [];
            state.total = 0;
            state.error = action.payload as string
        })
        
    // get phase by id
       builder
       .addCase(getPhaseByIdThunk.pending, (state)=> {
            state.loading =true;
            state.error = null;
        })
        .addCase(getPhaseByIdThunk.fulfilled, (state, action)=> {
            state.loading = false;
            state.phaseData = action.payload;
        })
        .addCase(getPhaseByIdThunk.rejected, (state, action)=> {
            state.loading= false;
            state.phaseData = null;
            state.error = action.payload as string
        })
    }
})
export const { clearPhaseData } = phaseSlice.actions;

export default phaseSlice.reducer;