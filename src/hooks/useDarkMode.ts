import { useEffect, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toggleDarkMode, setDarkMode } from '../redux/slices/uiSlice';
import { STORAGE_KEYS } from '../utils/constants';
import { RootState } from '../types';

interface UseDarkModeResult {
  isDark: boolean;
  toggle: () => Promise<void>;
  setMode: (isDark: boolean) => Promise<void>;
}

export const useDarkMode = (): UseDarkModeResult => {
  const dispatch = useDispatch();
  const systemColorScheme = useColorScheme();
  const reduxDarkMode = useSelector((state: RootState) => state.ui.darkMode);
  const [loaded, setLoaded] = useState(false);

  // Load saved preference on mount
  useEffect(() => {
    const loadSavedPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEYS.DARK_MODE);
        if (saved !== null) {
          dispatch(setDarkMode(saved === 'true'));
        } else if (systemColorScheme) {
          dispatch(setDarkMode(systemColorScheme === 'dark'));
        }
      } catch (error) {
        console.warn('Error loading dark mode preference:', error);
        // Fallback to system preference
        if (systemColorScheme) {
          dispatch(setDarkMode(systemColorScheme === 'dark'));
        }
      } finally {
        setLoaded(true);
      }
    };

    loadSavedPreference();
  }, [dispatch, systemColorScheme]);

  const toggle = useCallback(async () => {
    try {
      const newValue = !reduxDarkMode;
      dispatch(toggleDarkMode());
      await AsyncStorage.setItem(STORAGE_KEYS.DARK_MODE, String(newValue));
    } catch (error) {
      console.error('Error toggling dark mode:', error);
      // Rollback on error
      dispatch(toggleDarkMode());
    }
  }, [reduxDarkMode, dispatch]);

  const setMode = useCallback(
    async (isDark: boolean) => {
      try {
        dispatch(setDarkMode(isDark));
        await AsyncStorage.setItem(STORAGE_KEYS.DARK_MODE, String(isDark));
      } catch (error) {
        console.error('Error setting dark mode:', error);
        // Rollback on error
        dispatch(setDarkMode(!isDark));
      }
    },
    [dispatch],
  );

  return {
    isDark: loaded ? reduxDarkMode : systemColorScheme === 'dark',
    toggle,
    setMode,
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
    background: isDark ? '#1a1a1a' : '#ffffff',
    text: isDark ? '#ffffff' : '#000000',
    primary: '#00A86B',
    secondary: '#FF6B6B',
    border: isDark ? '#333333' : '#eeeeee',
  };
};
