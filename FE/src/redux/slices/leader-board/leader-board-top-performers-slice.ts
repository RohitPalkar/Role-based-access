import type { PayloadAction } from "@reduxjs/toolkit";
import type { ITopPerformersResponse } from "src/types/leader-board/leader-board-top-performers-and-cancellations";

import { createSlice } from "@reduxjs/toolkit";

import { getTopPerformers } from "src/redux/actions/leader-board/leader-board-top-performer-and-cancellation-action";

interface TopPerformerState {
    topPerformers: ITopPerformersResponse[];
    loading: boolean;
    error: string | null;
}

const initialState: TopPerformerState = {
    topPerformers: [],
    loading: false,
    error: null,
};


// Create a slice
const topPerformersSlice = createSlice({
    name: 'topPerformers',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(getTopPerformers.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getTopPerformers.fulfilled, (state, action: PayloadAction<ITopPerformersResponse>) => {
                state.loading = false;
                // @ts-ignore
                state.topPerformers = action.payload.topPerformers;
            })
            .addCase(getTopPerformers.rejected, (state, action) => {
                state.loading = false;
                state.topPerformers = [];
                state.error = action.payload as string;
            });
    },
});

export default topPerformersSlice.reducer;
