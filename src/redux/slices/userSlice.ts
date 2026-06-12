import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, AuthTokens, UserState } from '../../types';

const initialState: UserState = {
  currentUser: null,
  isAuthenticated: false,
  tokens: null,
  loading: false,
  error: null,
  syncStatus: 'idle',
  lastSync: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ user: User; tokens: AuthTokens }>) => {
      state.loading = false;
      state.currentUser = action.payload.user;
      state.tokens = action.payload.tokens;
      state.isAuthenticated = true;
      state.error = null;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
    },
    registerStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    registerSuccess: (state, action: PayloadAction<{ user: User; tokens: AuthTokens }>) => {
      state.loading = false;
      state.currentUser = action.payload.user;
      state.tokens = action.payload.tokens;
      state.isAuthenticated = true;
      state.error = null;
    },
    registerFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.currentUser = null;
      state.tokens = null;
      state.isAuthenticated = false;
      state.error = null;
      state.lastSync = null;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.currentUser) {
        state.currentUser = { ...state.currentUser, ...action.payload };
      }
    },
    setSyncStatus: (state, action: PayloadAction<'idle' | 'syncing' | 'error'>) => {
      state.syncStatus = action.payload;
    },
    setSyncSuccess: (state) => {
      state.syncStatus = 'idle';
      state.lastSync = new Date().toISOString();
      state.error = null;
    },
    setSyncError: (state, action: PayloadAction<string>) => {
      state.syncStatus = 'error';
      state.error = action.payload;
    },
    setTokens: (state, action: PayloadAction<AuthTokens>) => {
      state.tokens = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setLoading,
  loginStart,
  loginSuccess,
  loginFailure,
  registerStart,
  registerSuccess,
  registerFailure,
  logout,
  updateUser,
  setSyncStatus,
  setSyncSuccess,
  setSyncError,
  setTokens,
  clearError,
} = userSlice.actions;

export default userSlice.reducer;
