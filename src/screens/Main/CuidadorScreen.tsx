// ================================================================
// CuidadorScreen.tsx — Modo Cuidador
// Un familiar/cuidador monitorea la salud de sus pacientes vinculados.
// Vinculación segura por CÓDIGO de 6 dígitos (válido 10 min) que el
// paciente genera. Todos los datos vienen del backend (Railway), que
// valida el vínculo activo antes de devolver nada del paciente.
// ================================================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Share,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useDarkMode } from '../../hooks/useDarkMode';
import apiService from '../../services/apiService';
import { ScreenBackground } from '../../components/ui/ScreenBackground';
import { SectionHero } from '../../components/ui/SectionHero';
import { DesignSystem as DS } from '../../theme/designSystem';
import { RootState } from '../../types';

type PacienteVinculado = {
  vinculoId: string;
  pacienteId: string;
  nombre: string;
  email: string;
  // Adherencia del día (calculada desde alarmas)
  adherenciaHoy: number;
  alarmasTomadas: number;
  alarmasPendientes: number;
  alarmasTotal: number;
  sinDatos: boolean;
};

function AdherenciaBadge({ pct }: { pct: number }) {
  const gradient: [string, string] =
    pct >= 90 ? DS.statGradients.adherence
    : pct >= 60 ? DS.statGradients.pending
    : DS.statGradients.streak;
  return (
    <LinearGradient colors={gradient} style={styles.badge}>
      <Text style={styles.badgeText}>{pct}%</Text>
    </LinearGradient>
  );
}

function PacienteCard({
  p,
  isDark,
  onDesvincular,
}: {
  p: PacienteVinculado;
  isDark: boolean;
  onDesvincular: (vinculoId: string, nombre: string) => void;
}) {
  const cardBg = isDark ? DS.colors.cardDark : DS.colors.card;
  const textColor = isDark ? DS.colors.textDark : DS.colors.text;
  const mutedColor = isDark ? DS.colors.mutedDark : DS.colors.muted;
  const borderColor = isDark ? DS.colors.borderDark : DS.colors.border;

  return (
    <View style={[styles.pacienteCard, { backgroundColor: cardBg }]}>
      <View style={styles.pacienteHeader}>
        <LinearGradient colors={DS.sectionGradients.cuidador as any} style={styles.avatarGradient}>
          <Text style={styles.avatarInicial}>{p.nombre.charAt(0).toUpperCase()}</Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[styles.pacienteNombre, { color: textColor }]}>{p.nombre}</Text>
          <Text style={[styles.pacienteEmail, { color: mutedColor }]}>{p.email}</Text>
        </View>
        {!p.sinDatos && <AdherenciaBadge pct={p.adherenciaHoy} />}
      </View>

      {p.sinDatos ? (
        <Text style={[styles.sinDatos, { color: mutedColor, borderTopColor: borderColor }]}>
          Sin alarmas registradas hoy.
        </Text>
      ) : (
        <View style={[styles.statsRow, { borderTopColor: borderColor }]}>
          <View style={styles.statItem}>
            <MaterialIcons name="check-circle" size={18} color={DS.colors.secondary} />
            <Text style={[styles.statNum, { color: textColor }]}>{p.alarmasTomadas}</Text>
            <Text style={[styles.statLbl, { color: mutedColor }]}>Tomadas</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="pending-actions" size={18} color={DS.statContainers.orange.fg} />
            <Text style={[styles.statNum, { color: textColor }]}>{p.alarmasPendientes}</Text>
            <Text style={[styles.statLbl, { color: mutedColor }]}>Pendientes</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="event-note" size={18} color={DS.colors.primary} />
            <Text style={[styles.statNum, { color: textColor }]}>{p.alarmasTotal}</Text>
            <Text style={[styles.statLbl, { color: mutedColor }]}>Alarmas</Text>
          </View>
        </View>
      )}

      {!p.sinDatos && p.adherenciaHoy < 60 && (
        <View style={styles.alertRow}>
          <MaterialIcons name="warning" size={16} color={DS.colors.error} />
          <Text style={styles.alertText}>Adherencia baja — recuérdale tomar sus medicamentos.</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.desvincularBtn, { borderTopColor: borderColor }]}
        onPress={() => onDesvincular(p.vinculoId, p.nombre)}
      >
        <MaterialIcons name="link-off" size={16} color={DS.colors.subtle} />
        <Text style={[styles.desvincularText, { color: DS.colors.subtle }]}>Desvincular</Text>
      </TouchableOpacity>
    </View>
  );
}

