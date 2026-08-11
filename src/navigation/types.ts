import { NavigatorScreenParams } from '@react-navigation/native';

// Auth Stack
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

// Main Bottom Tab Screens
export type DashboardStackParamList = {
  DashboardScreen: undefined;
};

export type MedicationsStackParamList = {
  MedicationsScreen: undefined;
  MedicationDetail: { medicationId: string };
  CreateMedication: undefined;
};

export type AlarmsStackParamList = {
  AlarmsScreen: undefined;
  CreateAlarm: undefined;
  AlarmDetail: { alarmId: string };
};

export type ChatStackParamList = {
  ChatScreen: undefined;
};

export type DiaryStackParamList = {
  DiaryScreen: undefined;
  DiaryEntry: { date: string };
};

export type SOSStackParamList = {
  SOSScreen: undefined;
};

export type SettingsStackParamList = {
  SettingsScreen: undefined;
  EditProfile: undefined;
  ManageContacts: undefined;
  NotificationSettings: undefined;
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  Chat: undefined;
  Diary: undefined;
  Mapa: undefined;
  Cuidador: undefined;
  Settings: undefined;
  Privacy: undefined;
  Terms: undefined;
};

// Main Tab Navigator
export type MainTabParamList = {
  DashboardTab: undefined;
  MedicationsTab: undefined;
  AlarmsTab: undefined;
  SOSTab: undefined;
  MoreTab: NavigatorScreenParams<MoreStackParamList> | undefined;
};

// Root Navigator
export type RootStackParamList = {
  AuthStack: NavigatorScreenParams<AuthStackParamList>;
  MainStack: NavigatorScreenParams<MainTabParamList>;
};

// Navigation prop types for screen components
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';

export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;
export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
export type DashboardNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<DashboardStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;
export type MedicationsNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<MedicationsStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;
export type AlarmsNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<AlarmsStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;
export type ChatNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<ChatStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;
export type DiaryNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<DiaryStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;
export type SOSNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<SOSStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;
export type SettingsNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<SettingsStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;
