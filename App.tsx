import React, { useEffect, useCallback } from 'react';
import { AppState, Platform, StatusBar, StyleSheet, View } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import store from './src/redux/store';
import RootNavigator from './src/navigation/RootNavigator';
import databaseService from './src/services/database';
import notificationService from './src/services/notificationService';
import { useDarkMode } from './src/hooks/useDarkMode';

dayjs.locale('es');

// Mantener el splash visible hasta que las fuentes estén listas
SplashScreen.preventAutoHideAsync().catch(() => {});

const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0288d1',
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#0288d1',
  },
};

function AppContent() {
  const { isDark } = useDarkMode();

  // Initialize services on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await databaseService.init();
        console.log('Database initialized');

        const permGranted = await notificationService.requestPermissions();
        console.log('Notifications permissions:', permGranted);
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    initializeApp();
  }, []);

  // Pantalla completa: oculta la barra de navegación de Android (botones o
  // gestos). Reaparece al deslizar desde el borde y se vuelve a ocultar sola,
  // por eso hay que reaplicarlo cuando la app regresa a primer plano.
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const ocultarNavegacion = async () => {
      try {
        await NavigationBar.setVisibilityAsync('hidden');
      } catch (error) {
        console.warn('No se pudo ocultar la barra de navegación:', error);
      }
    };

    ocultarNavegacion();
    const subscription = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') ocultarNavegacion();
    });
    return () => subscription.remove();
  }, []);

  return (
    <PaperProvider theme={isDark ? darkTheme : lightTheme}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={isDark ? '#0f172a' : '#f0f4f8'}
        />
        <RootNavigator />
      </SafeAreaProvider>
    </PaperProvider>
  );
}

function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  const onLayoutRootView = useCallback(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null; // el splash sigue visible
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container} onLayout={onLayoutRootView}>
        <Provider store={store}>
          <AppContent />
        </Provider>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
