import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Alarma, AlarmStatistics, AlarmState } from '../../types';

const initialState: AlarmState = {
  todayAlarms: [],
  statistics: {
    total: 0,
    tomadas: 0,
    pendientes: 0,
    silenciadas: 0,
    adherencia: 0,
  },
  lastCheck: null,
  loading: false,
  error: null,
};

const alarmSlice = createSlice({
  name: 'alarm',
  initialState,
  reducers: {
    loadAlarmsStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loadAlarmsSuccess: (state, action: PayloadAction<Alarma[]>) => {
      state.loading = false;
      state.todayAlarms = action.payload;
      state.error = null;
    },
    loadAlarmsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateAlarm: (state, action: PayloadAction<Alarma>) => {
      const index = state.todayAlarms.findIndex((a) => a.id === action.payload.id);
      if (index !== -1) {
        state.todayAlarms[index] = action.payload;
      }
    },
    addAlarm: (state, action: PayloadAction<Alarma>) => {
      state.todayAlarms.push(action.payload);
    },
    removeAlarm: (state, action: PayloadAction<string>) => {
      state.todayAlarms = state.todayAlarms.filter((a) => a.id !== action.payload);
    },
    silenceAlarm: (state, action: PayloadAction<string>) => {
      const alarm = state.todayAlarms.find((a) => a.id === action.payload);
      if (alarm) {
        alarm.silenciada = true;
      }
    },
    unsilenceAlarm: (state, action: PayloadAction<string>) => {
      const alarm = state.todayAlarms.find((a) => a.id === action.payload);
      if (alarm) {
        alarm.silenciada = false;
      }
    },
    updateStatistics: (state, action: PayloadAction<AlarmStatistics>) => {
      state.statistics = action.payload;
      state.lastCheck = new Date().toISOString();
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  loadAlarmsStart,
  loadAlarmsSuccess,
  loadAlarmsFailure,
  updateAlarm,
  addAlarm,
  removeAlarm,
  silenceAlarm,
  unsilenceAlarm,
  updateStatistics,
  clearError,
} = alarmSlice.actions;

export default alarmSlice.reducer;
