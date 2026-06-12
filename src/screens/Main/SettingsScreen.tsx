import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../redux/slices/userSlice';
import { useDarkMode } from '../../hooks/useDarkMode';
import authService from '../../services/authService';
import { RootState } from '../../types';

function SettingsScreen() {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const { isDark, toggle: toggleDarkMode } = useDarkMode();

  const handleLogout = () => {
    Alert.alert('Cerrar Sesión', '¿Deseas cerrar tu sesión?', [
      { text: 'Cancelar' },
      {
        text: 'Cerrar Sesión',
        onPress: async () => {
          try {
            await authService.logout();
            dispatch(logout());
          } catch (error) {
            console.error('Logout error:', error);
            dispatch(logout());
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Perfil</Text>

        <View style={styles.profileCard}>
          <MaterialIcons name="account-circle" size={40} color="#00A86B" />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{currentUser?.nombre || 'Usuario'}</Text>
            <Text style={styles.profileEmail}>{currentUser?.email || 'email@example.com'}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </View>
      </View>

      {/* App Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuración de App</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <MaterialIcons name="dark-mode" size={20} color="#666" />
            <Text style={styles.settingLabel}>Modo Oscuro</Text>
          </View>
          <Switch value={isDark} onValueChange={toggleDarkMode} />
        </View>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <MaterialIcons name="notifications" size={20} color="#666" />
            <Text style={styles.settingLabel}>Notificaciones</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <MaterialIcons name="language" size={20} color="#666" />
            <Text style={styles.settingLabel}>Idioma</Text>
          </View>
          <Text style={styles.settingValue}>Español</Text>
        </TouchableOpacity>
      </View>

      {/* Data & Privacy */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Datos y Privacidad</Text>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <MaterialIcons name="backup" size={20} color="#666" />
            <Text style={styles.settingLabel}>Hacer Copia de Seguridad</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <MaterialIcons name="restore" size={20} color="#666" />
            <Text style={styles.settingLabel}>Restaurar Datos</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <MaterialIcons name="delete-outline" size={20} color="#d32f2f" />
            <Text style={[styles.settingLabel, { color: '#d32f2f' }]}>Eliminar Todos los Datos</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información</Text>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Versión</Text>
          <Text style={styles.settingValue}>1.0.0</Text>
        </View>

        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingLabel}>Términos de Servicio</Text>
          <MaterialIcons name="chevron-right" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingLabel}>Política de Privacidad</Text>
          <MaterialIcons name="chevron-right" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <MaterialIcons name="logout" size={20} color="#fff" />
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      <View style={styles.spacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  profileEmail: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  settingValue: {
    fontSize: 14,
    color: '#888',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    marginHorizontal: 16,
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  spacing: {
    height: 32,
  },
});

export default SettingsScreen;
