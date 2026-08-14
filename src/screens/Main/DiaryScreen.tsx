import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import databaseService from '../../services/database';
import { useDarkMode } from '../../hooks/useDarkMode';
import { GradientButton } from '../../components/ui/GradientButton';
import { ScreenBackground } from '../../components/ui/ScreenBackground';
import { FloatingIcon } from '../../components/ui/FloatingIcon';
import { DesignSystem as DS } from '../../theme/designSystem';
import { RootState } from '../../types';
import dayjs from 'dayjs';

const MOODS = [
  { value: 'muy_mal', emoji: '😢', label: 'Muy mal', image: require('../../../assets/images/mood-muy-mal.png') },
  { value: 'mal', emoji: '😞', label: 'Mal', image: require('../../../assets/images/mood-mal.png') },
  { value: 'normal', emoji: '😐', label: 'Regular', image: require('../../../assets/images/mood-regular.png') },
  { value: 'bien', emoji: '🙂', label: 'Bien', image: require('../../../assets/images/mood-bien.png') },
  { value: 'muy_bien', emoji: '😄', label: 'Genial', image: require('../../../assets/images/mood-genial.png') },
];

function etiquetaFecha(fecha: string): string {
  const d = dayjs(fecha);
  const hoy = dayjs();
  if (d.isSame(hoy, 'day')) return 'Hoy';
  if (d.isSame(hoy.subtract(1, 'day'), 'day')) return 'Ayer';
  return d.format('dddd');
}

