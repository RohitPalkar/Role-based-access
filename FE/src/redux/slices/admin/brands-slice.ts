

import type { PayloadAction } from "@reduxjs/toolkit";
import type { Brands, BrandsResponse } from "src/types/admin/services/brands";

import { createSlice } from "@reduxjs/toolkit";

import { fetchBrands } from "src/redux/actions/admin/brands-actions";

interface BrandsState {
  brandsList: Brands[];
  total:number
  loading: boolean;
  error: string | null;
}
// Initial state
const initialState: BrandsState = {
  brandsList: [],
  total: 5,
  loading: false,
  error: null,
};
// Create slice

const brandsSlice = createSlice({
    name: 'Brands',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
        .addCase(fetchBrands.pending, (state)=> {
            state.loading =true;
            state.error = null;
        })
        .addCase(fetchBrands.fulfilled, (state, action: PayloadAction<BrandsResponse>)=> {
            state.loading = false;
            state.brandsList = action.payload.brands;
            state.total = action?.payload?.total || 0
        })
        .addCase(fetchBrands.rejected, (state, action)=> {
            state.loading= false;
            state.brandsList = [];
            state.total = 0;
            state.error = action.payload as string
        })
    }
})

export default brandsSlice.reducer;