import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import alarmReducer from './slices/alarmSlice';
import medicationReducer from './slices/medicationSlice';
import uiReducer from './slices/uiSlice';
import { RootState } from '../types';

export const store = configureStore({
  reducer: {
    user: userReducer,
    alarm: alarmReducer,
    medication: medicationReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['user/setTokens', 'user/loginSuccess', 'user/registerSuccess'],
        ignoredPaths: ['user.tokens'],
      },
    }),
});

export type AppDispatch = typeof store.dispatch;
export type AppRootState = RootState;

export default store;
