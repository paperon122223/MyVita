import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Medicamento, Prescripcion, Inventario, MedicationState } from '../../types';

const initialState: MedicationState = {
  medications: [],
  prescriptions: [],
  inventory: [],
  loading: false,
  error: null,
};

const medicationSlice = createSlice({
  name: 'medication',
  initialState,
  reducers: {
    loadMedicationsStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loadMedicationsSuccess: (state, action: PayloadAction<{ medications: Medicamento[]; prescriptions: Prescripcion[]; inventory: Inventario[] }>) => {
      state.loading = false;
      state.medications = action.payload.medications;
      state.prescriptions = action.payload.prescriptions;
      state.inventory = action.payload.inventory;
      state.error = null;
    },
    loadMedicationsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    addMedication: (state, action: PayloadAction<Medicamento>) => {
      state.medications.push(action.payload);
    },
    updateMedication: (state, action: PayloadAction<Medicamento>) => {
      const index = state.medications.findIndex((m) => m.id === action.payload.id);
      if (index !== -1) {
        state.medications[index] = action.payload;
      }
    },
    removeMedication: (state, action: PayloadAction<string>) => {
      state.medications = state.medications.filter((m) => m.id !== action.payload);
    },
    addPrescription: (state, action: PayloadAction<Prescripcion>) => {
      state.prescriptions.push(action.payload);
    },
    updatePrescription: (state, action: PayloadAction<Prescripcion>) => {
      const index = state.prescriptions.findIndex((p) => p.id === action.payload.id);
      if (index !== -1) {
        state.prescriptions[index] = action.payload;
      }
    },
    removePrescription: (state, action: PayloadAction<string>) => {
      state.prescriptions = state.prescriptions.filter((p) => p.id !== action.payload);
    },
    updateInventory: (state, action: PayloadAction<Inventario>) => {
      const index = state.inventory.findIndex((i) => i.medicamentoId === action.payload.medicamentoId);
      if (index !== -1) {
        state.inventory[index] = action.payload;
      } else {
        state.inventory.push(action.payload);
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  loadMedicationsStart,
  loadMedicationsSuccess,
  loadMedicationsFailure,
  addMedication,
  updateMedication,
  removeMedication,
  addPrescription,
  updatePrescription,
  removePrescription,
  updateInventory,
  clearError,
} = medicationSlice.actions;

export default medicationSlice.reducer;
