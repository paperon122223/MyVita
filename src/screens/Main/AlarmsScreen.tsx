import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSelector } from 'react-redux';
import { useAlarms } from '../../hooks/useAlarms';
import { useDarkMode } from '../../hooks/useDarkMode';
import { GradientButton } from '../../components/ui/GradientButton';
import { AdherenceRing } from '../../components/ui/AdherenceRing';
import systemAlarmService from '../../services/systemAlarmService';
import { DesignSystem as DS } from '../../theme/designSystem';
import { RootState, Alarma, FrecuenciaAlarma } from '../../types';
import { Switch } from 'react-native';
import { addLocalDays, localDateFromKey, localDateKey } from '../../utils/localDate';

const DIAS_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const DIAS_NOMBRES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function frecuenciaLabel(alarma: Alarma): string | null {
  if (!alarma.frecuencia || alarma.frecuencia === 'una_vez') return null;
  if (alarma.frecuencia === 'diaria') return 'Diaria';
  if (alarma.frecuencia === 'semanal' && alarma.diasSemana && alarma.diasSemana.length > 0) {
    return alarma.diasSemana.map((d) => DIAS_NOMBRES[d]).join(', ');
  }
  return 'Semanal';
}

function periodoDe(hora: string): string {
  const h = parseInt((hora || '0').split(':')[0], 10);
  if (h < 12) return 'MAÑANA';
  if (h < 19) return 'TARDE';
  return 'NOCHE';
}

function etiquetaFecha(fecha: string): string | null {
  const hoy = new Date();
  if (fecha === localDateKey(hoy)) return null;
  if (fecha === localDateKey(addLocalDays(hoy, 1))) return 'MAÑANA';
  return localDateFromKey(fecha)
    .toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
    .toUpperCase();
}

