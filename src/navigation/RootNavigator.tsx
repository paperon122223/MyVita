import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import authService from '../services/authService';
import databaseService from '../services/database';
import apiService from '../services/apiService';
import { CLOUD_BACKEND_ENABLED } from '../utils/constants';
import { useDarkMode } from '../hooks/useDarkMode';
import { loginSuccess, logout } from '../redux/slices/userSlice';
import { RootState } from '../types';

// Types
import {
  RootStackParamList,
  AuthStackParamList,
  MainTabParamList,
  MoreStackParamList,
} from './types';

// Screens
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import DashboardScreen from '../screens/Main/DashboardScreen';
import MedicationsScreen from '../screens/Main/MedicationsScreen';
import AlarmsScreen from '../screens/Main/AlarmsScreen';
import ChatScreen from '../screens/Main/ChatScreen';
import DiaryScreen from '../screens/Main/DiaryScreen';
import SOSScreen from '../screens/Main/SOSScreen';
import MapaScreen from '../screens/Main/MapaScreen';
import CuidadorScreen from '../screens/Main/CuidadorScreen';
import SettingsScreen from '../screens/Main/SettingsScreen';
import MoreScreen from '../screens/Main/MoreScreen';
import PrivacyScreen from '../screens/Main/PrivacyScreen';
import TermsScreen from '../screens/Main/TermsScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();

type TabIconName = keyof typeof MaterialIcons.glyphMap;

const TAB_ICONS: Record<string, TabIconName> = {
  DashboardTab: 'home',
  MedicationsTab: 'medication',
  AlarmsTab: 'alarm',
  SOSTab: 'sos',
  MoreTab: 'apps',
};

const TAB_LABELS: Record<string, string> = {
  DashboardTab: 'Inicio',
  MedicationsTab: 'Medicinas',
  AlarmsTab: 'Alarmas',
  SOSTab: 'SOS',
  MoreTab: 'Más',
};

const TAB_TITLES: Record<string, string> = {
  DashboardTab: 'Panel de Control',
  MedicationsTab: 'Medicinas',
  AlarmsTab: 'Alarmas',
  SOSTab: 'Emergencia',
  MoreTab: 'Más herramientas',
};

function MoreNavigator() {
  const { isDark } = useDarkMode();
  return (
    <MoreStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: isDark ? '#1e293b' : '#ffffff' },
        headerTintColor: isDark ? '#96ccff' : '#006096',
        headerTitleStyle: { fontFamily: 'Poppins_800ExtraBold', fontSize: 19 },
        headerShadowVisible: false,
      }}
    >
      <MoreStack.Screen name="MoreMenu" component={MoreScreen} options={{ title: 'Más herramientas' }} />
      <MoreStack.Screen name="Chat" component={ChatScreen} options={{ title: 'Asistente IA' }} />
      <MoreStack.Screen name="Diary" component={DiaryScreen} options={{ title: 'Diario' }} />
      <MoreStack.Screen name="Mapa" component={MapaScreen} options={{ title: 'Mi ubicación' }} />
      <MoreStack.Screen name="Cuidador" component={CuidadorScreen} options={{ title: 'Modo cuidador' }} />
      <MoreStack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Configuración' }} />
      <MoreStack.Screen name="Privacy" component={PrivacyScreen} options={{ title: 'Aviso de privacidad' }} />
      <MoreStack.Screen name="Terms" component={TermsScreen} options={{ title: 'Términos de uso' }} />
    </MoreStack.Navigator>
  );
}

// Auth Navigator
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// Main Tab Navigator (5 accesos principales)
function MainTabNavigator() {
  const { isDark } = useDarkMode();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        animation: 'shift',
        tabBarIcon: ({ focused }) => {
          const iconName = TAB_ICONS[route.name] ?? 'circle';
          // SOS: píldora roja; resto: píldora verde
          const isSOSTab = route.name === 'SOSTab';
          return (
            <View
              style={[
                styles.tabPill,
                focused && (isSOSTab ? styles.tabPillSOS : styles.tabPillActive),
              ]}
            >
              <MaterialIcons
                name={iconName}
                size={22}
                color={
                  focused
                    ? isSOSTab
                      ? '#ba1a1a'
                      : '#006e2a'
                    : isDark
                      ? '#aeb6c2'
                      : '#707882'
                }
              />
            </View>
          );
        },
        tabBarActiveTintColor: '#006e2a',
        tabBarInactiveTintColor: isDark ? '#aeb6c2' : '#707882',
        tabBarStyle: {
          backgroundColor: isDark ? '#1b2536' : '#ffffff',
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: '#006096',
          shadowOpacity: 0.12,
          shadowRadius: 16,
          height: 64 + bottomInset,
          paddingTop: 4,
          paddingBottom: bottomInset,
        },
        tabBarItemStyle: { paddingVertical: 1 },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'Poppins_600SemiBold',
        },
        tabBarLabel: TAB_LABELS[route.name] ?? '',
        headerStyle: {
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          fontFamily: 'Poppins_800ExtraBold',
          fontSize: 20,
          color: isDark ? '#96ccff' : '#006096',
        },
        title: TAB_TITLES[route.name] ?? '',
      })}
    >
      <Tab.Screen name="DashboardTab" component={DashboardScreen} />
      <Tab.Screen name="MedicationsTab" component={MedicationsScreen} />
      <Tab.Screen name="AlarmsTab" component={AlarmsScreen} />
      <Tab.Screen name="SOSTab" component={SOSScreen} />
      <Tab.Screen name="MoreTab" component={MoreNavigator} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}

// Root Navigator
function RootNavigator() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const { isDark } = useDarkMode();
  const [isLoading, setIsLoading] = useState(true);

  const navTheme = isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: '#0f172a', card: '#1e293b' } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: '#f0f4f8', card: '#ffffff' } };

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await authService.getStoredToken();
        if (token) {
          const userId = await authService.getStoredUserId();
          if (userId) {
            let nombre = '';
            let email = '';
            try {
              const row = await databaseService.getUsuarioPorId(userId);
              nombre = row?.nombre ?? '';
              email = row?.email ?? '';
            } catch (e) {
              console.warn('No se pudo cargar el usuario local:', e);
            }
            dispatch(
              loginSuccess({
                user: {
                  id: userId,
                  nombre,
                  email,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                tokens: {
                  access_token: token,
                  expires_at: 0,
                },
              }),
            );
          }
        }
      } catch (e) {
        console.warn('Failed to restore token:', e);
        dispatch(logout());
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, [dispatch]);

  // Procesa cambios locales al iniciar sesión y vuelve a intentarlo mientras
  // la app permanece abierta. Si no hay red, la cola queda intacta en SQLite.
  useEffect(() => {
    if (!CLOUD_BACKEND_ENABLED || !isAuthenticated || !currentUser?.id) return;
    const sync = () => apiService.processSyncQueue(currentUser.id).catch((error) => {
      console.warn('[Sync] reintento pendiente:', error);
    });
    sync();
    const interval = setInterval(sync, 60_000);
    return () => clearInterval(interval);
  }, [isAuthenticated, currentUser?.id]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0288d1" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="MainStack" component={MainTabNavigator} />
        ) : (
          <RootStack.Screen name="AuthStack" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabPill: {
    width: 44,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPillActive: {
    backgroundColor: '#c6f6d5',
  },
  tabPillSOS: {
    backgroundColor: '#ffdad6',
  },
});

export default RootNavigator;
