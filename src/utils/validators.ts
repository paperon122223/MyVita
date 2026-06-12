import { ERROR_MESSAGES } from './constants';

// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation
export const isValidPassword = (password: string): string | null => {
  if (password.length < 8) {
    return ERROR_MESSAGES.PASSWORD_TOO_SHORT;
  }
  return null;
};

// Password confirmation
export const passwordsMatch = (password: string, confirmation: string): boolean => {
  return password === confirmation;
};

// Phone validation (basic)
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[0-9\s\-\+\(\)]{7,}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Time validation (HH:mm format)
export const isValidTime = (time: string): boolean => {
  const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
  return timeRegex.test(time);
};

// Date validation (YYYY-MM-DD format)
export const isValidDate = (date: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return dateRegex.test(date);
};

// Age validation
export const isValidAge = (age: number): boolean => {
  return age > 0 && age < 150;
};

// Login form validation
export interface LoginFormErrors {
  email?: string;
  password?: string;
}

export const validateLoginForm = (email: string, password: string): LoginFormErrors => {
  const errors: LoginFormErrors = {};

  if (!email.trim()) {
    errors.email = 'El email es requerido.';
  } else if (!isValidEmail(email)) {
    errors.email = ERROR_MESSAGES.INVALID_EMAIL;
  }

  if (!password) {
    errors.password = 'La contraseña es requerida.';
  }

  return errors;
};

// Register form validation
export interface RegisterFormErrors {
  nombre?: string;
  email?: string;
  password?: string;
  passwordConfirm?: string;
  edad?: string;
  genero?: string;
}

export const validateRegisterForm = (
  nombre: string,
  email: string,
  password: string,
  passwordConfirm: string,
  edad: number,
  genero: string,
): RegisterFormErrors => {
  const errors: RegisterFormErrors = {};

  if (!nombre.trim()) {
    errors.nombre = 'El nombre es requerido.';
  }

  if (!email.trim()) {
    errors.email = 'El email es requerido.';
  } else if (!isValidEmail(email)) {
    errors.email = ERROR_MESSAGES.INVALID_EMAIL;
  }

  const passwordError = isValidPassword(password);
  if (passwordError) {
    errors.password = passwordError;
  }

  if (!passwordsMatch(password, passwordConfirm)) {
    errors.passwordConfirm = ERROR_MESSAGES.PASSWORDS_DONT_MATCH;
  }

  if (!isValidAge(edad)) {
    errors.edad = 'Por favor ingresa una edad válida.';
  }

  if (!genero) {
    errors.genero = 'El género es requerido.';
  }

  return errors;
};

// Alarm validation
export interface AlarmFormErrors {
  medicamentoId?: string;
  hora?: string;
  diasSemana?: string;
  recordatorio?: string;
}

export const validateAlarmForm = (
  medicamentoId: string,
  hora: string,
  diasSemana: string[],
  recordatorio: number,
): AlarmFormErrors => {
  const errors: AlarmFormErrors = {};

  if (!medicamentoId) {
    errors.medicamentoId = 'Debes seleccionar un medicamento.';
  }

  if (!hora || !isValidTime(hora)) {
    errors.hora = 'Por favor ingresa una hora válida (HH:mm).';
  }

  if (!diasSemana || diasSemana.length === 0) {
    errors.diasSemana = 'Debes seleccionar al menos un día.';
  }

  if (recordatorio < 0 || recordatorio > 120) {
    errors.recordatorio = 'El recordatorio debe estar entre 0 y 120 minutos.';
  }

  return errors;
};

// Medication validation
export interface MedicationFormErrors {
  nombre?: string;
  dosis?: string;
  presentacion?: string;
}

export const validateMedicationForm = (nombre: string, dosis: string, presentacion: string): MedicationFormErrors => {
  const errors: MedicationFormErrors = {};

  if (!nombre.trim()) {
    errors.nombre = 'El nombre del medicamento es requerido.';
  }

  if (!dosis.trim()) {
    errors.dosis = 'La dosis es requerida.';
  }

  if (!presentacion.trim()) {
    errors.presentacion = 'La presentación es requerida.';
  }

  return errors;
};

// Emergency contact validation
export interface ContactFormErrors {
  nombre?: string;
  relacion?: string;
  telefono?: string;
}

export const validateContactForm = (nombre: string, relacion: string, telefono: string): ContactFormErrors => {
  const errors: ContactFormErrors = {};

  if (!nombre.trim()) {
    errors.nombre = 'El nombre es requerido.';
  }

  if (!relacion.trim()) {
    errors.relacion = 'La relación es requerida.';
  }

  if (!telefono.trim()) {
    errors.telefono = 'El teléfono es requerido.';
  } else if (!isValidPhone(telefono)) {
    errors.telefono = 'Por favor ingresa un teléfono válido.';
  }

  return errors;
};

// Diary entry validation
export interface DiaryFormErrors {
  titulo?: string;
  contenido?: string;
}

export const validateDiaryForm = (titulo: string, contenido: string): DiaryFormErrors => {
  const errors: DiaryFormErrors = {};

  if (!titulo.trim()) {
    errors.titulo = 'El título es requerido.';
  }

  if (!contenido.trim()) {
    errors.contenido = 'El contenido es requerido.';
  }

  return errors;
};

// Check if object has errors
export const hasErrors = (errors: Record<string, string | undefined>): boolean => {
  return Object.values(errors).some((error) => error !== undefined);
};
