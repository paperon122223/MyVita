import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Linking,
  FlatList,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import { useContactosEmergencia } from '../../hooks/useDatabase';
import { useDarkMode } from '../../hooks/useDarkMode';
import databaseService from '../../services/database';
import emergencyService from '../../services/emergencyService';
import type { ContactoElegido } from '../../services/emergencyService';
import { GradientButton } from '../../components/ui/GradientButton';
import { ScreenBackground } from '../../components/ui/ScreenBackground';
import { DesignSystem as DS } from '../../theme/designSystem';
import { RootState } from '../../types';

function SOSScreen() {
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const userId = currentUser?.id || '';
  const { isDark } = useDarkMode();
  const { data: contacts, refetch } = useContactosEmergencia(userId);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  // Modal agregar contacto
  const [modalVisible, setModalVisible] = useState(false);
  const [nombre, setNombre] = useState('');
  const [relacion, setRelacion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [saving, setSaving] = useState(false);
  const [contactPickerVisible, setContactPickerVisible] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [phoneContacts, setPhoneContacts] = useState<ContactoElegido[]>([]);
  const [contactSearch, setContactSearch] = useState('');

  // Halo pulsante detrás del botón de emergencia (puramente visual)
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.3 }],
    opacity: (1 - pulse.value) * 0.45,
  }));

  const bg = isDark ? DS.colors.surfaceDark : DS.colors.surface;
  const cardBg = isDark ? DS.colors.cardDark : DS.colors.card;
  const textColor = isDark ? DS.colors.textDark : DS.colors.text;
  const mutedColor = isDark ? DS.colors.mutedDark : DS.colors.muted;

  // Envía la alerta (registra evento + obtiene ubicación + abre WhatsApp/SMS)
  const dispararAlerta = useCallback(
    async (via: 'whatsapp' | 'sms') => {
      if (!contacts || contacts.length === 0) return;
      setSending(true);
      try {
        // Ubicación actual (para incluir el mapa en el mensaje)
        const ubicacion = await emergencyService.getUbicacionActual();
        const mensaje = emergencyService.construirMensaje(currentUser?.nombre || '', ubicacion?.link ?? null);

        if (via === 'sms') {
          const telefonos = contacts.map((c) => c.telefono).filter(Boolean);
          const resultado = await emergencyService.enviarSMS(telefonos, mensaje);
          if (resultado === 'unavailable') {
            Alert.alert('SMS no disponible', 'Este dispositivo no puede enviar SMS.');
            return;
          }
          if (resultado === 'cancelled') return;

          await databaseService.registrarEventoSOS(
            userId,
            ubicacion?.latitude,
            ubicacion?.longitude,
            mensaje,
            resultado === 'sent' ? 'enviado' : 'abierto',
            contacts.map((contacto) => contacto.id),
          );
        } else {
          // WhatsApp: al contacto principal (deep link admite uno a la vez)
          const principal = contacts[0];
          const ok = await emergencyService.enviarWhatsApp(principal.telefono, mensaje);
          if (!ok) {
            Alert.alert('WhatsApp no disponible', 'No se pudo abrir WhatsApp.');
            return;
          }

          // WhatsApp no confirma el envío; registramos únicamente que se abrió.
          await databaseService.registrarEventoSOS(
            userId,
            ubicacion?.latitude,
            ubicacion?.longitude,
            mensaje,
            'abierto',
            [principal.id],
          );
        }

        setCooldown(true);
        setTimeout(() => setCooldown(false), 5000);
      } catch (e) {
        Alert.alert('Error', 'No se pudo enviar la alerta.');
      } finally {
        setSending(false);
      }
    },
    [contacts, userId, currentUser],
  );

  const handleSOS = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    if (!contacts || contacts.length === 0) {
      Alert.alert(
        'Sin contactos',
        'Primero agrega al menos un contacto de emergencia para poder enviar la alerta.',
      );
      return;
    }

    const principal = contacts[0];
    Alert.alert('🆘 Enviar alerta de emergencia', '¿Cómo quieres avisar a tus contactos?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: '💬 WhatsApp', onPress: () => dispararAlerta('whatsapp') },
      { text: '✉️ SMS (a todos)', onPress: () => dispararAlerta('sms') },
      {
        text: '📞 Llamar',
        onPress: () => Linking.openURL(`tel:${principal.telefono}`),
      },
    ]);
  }, [contacts, dispararAlerta]);

  // Carga la agenda y la muestra dentro de MyVita. Es más estable en MIUI que
  // delegar la selección a la ventana nativa de Contactos.
  const handlePickContact = useCallback(async () => {
    setModalVisible(false);
    setLoadingContacts(true);
    try {
      const agenda = await emergencyService.obtenerContactosTelefono();
      setPhoneContacts(agenda);
      setContactSearch('');
      setContactPickerVisible(true);
      if (agenda.length === 0) {
        Alert.alert('Sin contactos', 'No encontramos contactos con número telefónico en el celular.');
      }
    } catch (e) {
      const permisoDenegado = e instanceof Error && e.message === 'CONTACTS_PERMISSION_DENIED';
      if (permisoDenegado) {
        Alert.alert(
          'Permiso de contactos',
          'MyVita necesita permiso para mostrar la agenda. Puedes habilitarlo en los ajustes del teléfono.',
          [
            { text: 'Ahora no', onPress: () => setModalVisible(true), style: 'cancel' },
            { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
          ],
        );
      } else {
        Alert.alert('No se pudo', 'No se pudieron cargar tus contactos. Puedes escribir el contacto a mano.');
        setModalVisible(true);
      }
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  const selectPhoneContact = useCallback((contacto: ContactoElegido) => {
    setNombre(contacto.nombre);
    setTelefono(contacto.telefono);
    setContactPickerVisible(false);
    setModalVisible(true);
  }, []);

  const filteredPhoneContacts = phoneContacts.filter((contacto) => {
    const query = contactSearch.trim().toLocaleLowerCase();
    if (!query) return true;
    return contacto.nombre.toLocaleLowerCase().includes(query) || contacto.telefono.includes(query);
  });

  const handleAddContact = useCallback(async () => {
    if (!nombre.trim() || !telefono.trim()) {
      Alert.alert('Faltan datos', 'Nombre y teléfono son obligatorios');
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await databaseService.ejecutar(
        `INSERT INTO contactos_emergencia (id, usuario_id, nombre, relacion, telefono, prioridad, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `contact_${Date.now()}`,
          userId,
          nombre.trim(),
          relacion.trim() || null,
          telefono.trim(),
          (contacts?.length ?? 0) + 1,
          now,
          now,
        ],
      );
      setModalVisible(false);
      setNombre('');
      setRelacion('');
      setTelefono('');
      await refetch();
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el contacto.');
    } finally {
      setSaving(false);
    }
  }, [nombre, relacion, telefono, userId, contacts, refetch]);

  return (
    <ScreenBackground isDark={isDark}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Botón SOS */}
      <View style={styles.sosSection}>
        <Text style={[styles.title, { color: textColor }]}>Botón de Emergencia</Text>

        <View style={styles.sosButtonWrap}>
          {!cooldown && (
            <Animated.Image
              source={require('../../../assets/images/sos-emergency-badge.png')}
              style={[styles.sosGlow, pulseStyle]}
            />
          )}
          <TouchableOpacity
            onPress={handleSOS}
            disabled={sending || cooldown}
            activeOpacity={0.8}
            accessibilityLabel="Enviar alerta de emergencia SOS"
          >
            {sending ? (
              <View style={styles.sosLoading}>
                <ActivityIndicator color="#fff" size="large" />
              </View>
            ) : (
              <Image
                source={require('../../../assets/images/sos-boton-grande.png')}
                style={[styles.sosButtonImage, cooldown && styles.sosButtonImageDisabled]}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
        </View>

        <Text style={[styles.instruction, { color: mutedColor }]}>
          Mantén la calma. Al presionar, registramos la alerta y te ayudamos a llamar a tu contacto
          principal.
        </Text>
      </View>

      {/* Contactos */}
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>Contactos de emergencia</Text>
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <LinearGradient colors={DS.statGradients.active} style={styles.addButton}>
              <MaterialIcons name="add" size={24} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {contacts && contacts.length > 0 ? (
          contacts.map((contact, i) => (
            <View
              key={contact.id}
              style={[styles.contactRow, { borderBottomColor: isDark ? DS.colors.borderDark : DS.colors.border }]}
            >
              <View style={[styles.contactAvatar, i === 0 && styles.contactAvatarMain]}>
                <MaterialIcons name="person" size={28} color={i === 0 ? '#fff' : DS.colors.primary} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactName, { color: textColor }]}>
                  {contact.nombre}
                  {i === 0 && <Text style={styles.mainBadge}>  · Principal</Text>}
                </Text>
                {!!contact.relacion && (
                  <Text style={[styles.contactRelation, { color: mutedColor }]}>{contact.relacion}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => Linking.openURL(`tel:${contact.telefono}`)}
                accessibilityLabel={`Llamar a ${contact.nombre}`}
              >
                <MaterialIcons name="call" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="contact-phone" size={34} color={DS.colors.subtle} />
            <Text style={[styles.emptyText, { color: mutedColor }]}>
              Agrega contactos que serán notificados en una emergencia
            </Text>
          </View>
        )}
      </View>

      {/* Modal: nuevo contacto de emergencia */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Nuevo Contacto</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={mutedColor} />
              </TouchableOpacity>
            </View>

            {/* Elegir de la agenda del teléfono */}
            <TouchableOpacity style={styles.pickContactBtn} onPress={handlePickContact} disabled={loadingContacts}>
              {loadingContacts ? (
                <ActivityIndicator size="small" color={DS.colors.primary} />
              ) : (
                <MaterialIcons name="contacts" size={22} color={DS.colors.primary} />
              )}
              <Text style={styles.pickContactText}>
                {loadingContacts ? 'Cargando contactos…' : 'Elegir de mis contactos'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>NOMBRE *</Text>
            <TextInput
              style={[styles.modalInput, { color: textColor, backgroundColor: bg, borderColor: isDark ? DS.colors.borderDark : DS.colors.border }]}
              placeholder="Ej. María Pérez"
              placeholderTextColor={DS.colors.subtle}
              value={nombre}
              onChangeText={setNombre}
            />

            <Text style={styles.fieldLabel}>RELACIÓN</Text>
            <TextInput
              style={[styles.modalInput, { color: textColor, backgroundColor: bg, borderColor: isDark ? DS.colors.borderDark : DS.colors.border }]}
              placeholder="Ej. Hija, vecino, médico"
              placeholderTextColor={DS.colors.subtle}
              value={relacion}
              onChangeText={setRelacion}
            />

            <Text style={styles.fieldLabel}>TELÉFONO *</Text>
            <TextInput
              style={[styles.modalInput, { color: textColor, backgroundColor: bg, borderColor: isDark ? DS.colors.borderDark : DS.colors.border }]}
              placeholder="55 1234 5678"
              placeholderTextColor={DS.colors.subtle}
              keyboardType="phone-pad"
              value={telefono}
              onChangeText={setTelefono}
            />

            <GradientButton
              label={saving ? 'Guardando…' : 'Guardar Contacto'}
              onPress={handleAddContact}
              loading={saving}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={contactPickerVisible}
        animationType="slide"
        onRequestClose={() => {
          setContactPickerVisible(false);
          setModalVisible(true);
        }}
      >
        <View style={[styles.contactPickerScreen, { backgroundColor: bg }]}>
          <View style={styles.contactPickerHeader}>
            <TouchableOpacity
              style={styles.contactPickerBack}
              onPress={() => {
                setContactPickerVisible(false);
                setModalVisible(true);
              }}
            >
              <MaterialIcons name="arrow-back" size={26} color={textColor} />
            </TouchableOpacity>
            <Text style={[styles.contactPickerTitle, { color: textColor }]}>Contactos del celular</Text>
          </View>

          <TextInput
            style={[styles.contactSearch, { color: textColor, backgroundColor: cardBg, borderColor: isDark ? DS.colors.borderDark : DS.colors.border }]}
            placeholder="Buscar por nombre o teléfono"
            placeholderTextColor={DS.colors.subtle}
            value={contactSearch}
            onChangeText={setContactSearch}
          />

          <FlatList
            data={filteredPhoneContacts}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={filteredPhoneContacts.length === 0 ? styles.contactPickerEmptyList : undefined}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: mutedColor }]}>No hay contactos con teléfono para mostrar.</Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.phoneContactRow, { borderBottomColor: isDark ? DS.colors.borderDark : DS.colors.border }]}
                onPress={() => selectPhoneContact(item)}
              >
                <View style={styles.phoneContactAvatar}>
                  <Text style={styles.phoneContactInitial}>{item.nombre.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={[styles.phoneContactName, { color: textColor }]}>{item.nombre}</Text>
                  <Text style={[styles.phoneContactNumber, { color: mutedColor }]}>{item.telefono}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={mutedColor} />
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 150,
  },
  sosSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontFamily: DS.fonts.extrabold,
    marginBottom: 22,
  },
  sosButtonWrap: {
    width: 230,
    height: 230,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  sosGlow: {
    position: 'absolute',
    width: 230,
    height: 230,
    pointerEvents: 'none',
  },
  sosButtonImage: {
    width: 220,
    height: 220,
  },
  sosButtonImageDisabled: {
    opacity: 0.45,
  },
  sosLoading: {
    width: 220,
    height: 220,
    borderRadius: 110,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DS.colors.error,
    ...DS.shadows.glow,
  },
  sosButtonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: DS.fonts.extrabold,
    letterSpacing: 1,
    marginTop: 4,
  },
  instruction: {
    fontSize: 16,
    fontFamily: DS.fonts.regular,
    textAlign: 'center',
    lineHeight: 23,
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: DS.borderRadius.xl,
    padding: 18,
    ...DS.shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: DS.fonts.bold,
    color: DS.colors.text,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  contactAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: DS.statContainers.blue.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarMain: {
    backgroundColor: DS.colors.primary,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 18,
    fontFamily: DS.fonts.bold,
  },
  mainBadge: {
    fontSize: 13,
    fontFamily: DS.fonts.semibold,
    color: DS.colors.primary,
  },
  contactRelation: {
    fontSize: 15,
    marginTop: 1,
  },
  callButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: DS.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 22,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: DS.fonts.regular,
    textAlign: 'center',
    paddingHorizontal: 30,
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
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 19,
    fontFamily: DS.fonts.extrabold,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: DS.fonts.bold,
    color: DS.colors.muted,
    letterSpacing: 0.6,
    marginBottom: 7,
  },
  pickContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: DS.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: DS.colors.primary,
    backgroundColor: DS.statContainers.blue.bg,
    paddingVertical: 14,
    marginBottom: 18,
  },
  pickContactText: {
    fontSize: 16,
    fontFamily: DS.fonts.bold,
    color: DS.colors.primary,
  },
  modalInput: {
    borderRadius: DS.borderRadius.md,
    borderWidth: 1.5,
    borderColor: DS.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 14,
  },
  contactPickerScreen: {
    flex: 1,
    paddingTop: 24,
  },
  contactPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  contactPickerBack: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactPickerTitle: {
    fontSize: 21,
    fontFamily: DS.fonts.extrabold,
  },
  contactSearch: {
    borderWidth: 1.5,
    borderRadius: DS.borderRadius.lg,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  contactPickerEmptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  phoneContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: 1,
    gap: 12,
  },
  phoneContactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DS.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneContactInitial: {
    color: '#fff',
    fontSize: 18,
    fontFamily: DS.fonts.bold,
  },
  phoneContactName: {
    fontSize: 16,
    fontFamily: DS.fonts.bold,
  },
  phoneContactNumber: {
    fontSize: 14,
    marginTop: 2,
  },
});

export default SOSScreen;
