import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Modal,
  Linking,
  AppState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../redux/slices/userSlice';
import { useDarkMode } from '../../hooks/useDarkMode';
import authService from '../../services/authService';
import alarmService from '../../services/alarmService';
import { useTabBarClearance } from '../../utils/layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Notifications } from '../../utils/notificationsModule';
import notificationService from '../../services/notificationService';
import demoDataService from '../../services/demoDataService';
import respaldoService from '../../services/respaldoService';
import { GradientButton } from '../../components/ui/GradientButton';
import { ScreenBackground } from '../../components/ui/ScreenBackground';
import { SectionHero } from '../../components/ui/SectionHero';
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
  return onPress ? <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>{content}</TouchableOpacity> : content;
}

function SettingsScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const { isDark, mode, setThemeMode } = useDarkMode();

  const clearance = useTabBarClearance();
  const insets = useSafeAreaInsets();
  const [demoVisible, setDemoVisible] = useState(false);
  const [prefSaving, setPrefSaving] = useState(false);
  const prefBusy = useRef(false);
  const [testing, setTesting] = useState(false);
  const [permission, setPermission] = useState<'checking' | 'granted' | 'denied' | 'unavailable'>('checking');
  const readPermission = useCallback(async () => {
    try {
      setPermission(!Notifications ? 'unavailable' : (await notificationService.checkPermissions()) ? 'granted' : 'denied');
    } catch { setPermission('unavailable'); }
  }, []);

  // Preferencias de notificación
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [notifSonido, setNotifSonido] = useState(true);
  const [notifVibrar, setNotifVibrar] = useState(true);

  useEffect(() => {
    notificationService.getPrefs().then((p) => {
      setNotifSonido(p.sonido);
      setNotifVibrar(p.vibrar);
    }).catch(() => Alert.alert('No pudimos leer tus preferencias', 'Intenta abrir Configuración de nuevo.'));
  }, []);

  useEffect(() => {
    if (!notifModalVisible) return;
    readPermission();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') readPermission(); });
    return () => listener.remove();
  }, [notifModalVisible, readPermission]);

  const savePreference = async (key: 'sonido' | 'vibrar', value: boolean) => {
    if (prefBusy.current) return;
    prefBusy.current = true;
    setPrefSaving(true);
    try {
      await notificationService.setPrefs({ [key]: value });
      if (key === 'sonido') setNotifSonido(value); else setNotifVibrar(value);
      await alarmService.refresh();
    } catch {
      Alert.alert('Revisa tus notificaciones', 'No pudimos aplicar el cambio a todos los recordatorios. Intenta de nuevo.');
    } finally { prefBusy.current = false; setPrefSaving(false); }
  };

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


  const exportarRespaldo = async () => {
    try {
      const total = await respaldoService.exportar(currentUser?.id || '');
      if (total === 0) {
        Alert.alert('Sin datos', 'Todavía no hay nada que respaldar.');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear la copia de seguridad.');
    }
  };

  const restaurarRespaldo = () => {
    Alert.alert(
      'Restaurar datos',
      'Se reemplazarán tus medicamentos, alarmas, historial, inventario y diario ' +
        'por los del archivo que elijas.\n\nLo que tengas ahora se perderá.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Elegir archivo',
          style: 'destructive',
          onPress: async () => {
            try {
              const total = await respaldoService.importar(currentUser?.id || '');
              if (total > 0) {
                await alarmService.refresh();
                Alert.alert('Listo', `Se restauraron ${total} registros.`);
              }
            } catch (error: any) {
              Alert.alert(
                'Error',
                error?.message === 'formato-invalido'
                  ? 'Ese archivo no es una copia de seguridad de MyVita.'
                  : 'No se pudieron restaurar los datos.',
              );
            }
          },
        },
      ],
    );
  };

  const cargarDatosDemo = () => {
    Alert.alert(
      'Cargar datos de ejemplo',
      'Se agregarán 4 medicamentos con 14 días de historial, inventario y entradas de diario, ' +
        'para mostrar la app con contenido.\n\nEsto NO borra lo que ya tienes.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cargar',
          onPress: async () => {
            try {
              const { medicamentos, alarmas } = await demoDataService.cargar(currentUser?.id || '');
              await alarmService.refresh();
              Alert.alert(
                'Listo',
                `Se agregaron ${medicamentos} medicamentos y ${alarmas} tomas de ejemplo. ` +
                  'Revisa Inicio, Alarmas e Historial.',
              );
            } catch (error) {
              Alert.alert('Error', 'No se pudieron cargar los datos de ejemplo.');
            }
          },
        },
      ],
    );
  };

  const borrarTodo = () => {
    Alert.alert(
      'Eliminar todos los datos',
      'Se borrarán TODOS tus medicamentos, alarmas, historial, inventario y diario. ' +
        'Esta acción no se puede deshacer.\n\nTu cuenta y tus contactos de emergencia no se tocan.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar todo',
          style: 'destructive',
          onPress: async () => {
            try {
              await demoDataService.limpiar(currentUser?.id || '');
              await alarmService.refresh();
              Alert.alert('Listo', 'Se borraron tus datos de medicamentos e historial.');
            } catch (error) {
              Alert.alert('Error', 'No se pudieron borrar los datos.');
            }
          },
        },
      ],
    );
  };

  return (
    <ScreenBackground isDark={isDark}>
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: clearance }} showsVerticalScrollIndicator={false}>
      <SectionHero title="A tu manera" subtitle="Ajusta MyVita para sentirte más cómodo." image={require('../../../assets/images/section-settings.png')} isDark={isDark} />
      {/* Perfil con gradiente azul → gris */}
      <LinearGradient colors={DS.sectionGradients.configuracion} style={styles.profileCard}>
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
                    onPress={() => setThemeMode(opt.value).catch(() => Alert.alert('No se guardó la apariencia', 'El cambio se verá ahora, pero puede perderse al cerrar MyVita. Intenta de nuevo.'))}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={`Tema ${opt.label}`}
                  >
                    <MaterialIcons
                      name={opt.icon}
                      size={17}
                      color={active ? '#fff' : isDark ? DS.colors.mutedDark : DS.colors.muted}
                    />
                    <Text style={[styles.themeChipText, { color: isDark ? DS.colors.mutedDark : DS.colors.muted }, active && styles.themeChipTextActive]}>
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
          <SettingRow icon="backup" label="Copia de Seguridad" dark={isDark} onPress={exportarRespaldo} />
          <SettingRow icon="restore" label="Restaurar Datos" dark={isDark} onPress={restaurarRespaldo} />
          <SettingRow icon="science" label="Herramientas de demostración" dark={isDark} onPress={() => setDemoVisible(value => !value)} />
          {demoVisible && <SettingRow
            icon="auto-awesome"
            label="Cargar datos de ejemplo"
            dark={isDark}
            onPress={cargarDatosDemo}
          />}
          <SettingRow
            icon="delete-outline"
            label="Eliminar Todos los Datos"
            color={DS.colors.error}
            dark={isDark}
            onPress={borrarTodo}
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

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} accessibilityRole="button">
        <MaterialIcons name="logout" size={19} color="#fff" />
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>



      {/* Modal de preferencias de notificación */}
      <Modal visible={notifModalVisible} transparent animationType="slide" onRequestClose={() => setNotifModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView style={{ maxHeight: '90%', backgroundColor: cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24 }} contentContainerStyle={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]} accessibilityViewIsModal>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Notificaciones</Text>
              <TouchableOpacity onPress={() => setNotifModalVisible(false)} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Cerrar notificaciones">
                <MaterialIcons name="close" size={24} color={DS.colors.subtle} />
              </TouchableOpacity>
            </View>

            <Text accessibilityLiveRegion="polite" style={[styles.prefNote, { color: textColor }]}>
              {permission === 'granted' ? 'Notificaciones permitidas en este teléfono.' : permission === 'denied' ? 'Las notificaciones están desactivadas. Actívalas para recibir recordatorios.' : permission === 'checking' ? 'Comprobando permisos…' : 'No se pudieron comprobar las notificaciones.'}
            </Text>
            {permission === 'denied' && <GradientButton label="Activar notificaciones" onPress={async () => {
              try {
                if (!(await notificationService.requestPermissions())) {
                  Alert.alert('Activar en el teléfono', 'Abre los ajustes de MyVita y permite las notificaciones.', [
                    { text: 'Ahora no', style: 'cancel' },
                    { text: 'Abrir ajustes', onPress: () => { Linking.openSettings().catch(() => Alert.alert('No se abrieron los ajustes', 'Abre Ajustes en tu teléfono y busca MyVita.')); } },
                  ]);
                } else { await alarmService.refresh(); }
                await readPermission();
              } catch { Alert.alert('No se pudo activar', 'Intenta de nuevo desde los ajustes del teléfono.'); }
            }} />}

            <View style={[styles.prefRow, { borderBottomColor: isDark ? DS.colors.borderDark : DS.colors.border }]}>
              <View style={styles.prefLeft}>
                <MaterialIcons name="volume-up" size={20} color={DS.colors.primary} />
                <View style={styles.prefText}>
                  <Text style={[styles.prefTitle, { color: textColor }]}>Sonido</Text>
                  <Text style={[styles.prefHint, { color: isDark ? DS.colors.mutedDark : DS.colors.muted }]}>Tono al llegar un recordatorio</Text>
                </View>
              </View>
              <Switch
                value={notifSonido}
                onValueChange={v => savePreference('sonido', v)}
                disabled={prefSaving}
                accessibilityLabel="Sonido de los recordatorios"
                trackColor={{ true: DS.colors.secondary }}
              />
            </View>

            <View style={[styles.prefRow, { borderBottomColor: isDark ? DS.colors.borderDark : DS.colors.border }]}>
              <View style={styles.prefLeft}>
                <MaterialIcons name="vibration" size={20} color={DS.colors.primary} />
                <View style={styles.prefText}>
                  <Text style={[styles.prefTitle, { color: textColor }]}>Vibración</Text>
                  <Text style={[styles.prefHint, { color: isDark ? DS.colors.mutedDark : DS.colors.muted }]}>Vibrar con cada recordatorio</Text>
                </View>
              </View>
              <Switch
                value={notifVibrar}
                onValueChange={v => savePreference('vibrar', v)}
                disabled={prefSaving}
                accessibilityLabel="Vibración de los recordatorios"
                trackColor={{ true: DS.colors.secondary }}
              />
            </View>

            <Text style={[styles.prefNote, { color: isDark ? DS.colors.mutedDark : DS.colors.muted }]}>
              Los recordatorios incluyen botones para confirmar la toma o posponer 10 minutos sin
              abrir la app.
            </Text>

            <GradientButton
              label={testing ? "Preparando prueba…" : "Probar notificación"}
              loading={testing}
              onPress={async () => {
                if (testing) return;
                setTesting(true);
                try {
                  const ok = await notificationService.enviarNotificacionPrueba();
                  await readPermission();
                  Alert.alert(ok ? 'Prueba programada' : 'No se pudo programar', ok ? 'Revisa el aviso de MyVita en las notificaciones del teléfono.' : 'Revisa los permisos de notificaciones e intenta de nuevo.');
                } catch { Alert.alert('No se pudo probar', 'Revisa los permisos e intenta de nuevo.'); }
                finally { setTesting(false); }
              }}
            />
            <TouchableOpacity style={styles.doneButton} onPress={() => setNotifModalVisible(false)} accessibilityRole="button">
              <Text style={{ fontSize: 18, fontFamily: DS.fonts.bold, color: textColor }}>Listo</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  closeButton: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' },
  doneButton: { minHeight: 56, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
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
    fontSize: 17,
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
    flex: 1,
    flexWrap: 'wrap',
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
    paddingVertical: 15,
    borderRadius: DS.borderRadius.full,
    ...DS.shadows.sm,
  },
  logoutButtonText: {
    fontSize: 17,
    fontFamily: DS.fonts.bold,
    color: '#fff',
  },
  spacing: {
    height: 150,
  },
  themeSelector: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  themeSelectorLabel: {
    fontSize: 17,
    fontFamily: DS.fonts.semibold,
    marginBottom: 10,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  themeChip: {
    minHeight: 56,
    flexWrap: 'wrap',
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
    backgroundColor: DS.colors.primaryDark,
  },
  themeChipText: {
    fontSize: 16,
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
    flex: 1,
    fontSize: 19,
    fontFamily: DS.fonts.extrabold,
  },
  prefRow: {
    gap: 12,
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
    fontSize: 17,
    fontFamily: DS.fonts.bold,
  },
  prefHint: {
    fontSize: 16,
    color: DS.colors.subtle,
    marginTop: 1,
  },
  prefNote: {
    fontSize: 16,
    color: DS.colors.subtle,
    lineHeight: 24,
    marginVertical: 14,
  },
});

export default SettingsScreen;
