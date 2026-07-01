import type { PayloadAction } from "@reduxjs/toolkit";

import { createSlice } from "@reduxjs/toolkit";

import { fetchCountries } from "../actions/country-list-actions";

import type { Country } from "../actions/country-list-actions";

interface CountryState {
  countryList: Country[];
  isLoading: boolean;
  isError: boolean;
  error: string | null;
}

const initialState: CountryState = {
  countryList: [],
  isLoading: false,
  isError: false,
  error: null,
};

const countrySlice = createSlice({
  name: "countries",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCountries.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.error = null;
      })
      .addCase(fetchCountries.fulfilled, (state, action: PayloadAction<Country[]>) => {
        state.isLoading = false;
        state.isError = false;
        state.countryList = action.payload;
      })
      .addCase(fetchCountries.rejected, (state, action: PayloadAction<string | undefined>) => {
        state.isLoading = false;
        state.isError = true;
        state.error = action.payload || "Something went wrong";
      });
  },
});

export default countrySlice.reducer;
