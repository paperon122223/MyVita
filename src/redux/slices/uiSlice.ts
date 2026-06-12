import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UIState } from '../../types';

const initialState: UIState = {
  darkMode: false,
  selectedTab: 0,
  navigationReady: false,
  loading: {},
  errors: {},
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
    },
    setDarkMode: (state, action: PayloadAction<boolean>) => {
      state.darkMode = action.payload;
    },
    setSelectedTab: (state, action: PayloadAction<number>) => {
      state.selectedTab = action.payload;
    },
    setNavigationReady: (state, action: PayloadAction<boolean>) => {
      state.navigationReady = action.payload;
    },
    setLoading: (state, action: PayloadAction<{ key: string; value: boolean }>) => {
      state.loading[action.payload.key] = action.payload.value;
    },
    setError: (state, action: PayloadAction<{ key: string; value: string }>) => {
      state.errors[action.payload.key] = action.payload.value;
    },
    clearError: (state, action: PayloadAction<string>) => {
      delete state.errors[action.payload];
    },
    clearAllErrors: (state) => {
      state.errors = {};
    },
  },
});

export const {
  toggleDarkMode,
  setDarkMode,
  setSelectedTab,
  setNavigationReady,
  setLoading,
  setError,
  clearError,
  clearAllErrors,
} = uiSlice.actions;

export default uiSlice.reducer;
