import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Tokens } from '../api/types';

export interface AuthState { tokens: Tokens | null }
const initialState: AuthState = { tokens: null };
const auth = createSlice({
  name: 'auth', initialState,
  reducers: {
    signedIn: (state, action: PayloadAction<Tokens>) => { state.tokens = action.payload; },
    signedOut: () => initialState,
  },
});
export const { signedIn, signedOut } = auth.actions;
export default auth.reducer;