function DiaryScreen() {
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const userId = currentUser?.id || '';
  const { isDark } = useDarkMode();
  const [sintomas, setSintomas] = useState('');
  const [contenido, setContenido] = useState('');
  const [mood, setMood] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [entradas, setEntradas] = useState<any[]>([]);

  const cardBg = isDark ? DS.colors.cardDark : DS.colors.card;
  const fieldBg = isDark ? DS.colors.surfaceContainerDark : DS.colors.surfaceContainerLow;
  const textColor = isDark ? DS.colors.textDark : DS.colors.text;
  const mutedColor = isDark ? DS.colors.mutedDark : DS.colors.muted;
  const borderColor = isDark ? DS.colors.borderDark : DS.colors.border;

  const cargarEntradas = useCallback(async () => {
    if (!userId) return;
    try {
      const rows = await databaseService.getDiarioReciente(userId, 10);
      setEntradas(rows);
    } catch (e) {
      console.warn('Error cargando diario:', e);
    }
  }, [userId]);

  useEffect(() => {
    cargarEntradas();
  }, [cargarEntradas]);

  const handleSave = useCallback(async () => {
    if (!contenido.trim() && !sintomas.trim()) {
      Alert.alert('Entrada vacía', 'Escribe cómo te sientes o tus síntomas');
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await databaseService.ejecutar(
        `INSERT INTO diario_entradas (id, usuario_id, fecha, contenido, sintomas, emocion, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `diario_${Date.now()}`,
          userId,
          dayjs().format('YYYY-MM-DD'),
          contenido.trim() || null,
          sintomas.trim() || null,
          mood,
          now,
          now,
        ],
      );
      setSintomas('');
      setContenido('');
      setMood(null);
      await cargarEntradas();
      Alert.alert('Guardado', 'Tu entrada del diario fue guardada ✅');
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar la entrada.');
    } finally {
      setSaving(false);
    }
  }, [contenido, sintomas, mood, userId, cargarEntradas]);

  const emojiDe = (emocion: string | null) =>
    MOODS.find((m) => m.value === emocion)?.emoji ?? '📝';
  const labelDe = (emocion: string | null) =>
    MOODS.find((m) => m.value === emocion)?.label ?? 'Nota';

  return (
    <ScreenBackground isDark={isDark}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.screenTitle, { color: textColor }]}>Mi Diario</Text>
          <Text style={[styles.screenSubtitle, { color: mutedColor }]}>
            Registra cómo te sientes para llevar un mejor control de tu salud.
          </Text>
        </View>
        <View style={[styles.dateBadge, { backgroundColor: cardBg, borderColor }]}>
          <MaterialIcons name="calendar-today" size={14} color={DS.colors.primary} />
          <Text style={[styles.dateBadgeText, { color: textColor }]}>
            {dayjs().format('D MMM')}
          </Text>
        </View>
      </View>

      {/* Estado de ánimo */}
      <LinearGradient
        colors={isDark ? ['#0B1730', '#2A1608'] : [cardBg, cardBg]}
        style={styles.card}
      >
        <Text style={[styles.cardTitle, { color: textColor }]}>¿Cómo te sientes hoy?</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.moodsRow}
        >
          {MOODS.map((m, i) => {
            const active = mood === m.value;
            return (
              <TouchableOpacity
                key={m.value}
                style={[styles.moodButton, active && styles.moodButtonActive]}
                onPress={() => setMood(m.value)}
                accessibilityLabel={m.label}
              >
                <FloatingIcon source={m.image} style={styles.moodImage} delay={i * 180} />
                <Text style={[styles.moodLabel, { color: active ? DS.colors.primary : mutedColor }]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </LinearGradient>

      {/* Síntomas */}
      <Text style={[styles.sectionLabel, { color: textColor }]}>Síntomas</Text>
      <View style={[styles.inputWrapper, { backgroundColor: cardBg, borderColor }]}>
        <MaterialIcons name="medical-services" size={22} color={DS.colors.subtle} />
        <TextInput
          style={[styles.input, { color: textColor }]}
          placeholder="Dolor de cabeza, fatiga…"
          placeholderTextColor={DS.colors.subtle}
          value={sintomas}
          onChangeText={setSintomas}
          editable={!saving}
        />
      </View>

      {/* Notas */}
      <Text style={[styles.sectionLabel, { color: textColor }]}>Notas</Text>
      <View style={[styles.textareaWrapper, { backgroundColor: cardBg, borderColor }]}>
        <TextInput
          style={[styles.textarea, { color: textColor }]}
          placeholder="Escribe algo sobre tu día…"
          placeholderTextColor={DS.colors.subtle}
          value={contenido}
          onChangeText={setContenido}
          multiline
          textAlignVertical="top"
          editable={!saving}
        />
      </View>

      <GradientButton
        label={saving ? 'Guardando…' : 'Guardar'}
        icon="save"
        onPress={handleSave}
        loading={saving}
        style={styles.saveBtn}
        gradientColors={['#FACC15', '#F97316']}
      />

      {/* Entradas recientes */}
      {entradas.length > 0 && (
        <>
          <View style={styles.recentHeader}>
            <Text style={[styles.recentTitle, { color: textColor }]}>Entradas recientes</Text>
          </View>
          {entradas.map((e) => {
            const accent =
              e.emocion === 'muy_bien' || e.emocion === 'bien'
                ? DS.colors.secondary
                : e.emocion === 'normal'
                  ? DS.colors.primary
                  : DS.colors.warning;
            return (
              <View key={e.id} style={[styles.entryCard, { backgroundColor: cardBg }]}>
                <View style={[styles.entryAccent, { backgroundColor: accent }]} />
                <Text style={styles.entryEmoji}>{emojiDe(e.emocion)}</Text>
                <View style={styles.entryInfo}>
                  <Text style={[styles.entryDay, { color: mutedColor }]}>{etiquetaFecha(e.fecha)}</Text>
                  <Text style={[styles.entryMood, { color: textColor }]} numberOfLines={1}>
                    {labelDe(e.emocion)}
                  </Text>
                  <Text style={[styles.entryNote, { color: mutedColor }]} numberOfLines={1}>
                    {e.sintomas || e.contenido || ''}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={DS.colors.subtle} />
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 150,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: DS.borderRadius.md,
    borderWidth: 1,
    marginTop: 2,
  },
  dateBadgeText: {
    fontSize: 13,
    fontFamily: DS.fonts.semibold,
    textTransform: 'capitalize',
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: DS.fonts.extrabold,
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 16,
    fontFamily: DS.fonts.regular,
    lineHeight: 22,
    marginBottom: 20,
  },
  card: {
    borderRadius: DS.borderRadius.xl,
    padding: 18,
    marginBottom: 20,
    ...DS.shadows.sm,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: DS.fonts.bold,
    textAlign: 'center',
    marginBottom: 16,
  },
  moodsRow: {
    flexGrow: 1,
    gap: 6,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  moodButton: {
    alignItems: 'center',
    gap: 6,
    borderRadius: DS.borderRadius.full,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 98,
  },
  moodButtonActive: {
    borderColor: DS.colors.primary,
    backgroundColor: DS.statContainers.blue.bg,
  },
  moodImage: {
    width: 98,
    height: 98,
  },
  moodLabel: {
    fontSize: 14,
    fontFamily: DS.fonts.semibold,
  },
  sectionLabel: {
    fontSize: 18,
    fontFamily: DS.fonts.bold,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: DS.borderRadius.lg,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    minHeight: 56,
    marginBottom: 18,
    ...DS.shadows.sm,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontFamily: DS.fonts.regular,
    paddingVertical: 12,
  },
  textareaWrapper: {
    borderRadius: DS.borderRadius.lg,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 20,
    minHeight: 120,
    ...DS.shadows.sm,
  },
  textarea: {
    fontSize: 18,
    fontFamily: DS.fonts.regular,
    minHeight: 92,
  },
  saveBtn: {
    marginBottom: 24,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 20,
    fontFamily: DS.fonts.bold,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: DS.borderRadius.lg,
    padding: 14,
    paddingLeft: 18,
    marginBottom: 12,
    gap: 12,
    overflow: 'hidden',
    ...DS.shadows.sm,
  },
  entryAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  entryEmoji: {
    fontSize: 30,
  },
  entryInfo: {
    flex: 1,
  },
  entryDay: {
    fontSize: 13,
    fontFamily: DS.fonts.semibold,
    textTransform: 'capitalize',
  },
  entryMood: {
    fontSize: 17,
    fontFamily: DS.fonts.bold,
  },
  entryNote: {
    fontSize: 14,
    fontFamily: DS.fonts.regular,
    marginTop: 1,
  },
});

export default DiaryScreen;
