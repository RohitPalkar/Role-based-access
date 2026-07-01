import type { User } from 'src/redux/type';

import { createSlice } from '@reduxjs/toolkit';

export type AuthUser = Partial<User> & {
  role?: string | null;
};

interface IInitialState {
  loading: boolean;
  error: string | null;
  user: AuthUser | null;
}
const initialState: IInitialState = {
  user: null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUserDetails: (state, action) => {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => { },
});

export const { setUserDetails } = authSlice.actions;

export default authSlice.reducer;
