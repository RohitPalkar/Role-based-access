import type { ICancellationsResponse } from "src/types/leader-board/leader-board-top-performers-and-cancellations";

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { getCancellations } from "src/redux/actions/leader-board/leader-board-top-performer-and-cancellation-action";



interface CancellationState {
    cancellations: ICancellationsResponse[];
    loading: boolean;
    error: string | null;
}

const initialState: CancellationState = {
    cancellations: [],
    loading: false,
    error: null,
};


const cancellationsSlice = createSlice({
    name: 'cancellations',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(getCancellations.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getCancellations.fulfilled, (state, action: PayloadAction<ICancellationsResponse>) => {
                state.loading = false;
                // @ts-ignore
                state.cancellations = action.payload.cancellations;
            })
            .addCase(getCancellations.rejected, (state, action) => {
                state.loading = false;
                state.cancellations = [];
                state.error = action.payload as string;
            });
    },
});

export default cancellationsSlice.reducer;
