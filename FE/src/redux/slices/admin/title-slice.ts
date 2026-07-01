import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Define a type for the slice's state
interface TitleState {
  title: string;
  loading: boolean;
  error: string | null;
}

// Initial state of the title
const initialState: TitleState = {
  title: '',
  loading: false,
  error: null,
};
// Define an async action using createAsyncThunk (simulate an API call)
export const setTitleAsync = createAsyncThunk<string, string>(
  'title/setTitleAsync',
  async (newTitle: string) => (
    newTitle
  )
);

// Create slice
const titleSlice = createSlice({
  name: 'title',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(setTitleAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(setTitleAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.title = action.payload;
      })
      .addCase(setTitleAsync.rejected, (state, action) => {
        state.loading = false;
        state.title = '';
        state.error = action.error.message || 'Failed to load title';
      });
  },
});

export default titleSlice.reducer;
