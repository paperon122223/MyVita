import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { ActivityIndicator, View, StyleSheet, Image, TouchableOpacity, Alert, Text } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import authService from '../services/authService';
import databaseService from '../services/database';
import apiService from '../services/apiService';
import { useDarkMode } from '../hooks/useDarkMode';
import DesignSystem from '../theme/designSystem';
import { loginSuccess, logout } from '../redux/slices/userSlice';
import { CLOUD_BACKEND_ENABLED } from '../utils/constants';
import { TAB_BAR_GAP, useTabBarHeight } from '../utils/layout';
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
import MoreScreen from '../screens/Main/MoreScreen';
import HistorialScreen from '../screens/Main/HistorialScreen';
import SettingsScreen from '../screens/Main/SettingsScreen';
import PrivacyScreen from '../screens/Main/PrivacyScreen';
import TermsScreen from '../screens/Main/TermsScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

type TabIconName = keyof typeof MaterialIcons.glyphMap;

const TAB_ICONS: Record<string, TabIconName> = {
  DashboardTab: 'home',
  MedicationsTab: 'medication',
  SOSTab: 'sos',
  AlarmsTab: 'alarm',
  MoreTab: 'apps',
};

const TAB_LABELS: Record<string, string> = {
  DashboardTab: 'Inicio',
  MedicationsTab: 'Medicinas',
  SOSTab: 'SOS',
  AlarmsTab: 'Alarmas',
  MoreTab: 'Más',
};

const TAB_TITLES: Record<string, string> = {
  DashboardTab: 'Panel de Control',
  MedicationsTab: 'Medicinas',
  SOSTab: 'Emergencia',
  AlarmsTab: 'Alarmas',
  MoreTab: 'Más herramientas',
};

// Auth Navigator
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// Pestaña "Más": menú + herramientas secundarias y pantallas legales.
// Agrupa lo que antes ocupaba pestañas propias, para que la barra inferior
// mantenga zonas táctiles grandes (app orientada a adultos mayores).
function MoreNavigator() {
  const { isDark } = useDarkMode();

  return (
    <MoreStack.Navigator
      // El encabezado lo controla este stack (la pestaña lo oculta), para que
      // las subpantallas tengan flecha de regreso y no salgan dos encabezados.
      screenOptions={{
        headerStyle: { backgroundColor: isDark ? '#0A1730' : '#FFFFFF' },
        headerTintColor: isDark ? '#fff' : DesignSystem.colors.text,
        headerTitleStyle: {
          fontFamily: 'Poppins_800ExtraBold',
          fontSize: 20,
        },
      }}
    >
      <MoreStack.Screen
        name="MoreMenu"
        component={MoreScreen}
        options={{ title: 'Más herramientas' }}
      />
      <MoreStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: 'Asistente IA' }}
      />
      <MoreStack.Screen
        name="Historial"
        component={HistorialScreen}
        options={{ title: 'Historial de tomas' }}
      />
      <MoreStack.Screen name="Diary" component={DiaryScreen} options={{ title: 'Diario' }} />
      <MoreStack.Screen name="Mapa" component={MapaScreen} options={{ title: 'Mi ubicación' }} />
      <MoreStack.Screen
        name="Cuidador"
        component={CuidadorScreen}
        options={{ title: 'Cuidadores' }}
      />
      <MoreStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Configuración' }}
      />
      <MoreStack.Screen
        name="Privacy"
        component={PrivacyScreen}
        options={{ title: 'Aviso de privacidad' }}
      />
      <MoreStack.Screen
        name="Terms"
        component={TermsScreen}
        options={{ title: 'Términos de uso' }}
      />
    </MoreStack.Navigator>
  );
}

