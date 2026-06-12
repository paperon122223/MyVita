import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import authService from '../services/authService';
import { loginSuccess, logout } from '../redux/slices/userSlice';
import { RootState } from '../types';

// Types
import {
  RootStackParamList,
  AuthStackParamList,
  MainTabParamList,
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
import SettingsScreen from '../screens/Main/SettingsScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Auth Navigator
function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// Main Tab Navigator
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof MaterialIcons.glyphMap = 'home';

          switch (route.name) {
            case 'DashboardTab':
              iconName = 'dashboard';
              break;
            case 'MedicationsTab':
              iconName = 'medication';
              break;
            case 'AlarmsTab':
              iconName = 'notifications';
              break;
            case 'ChatTab':
              iconName = 'chat';
              break;
            case 'DiaryTab':
              iconName = 'book';
              break;
            case 'SOSTab':
              iconName = 'emergency';
              break;
            case 'SettingsTab':
              iconName = 'settings';
              break;
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#00A86B',
        tabBarInactiveTintColor: '#888',
        tabBarLabel: (() => {
          switch (route.name) {
            case 'DashboardTab':
              return 'Inicio';
            case 'MedicationsTab':
              return 'Medicinas';
            case 'AlarmsTab':
              return 'Alarmas';
            case 'ChatTab':
              return 'Chat';
            case 'DiaryTab':
              return 'Diario';
            case 'SOSTab':
              return 'SOS';
            case 'SettingsTab':
              return 'Config';
            default:
              return '';
          }
        })(),
      })}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          title: 'Panel de Control',
        }}
      />
      <Tab.Screen
        name="MedicationsTab"
        component={MedicationsScreen}
        options={{
          title: 'Medicinas',
        }}
      />
      <Tab.Screen
        name="AlarmsTab"
        component={AlarmsScreen}
        options={{
          title: 'Alarmas',
        }}
      />
      <Tab.Screen
        name="ChatTab"
        component={ChatScreen}
        options={{
          title: 'Asistente IA',
        }}
      />
      <Tab.Screen
        name="DiaryTab"
        component={DiaryScreen}
        options={{
          title: 'Diario',
        }}
      />
      <Tab.Screen
        name="SOSTab"
        component={SOSScreen}
        options={{
          title: 'Emergencia',
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: 'Configuración',
        }}
      />
    </Tab.Navigator>
  );
}

// Root Navigator
function RootNavigator() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is still authenticated on app launch
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await authService.getStoredToken();
        if (token) {
          // TODO: Verify token is still valid and refresh if needed
          // For now, assume it's valid
          const userId = await authService.getStoredUserId();
          if (userId) {
            dispatch(
              loginSuccess({
                user: {
                  id: userId,
                  nombre: '',
                  email: '',
                  edad: 0,
                  genero: 'M',
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

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00A86B" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {isAuthenticated ? (
          <RootStack.Screen name="MainStack" component={MainTabNavigator} />
        ) : (
          <RootStack.Screen name="AuthStack" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

export default RootNavigator;
