import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import databaseService from '../../services/database';
import { useDarkMode } from '../../hooks/useDarkMode';
import { ScreenBackground } from '../../components/ui/ScreenBackground';
import { useTabBarClearance } from '../../utils/layout';
import { localDateFromKey, localDateKey } from '../../utils/localDate';
import { DesignSystem as DS } from '../../theme/designSystem';
import { RootState } from '../../types';

const RANGOS = [
  { dias: 7, label: '7 días' },
  { dias: 30, label: '30 días' },
  { dias: 90, label: '90 días' },
] as const;

interface Toma {
  id: string;
  fecha: string;
  hora_toma: string;
  medicamento_nombre?: string;
  dosis?: string;
  tomado: number;
}

/** "Hoy", "Ayer" o "lunes, 12 de agosto". */
function etiquetaFecha(fecha: string): string {
  const hoy = localDateKey(new Date());
  if (fecha === hoy) return 'Hoy';

  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  if (fecha === localDateKey(ayer)) return 'Ayer';

  return localDateFromKey(fecha).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function HistorialScreen() {
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const userId = currentUser?.id || '';
  const { isDark } = useDarkMode();
  const clearance = useTabBarClearance();

  const [dias, setDias] = useState<number>(30);
  const [tomas, setTomas] = useState<Toma[]>([]);
  const [loading, setLoading] = useState(true);

  const cardBg = isDark ? DS.colors.cardDark : DS.colors.card;
  const textColor = isDark ? DS.colors.textDark : DS.colors.text;
  const mutedColor = isDark ? DS.colors.mutedDark : DS.colors.muted;
  const borderColor = isDark ? DS.colors.borderDark : DS.colors.border;

  // Recargar al entrar: pudieron marcarse tomas desde Alarmas o una notificación.
  useFocusEffect(
    useCallback(() => {
      let activo = true;
      if (!userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      databaseService
        .getHistorialTomas(userId, dias)
        .then((filas) => {
          if (activo) setTomas(filas as Toma[]);
        })
        .catch(() => {
          if (activo) setTomas([]);
        })
        .finally(() => {
          if (activo) setLoading(false);
        });
      return () => {
        activo = false;
      };
    }, [userId, dias]),
  );

  const { secciones, tomadas, total } = useMemo(() => {
    const porFecha = new Map<string, Toma[]>();
    for (const toma of tomas) {
      const lista = porFecha.get(toma.fecha) ?? [];
      lista.push(toma);
      porFecha.set(toma.fecha, lista);
    }
    return {
      secciones: Array.from(porFecha.entries()).map(([fecha, data]) => ({
        title: etiquetaFecha(fecha),
        data,
      })),
      tomadas: tomas.filter((t) => t.tomado === 1).length,
      total: tomas.length,
    };
  }, [tomas]);

  const adherencia = total > 0 ? Math.round((tomadas / total) * 100) : 0;

  const Resumen = (
    <View style={[styles.resumen, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.filtros}>
        {RANGOS.map((rango) => {
          const activo = rango.dias === dias;
          return (
            <TouchableOpacity
              key={rango.dias}
              onPress={() => setDias(rango.dias)}
              style={[
                styles.filtroChip,
                {
                  backgroundColor: activo
                    ? DS.colors.primary
                    : isDark
                      ? DS.colors.surfaceContainerDark
                      : DS.colors.surfaceContainer,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Ver últimos ${rango.label}`}
            >
              <Text
                style={[styles.filtroTexto, { color: activo ? '#fff' : mutedColor }]}
              >
                {rango.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.resumenDatos}>
        <View style={styles.resumenItem}>
          <Text style={[styles.resumenNumero, { color: DS.colors.success }]}>{tomadas}</Text>
          <Text style={[styles.resumenLabel, { color: mutedColor }]}>Tomadas</Text>
        </View>
        <View style={styles.resumenItem}>
          <Text style={[styles.resumenNumero, { color: DS.colors.warning }]}>
            {total - tomadas}
          </Text>
          <Text style={[styles.resumenLabel, { color: mutedColor }]}>Omitidas</Text>
        </View>
        <View style={styles.resumenItem}>
          <Text style={[styles.resumenNumero, { color: DS.colors.primary }]}>{adherencia}%</Text>
          <Text style={[styles.resumenLabel, { color: mutedColor }]}>Adherencia</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <ScreenBackground isDark={isDark}>
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={DS.colors.primary} />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground isDark={isDark}>
      <SectionList
        sections={secciones}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.contenido, { paddingBottom: clearance }]}
        ListHeaderComponent={Resumen}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={[styles.seccionTitulo, { color: textColor }]}>{section.title}</Text>
        )}
        renderItem={({ item }) => {
          const tomado = item.tomado === 1;
          return (
            <View style={[styles.fila, { backgroundColor: cardBg, borderColor }]}>
              <View
                style={[
                  styles.estadoIcono,
                  {
                    backgroundColor: tomado
                      ? 'rgba(43,216,74,0.15)'
                      : 'rgba(245,158,11,0.15)',
                  },
                ]}
              >
                <MaterialIcons
                  name={tomado ? 'check-circle' : 'schedule'}
                  size={24}
                  color={tomado ? DS.colors.success : DS.colors.warning}
                />
              </View>
              <View style={styles.filaTexto}>
                <Text style={[styles.filaNombre, { color: textColor }]} numberOfLines={1}>
                  {item.medicamento_nombre || 'Medicamento'}
                </Text>
                <Text style={[styles.filaDetalle, { color: mutedColor }]} numberOfLines={1}>
                  {[item.hora_toma, item.dosis].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <Text
                style={[
                  styles.filaEstado,
                  { color: tomado ? DS.colors.success : DS.colors.warning },
                ]}
              >
                {tomado ? 'Tomada' : 'Omitida'}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <MaterialIcons name="history" size={44} color={DS.colors.subtle} />
            <Text style={[styles.vacioTitulo, { color: textColor }]}>Sin historial</Text>
            <Text style={[styles.vacioTexto, { color: mutedColor }]}>
              Aquí verás tus tomas cuando tengas alarmas registradas.
            </Text>
          </View>
        }
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contenido: {
    padding: DS.spacing.md,
  },
  resumen: {
    borderRadius: DS.borderRadius.xl,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
    ...DS.shadows.sm,
  },
  filtros: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filtroChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: DS.borderRadius.full,
    alignItems: 'center',
  },
  filtroTexto: {
    fontSize: 14,
    fontFamily: DS.fonts.bold,
  },
  resumenDatos: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  resumenItem: {
    alignItems: 'center',
  },
  resumenNumero: {
    fontSize: 26,
    fontFamily: DS.fonts.extrabold,
  },
  resumenLabel: {
    fontSize: 13,
    fontFamily: DS.fonts.medium,
    marginTop: 2,
  },
  seccionTitulo: {
    fontSize: 17,
    fontFamily: DS.fonts.bold,
    marginTop: 12,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: DS.borderRadius.lg,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  estadoIcono: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaTexto: {
    flex: 1,
  },
  filaNombre: {
    fontSize: 17,
    fontFamily: DS.fonts.semibold,
  },
  filaDetalle: {
    fontSize: 14,
    fontFamily: DS.fonts.regular,
    marginTop: 2,
  },
  filaEstado: {
    fontSize: 13,
    fontFamily: DS.fonts.bold,
  },
  vacio: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  vacioTitulo: {
    fontSize: 19,
    fontFamily: DS.fonts.bold,
  },
  vacioTexto: {
    fontSize: 15,
    fontFamily: DS.fonts.regular,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 21,
  },
});

export default HistorialScreen;
