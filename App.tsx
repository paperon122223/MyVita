import React, { useEffect } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import store from './src/redux/store';
import RootNavigator from './src/navigation/RootNavigator';
import databaseService from './src/services/database';
import notificationService from './src/services/notificationService';
import { useDarkMode } from './src/hooks/useDarkMode';

dayjs.locale('es');

const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#00A86B',
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#00A86B',
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

  return (
    <PaperProvider theme={isDark ? darkTheme : lightTheme}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={isDark ? '#1a1a1a' : '#ffffff'}
        />
        <RootNavigator />
      </SafeAreaProvider>
    </PaperProvider>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <Provider store={store}>
        <AppContent />
      </Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
