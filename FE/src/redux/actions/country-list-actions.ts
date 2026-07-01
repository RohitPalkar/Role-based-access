import { createAsyncThunk } from "@reduxjs/toolkit";

import { route } from "src/services/apiRoutes";

import { POST } from "../../services/axiosInstance";

export interface Country {
  id: number;
  isoCode: string;
  countryName: string;
  countryCode: string;
}

export const fetchCountries = createAsyncThunk<
  Country[],
  void,                     
  { rejectValue: string }
>(
  "countries/fetchCountries",
  async (_, thunkAPI) => {
    try {
      const res = await POST(route.GET_COUNTRY_LIST, {});

      if (res?.response?.success) {
        return res?.response?.response?.data?.countries || [];
      }

      return thunkAPI.rejectWithValue(res?.message || "Failed to fetch countries")
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error?.response?.data?.message || error.message || "Unknown error");
    }
  }
);
