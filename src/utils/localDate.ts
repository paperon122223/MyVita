const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;

/** Fecha calendario del dispositivo, sin convertirla a UTC. */
export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Convierte YYYY-MM-DD a medianoche en la zona local del dispositivo. */
export function localDateFromKey(key: string): Date {
  const match = DATE_KEY_PATTERN.exec(key);
  if (!match) throw new Error(`Fecha local inválida: ${key}`);

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (localDateKey(date) !== key) throw new Error(`Fecha local inválida: ${key}`);
  return date;
}

/** Combina una fecha calendario y una hora HH:mm en la zona local. */
export function localDateTime(dateKey: string, time: string): Date {
  const match = TIME_PATTERN.exec(time);
  if (!match) throw new Error(`Hora inválida: ${time}`);

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new Error(`Hora inválida: ${time}`);

  const date = localDateFromKey(dateKey);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function addLocalDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