// Cinco destinos principales con etiquetas visibles y zonas táctiles amplias.
function MainTabNavigator() {
  const { isDark } = useDarkMode();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const muted = isDark ? DesignSystem.colors.mutedDark : DesignSystem.colors.muted;
  const active = isDark ? DesignSystem.colors.primaryTextDark : DesignSystem.colors.primaryText;
  // La barra flota por encima de la navegación del sistema (gestos o botones):
  // se respeta el inset y se añade holgura para que no se encimen.
  const bottomInset = Math.max(insets.bottom, 8) + TAB_BAR_GAP;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        animation: 'none',
        tabBarIcon: ({ focused }) => (
          <View style={[styles.tabPillInactive, focused && {
            backgroundColor: isDark ? '#203655' : '#DCEAFE',
            borderRadius: 16,
          }]}>
            <MaterialIcons
              name={TAB_ICONS[route.name] ?? 'circle'}
              size={28}
              color={route.name === 'SOSTab' ? (isDark ? '#FF9A94' : '#B42318') : focused ? active : muted}
            />
          </View>
        ),
        tabBarActiveTintColor: active,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: muted,
        tabBarLabelPosition: 'below-icon',
        tabBarStyle: {
          position: 'absolute',
          left: 8,
          right: 8,
          bottom: bottomInset,
          height: tabBarHeight,
          borderRadius: 24,
          backgroundColor: isDark ? DesignSystem.colors.cardDark : DesignSystem.colors.card,
          borderWidth: 1,
          borderColor: isDark ? '#34465E' : DesignSystem.colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
          ...DesignSystem.shadows.lg,
        },
        tabBarItemStyle: { paddingVertical: 0, paddingHorizontal: 0 },
        tabBarAccessibilityLabel: TAB_LABELS[route.name],
        tabBarLabel: ({ focused, color }) => (
          <Text style={{ fontSize: 13, fontFamily: focused ? DesignSystem.fonts.bold : DesignSystem.fonts.medium, color, textAlign: 'center' }}>
            {TAB_LABELS[route.name] ?? ''}
          </Text>
        ),
        headerBackground: () => (
          <View style={{ flex: 1, backgroundColor: isDark ? '#0A1730' : '#FFFFFF' }} />
        ),
        headerStyle: {
          height: 104,
          elevation: 8,
          shadowOpacity: 0.15,
        },
        headerTintColor: isDark ? '#fff' : DesignSystem.colors.text,
        headerTitleStyle: {
          fontFamily: 'Poppins_800ExtraBold',
          fontSize: 20,
          color: isDark ? '#fff' : DesignSystem.colors.text,
        },
        title: TAB_TITLES[route.name] ?? '',
      })}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={({ navigation }) => ({
          headerTitle: () => (
            <Image
              source={
                isDark
                  ? require('../../assets/images/myvita-logo-horizontal-light.png')
                  : require('../../assets/images/myvita-logo-horizontal.png')
              }
              style={styles.headerLogo}
              resizeMode="contain"
            />
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('AlarmsTab')}
              style={styles.headerBell}
              accessibilityRole="button"
              accessibilityLabel="Ver mis alarmas"
            >
              <MaterialIcons
                name="notifications-none"
                size={32}
                color={isDark ? '#fff' : DesignSystem.colors.text}
              />
            </TouchableOpacity>
          ),
        })}
      />
      <Tab.Screen name="MedicationsTab" component={MedicationsScreen} />
      <Tab.Screen
        name="SOSTab"
        component={SOSScreen}

      />
      <Tab.Screen name="AlarmsTab" component={AlarmsScreen} />
      <Tab.Screen
        name="MoreTab"
        component={MoreNavigator}
        options={{ headerShown: false }}
        // Sin esto, la pestaña recuerda la última pantalla abierta (p. ej.
        // Diario) y "Más" ya no llevaría al menú. Siempre volver al menú.
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('MoreTab', { screen: 'MoreMenu' });
          },
        })}
      />
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
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: DesignSystem.colors.surfaceDark,
          card: DesignSystem.colors.cardDark,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: DesignSystem.colors.surface,
          card: DesignSystem.colors.card,
        },
      };

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

  useEffect(() => authService.onSessionExpired(() => {
    dispatch(logout());
    Alert.alert('Vuelve a iniciar sesión', 'Tu sesión venció. Ingresa de nuevo para recuperar la sincronización. Tus datos siguen guardados en este teléfono.');
  }), [dispatch]);

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
        <ActivityIndicator size="large" color={DesignSystem.colors.primary} />
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
  tabBarGradient: {
    flex: 1,
    borderRadius: DesignSystem.borderRadius.full,
    overflow: 'hidden',
  },
  tabPillActive: {
    width: 46,
    height: 34,
    borderRadius: DesignSystem.borderRadius.full,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPillInactive: {
    width: 46,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosTabWrap: {
    top: -22,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  sosTabCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    ...DesignSystem.shadows.glow,
  },
  sosTabCircleFocused: {
    borderWidth: 4,
  },
  headerLogo: {
    width: 190,
    height: 88,
  },
  headerBell: {
    marginRight: 16,
    minHeight: 48,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBellDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: DesignSystem.colors.secondary,
    borderWidth: 1.5,
    borderColor: '#0A1730',
  },
});

export default RootNavigator;
