import { useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setThemeMode as setThemeModeAction } from '../redux/slices/uiSlice';
import { STORAGE_KEYS } from '../utils/constants';
import { RootState, ThemeMode } from '../types';

// Compartir la carga evita parpadeos y que una lectura antigua deshaga una selección.
let hydration: Promise<void> | null = null;
let preferenceRevision = 0;
let persistence: Promise<void> = Promise.resolve();

interface UseDarkModeResult {
  isDark: boolean;
  mode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  /** Compatibilidad: alterna entre claro y oscuro (sale del modo auto) */
  toggle: () => Promise<void>;
}

export const useDarkMode = (): UseDarkModeResult => {
  const dispatch = useDispatch();
  const systemColorScheme = useColorScheme();
  const mode = useSelector((state: RootState) => state.ui.themeMode);
  useEffect(() => {
    if (hydration) return;
    const revision = preferenceRevision;
    hydration = (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEYS.THEME_MODE);
        let preference: ThemeMode | undefined;
        if (saved === 'light' || saved === 'dark' || saved === 'auto') {
          preference = saved;
        } else {
          const legacy = await AsyncStorage.getItem(STORAGE_KEYS.DARK_MODE);
          if (legacy !== null) preference = legacy === 'true' ? 'dark' : 'light';
        }
        if (preference && revision === preferenceRevision) dispatch(setThemeModeAction(preference));
      } catch (error) {
        console.warn('No se pudo cargar la apariencia:', error);
      }
    })();
  }, [dispatch]);

  const isDark = mode === 'auto' ? systemColorScheme === 'dark' : mode === 'dark';

  const setThemeMode = useCallback(
    async (newMode: ThemeMode) => {
      preferenceRevision++;
      dispatch(setThemeModeAction(newMode));
      const write = persistence.catch(() => {}).then(() => AsyncStorage.setItem(STORAGE_KEYS.THEME_MODE, newMode));
      persistence = write;
      await write;
    },
    [dispatch],
  );

  const toggle = useCallback(async () => {
    await setThemeMode(isDark ? 'light' : 'dark');
  }, [isDark, setThemeMode]);

  return {
    isDark,
    mode,
    setThemeMode,
    toggle,
  };
};

// Hook to get theme colors based on dark mode
interface ThemeColors {
  background: string;
  text: string;
  primary: string;
  secondary: string;
  border: string;
}

export const useThemeColors = (): ThemeColors => {
  const { isDark } = useDarkMode();

  return {
    background: isDark ? '#0f172a' : '#f0f4f8',
    text: isDark ? '#f1f5f9' : '#1a202c',
    primary: '#0288d1',
    secondary: '#00c853',
    border: isDark ? '#334155' : '#e2e8f0',
  };
};