function CuidadorScreen() {
  const { isDark } = useDarkMode();
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const userId = currentUser?.id || '';

  const [pacientes, setPacientes] = useState<PacienteVinculado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [errorRed, setErrorRed] = useState<string | null>(null);

  // Modal: cuidador ingresa código
  const [modalVincular, setModalVincular] = useState(false);
  const [codigoInput, setCodigoInput] = useState('');
  const [vinculando, setVinculando] = useState(false);

  // Modal: paciente genera su código
  const [modalCodigo, setModalCodigo] = useState(false);
  const [miCodigo, setMiCodigo] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const bg = isDark ? DS.colors.surfaceDark : DS.colors.surface;
  const cardBg = isDark ? DS.colors.cardDark : DS.colors.card;
  const textColor = isDark ? DS.colors.textDark : DS.colors.text;
  const mutedColor = isDark ? DS.colors.mutedDark : DS.colors.muted;

  // ── Cargar pacientes + su adherencia de hoy ─────────────────────────────────
  const cargarPacientes = useCallback(async () => {
    if (!userId) {
      setCargando(false);
      return;
    }
    setErrorRed(null);
    try {
      const lista = await apiService.getPacientes(userId);
      const conDatos = await Promise.all(
        lista.map(async (v: any): Promise<PacienteVinculado> => {
          const pac = v.paciente ?? {};
          const base: PacienteVinculado = {
            vinculoId: v.id,
            pacienteId: pac.id ?? '',
            nombre: pac.nombre ?? 'Paciente',
            email: pac.email ?? '',
            adherenciaHoy: 0,
            alarmasTomadas: 0,
            alarmasPendientes: 0,
            alarmasTotal: 0,
            sinDatos: true,
          };
          try {
            const alarmas = await apiService.getAlarmasPaciente(base.pacienteId, userId);
            const total = alarmas.length;
            if (total === 0) return base;
            const tomadas = alarmas.filter((a: any) => a.tomado === 1 || a.tomado === true).length;
            return {
              ...base,
              alarmasTotal: total,
              alarmasTomadas: tomadas,
              alarmasPendientes: total - tomadas,
              adherenciaHoy: Math.round((tomadas / total) * 100),
              sinDatos: false,
            };
          } catch {
            return base; // sin acceso a alarmas o error puntual
          }
        }),
      );
      setPacientes(conDatos);
    } catch (e: any) {
      const msg = e?.message ?? '';
      if (msg.includes('autorizado') || msg.includes('sesión')) {
        setErrorRed('Tu sesión expiró. Cierra sesión y vuelve a entrar.');
      } else {
        setErrorRed('No se pudo conectar al servidor. Verifica tu conexión a internet.');
      }
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [userId]);

  useEffect(() => {
    cargarPacientes();
  }, [cargarPacientes]);

  // Limpiar el timer del countdown al desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const onRefresh = useCallback(() => {
    setRefrescando(true);
    cargarPacientes();
  }, [cargarPacientes]);

  // ── Paciente: generar código ────────────────────────────────────────────────
  const generarMiCodigo = useCallback(async () => {
    if (!userId) return;
    setGenerando(true);
    setMiCodigo(null);
    setModalCodigo(true);
    try {
      const { codigo, expira_at } = await apiService.generarCodigoVinculacion({
        id: userId,
        nombre: currentUser?.nombre,
        email: currentUser?.email,
      });
      setMiCodigo(codigo);

      // Countdown hasta expira_at
      const finMs = new Date(expira_at).getTime();
      const tick = () => {
        const restante = Math.max(0, Math.round((finMs - Date.now()) / 1000));
        setSegundosRestantes(restante);
        if (restante <= 0 && timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
      tick();
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(tick, 1000);
    } catch {
      setModalCodigo(false);
      Alert.alert('Error', 'No se pudo generar el código. Verifica tu conexión.');
    } finally {
      setGenerando(false);
    }
  }, [userId, currentUser]);

  const compartirCodigo = useCallback(async () => {
    if (!miCodigo) return;
    try {
      await Share.share({
        message: `Mi código de MyVita para que me monitorees: ${miCodigo}\n(Válido por 10 minutos)`,
      });
    } catch {
      /* cancelado */
    }
  }, [miCodigo]);

  // ── Cuidador: vincular con código ───────────────────────────────────────────
  const handleVincular = useCallback(async () => {
    const codigo = codigoInput.trim();
    if (!/^\d{6}$/.test(codigo)) {
      Alert.alert('Código inválido', 'El código debe ser de 6 dígitos.');
      return;
    }
    setVinculando(true);
    try {
      const res = await apiService.vincularConCodigo(codigo, userId);
      setModalVincular(false);
      setCodigoInput('');
      const nombrePac = res?.paciente?.nombre ?? 'el paciente';
      Alert.alert('¡Vinculado!', `Ahora puedes monitorear a ${nombrePac}.`, [
        { text: 'Ver', onPress: cargarPacientes },
      ]);
    } catch (e: any) {
      const msg = (e?.message ?? '').toLowerCase();
      if (msg.includes('inválido') || msg.includes('expirado') || msg.includes('400')) {
        Alert.alert('Código inválido', 'El código no existe o ya expiró. Pide uno nuevo al paciente.');
      } else if (msg.includes('contigo')) {
        Alert.alert('Código inválido', 'No puedes vincularte contigo mismo.');
      } else {
        Alert.alert('Error', 'No se pudo vincular. Verifica tu conexión.');
      }
    } finally {
      setVinculando(false);
    }
  }, [codigoInput, userId, cargarPacientes]);

  // ── Desvincular ─────────────────────────────────────────────────────────────
  const handleDesvincular = useCallback(
    (vinculoId: string, nombre: string) => {
      Alert.alert('Desvincular', `¿Dejar de monitorear a ${nombre}?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.desvincular(vinculoId, userId);
              setPacientes((prev) => prev.filter((x) => x.vinculoId !== vinculoId));
            } catch {
              Alert.alert('Error', 'No se pudo desvincular. Intenta de nuevo.');
            }
          },
        },
      ]);
    },
    [userId],
  );

  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <ScreenBackground isDark={isDark}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refrescando}
          onRefresh={onRefresh}
          colors={[DS.colors.primary]}
          tintColor={DS.colors.primary}
        />
      }
    >
      <SectionHero title="Acompañados es mejor" subtitle="Mantén cerca a las personas que te cuidan." image={require('../../../assets/images/section-caregiver.png')} isDark={isDark} />

      {/* Generar mi código (para que me monitoreen a mí) */}
      <TouchableOpacity
        style={[styles.codigoCard, { backgroundColor: cardBg }]}
        onPress={generarMiCodigo}
        activeOpacity={0.8}
      >
        <View style={[styles.codigoIcon, { backgroundColor: DS.statContainers.green.bg }]}>
          <MaterialIcons name="qr-code-2" size={24} color={DS.colors.secondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.codigoLabel, { color: textColor }]}>Generar mi código</Text>
          <Text style={[styles.codigoSub, { color: mutedColor }]}>
            Para que un familiar te monitoree a ti
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={22} color={DS.colors.subtle} />
      </TouchableOpacity>

      {cargando && (
        <View style={[styles.centroCard, { backgroundColor: cardBg }]}>
          <ActivityIndicator size="large" color={DS.colors.primary} />
          <Text style={[styles.cargandoText, { color: mutedColor }]}>Conectando con el servidor…</Text>
        </View>
      )}

      {!cargando && errorRed && (
        <View style={[styles.centroCard, { backgroundColor: cardBg }]}>
          <MaterialIcons name="cloud-off" size={44} color={DS.colors.subtle} />
          <Text style={[styles.errorText, { color: textColor }]}>{errorRed}</Text>
          <TouchableOpacity style={styles.fullBtn} onPress={cargarPacientes}>
            <LinearGradient colors={DS.sectionGradients.cuidador as any} style={styles.fullGradient}>
              <MaterialIcons name="refresh" size={18} color="#fff" />
              <Text style={styles.fullLabel}>Reintentar</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {!cargando && !errorRed && (
        <>
          <View style={styles.seccionHeader}>
            <Text style={[styles.seccionTitulo, { color: textColor }]}>
              Mis pacientes ({pacientes.length})
            </Text>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: DS.statContainers.blue.bg }]}
              onPress={() => { setCodigoInput(''); setModalVincular(true); }}
            >
              <MaterialIcons name="person-add" size={18} color={DS.colors.primary} />
              <Text style={[styles.addBtnLabel, { color: DS.colors.primary }]}>Vincular</Text>
            </TouchableOpacity>
          </View>

          {pacientes.length === 0 ? (
            <View style={[styles.centroCard, { backgroundColor: cardBg }]}>
              <MaterialIcons name="people-outline" size={52} color={DS.colors.subtle} />
              <Text style={[styles.emptyTitulo, { color: textColor }]}>Sin pacientes vinculados</Text>
              <Text style={[styles.emptySub, { color: mutedColor }]}>
                Pide al paciente que genere su código de 6 dígitos y presiona "Vincular".
              </Text>
              <TouchableOpacity
                style={styles.fullBtn}
                onPress={() => { setCodigoInput(''); setModalVincular(true); }}
              >
                <LinearGradient colors={DS.sectionGradients.cuidador as any} style={styles.fullGradient}>
                  <MaterialIcons name="person-add" size={20} color="#fff" />
                  <Text style={styles.fullLabel}>Vincular primer paciente</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            pacientes.map((p) => (
              <PacienteCard key={p.vinculoId} p={p} isDark={isDark} onDesvincular={handleDesvincular} />
            ))
          )}
        </>
      )}

      {/* ── Modal: ingresar código (cuidador) ── */}
      <Modal visible={modalVincular} transparent animationType="slide" onRequestClose={() => setModalVincular(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitulo, { color: textColor }]}>Vincular paciente</Text>
              <TouchableOpacity onPress={() => setModalVincular(false)}>
                <MaterialIcons name="close" size={24} color={mutedColor} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: mutedColor }]}>
              Pide al paciente que abra MyVita → Cuidador → "Generar mi código" y dícte los 6 dígitos.
            </Text>

            <TextInput
              style={[
                styles.codigoInputBig,
                {
                  color: textColor,
                  backgroundColor: bg,
                  borderColor: isDark ? DS.colors.borderDark : DS.colors.border,
                },
              ]}
              placeholder="000000"
              placeholderTextColor={DS.colors.subtle}
              value={codigoInput}
              onChangeText={(t) => setCodigoInput(t.replace(/[^\d]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />

            <TouchableOpacity style={styles.fullBtn} onPress={handleVincular} disabled={vinculando}>
              <LinearGradient colors={DS.sectionGradients.cuidador as any} style={styles.fullGradient}>
                {vinculando ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="link" size={20} color="#fff" />
                    <Text style={styles.fullLabel}>Vincular</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modal: mostrar mi código (paciente) ── */}
      <Modal visible={modalCodigo} transparent animationType="slide" onRequestClose={() => setModalCodigo(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitulo, { color: textColor }]}>Mi código</Text>
              <TouchableOpacity onPress={() => setModalCodigo(false)}>
                <MaterialIcons name="close" size={24} color={mutedColor} />
              </TouchableOpacity>
            </View>

            {generando || !miCodigo ? (
              <View style={styles.codigoLoading}>
                <ActivityIndicator size="large" color={DS.colors.primary} />
                <Text style={[styles.cargandoText, { color: mutedColor }]}>Generando código…</Text>
              </View>
            ) : (
              <>
                <Text style={[styles.modalDesc, { color: mutedColor }]}>
                  Comparte este código con tu cuidador. Es válido por tiempo limitado:
                </Text>

                <View style={[styles.codigoDisplay, { backgroundColor: bg }]}>
                  <Text style={[styles.codigoDigitos, { color: DS.colors.primary }]}>{miCodigo}</Text>
                </View>

                <View style={styles.expiraRow}>
                  <MaterialIcons
                    name="timer"
                    size={16}
                    color={segundosRestantes > 0 ? DS.statContainers.orange.fg : DS.colors.error}
                  />
                  <Text
                    style={[
                      styles.expiraText,
                      { color: segundosRestantes > 0 ? mutedColor : DS.colors.error },
                    ]}
                  >
                    {segundosRestantes > 0 ? `Expira en ${mmss(segundosRestantes)}` : 'Código expirado'}
                  </Text>
                </View>

                {segundosRestantes > 0 ? (
                  <TouchableOpacity style={styles.fullBtn} onPress={compartirCodigo}>
                    <LinearGradient colors={DS.sectionGradients.cuidador as any} style={styles.fullGradient}>
                      <MaterialIcons name="share" size={20} color="#fff" />
                      <Text style={styles.fullLabel}>Compartir código</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.fullBtn} onPress={generarMiCodigo}>
                    <LinearGradient colors={DS.sectionGradients.cuidador as any} style={styles.fullGradient}>
                      <MaterialIcons name="refresh" size={20} color="#fff" />
                      <Text style={styles.fullLabel}>Generar nuevo código</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 150 },

  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 24,
    gap: 6,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 16,
  },
  headerIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  headerTitle: { fontSize: 24, fontFamily: DS.fonts.extrabold, color: '#fff' },
  headerSub: {
    fontSize: 14,
    fontFamily: DS.fonts.regular,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },

  codigoCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: DS.borderRadius.xl,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...DS.shadows.sm,
  },
  codigoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codigoLabel: { fontSize: 16, fontFamily: DS.fonts.bold },
  codigoSub: { fontSize: 13, fontFamily: DS.fonts.regular, marginTop: 2 },

  seccionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  seccionTitulo: { fontSize: 18, fontFamily: DS.fonts.bold },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: DS.borderRadius.full,
  },
  addBtnLabel: { fontSize: 14, fontFamily: DS.fonts.bold },

  centroCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: DS.borderRadius.xl,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    ...DS.shadows.sm,
  },
  cargandoText: { fontSize: 15, fontFamily: DS.fonts.medium },
  errorText: { fontSize: 15, fontFamily: DS.fonts.medium, textAlign: 'center', lineHeight: 22 },
  emptyTitulo: { fontSize: 18, fontFamily: DS.fonts.bold, textAlign: 'center' },
  emptySub: {
    fontSize: 15,
    fontFamily: DS.fonts.regular,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },

  fullBtn: { width: '100%', marginTop: 4 },
  fullGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 17,
    borderRadius: DS.borderRadius.full,
    ...DS.shadows.sm,
  },
  fullLabel: { fontSize: 17, fontFamily: DS.fonts.bold, color: '#fff' },

  // Tarjeta de paciente
  pacienteCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: DS.borderRadius.xl,
    overflow: 'hidden',
    ...DS.shadows.sm,
  },
  pacienteHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  avatarGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInicial: { fontSize: 24, fontFamily: DS.fonts.extrabold, color: '#fff' },
  pacienteNombre: { fontSize: 18, fontFamily: DS.fonts.bold },
  pacienteEmail: { fontSize: 13, fontFamily: DS.fonts.regular, marginTop: 1 },
  badge: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 16, fontFamily: DS.fonts.extrabold, color: '#fff' },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  statItem: { alignItems: 'center', gap: 3 },
  statNum: { fontSize: 18, fontFamily: DS.fonts.extrabold },
  statLbl: { fontSize: 11, fontFamily: DS.fonts.medium },
  sinDatos: {
    fontSize: 14,
    fontFamily: DS.fonts.medium,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: DS.statContainers.red.bg,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  alertText: { flex: 1, fontSize: 13, fontFamily: DS.fonts.medium, color: DS.colors.error },
  desvincularBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  desvincularText: { fontSize: 13, fontFamily: DS.fonts.medium },

  // Modales
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: {
    borderTopLeftRadius: DS.borderRadius.xl,
    borderTopRightRadius: DS.borderRadius.xl,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitulo: { fontSize: 20, fontFamily: DS.fonts.extrabold },
  modalDesc: { fontSize: 14, fontFamily: DS.fonts.regular, lineHeight: 21, marginBottom: 20 },

  codigoInputBig: {
    borderRadius: DS.borderRadius.md,
    borderWidth: 1.5,
    paddingVertical: 16,
    fontSize: 32,
    fontFamily: DS.fonts.extrabold,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 20,
  },

  codigoLoading: { alignItems: 'center', gap: 14, paddingVertical: 30 },
  codigoDisplay: {
    borderRadius: DS.borderRadius.lg,
    paddingVertical: 22,
    alignItems: 'center',
    marginBottom: 12,
  },
  codigoDigitos: { fontSize: 44, fontFamily: DS.fonts.extrabold, letterSpacing: 10 },
  expiraRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 20 },
  expiraText: { fontSize: 14, fontFamily: DS.fonts.semibold },
});

export default CuidadorScreen;
