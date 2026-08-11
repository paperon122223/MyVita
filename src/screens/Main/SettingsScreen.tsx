import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../redux/slices/userSlice';
import { useDarkMode } from '../../hooks/useDarkMode';
import authService from '../../services/authService';
import notificationService from '../../services/notificationService';
import { GradientButton } from '../../components/ui/GradientButton';
import { DesignSystem as DS } from '../../theme/designSystem';
import { RootState, ThemeMode } from '../../types';
import Constants from 'expo-constants';

const THEME_OPTIONS: {
  value: ThemeMode;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}[] = [
  { value: 'light', label: 'Claro', icon: 'light-mode' },
  { value: 'dark', label: 'Oscuro', icon: 'dark-mode' },
  { value: 'auto', label: 'Auto', icon: 'brightness-auto' },
];

interface RowProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  right?: React.ReactNode;
  color?: string;
  onPress?: () => void;
  dark?: boolean;
}

function SettingRow({ icon, label, right, color, onPress, dark }: RowProps) {
  const content = (
    <View style={[styles.settingItem, { borderBottomColor: dark ? DS.colors.borderDark : DS.colors.border }]}>
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: (color || DS.colors.primary) + '18' }]}>
          <MaterialIcons name={icon} size={18} color={color || DS.colors.primary} />
        </View>
        <Text style={[styles.settingLabel, { color: color || (dark ? DS.colors.textDark : DS.colors.text) }]}>
          {label}
        </Text>
      </View>
      {right ?? <MaterialIcons name="chevron-right" size={20} color={DS.colors.subtle} />}
    </View>
  );
  return onPress ? <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity> : content;
}

function SettingsScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const { isDark, mode, setThemeMode } = useDarkMode();

  // Preferencias de notificación
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [notifSonido, setNotifSonido] = useState(true);
  const [notifVibrar, setNotifVibrar] = useState(true);

  useEffect(() => {
    notificationService.getPrefs().then((p) => {
      setNotifSonido(p.sonido);
      setNotifVibrar(p.vibrar);
    });
  }, []);

  const bg = isDark ? DS.colors.surfaceDark : DS.colors.surface;
  const cardBg = isDark ? DS.colors.cardDark : DS.colors.card;
  const textColor = isDark ? DS.colors.textDark : DS.colors.text;

  const handleLogout = () => {
    Alert.alert('Cerrar Sesión', '¿Deseas cerrar tu sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar Sesión',
        style: 'destructive',
        onPress: async () => {
          try {
            await authService.logout();
          } catch (error) {
            console.error('Logout error:', error);
          } finally {
            dispatch(logout());
          }
        },
      },
    ]);
  };

  const proximamente = () => Alert.alert('Próximamente', 'Esta función estará disponible pronto.');

  return (
    <ScrollView style={[styles.container, { backgroundColor: bg }]} showsVerticalScrollIndicator={false}>
      {/* Perfil con gradiente */}
      <LinearGradient colors={DS.statGradients.signature} style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <MaterialIcons name="person" size={36} color={DS.colors.primary} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{currentUser?.nombre || 'Usuario'}</Text>
          <Text style={styles.profileEmail}>{currentUser?.email || ''}</Text>
        </View>
      </LinearGradient>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>APARIENCIA</Text>
        <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
          <View style={[styles.themeSelector, { borderBottomColor: isDark ? DS.colors.borderDark : DS.colors.border }]}>
            <Text style={[styles.themeSelectorLabel, { color: textColor }]}>Tema de la app</Text>
            <View style={styles.themeOptions}>
              {THEME_OPTIONS.map((opt) => {
                const active = mode === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.themeChip, active && styles.themeChipActive]}
                    onPress={() => setThemeMode(opt.value)}
                    accessibilityLabel={`Tema ${opt.label}`}
                  >
                    <MaterialIcons
                      name={opt.icon}
                      size={17}
                      color={active ? '#fff' : DS.colors.muted}
                    />
                    <Text style={[styles.themeChipText, active && styles.themeChipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <SettingRow
            icon="notifications"
            label="Notificaciones"
            dark={isDark}
            onPress={() => setNotifModalVisible(true)}
          />
          <SettingRow
            icon="language"
            label="Idioma"
            dark={isDark}
            right={<Text style={styles.settingValue}>Español</Text>}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DATOS</Text>
        <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
          <SettingRow icon="backup" label="Copia de Seguridad" dark={isDark} onPress={proximamente} />
          <SettingRow icon="restore" label="Restaurar Datos" dark={isDark} onPress={proximamente} />
          <SettingRow
            icon="delete-outline"
            label="Eliminar Todos los Datos"
            color={DS.colors.error}
            dark={isDark}
            onPress={proximamente}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>INFORMACIÓN</Text>
        <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
          <SettingRow
            icon="info-outline"
            label="Versión"
            dark={isDark}
            right={<Text style={styles.settingValue}>{Constants.expoConfig?.version || '1.0.0'}</Text>}
          />
          <SettingRow icon="description" label="Términos de uso" dark={isDark} onPress={() => navigation.navigate('Terms')} />
          <SettingRow icon="privacy-tip" label="Aviso de privacidad" dark={isDark} onPress={() => navigation.navigate('Privacy')} />
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <MaterialIcons name="logout" size={19} color="#fff" />
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      <View style={styles.spacing} />

      {/* Modal de preferencias de notificación */}
      <Modal visible={notifModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Notificaciones</Text>
              <TouchableOpacity onPress={() => setNotifModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={DS.colors.subtle} />
              </TouchableOpacity>
            </View>

            <View style={[styles.prefRow, { borderBottomColor: isDark ? DS.colors.borderDark : DS.colors.border }]}>
              <View style={styles.prefLeft}>
                <MaterialIcons name="volume-up" size={20} color={DS.colors.primary} />
                <View style={styles.prefText}>
                  <Text style={[styles.prefTitle, { color: textColor }]}>Sonido</Text>
                  <Text style={styles.prefHint}>Tono al llegar un recordatorio</Text>
                </View>
              </View>
              <Switch
                value={notifSonido}
                onValueChange={(v) => {
                  setNotifSonido(v);
                  notificationService.setPrefs({ sonido: v });
                }}
                trackColor={{ true: DS.colors.secondary }}
              />
            </View>

            <View style={[styles.prefRow, { borderBottomColor: isDark ? DS.colors.borderDark : DS.colors.border }]}>
              <View style={styles.prefLeft}>
                <MaterialIcons name="vibration" size={20} color={DS.colors.primary} />
                <View style={styles.prefText}>
                  <Text style={[styles.prefTitle, { color: textColor }]}>Vibración</Text>
                  <Text style={styles.prefHint}>Vibrar con cada recordatorio</Text>
                </View>
              </View>
              <Switch
                value={notifVibrar}
                onValueChange={(v) => {
                  setNotifVibrar(v);
                  notificationService.setPrefs({ vibrar: v });
                }}
                trackColor={{ true: DS.colors.secondary }}
              />
            </View>

            <Text style={styles.prefNote}>
              Los recordatorios incluyen botones para confirmar la toma o posponer 10 minutos sin
              abrir la app.
            </Text>

            <GradientButton
              label="Enviar notificación de prueba"
              onPress={async () => {
                const ok = await notificationService.enviarNotificacionPrueba();
                if (!ok) {
                  Alert.alert('No disponible', 'Las notificaciones no están disponibles en este entorno.');
                }
              }}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    margin: 16,
    borderRadius: DS.borderRadius.xl,
    padding: 20,
    ...DS.shadows.lg,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontFamily: DS.fonts.extrabold,
    color: '#fff',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 15,
    fontFamily: DS.fonts.regular,
    color: 'rgba(255,255,255,0.9)',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: DS.fonts.bold,
    color: DS.colors.primary,
    letterSpacing: 0.7,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: DS.borderRadius.lg,
    overflow: 'hidden',
    ...DS.shadows.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    flex: 1,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 17,
    fontFamily: DS.fonts.semibold,
  },
  settingValue: {
    fontSize: 15,
    color: DS.colors.subtle,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: DS.colors.error,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: DS.borderRadius.lg,
    ...DS.shadows.sm,
  },
  logoutButtonText: {
    fontSize: 14,
    fontFamily: DS.fonts.bold,
    color: '#fff',
  },
  spacing: {
    height: 36,
  },
  themeSelector: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  themeSelectorLabel: {
    fontSize: 14,
    fontFamily: DS.fonts.semibold,
    marginBottom: 10,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  themeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 10,
    paddingVertical: 9,
    backgroundColor: 'rgba(148,163,184,0.12)',
  },
  themeChipActive: {
    backgroundColor: DS.colors.primary,
  },
  themeChipText: {
    fontSize: 12,
    fontFamily: DS.fonts.bold,
    color: DS.colors.muted,
  },
  themeChipTextActive: {
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: DS.borderRadius.xl,
    borderTopRightRadius: DS.borderRadius.xl,
    padding: 22,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 19,
    fontFamily: DS.fonts.extrabold,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  prefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    flex: 1,
  },
  prefText: {
    flex: 1,
  },
  prefTitle: {
    fontSize: 14,
    fontFamily: DS.fonts.bold,
  },
  prefHint: {
    fontSize: 11,
    color: DS.colors.subtle,
    marginTop: 1,
  },
  prefNote: {
    fontSize: 11,
    color: DS.colors.subtle,
    lineHeight: 16,
    marginVertical: 14,
  },
});

export default SettingsScreen;
