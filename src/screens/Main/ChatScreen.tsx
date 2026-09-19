import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Text,
  ScrollView,
  Modal,
  Image,
  Alert,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import chatService from '../../services/chatService';
import { useDarkMode } from '../../hooks/useDarkMode';
import { ScreenBackground } from '../../components/ui/ScreenBackground';
import { SectionHero } from '../../components/ui/SectionHero';
import { useTabBarClearance } from '../../utils/layout';
import { DesignSystem as DS } from '../../theme/designSystem';
import { RootState } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  hora: string;
}

const LECTURA_KEY = '@myvita:leer_respuestas';

/** Quita el marcado (**negritas**, listas) para que la voz no lea símbolos. */
function limpiarParaVoz(texto: string): string {
  return texto
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/[*_#`]/g, '')
    .replace(/^\s*[-•]\s*/gm, '')
    .trim();
}

const SUGERENCIAS = [
  '¿Ya tomé mis medicamentos de hoy?',
  '¿Cómo va mi adherencia?',
  '¿Qué hago si olvidé una toma?',
  '¿Cómo debo guardar mis medicinas?',
];

function horaActual(): string {
  return new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function ChatScreen({ navigation }: any) {
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const userId = currentUser?.id || '';
  const { isDark } = useDarkMode();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [aiConsent, setAiConsent] = useState<boolean | null>(null);
  // Lectura en voz alta (accesibilidad para adultos mayores)
  const [leerAuto, setLeerAuto] = useState(true);
  const [hablandoId, setHablandoId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    AsyncStorage.getItem(LECTURA_KEY)
      .then((value) => setLeerAuto(value !== 'off'))
      .catch(() => {});
  }, []);

  // Detener la voz al salir de la pantalla
  useEffect(() => () => {
    Speech.stop();
  }, []);

  const detenerVoz = useCallback(() => {
    Speech.stop();
    setHablandoId(null);
  }, []);

  const hablar = useCallback((id: string, texto: string) => {
    Speech.stop();
    setHablandoId(id);
    Speech.speak(limpiarParaVoz(texto), {
      language: 'es-MX',
      rate: 0.92, // un poco más lento, se entiende mejor
      onDone: () => setHablandoId(null),
      onStopped: () => setHablandoId(null),
      onError: () => setHablandoId(null),
    });
  }, []);

  /** Alterna entre leer y detener el mensaje tocado. */
  const alternarVoz = useCallback(
    (id: string, texto: string) => {
      if (hablandoId === id) detenerVoz();
      else hablar(id, texto);
    },
    [hablandoId, detenerVoz, hablar],
  );

  // ── Dictado por voz ───────────────────────────────────────────────────────
  const [escuchando, setEscuchando] = useState(false);

  useSpeechRecognitionEvent('result', (event) => {
    const transcripcion = event.results?.[0]?.transcript;
    if (transcripcion) setInput(transcripcion);
  });
  useSpeechRecognitionEvent('end', () => setEscuchando(false));
  useSpeechRecognitionEvent('error', () => {
    setEscuchando(false);
  });

  // Si se sale de la pantalla mientras dicta, cortar el micrófono.
  useEffect(() => () => {
    ExpoSpeechRecognitionModule.abort();
  }, []);

  const alternarDictado = useCallback(async () => {
    if (escuchando) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    const permiso = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert(
        'Permiso del micrófono',
        'Para dictar tu pregunta necesito permiso para usar el micrófono. Puedes activarlo en los ajustes del teléfono.',
      );
      return;
    }

    // Callar al lector: si está hablando, el micrófono se oiría a sí mismo.
    Speech.stop();
    setHablandoId(null);

    setEscuchando(true);
    ExpoSpeechRecognitionModule.start({
      lang: 'es-MX',
      interimResults: true, // el texto aparece mientras habla
      continuous: false, // se detiene solo al callar
    });
  }, [escuchando]);

  const alternarLecturaAuto = useCallback(() => {
    setLeerAuto((prev) => {
      const siguiente = !prev;
      AsyncStorage.setItem(LECTURA_KEY, siguiente ? 'on' : 'off').catch(() => {});
      if (!siguiente) {
        Speech.stop();
        setHablandoId(null);
      }
      return siguiente;
    });
  }, []);

  // Botón de encabezado para activar/desactivar la lectura automática
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={alternarLecturaAuto}
          style={styles.headerVoiceButton}
          accessibilityRole="button"
          accessibilityLabel={
            leerAuto ? 'Desactivar lectura en voz alta' : 'Activar lectura en voz alta'
          }
        >
          <MaterialIcons
            name={leerAuto ? 'volume-up' : 'volume-off'}
            size={28}
            color={leerAuto ? DS.colors.primary : DS.colors.subtle}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, leerAuto, alternarLecturaAuto]);

  useEffect(() => {
    if (!userId) return;
    AsyncStorage.getItem(`@myvita:ai_consent:${userId}`)
      .then((value) => setAiConsent(value === 'accepted'))
      .catch(() => setAiConsent(false));
  }, [userId]);

  const acceptAI = useCallback(async () => {
    await AsyncStorage.setItem(`@myvita:ai_consent:${userId}`, 'accepted');
    setAiConsent(true);
  }, [userId]);

  // Cargar historial persistido
  useEffect(() => {
    if (!userId) return;
    chatService.cargarHistorial(userId).then((history) => {
      setMessages(
        history.map((h, i) => ({
          id: `h_${i}`,
          role: h.role,
          content: h.content,
          hora: '',
        })),
      );
    });
  }, [userId]);

  const enviar = useCallback(
    async (texto: string) => {
      const mensaje = texto.trim();
      if (!mensaje || typing) return;

      setInput('');
      setMessages((prev) => [
        ...prev,
        { id: `u_${Date.now()}`, role: 'user', content: mensaje, hora: horaActual() },
      ]);
      setTyping(true);

      try {
        const respuesta = await chatService.enviarMensaje(userId, mensaje);
        const id = `a_${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          { id, role: 'assistant', content: respuesta, hora: horaActual() },
        ]);
        if (leerAuto) hablar(id, respuesta);
      } finally {
        setTyping(false);
      }
    },
    [userId, typing, leerAuto, hablar],
  );

  useEffect(() => {
    const t = setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    return () => clearTimeout(t);
  }, [messages, typing]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // Espacio que ocupa la barra flotante: el input se apoya justo encima.
  const tabBarClearance = useTabBarClearance();
  const bg = isDark ? DS.colors.surfaceDark : DS.colors.surface;
  const cardBg = isDark ? DS.colors.cardDark : DS.colors.card;
  const textColor = isDark ? DS.colors.textDark : DS.colors.text;

  // Glow decorativo pulsante detrás del avatar del asistente (puramente visual)
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.25 }],
    opacity: (1 - pulse.value) * 0.4,
  }));

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.rowUser : styles.rowAssistant]}>
        {!isUser && (
          <Image
            source={require('../../../assets/images/robot-assistant-badge.png')}
            style={styles.avatar}
          />
        )}
        {isUser ? (
          <LinearGradient
            colors={DS.sectionGradients.chat}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bubble, styles.bubbleUser]}
          >
            <Text style={styles.textUser}>{item.content}</Text>
            {!!item.hora && <Text style={styles.horaUser}>{item.hora}</Text>}
          </LinearGradient>
        ) : (
          <View style={[styles.bubble, styles.bubbleAssistant, { backgroundColor: cardBg }]}>
            <Text style={[styles.textAssistant, { color: textColor }]}>{item.content}</Text>
            <View style={styles.assistantFooter}>
              {!!item.hora && <Text style={styles.horaAssistant}>{item.hora}</Text>}
              <TouchableOpacity
                onPress={() => alternarVoz(item.id, item.content)}
                style={styles.voiceButton}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={
                  hablandoId === item.id ? 'Detener lectura' : 'Escuchar este mensaje'
                }
              >
                <MaterialIcons
                  name={hablandoId === item.id ? 'stop-circle' : 'volume-up'}
                  size={22}
                  color={hablandoId === item.id ? DS.colors.error : DS.colors.primary}
                />
                <Text style={styles.voiceButtonText}>
                  {hablandoId === item.id ? 'Detener' : 'Escuchar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScreenBackground isDark={isDark}>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={[styles.safetyBanner, { backgroundColor: isDark ? '#312f1f' : '#fff4df' }]}>
        <MaterialIcons name="info-outline" size={18} color={DS.colors.warning} />
        <Text style={[styles.safetyBannerText, { color: textColor }]}>Orientación general. No sustituye a un profesional ni debe usarse en emergencias.</Text>
      </View>

      {messages.length === 0 && !typing ? (
        <ScrollView contentContainerStyle={styles.welcomeContainer}>
          <SectionHero title="Pregunta con confianza" subtitle="Tu asistente está aquí para acompañarte." image={require('../../../assets/images/section-assistant.png')} isDark={isDark} />
          <Text style={[styles.welcomeSubtitle, { color: isDark ? DS.colors.mutedDark : DS.colors.muted }]}>
            Conozco tus medicamentos, tomas y adherencia. Pregúntame lo que necesites 💊
          </Text>
          <View style={styles.chipsContainer}>
            {SUGERENCIAS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, { backgroundColor: cardBg }]}
                onPress={() => enviar(s)}
              >
                <Text style={styles.chipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListFooterComponent={
            typing ? (
              <View style={[styles.messageRow, styles.rowAssistant]}>
                <Image
                  source={require('../../../assets/images/robot-assistant-badge.png')}
                  style={styles.avatar}
                />
                <View style={[styles.bubble, styles.bubbleAssistant, { backgroundColor: cardBg }]}>
                  <Text style={styles.typingText}>Escribiendo…</Text>
                </View>
              </View>
            ) : null
          }
        />
      )}

      <View
        style={[
          styles.inputBar,
          { backgroundColor: cardBg, paddingBottom: keyboardVisible ? 10 : tabBarClearance },
        ]}
      >
        <TextInput
          style={[styles.input, { color: textColor, backgroundColor: bg }]}
          placeholder={escuchando ? 'Escuchando… habla ahora' : 'Escribe tu pregunta…'}
          placeholderTextColor={escuchando ? DS.colors.error : DS.colors.subtle}
          value={input}
          onChangeText={setInput}
          editable={!typing && aiConsent === true}
          multiline
        />
        <TouchableOpacity
          onPress={alternarDictado}
          disabled={typing || aiConsent !== true}
          style={[
            styles.micButton,
            {
              backgroundColor: escuchando
                ? DS.colors.error
                : isDark
                  ? DS.colors.surfaceContainerDark
                  : DS.colors.surfaceContainer,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={escuchando ? 'Detener dictado' : 'Dictar pregunta por voz'}
        >
          <MaterialIcons
            name={escuchando ? 'stop' : 'mic'}
            size={24}
            color={escuchando ? '#fff' : DS.colors.primary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => enviar(input)}
          disabled={typing || !input.trim()}
          accessibilityLabel="Enviar mensaje"
        >
          <LinearGradient
            colors={
              typing || !input.trim()
                ? [DS.colors.gray[300], DS.colors.gray[400]]
                : DS.sectionGradients.chat
            }
            style={styles.sendButton}
          >
            <MaterialIcons name="send" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Modal visible={aiConsent === false} transparent animationType="fade" onRequestClose={() => navigation.navigate('DashboardTab')}>
        <View style={styles.consentOverlay}>
          <View style={[styles.consentCard, { backgroundColor: cardBg }]}>
            <View style={styles.consentIcon}>
              <MaterialIcons name="health-and-safety" size={34} color={DS.colors.primary} />
            </View>
            <Text style={[styles.consentTitle, { color: textColor }]}>Antes de usar el asistente</Text>
            <Text style={[styles.consentText, { color: isDark ? DS.colors.mutedDark : DS.colors.muted }]}>
              Para responder, MyVita puede enviar tu pregunta y el contexto necesario de medicamentos, adherencia y diario a su servicio de IA. Estos pueden ser datos sensibles de salud.
            </Text>
            <Text style={[styles.consentWarning, { color: textColor }]}>La respuesta puede equivocarse y no sustituye diagnóstico, receta ni atención médica.</Text>
            <TouchableOpacity style={styles.consentPrimary} onPress={acceptAI}>
              <Text style={styles.consentPrimaryText}>Entiendo y deseo continuar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.consentSecondary}
              onPress={() => navigation.navigate('Privacy')}
            >
              <Text style={styles.consentSecondaryText}>Ver aviso de privacidad</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.consentCancel} onPress={() => navigation.navigate('DashboardTab')}>
              <Text style={[styles.consentCancelText, { color: isDark ? DS.colors.mutedDark : DS.colors.muted }]}>No usar el asistente</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safetyBanner: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  safetyBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: DS.fonts.medium,
  },
  welcomeContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  welcomeIconWrap: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  welcomeIconGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: DS.colors.accent,
  },
  welcomeIcon: {
    width: 220,
    height: 220,
  },
  welcomeTitle: {
    fontSize: 22,
    fontFamily: DS.fonts.extrabold,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    fontFamily: DS.fonts.regular,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 23,
  },
  chipsContainer: {
    gap: 10,
    width: '100%',
  },
  chip: {
    borderRadius: DS.borderRadius.lg,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(0,96,150,0.3)',
    minHeight: 52,
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 16,
    fontFamily: DS.fonts.semibold,
    color: DS.colors.primary,
  },
  messagesList: {
    padding: 14,
    paddingBottom: 10,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 6,
    alignItems: 'flex-end',
    gap: 8,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  bubbleUser: {
    borderBottomRightRadius: 6,
  },
  bubbleAssistant: {
    borderBottomLeftRadius: 6,
    ...DS.shadows.sm,
  },
  textUser: {
    color: '#fff',
    fontSize: 17,
    fontFamily: DS.fonts.regular,
    lineHeight: 24,
  },
  textAssistant: {
    fontSize: 17,
    fontFamily: DS.fonts.regular,
    lineHeight: 24,
  },
  horaUser: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  horaAssistant: {
    color: DS.colors.subtle,
    fontSize: 12,
    marginTop: 4,
  },
  assistantFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 2,
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  voiceButtonText: {
    fontSize: 14,
    fontFamily: DS.fonts.semibold,
    color: DS.colors.primary,
  },
  headerVoiceButton: {
    marginRight: 16,
    padding: 4,
  },
  typingText: {
    fontSize: 16,
    color: DS.colors.muted,
    fontStyle: 'italic',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,96,150,0.08)',
  },
  input: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 13,
    maxHeight: 110,
    fontSize: 17,
    fontFamily: DS.fonts.regular,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consentOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  consentCard: {
    width: '100%',
    maxWidth: 430,
    borderRadius: DS.borderRadius.xl,
    padding: 22,
    alignItems: 'center',
    ...DS.shadows.lg,
  },
  consentIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: DS.statContainers.blue.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  consentTitle: {
    fontSize: 21,
    fontFamily: DS.fonts.extrabold,
    textAlign: 'center',
    marginBottom: 10,
  },
  consentText: {
    fontSize: 15,
    lineHeight: 23,
    fontFamily: DS.fonts.regular,
    textAlign: 'center',
    marginBottom: 12,
  },
  consentWarning: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: DS.fonts.semibold,
    textAlign: 'center',
    marginBottom: 18,
  },
  consentPrimary: {
    width: '100%',
    minHeight: 50,
    borderRadius: DS.borderRadius.lg,
    backgroundColor: DS.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  consentPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: DS.fonts.bold,
  },
  consentSecondary: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  consentSecondaryText: {
    color: DS.colors.primary,
    fontSize: 15,
    fontFamily: DS.fonts.semibold,
  },
  consentCancel: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consentCancelText: {
    fontSize: 14,
    fontFamily: DS.fonts.medium,
  },
});

export default ChatScreen;