function AlarmsScreen() {
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const userId = currentUser?.id || '';
  const { isDark } = useDarkMode();
  const { alarms, loading, markTaken, silenceAlarm, createAlarm, deleteAlarm, deleteAlarmSeries } = useAlarms(userId);

  // Modal de nueva alarma
  const [modalVisible, setModalVisible] = useState(false);
  const [medName, setMedName] = useState('');
  const [dosis, setDosis] = useState('');
  const [hora, setHora] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [guardarEnReloj, setGuardarEnReloj] = useState(false);
  const [frecuencia, setFrecuencia] = useState<FrecuenciaAlarma>('una_vez');
  const [diasSemana, setDiasSemana] = useState<number[]>([]);

  const bg = isDark ? DS.colors.surfaceDark : DS.colors.surface;
  const cardBg = isDark ? DS.colors.cardDark : DS.colors.card;
  const textColor = isDark ? DS.colors.textDark : DS.colors.text;
  const mutedColor = isDark ? DS.colors.mutedDark : DS.colors.muted;

  const horaStr = `${String(hora.getHours()).padStart(2, '0')}:${String(hora.getMinutes()).padStart(2, '0')}`;

  const toggleDia = (dia: number) => {
    setDiasSemana((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia],
    );
  };

  const resetModal = () => {
    setMedName('');
    setDosis('');
    setHora(new Date());
    setFrecuencia('una_vez');
    setDiasSemana([]);
    setGuardarEnReloj(false);
  };

  const handleCreate = useCallback(async () => {
    if (!medName.trim()) {
      Alert.alert('Falta información', 'Escribe el nombre del medicamento');
      return;
    }
    if (frecuencia === 'semanal' && diasSemana.length === 0) {
      Alert.alert('Falta información', 'Selecciona al menos un día de la semana');
      return;
    }
    setSaving(true);
    try {
      await createAlarm(
        {
          medicamentoNombre: medName.trim(),
          dosis: dosis.trim() || undefined,
          horaToma: horaStr,
        },
        frecuencia,
        frecuencia === 'semanal' ? diasSemana : undefined,
      );

      let enReloj = false;
      if (guardarEnReloj) {
        const etiqueta = `💊 MyVita: ${medName.trim()}${dosis.trim() ? ' (' + dosis.trim() + ')' : ''}`;
        enReloj = await systemAlarmService.guardarEnReloj(horaStr, etiqueta);
      }

      setModalVisible(false);
      resetModal();
      if (guardarEnReloj && enReloj) {
        Alert.alert('Alarma creada ⏰', 'También quedó guardada en el reloj del teléfono.');
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo crear la alarma. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }, [medName, dosis, horaStr, frecuencia, diasSemana, guardarEnReloj, createAlarm]);

  const handleTake = useCallback(
    (alarm: Alarma) => {
      Alert.alert('Confirmar toma', `¿Tomaste ${alarm.medicamentoNombre}?`, [
        { text: 'Aún no' },
        {
          text: 'Sí, ya lo tomé',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            markTaken(alarm.id);
          },
        },
      ]);
    },
    [markTaken],
  );

  const handleDelete = useCallback(
    (alarm: Alarma) => {
      if (alarm.recurrenciaId) {
        Alert.alert('Eliminar alarma', '¿Qué deseas hacer?', [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Solo esta toma',
            onPress: () => deleteAlarm(alarm.id),
          },
          {
            text: 'Eliminar toda la serie',
            style: 'destructive',
            onPress: () => deleteAlarmSeries(alarm.recurrenciaId!),
          },
        ]);
      } else {
        Alert.alert('Eliminar alarma', `¿Eliminar la alarma de ${alarm.medicamentoNombre}?`, [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => deleteAlarm(alarm.id),
          },
        ]);
      }
    },
    [deleteAlarm, deleteAlarmSeries],
  );

  const renderAlarm = ({ item, index }: { item: Alarma; index: number }) => {
    const tomada = item.tomado === 1;
    const silenciada = item.recordatorioSilenciado === 1;
    const badge = frecuenciaLabel(item);
    const fechaBadge = etiquetaFecha(item.fecha);
    const esHoy = fechaBadge === null;

    // Color del acento/badge según estado
    const accent = tomada ? DS.colors.secondary : silenciada ? DS.colors.subtle : DS.colors.primary;
    const badgeBg = tomada
      ? DS.statContainers.green.bg
      : silenciada
        ? (isDark ? DS.colors.surfaceContainerDark : DS.colors.surfaceContainer)
        : DS.statContainers.blue.bg;

    return (
      <Animated.View
        entering={FadeInDown.delay(Math.min(index, 8) * 70).duration(400)}
        style={[styles.alarmCard, { backgroundColor: cardBg }, tomada && styles.alarmCardTaken]}
      >
        <View style={[styles.alarmAccent, { backgroundColor: accent }]} />

        {/* Fila superior: badge de hora + nombre + estado */}
        <View style={styles.alarmTop}>
          <View style={[styles.timeBadge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.timeText, { color: accent }]}>{item.hora}</Text>
            <Text style={[styles.periodText, { color: accent }]}>{periodoDe(item.hora)}</Text>
          </View>

          <View style={styles.alarmInfo}>
            <View style={styles.nameRow}>
              <Text
                style={[styles.alarmName, { color: textColor }, tomada && styles.alarmNameTaken]}
                numberOfLines={1}
              >
                {item.medicamentoNombre || 'Medicamento'}
              </Text>
              {tomada ? (
                <View style={[styles.statusChip, styles.chipTaken]}>
                  <MaterialIcons name="check-circle" size={13} color={DS.colors.secondary} />
                  <Text style={styles.chipTakenText}>Tomado</Text>
                </View>
              ) : silenciada ? (
                <View style={[styles.statusChip, styles.chipMuted]}>
                  <MaterialIcons name="notifications-off" size={13} color={DS.colors.subtle} />
                  <Text style={styles.chipMutedText}>Silenciado</Text>
                </View>
              ) : (
                <View style={[styles.statusChip, styles.chipPending]}>
                  <Text style={styles.chipPendingText}>Pendiente</Text>
                </View>
              )}
            </View>
            {!!item.dosis && (
              <Text style={[styles.alarmDosis, { color: mutedColor }]} numberOfLines={1}>
                {item.dosis}
              </Text>
            )}
            {!!fechaBadge && (
              <View style={styles.dateRow}>
                <MaterialIcons name="event" size={13} color={DS.colors.primary} />
                <Text style={styles.dateText}>{fechaBadge}</Text>
              </View>
            )}
            {!!badge && (
              <View style={styles.recurringRow}>
                <MaterialIcons name="repeat" size={13} color={DS.colors.primary} />
                <Text style={styles.recurringText}>{badge}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Fila de acciones: botón Tomar Medicina + silenciar + borrar */}
        {esHoy && !tomada && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.takeBtn, silenciada && styles.takeBtnMuted]}
              onPress={() => handleTake(item)}
              accessibilityLabel={`Marcar ${item.medicamentoNombre} como tomado`}
            >
              <MaterialIcons name="check-circle" size={20} color="#fff" />
              <Text style={styles.takeBtnText}>Tomar Medicina</Text>
            </TouchableOpacity>
            {!silenciada && (
              <TouchableOpacity
                style={[styles.iconBtn, { borderColor: isDark ? DS.colors.borderDark : DS.colors.border }]}
                onPress={() => silenceAlarm(item.id)}
                accessibilityLabel="Silenciar alarma"
              >
                <MaterialIcons name="notifications-off" size={20} color={DS.colors.muted} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.iconBtn, { borderColor: isDark ? DS.colors.borderDark : DS.colors.border }]}
              onPress={() => handleDelete(item)}
              accessibilityLabel="Eliminar alarma"
            >
              <MaterialIcons name="delete-outline" size={20} color={DS.colors.error} />
            </TouchableOpacity>
          </View>
        )}
        {(!esHoy || tomada) && (
          <TouchableOpacity
            style={styles.deleteOnlyRow}
            onPress={() => handleDelete(item)}
            accessibilityLabel="Eliminar alarma"
          >
            <MaterialIcons name="delete-outline" size={18} color={DS.colors.subtle} />
            <Text style={styles.deleteOnlyText}>Eliminar</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  // Progreso del día
  const hoy = localDateKey();
  const alarmasHoy = alarms.filter((a) => a.fecha === hoy);
  const totalHoy = alarmasHoy.length;
  const tomadasHoy = alarmasHoy.filter((a) => a.tomado === 1).length;
  const pctHoy = totalHoy > 0 ? Math.round((tomadasHoy / totalHoy) * 100) : 0;

  const ProgressHeader = () =>
    totalHoy > 0 ? (
      <View style={[styles.progressCard, { backgroundColor: isDark ? DS.colors.surfaceContainerDark : DS.colors.surfaceContainer }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.progressTitle, { color: DS.colors.primary }]}>Progreso Diario</Text>
          <Text style={[styles.progressSub, { color: textColor }]}>
            {tomadasHoy} de {totalHoy} tomas completadas
          </Text>
        </View>
        <AdherenceRing progress={pctHoy} size={64} strokeWidth={8} />
      </View>
    ) : null;

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={DS.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <FlatList
        data={alarms}
        renderItem={renderAlarm}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ProgressHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <LinearGradient colors={DS.statGradients.signature} style={styles.emptyIcon}>
              <MaterialIcons name="alarm-add" size={36} color="#fff" />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: textColor }]}>Sin alarmas hoy</Text>
            <Text style={[styles.emptyText, { color: mutedColor }]}>
              Crea tu primera alarma para no olvidar ninguna toma
            </Text>
          </View>
        }
      />

      {/* FAB con gradiente */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        accessibilityLabel="Crear nueva alarma"
      >
        <LinearGradient colors={DS.statGradients.signature} style={styles.fabGradient}>
          <MaterialIcons name="add" size={26} color="#fff" />
          <Text style={styles.fabText}>Nueva Alarma</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Modal crear alarma */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Nueva Alarma</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetModal(); }}>
                <MaterialIcons name="close" size={24} color={mutedColor} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>MEDICAMENTO</Text>
              <TextInput
                style={[styles.modalInput, { color: textColor, backgroundColor: bg, borderColor: isDark ? DS.colors.borderDark : DS.colors.border }]}
                placeholder="Ej. Paracetamol"
                placeholderTextColor={DS.colors.subtle}
                value={medName}
                onChangeText={setMedName}
              />

              <Text style={styles.fieldLabel}>DOSIS (OPCIONAL)</Text>
              <TextInput
                style={[styles.modalInput, { color: textColor, backgroundColor: bg, borderColor: isDark ? DS.colors.borderDark : DS.colors.border }]}
                placeholder="Ej. 500 mg, 1 tableta"
                placeholderTextColor={DS.colors.subtle}
                value={dosis}
                onChangeText={setDosis}
              />

              <Text style={styles.fieldLabel}>HORA DE LA TOMA</Text>
              <TouchableOpacity
                style={[styles.timeSelector, { backgroundColor: bg, borderColor: isDark ? DS.colors.borderDark : DS.colors.border }]}
                onPress={() => setShowTimePicker(true)}
              >
                <MaterialIcons name="access-time" size={20} color={DS.colors.primary} />
                <Text style={styles.timeSelectorText}>{horaStr}</Text>
              </TouchableOpacity>

              {showTimePicker && (
                <DateTimePicker
                  value={hora}
                  mode="time"
                  is24Hour
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_event, selected) => {
                    setShowTimePicker(Platform.OS === 'ios');
                    if (selected) setHora(selected);
                  }}
                />
              )}

              {/* Selector de frecuencia */}
              <Text style={styles.fieldLabel}>FRECUENCIA</Text>
              <View style={styles.frecuenciaRow}>
                {(['una_vez', 'diaria', 'semanal'] as FrecuenciaAlarma[]).map((f) => {
                  const labels: Record<FrecuenciaAlarma, string> = {
                    una_vez: 'Una vez',
                    diaria: 'Diaria',
                    semanal: 'Semanal',
                  };
                  const selected = frecuencia === f;
                  return (
                    <TouchableOpacity
                      key={f}
                      style={[
                        styles.frecuenciaBtn,
                        selected && styles.frecuenciaBtnActive,
                        { borderColor: selected ? DS.colors.primary : (isDark ? DS.colors.borderDark : DS.colors.border) },
                      ]}
                      onPress={() => setFrecuencia(f)}
                    >
                      <Text
                        style={[
                          styles.frecuenciaBtnText,
                          { color: selected ? DS.colors.primary : mutedColor },
                        ]}
                      >
                        {labels[f]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Chips de días — solo visible en 'semanal' */}
              {frecuencia === 'semanal' && (
                <>
                  <Text style={[styles.fieldLabel, { marginTop: 14 }]}>DÍAS DE LA SEMANA</Text>
                  <View style={styles.diasRow}>
                    {DIAS_LABELS.map((label, i) => {
                      const active = diasSemana.includes(i);
                      return (
                        <TouchableOpacity
                          key={i}
                          style={[
                            styles.diaChip,
                            active && styles.diaChipActive,
                          ]}
                          onPress={() => toggleDia(i)}
                        >
                          <Text style={[styles.diaChipText, active && styles.diaChipTextActive]}>
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              <View style={styles.clockRow}>
                <View style={styles.clockRowLeft}>
                  <MaterialIcons name="alarm-on" size={20} color={DS.colors.primary} />
                  <View style={styles.clockRowText}>
                    <Text style={[styles.clockRowTitle, { color: textColor }]}>
                      Crear respaldo adicional en Reloj
                    </Text>
                    <Text style={styles.clockRowHint}>
                      Opcional: sonará además de la alerta de MyVita
                    </Text>
                  </View>
                </View>
                <Switch
                  value={guardarEnReloj}
                  onValueChange={setGuardarEnReloj}
                  trackColor={{ true: DS.colors.secondary }}
                />
              </View>

              <GradientButton
                label={saving ? 'Guardando…' : 'Crear Alarma'}
                onPress={handleCreate}
                loading={saving}
                style={styles.modalButton}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 96,
    flexGrow: 1,
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: DS.borderRadius.xl,
    padding: 18,
    marginBottom: 16,
    gap: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontFamily: DS.fonts.bold,
    marginBottom: 2,
  },
  progressSub: {
    fontSize: 15,
    fontFamily: DS.fonts.medium,
  },
  alarmCard: {
    borderRadius: DS.borderRadius.xl,
    padding: 16,
    paddingLeft: 20,
    marginBottom: 14,
    overflow: 'hidden',
    ...DS.shadows.sm,
  },
  alarmCardTaken: {
    opacity: 0.7,
  },
  alarmAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  alarmTop: {
    flexDirection: 'row',
    gap: 14,
  },
  timeBadge: {
    borderRadius: DS.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 19,
    fontFamily: DS.fonts.extrabold,
  },
  periodText: {
    fontSize: 10,
    fontFamily: DS.fonts.bold,
    letterSpacing: 0.8,
    marginTop: 1,
  },
  alarmInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  alarmName: {
    fontSize: 20,
    fontFamily: DS.fonts.bold,
  },
  alarmNameTaken: {
    textDecorationLine: 'line-through',
  },
  alarmDosis: {
    fontSize: 15,
    fontFamily: DS.fonts.regular,
    marginTop: 3,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  dateText: {
    fontSize: 13,
    fontFamily: DS.fonts.bold,
    color: DS.colors.primary,
  },
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  recurringText: {
    fontSize: 13,
    fontFamily: DS.fonts.semibold,
    color: DS.colors.primary,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipTaken: {
    backgroundColor: DS.statContainers.green.bg,
  },
  chipTakenText: {
    fontSize: 13,
    fontFamily: DS.fonts.bold,
    color: DS.colors.secondary,
  },
  chipPending: {
    backgroundColor: DS.statContainers.orange.bg,
  },
  chipPendingText: {
    fontSize: 13,
    fontFamily: DS.fonts.bold,
    color: DS.colors.warning,
  },
  chipMuted: {
    backgroundColor: DS.colors.surfaceContainer,
  },
  chipMutedText: {
    fontSize: 13,
    fontFamily: DS.fonts.bold,
    color: DS.colors.subtle,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  takeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: DS.borderRadius.lg,
    backgroundColor: DS.colors.secondary,
  },
  takeBtnMuted: {
    backgroundColor: DS.colors.secondaryLight,
  },
  takeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: DS.fonts.bold,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: DS.borderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 4,
  },
  deleteOnlyText: {
    fontSize: 14,
    fontFamily: DS.fonts.semibold,
    color: DS.colors.subtle,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...DS.shadows.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: DS.fonts.bold,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
  },
  fabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 20,
    ...DS.shadows.lg,
  },
  fabText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: DS.fonts.bold,
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
    maxHeight: '90%',
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
    fontSize: 11,
    fontFamily: DS.fonts.bold,
    color: DS.colors.muted,
    letterSpacing: 0.6,
    marginBottom: 7,
  },
  modalInput: {
    borderRadius: DS.borderRadius.md,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 14,
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: DS.borderRadius.md,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 18,
  },
  timeSelectorText: {
    fontSize: 17,
    fontFamily: DS.fonts.extrabold,
    color: DS.colors.primary,
  },
  frecuenciaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  frecuenciaBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: DS.borderRadius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  frecuenciaBtnActive: {
    backgroundColor: 'rgba(2,136,209,0.08)',
  },
  frecuenciaBtnText: {
    fontSize: 12,
    fontFamily: DS.fonts.bold,
  },
  diasRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  diaChip: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(156,163,175,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaChipActive: {
    backgroundColor: DS.colors.primary,
  },
  diaChipText: {
    fontSize: 12,
    fontFamily: DS.fonts.bold,
    color: DS.colors.muted,
  },
  diaChipTextActive: {
    color: '#fff',
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    marginTop: 14,
    paddingVertical: 4,
  },
  clockRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  clockRowText: {
    flex: 1,
  },
  clockRowTitle: {
    fontSize: 13,
    fontFamily: DS.fonts.bold,
  },
  clockRowHint: {
    fontSize: 11,
    color: DS.colors.subtle,
    marginTop: 1,
  },
  modalButton: {
    marginTop: 4,
  },
});

export default AlarmsScreen;
