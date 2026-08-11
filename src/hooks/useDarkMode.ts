import { useEffect, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setThemeMode as setThemeModeAction } from '../redux/slices/uiSlice';
import { STORAGE_KEYS } from '../utils/constants';
import { RootState, ThemeMode } from '../types';

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
  const [loaded, setLoaded] = useState(false);

  // Cargar preferencia guardada al montar
  useEffect(() => {
    const loadSavedPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEYS.THEME_MODE);
        if (saved === 'light' || saved === 'dark' || saved === 'auto') {
          dispatch(setThemeModeAction(saved));
        } else {
          // Migrar la preferencia booleana antigua si existe
          const legacy = await AsyncStorage.getItem(STORAGE_KEYS.DARK_MODE);
          if (legacy !== null) {
            dispatch(setThemeModeAction(legacy === 'true' ? 'dark' : 'light'));
          }
        }
      } catch (error) {
        console.warn('Error loading theme preference:', error);
      } finally {
        setLoaded(true);
      }
    };

    loadSavedPreference();
    // Solo al montar: el modo vive en redux después
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const isDark = mode === 'auto' ? systemColorScheme === 'dark' : mode === 'dark';

  const setThemeMode = useCallback(
    async (newMode: ThemeMode) => {
      try {
        dispatch(setThemeModeAction(newMode));
        await AsyncStorage.setItem(STORAGE_KEYS.THEME_MODE, newMode);
      } catch (error) {
        console.error('Error setting theme mode:', error);
      }
    },
    [dispatch],
  );

  const toggle = useCallback(async () => {
    await setThemeMode(isDark ? 'light' : 'dark');
  }, [isDark, setThemeMode]);

  return {
    isDark: loaded ? isDark : systemColorScheme === 'dark',
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
