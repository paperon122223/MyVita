import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import { useAlarms } from '../../hooks/useAlarms';
import { useDarkMode } from '../../hooks/useDarkMode';
import databaseService from '../../services/database';
import { StatCard } from '../../components/ui/StatCard';
import { AdherenceRing } from '../../components/ui/AdherenceRing';
import { DesignSystem as DS } from '../../theme/designSystem';
import { RootState } from '../../types';
import dayjs from 'dayjs';

function saludoPorHora(nombre: string): { titulo: string; frase: string } {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) {
    return { titulo: `¡Buenos días, ${nombre}!`, frase: 'Cada paso cuenta para tu bienestar. ¡Sigue así!' };
  }
  if (hora >= 12 && hora < 19) {
    return { titulo: `¡Buenas tardes, ${nombre}!`, frase: 'Vas muy bien hoy, sigue cuidándote.' };
  }
  return { titulo: `¡Buenas noches, ${nombre}!`, frase: 'Descansa, mañana será un gran día.' };
}

function calificaAdherencia(p: number): string {
  if (p >= 90) return 'Excelente';
  if (p >= 70) return 'Muy bien';
  if (p >= 50) return 'Regular';
  return 'Mejorable';
}

function DashboardScreen({ navigation }: any) {
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const { isDark } = useDarkMode();
  const userId = currentUser?.id || '';
  const { alarms, statistics, loading, refreshAlarms, markTaken } = useAlarms(userId);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeMeds, setActiveMeds] = useState(0);
  const [racha, setRacha] = useState(0);

  const loadExtraStats = useCallback(async () => {
    if (!userId) return;
    const results = await Promise.allSettled([
      databaseService.getMedicamentosActivos(userId),
      databaseService.getRachaDias(userId),
    ]);
    if (results[0].status === 'fulfilled') setActiveMeds(results[0].value);
    if (results[1].status === 'fulfilled') setRacha(results[1].value);
  }, [userId]);

  useEffect(() => {
    loadExtraStats();
  }, [loadExtraStats]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.allSettled([refreshAlarms(), loadExtraStats()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshAlarms, loadExtraStats]);

  const saludo = saludoPorHora(currentUser?.nombre?.split(' ')[0] || 'Usuario');
  const proximasAlarmas = alarms.filter((a) => a.tomado !== 1).slice(0, 3);

  const bg = isDark ? DS.colors.surfaceDark : DS.colors.surface;
  const cardBg = isDark ? DS.colors.cardDark : DS.colors.card;
  const textColor = isDark ? DS.colors.textDark : DS.colors.text;
  const mutedColor = isDark ? DS.colors.mutedDark : DS.colors.muted;
  const borderColor = isDark ? DS.colors.borderDark : DS.colors.border;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bg }]}
      refreshControl={<RefreshControl refreshing={isRefreshing || loading} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {/* Tarjeta de bienvenida con gradiente + anillo de adherencia */}
      <Animated.View entering={FadeInUp.duration(500)}>
        <LinearGradient
          colors={DS.statGradients.signature}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.welcomeCard}
        >
          <View style={styles.welcomeText}>
            <Text style={styles.welcomeTitle}>{saludo.titulo}</Text>
            <Text style={styles.welcomeQuote}>"{saludo.frase}"</Text>
          </View>
          <AdherenceRing progress={statistics.adherencia} onGradient size={108} sublabel="META" />
        </LinearGradient>
      </Animated.View>

      {/* Estadísticas 2x2 con tiles suaves */}
      <Animated.View entering={FadeInDown.delay(120).duration(500)} style={styles.statsGrid}>
        <StatCard
          icon="insights"
          label="Adherencia"
          value={calificaAdherencia(statistics.adherencia)}
          variant="blue"
          dark={isDark}
        />
        <StatCard
          icon="medication"
          label="Medicinas"
          value={`${activeMeds} activas`}
          variant="green"
          dark={isDark}
        />
        <StatCard
          icon="pending-actions"
          label="Pendientes"
          value={statistics.pendientes === 1 ? '1 ahora' : `${statistics.pendientes} ahora`}
          variant="orange"
          dark={isDark}
        />
        <StatCard
          icon="local-fire-department"
          label="Racha"
          value={`${racha} día${racha === 1 ? '' : 's'}`}
          variant="red"
          dark={isDark}
        />
      </Animated.View>

      {/* Próximas tomas */}
      <Animated.View entering={FadeInDown.delay(220).duration(500)}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: textColor }]}>Próximas tomas</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AlarmsTab')}>
            <Text style={styles.sectionLink}>Ver todo</Text>
          </TouchableOpacity>
        </View>

        {proximasAlarmas.length > 0 ? (
          proximasAlarmas.map((alarm, i) => (
            <View key={alarm.id} style={[styles.tomaCard, { backgroundColor: cardBg }]}>
              <View
                style={[
                  styles.tomaAccent,
                  { backgroundColor: i === 0 ? DS.colors.primary : DS.colors.warning },
                ]}
              />
              <View style={[styles.tomaTimeBox, { backgroundColor: isDark ? DS.colors.surfaceContainerDark : DS.colors.surfaceContainer }]}>
                <Text style={styles.tomaTimeText}>{alarm.hora}</Text>
              </View>
              <View style={styles.tomaInfo}>
                <Text style={[styles.tomaName, { color: textColor }]} numberOfLines={1}>
                  {alarm.medicamentoNombre || 'Medicamento'}
                </Text>
                {!!alarm.dosis && (
                  <Text style={[styles.tomaDosis, { color: mutedColor }]} numberOfLines={1}>
                    {alarm.dosis}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.tomaCheck}
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                  markTaken(alarm.id);
                }}
                accessibilityLabel={`Marcar ${alarm.medicamentoNombre} como tomado`}
              >
                <MaterialIcons name="check" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={[styles.emptyState, { backgroundColor: cardBg }]}>
            <MaterialIcons name="celebration" size={40} color={DS.colors.secondary} />
            <Text style={[styles.emptyText, { color: mutedColor }]}>
              {alarms.length > 0 ? '¡Todo tomado por hoy!' : 'Sin alarmas para hoy'}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Accesos rápidos */}
      <Animated.View entering={FadeInDown.delay(320).duration(500)}>
        <Text style={[styles.sectionLabel, { color: textColor, marginBottom: 12, marginTop: 8 }]}>
          Accesos rápidos
        </Text>
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={styles.quickCardWrap}
            onPress={() => navigation.navigate('MoreTab', { screen: 'Chat' })}
          >
            <LinearGradient colors={DS.statGradients.signature} style={styles.quickCardFilled}>
              <MaterialIcons name="smart-toy" size={30} color="#fff" />
              <Text style={styles.quickLabelFilled}>Asistente IA</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCardWrap, styles.quickCardOutline, { backgroundColor: cardBg, borderColor }]}
            onPress={() => navigation.navigate('MoreTab', { screen: 'Diary' })}
          >
            <MaterialIcons name="book" size={30} color={DS.colors.primary} />
            <Text style={[styles.quickLabel, { color: textColor }]}>Mi Diario</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCardWrap, styles.quickCardOutline, { backgroundColor: cardBg, borderColor }]}
            onPress={() => navigation.navigate('SOSTab')}
          >
            <MaterialIcons name="sos" size={30} color={DS.colors.error} />
            <Text style={[styles.quickLabel, { color: textColor }]}>Emergencia</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: DS.borderRadius.xl,
    padding: 22,
    marginBottom: 16,
    ...DS.shadows.lg,
  },
  welcomeText: {
    flex: 1,
    paddingRight: 12,
  },
  welcomeTitle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: DS.fonts.extrabold,
    marginBottom: 8,
  },
  welcomeQuote: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 16,
    fontFamily: DS.fonts.medium,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 20,
    fontFamily: DS.fonts.bold,
  },
  sectionLink: {
    fontSize: 16,
    fontFamily: DS.fonts.semibold,
    color: DS.colors.primary,
  },
  tomaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: DS.borderRadius.lg,
    padding: 12,
    paddingLeft: 18,
    marginBottom: 12,
    overflow: 'hidden',
    ...DS.shadows.sm,
  },
  tomaAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  tomaTimeBox: {
    borderRadius: DS.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 14,
    alignItems: 'center',
    minWidth: 64,
  },
  tomaTimeText: {
    fontSize: 18,
    fontFamily: DS.fonts.extrabold,
    color: DS.colors.primary,
  },
  tomaInfo: {
    flex: 1,
  },
  tomaName: {
    fontSize: 18,
    fontFamily: DS.fonts.bold,
  },
  tomaDosis: {
    fontSize: 15,
    fontFamily: DS.fonts.regular,
    marginTop: 2,
  },
  tomaCheck: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: DS.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
    borderRadius: DS.borderRadius.lg,
    gap: 10,
    ...DS.shadows.sm,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: DS.fonts.medium,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickCardWrap: {
    flex: 1,
    height: 120,
    borderRadius: DS.borderRadius.xl,
  },
  quickCardFilled: {
    flex: 1,
    borderRadius: DS.borderRadius.xl,
    padding: 16,
    justifyContent: 'space-between',
    ...DS.shadows.md,
  },
  quickCardOutline: {
    borderWidth: 1.5,
    padding: 16,
    justifyContent: 'space-between',
    ...DS.shadows.sm,
  },
  quickLabelFilled: {
    color: '#fff',
    fontSize: 16,
    fontFamily: DS.fonts.bold,
  },
  quickLabel: {
    fontSize: 16,
    fontFamily: DS.fonts.bold,
  },
});

export default DashboardScreen;
