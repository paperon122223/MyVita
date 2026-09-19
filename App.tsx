import React, { useEffect, useCallback, useState } from 'react';
import { Platform, StatusBar, StyleSheet, View, Text, ActivityIndicator, Pressable } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { MaterialIcons } from '@expo/vector-icons';
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

  const [startup, setStartup] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setStartup('loading');
    databaseService.init().then(() => {
      if (!active) return;
      setStartup('ready');
      // La denegación de permisos no debe impedir el acceso a los datos.
      notificationService.requestPermissions().catch((error) => {
        console.warn('No se pudieron solicitar notificaciones:', error);
      });
    }).catch((error) => {
      console.error('Error inicializando MyVita:', error);
      if (active) setStartup('error');
    });
    return () => { active = false; };
  }, [attempt]);

  // Mantener a la vista los controles conocidos de Android: Atrás e Inicio.
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('visible').catch(() => {});
    }
  }, []);

  return (
    <PaperProvider theme={isDark ? darkTheme : lightTheme}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={isDark ? '#0f172a' : '#f0f4f8'}
        />
        {startup === 'ready' ? <RootNavigator /> : (
          <View style={[styles.startup, { backgroundColor: isDark ? '#0f172a' : '#f0f4f8' }]}>
            {startup === 'loading' && <ActivityIndicator size="large" color="#0288d1" />}
            <Text accessibilityRole="header" style={[styles.startupTitle, { color: isDark ? '#fff' : '#0f172a' }]}>
              {startup === 'loading' ? 'Preparando MyVita' : 'No pudimos abrir MyVita'}
            </Text>
            <Text accessibilityLiveRegion="polite" style={[styles.startupMessage, { color: isDark ? '#cbd5e1' : '#475569' }]}>
              {startup === 'loading' ? 'Estamos preparando tus datos.' : 'Ocurrió un problema al abrir tus datos. Intenta de nuevo.'}
            </Text>
            {startup === 'error' && (
              <Pressable accessibilityRole="button" onPress={() => setAttempt(value => value + 1)} style={styles.retry}>
                <Text style={styles.retryLabel}>Volver a intentar</Text>
              </Pressable>
            )}
          </View>
        )}
      </SafeAreaProvider>
    </PaperProvider>
  );
}

function App() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    ...MaterialIcons.font,
  });

  const onLayoutRootView = useCallback(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
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
  startup: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 },
  startupTitle: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  startupMessage: { fontSize: 17, textAlign: 'center', lineHeight: 26 },
  retry: { backgroundColor: '#0369a1', borderRadius: 18, paddingHorizontal: 24, paddingVertical: 18, minHeight: 56 },
  retryLabel: { color: '#fff', fontSize: 18, fontWeight: '600', textAlign: 'center' },
  container: {
    flex: 1,
  },
});

export default App;
