import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { ActivityIndicator, View, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
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
import { TAB_BAR_GAP, TAB_BAR_HEIGHT } from '../utils/layout';
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
  ChatTab: 'chat',
  MoreTab: 'apps',
};

const TAB_LABELS: Record<string, string> = {
  DashboardTab: 'Inicio',
  MedicationsTab: 'Medicinas',
  SOSTab: 'SOS',
  AlarmsTab: 'Alarmas',
  ChatTab: 'Chat',
  MoreTab: 'Más',
};

const TAB_TITLES: Record<string, string> = {
  DashboardTab: 'Panel de Control',
  MedicationsTab: 'Medicinas',
  SOSTab: 'Emergencia',
  AlarmsTab: 'Alarmas',
  ChatTab: 'Asistente IA',
  MoreTab: 'Más herramientas',
};

// Botón flotante circular para el tab de SOS (destaca en el centro de la barra)
function SOSTabButton({ onPress, accessibilityState, isDark }: any) {
  const focused = !!accessibilityState?.selected;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.sosTabWrap}
      accessibilityRole="button"
      accessibilityLabel="Emergencia SOS"
    >
      <LinearGradient
        colors={DesignSystem.sectionGradients.sos}
        style={[
          styles.sosTabCircle,
          { borderColor: isDark ? DesignSystem.colors.surfaceContainerDark : DesignSystem.colors.card },
          focused && styles.sosTabCircleFocused,
        ]}
      >
        <MaterialIcons name="sos" size={24} color="#fff" />
      </LinearGradient>
    </TouchableOpacity>
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

// Main Tab Navigator (9 tabs)
function MainTabNavigator() {
  const { isDark } = useDarkMode();
  const insets = useSafeAreaInsets();
  // La barra flota por encima de la navegación del sistema (gestos o botones):
  // se respeta el inset y se añade holgura para que no se encimen.
  const bottomInset = Math.max(insets.bottom, 8) + TAB_BAR_GAP;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        animation: 'shift',
        tabBarIcon: ({ focused }) => {
          const iconName = TAB_ICONS[route.name] ?? 'circle';
          const isSOSTab = route.name === 'SOSTab';
          if (isSOSTab) return null;
          const iconSize = 26;
          if (focused) {
            return (
              <View style={styles.tabPillActive}>
                <MaterialIcons name={iconName} size={iconSize} color={DesignSystem.colors.primary} />
              </View>
            );
          }
          return (
            <View style={styles.tabPillInactive}>
              <MaterialIcons name={iconName} size={iconSize} color="rgba(255,255,255,0.55)" />
            </View>
          );
        },
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
        tabBarBackground: () => (
          <LinearGradient
            colors={DesignSystem.statGradients.signature}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tabBarGradient}
          />
        ),
        tabBarStyle: {
          position: 'absolute',
          left: 8,
          right: 8,
          bottom: bottomInset,
          height: TAB_BAR_HEIGHT,
          borderRadius: DesignSystem.borderRadius.full,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          paddingTop: 8,
          paddingBottom: 8,
          ...DesignSystem.shadows.lg,
        },
        tabBarItemStyle: { paddingVertical: 0, paddingHorizontal: 0 },
        // En 360dp de ancho quedan ~64dp por pestaña (el SOS ocupa menos):
        // a 10px "Medicinas" —la etiqueta más larga— entra sin recortarse.
        // El ícono (26px) es la señal principal, así que el texto puede ser
        // pequeño sin perder claridad.
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'Poppins_600SemiBold',
        },
        tabBarLabel: TAB_LABELS[route.name] ?? '',
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
        options={{
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
              onPress={() =>
                Alert.alert('Notificaciones', 'Próximamente podrás ver tus notificaciones aquí.')
              }
              style={styles.headerBell}
              accessibilityLabel="Notificaciones"
            >
              <MaterialIcons
                name="notifications-none"
                size={32}
                color={isDark ? '#fff' : DesignSystem.colors.text}
              />
              <View
                style={[
                  styles.headerBellDot,
                  { borderColor: isDark ? '#0A1730' : '#FFFFFF' },
                ]}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <Tab.Screen name="MedicationsTab" component={MedicationsScreen} />
      <Tab.Screen
        name="SOSTab"
        component={SOSScreen}
        options={{
          // El círculo del SOS flota; su espacio en la fila es más angosto
          // para no robarle ancho a las etiquetas vecinas.
          tabBarItemStyle: { flex: 0.35 },
          tabBarButton: (props) => <SOSTabButton {...props} isDark={isDark} />,
        }}
      />
      <Tab.Screen name="AlarmsTab" component={AlarmsScreen} />
      <Tab.Screen name="ChatTab" component={ChatScreen} />
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
    padding: 4,
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
