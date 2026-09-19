import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer } from 'expo-audio';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useAlarms } from '../../hooks/useAlarms';
import { useDarkMode } from '../../hooks/useDarkMode';
import databaseService from '../../services/database';
import { StatCard } from '../../components/ui/StatCard';
import { AdherenceRing } from '../../components/ui/AdherenceRing';
import { ScreenBackground } from '../../components/ui/ScreenBackground';
import { FloatingIcon } from '../../components/ui/FloatingIcon';
import { DesignSystem as DS } from '../../theme/designSystem';
import { RootState } from '../../types';
import dayjs from 'dayjs';

function saludoPorHora(nombre: string): { titulo: string; frase: string; esNoche: boolean } {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) {
    return { titulo: `¡Buenos días, ${nombre}!`, frase: 'Cada paso cuenta para tu bienestar. ¡Sigue así!', esNoche: false };
  }
  if (hora >= 12 && hora < 19) {
    return { titulo: `¡Buenas tardes, ${nombre}!`, frase: 'Vas muy bien hoy, sigue cuidándote.', esNoche: false };
  }
  return { titulo: `¡Buenas noches, ${nombre}!`, frase: 'Descansa, mañana será un gran día.', esNoche: true };
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
  const [porAgotarse, setPorAgotarse] = useState<any[]>([]);
  const robotAudioPlayer = useAudioPlayer(require('../../../assets/audio/robot-tutorial.mp3'));
  const pulseProgress = useSharedValue(0);

  useEffect(() => {
    pulseProgress.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
  }, [pulseProgress]);

  const pulseRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulseProgress.value * 0.7 }],
    opacity: 0.5 * (1 - pulseProgress.value),
  }));

  const handleRobotPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (robotAudioPlayer.playing) {
      robotAudioPlayer.pause();
    } else {
      robotAudioPlayer.play();
    }
  }, [robotAudioPlayer]);

  const loadExtraStats = useCallback(async () => {
    if (!userId) return;
    const results = await Promise.allSettled([
      databaseService.getMedicamentosActivos(userId),
      databaseService.getRachaDias(userId),
      databaseService.getMedicamentosPorAgotarse(userId),
    ]);
    if (results[0].status === 'fulfilled') setActiveMeds(results[0].value);
    if (results[1].status === 'fulfilled') setRacha(results[1].value);
    if (results[2].status === 'fulfilled') setPorAgotarse(results[2].value);
  }, [userId]);

  // Al volver de Medicinas las existencias pueden haber cambiado: recargar
  // al enfocar la pantalla y no solo al montarla.
  useFocusEffect(
    useCallback(() => {
      loadExtraStats();
    }, [loadExtraStats]),
  );

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

  const cardBg = isDark ? DS.colors.cardDark : DS.colors.card;
  const textColor = isDark ? DS.colors.textDark : DS.colors.text;
  const mutedColor = isDark ? DS.colors.mutedDark : DS.colors.muted;
  const borderColor = isDark ? DS.colors.borderDark : DS.colors.border;

  return (
    <ScreenBackground isDark={isDark}>
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isRefreshing || loading} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {/* Aviso de medicamentos por agotarse: va primero porque requiere una
          acción fuera de la app (ir a comprar) y es fácil que se pase por alto. */}
      {porAgotarse.length > 0 && (
        <Animated.View entering={FadeInUp.duration(400)}>
          <TouchableOpacity
            style={[styles.stockAlert, { backgroundColor: isDark ? 'rgba(229,57,53,0.14)' : '#FBDEDC' }]}
            onPress={() => navigation.navigate('MedicationsTab')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Ver medicamentos por agotarse"
          >
            <MaterialIcons name="error-outline" size={26} color={DS.colors.error} />
            <View style={styles.stockAlertText}>
              <Text style={[styles.stockAlertTitle, { color: DS.colors.error }]}>
                {porAgotarse.length === 1
                  ? 'Un medicamento por agotarse'
                  : `${porAgotarse.length} medicamentos por agotarse`}
              </Text>
              <Text style={[styles.stockAlertBody, { color: textColor }]} numberOfLines={2}>
                {porAgotarse
                  .map((m) => `${m.nombre} (${m.cantidad === 0 ? 'agotado' : `quedan ${m.cantidad}`})`)
                  .join(' · ')}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={DS.colors.error} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Tarjeta de bienvenida: saludo + meta diaria juntos */}
      <Animated.View entering={FadeInUp.duration(500)}>
        <LinearGradient
          colors={DS.statGradients.signature}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.welcomeCard}
        >
          <View style={styles.welcomeText}>
            <MaterialIcons
              name={saludo.esNoche ? 'bedtime' : 'wb-sunny'}
              size={20}
              color="rgba(255,255,255,0.4)"
              style={styles.skyIcon}
            />
            <Text style={styles.welcomeTitle}>{saludo.titulo}</Text>
            <Text style={styles.welcomeQuote}>"{saludo.frase}"</Text>
          </View>
          <View style={styles.metaWrap}>
            <Image
              source={require('../../../assets/images/meta-heart-bg.png')}
              style={styles.metaHeartBg}
              resizeMode="contain"
            />
            <AdherenceRing progress={statistics.adherencia} onGradient isDark={isDark} size={78} sublabel="META" />
            <Text style={styles.metaLabelInline}>Tu meta diaria</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Robot del asistente a la izquierda, estadísticas a la derecha */}
      <Animated.View entering={FadeInDown.delay(120).duration(500)} style={styles.robotStatsRow}>
        <TouchableOpacity
          style={styles.robotWrap}
          activeOpacity={0.8}
          onPress={handleRobotPress}
          accessibilityLabel="Escuchar tutorial del asistente"
        >
          <Image
            source={require('../../../assets/images/robot-dashboard.png')}
            style={styles.robotImage}
            resizeMode="contain"
          />
          <View style={styles.robotBadgeWrap} pointerEvents="none">
            <Animated.View style={[styles.robotBadgePulse, pulseRingStyle]} />
            <LinearGradient
              colors={DS.statGradients.signature}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.robotBadge}
            >
              <MaterialIcons
                name={robotAudioPlayer.playing ? 'pause' : 'volume-up'}
                size={14}
                color="#fff"
              />
            </LinearGradient>
          </View>
        </TouchableOpacity>

        <View style={styles.statsColumn}>
          <StatCard
            horizontal
            icon="insights"
            image={require('../../../assets/images/icon-adherencia.png')}
            label="Adherencia"
            value={calificaAdherencia(statistics.adherencia)}
            variant="blue"
            dark={isDark}
          />
          <StatCard
            horizontal
            icon="medication"
            image={require('../../../assets/images/icon-medicinas.png')}
            label="Medicinas"
            value={`${activeMeds} activas`}
            variant="green"
            dark={isDark}
          />
          <StatCard
            horizontal
            icon="pending-actions"
            image={require('../../../assets/images/icon-pendientes.png')}
            label="Pendientes"
            value={statistics.pendientes === 1 ? '1 ahora' : `${statistics.pendientes} ahora`}
            variant="orange"
            dark={isDark}
          />
          <StatCard
            horizontal
            icon="local-fire-department"
            image={require('../../../assets/images/icon-racha.png')}
            label="Racha"
            value={`${racha} día${racha === 1 ? '' : 's'}`}
            variant="red"
            dark={isDark}
          />
        </View>
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
            {alarms.length > 0 ? (
              <MaterialIcons name="celebration" size={40} color={DS.colors.secondary} />
            ) : (
              <Image
                source={require('../../../assets/images/icon-sin-alarmas.png')}
                style={styles.emptyStateIcon}
                resizeMode="contain"
              />
            )}
            <Text style={[styles.emptyText, { color: mutedColor }]}>
              {alarms.length > 0 ? '¡Todo tomado por hoy!' : 'Sin alarmas para hoy'}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Tarjeta de acceso al Asistente IA */}
      <Animated.View entering={FadeInDown.delay(260).duration(500)} style={styles.aiCardWrap}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('MoreTab', { screen: 'Chat' })}
        >
          <LinearGradient
            colors={['#000000', '#00C2FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.aiCard}
          >
            <View style={styles.aiAvatarGlow}>
              <Image
                source={require('../../../assets/images/robot-assistant.png')}
                style={styles.aiAvatar}
                resizeMode="contain"
              />
            </View>
            <View style={styles.aiTextWrap}>
              <Text style={styles.aiTitle} numberOfLines={1}>
                Asistente IA
              </Text>
              <Text style={styles.aiSubtitle} numberOfLines={2}>
                {`Hola ${currentUser?.nombre?.split(' ')[0] || 'Usuario'}, ¿en qué te ayudo?`}
              </Text>
            </View>
            <View style={styles.aiButton}>
              <Text style={styles.aiButtonText}>Pregúntame</Text>
              <MaterialIcons name="chevron-right" size={18} color="#fff" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Accesos rápidos */}
      <Animated.View entering={FadeInDown.delay(320).duration(500)}>
        <Text style={[styles.sectionLabel, { color: textColor, marginBottom: 12, marginTop: 8 }]}>
          Accesos rápidos
        </Text>
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={[styles.quickCardWrap, styles.quickCardOutline, { backgroundColor: cardBg, borderColor }]}
            onPress={() => navigation.navigate('MoreTab', { screen: 'Diary' })}
          >
            <FloatingIcon
              source={require('../../../assets/images/icon-diario.png')}
              style={styles.quickIconImageBig}
              delay={0}
            />
            <Text style={[styles.quickLabel, { color: textColor }]}>Mi Diario</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCardWrap, styles.quickCardOutline, { backgroundColor: cardBg, borderColor }]}
            onPress={() => navigation.navigate('SOSTab')}
          >
            <FloatingIcon
              source={require('../../../assets/images/icon-emergencia-dashboard.png')}
              style={styles.quickIconImageBig}
              delay={300}
            />
            <Text style={[styles.quickLabel, { color: textColor }]}>Emergencia</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
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
    // Deja libre la barra flotante (ver utils/layout.ts)
    paddingBottom: 150,
  },
  stockAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: DS.borderRadius.lg,
    padding: 14,
    marginBottom: 14,
  },
  stockAlertText: {
    flex: 1,
  },
  stockAlertTitle: {
    fontSize: 15,
    fontFamily: DS.fonts.bold,
  },
  stockAlertBody: {
    fontSize: 13,
    fontFamily: DS.fonts.regular,
    marginTop: 2,
    lineHeight: 18,
  },
  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: DS.borderRadius.xl,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
    ...DS.shadows.lg,
  },
  welcomeText: {
    flex: 1,
    paddingRight: 10,
  },
  skyIcon: {
    marginBottom: 4,
  },
  metaWrap: {
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaLabelInline: {
    color: '#fff',
    fontSize: 10,
    fontFamily: DS.fonts.bold,
    letterSpacing: 0.4,
    marginTop: 6,
    textAlign: 'center',
  },
  metaHeartBg: {
    position: 'absolute',
    width: 110,
    height: 110,
    opacity: 0.18,
  },
  welcomeTitle: {
    flexShrink: 1,
    color: '#fff',
    fontSize: 18,
    fontFamily: DS.fonts.extrabold,
    marginBottom: 6,
  },
  welcomeQuote: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    fontFamily: DS.fonts.medium,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  robotStatsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  statsColumn: {
    flex: 1,
    gap: 10,
  },
  robotWrap: {
    width: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  robotImage: {
    width: 132,
    height: 198,
  },
  robotBadgeWrap: {
    position: 'absolute',
    right: 2,
    bottom: 16,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  robotBadgePulse: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: DS.colors.primary,
  },
  robotBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    ...DS.shadows.glowBlue,
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
  aiCardWrap: {
    marginTop: 12,
  },
  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: DS.borderRadius.xl,
    padding: 16,
    marginBottom: 20,
    gap: 12,
    ...DS.shadows.glowBlue,
  },
  aiAvatarGlow: {
    borderRadius: DS.borderRadius.full,
    ...DS.shadows.glowBlue,
  },
  aiAvatar: {
    width: 54,
    height: 54,
    borderRadius: DS.borderRadius.full,
  },
  aiTextWrap: {
    flex: 1,
  },
  aiTitle: {
    fontSize: 14,
    fontFamily: DS.fonts.bold,
    color: '#fff',
    marginBottom: 2,
  },
  aiSubtitle: {
    fontSize: 13,
    fontFamily: DS.fonts.regular,
    color: 'rgba(255,255,255,0.78)',
    lineHeight: 17,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
    borderRadius: DS.borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  aiButtonText: {
    fontSize: 13,
    fontFamily: DS.fonts.bold,
    color: '#fff',
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
    borderRadius: DS.borderRadius.full,
    backgroundColor: DS.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...DS.shadows.sm,
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
  emptyStateIcon: {
    width: 53,
    height: 53,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickCardWrap: {
    flex: 1,
    height: 140,
    borderRadius: DS.borderRadius.xl,
  },
  quickCardOutline: {
    borderWidth: 1.5,
    padding: 16,
    justifyContent: 'space-between',
    ...DS.shadows.sm,
  },
  quickLabel: {
    fontSize: 16,
    fontFamily: DS.fonts.bold,
  },
  quickIconImageBig: {
    width: 67,
    height: 67,
  },
});

export default DashboardScreen;
