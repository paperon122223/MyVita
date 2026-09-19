// ================================================================
// MapaScreen.tsx — Mi Ubicación
// Muestra la posición GPS del usuario sobre un mini-mapa construido con
// tiles de MapTiler servidos por el backend (la API key vive en el
// servidor). Se arma una cuadrícula de tiles centrada en la ubicación
// — sin depender de react-native-maps ni de servicios externos caídos.
// ================================================================

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Dimensions,
  Share,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useDarkMode } from '../../hooks/useDarkMode';
import { ScreenBackground } from '../../components/ui/ScreenBackground';
import { SectionHero } from '../../components/ui/SectionHero';
import { DesignSystem as DS } from '../../theme/designSystem';
import { API_BASE_URL } from '../../utils/constants';

type LocationData = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
};

// ── Geometría de tiles (proyección Web Mercator) ─────────────────────────────
const ZOOM = 16;
const TILE_PX = 256; // tamaño en pantalla (la imagen es 512 → se ve nítida/retina)
const MAP_W = Dimensions.get('window').width - 40; // descontando el margen del card
const MAP_H = 240;

function lonLatToTile(lon: number, lat: number, z: number) {
  const n = Math.pow(2, z);
  const x = ((lon + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
}

function MapaScreen() {
  const { isDark } = useDarkMode();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cardBg = isDark ? DS.colors.cardDark : DS.colors.card;
  const textColor = isDark ? DS.colors.textDark : DS.colors.text;
  const mutedColor = isDark ? DS.colors.mutedDark : DS.colors.muted;

  const obtenerUbicacion = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Sin permiso de ubicación. Actívalo en Ajustes para ver tu posición.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
        timestamp: loc.timestamp,
      });
    } catch {
      setError('No se pudo obtener tu ubicación. Verifica que el GPS esté activo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    obtenerUbicacion();
  }, [obtenerUbicacion]);

  const mapsUrl = location
    ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
    : null;

  // Cuadrícula de tiles centrada en la ubicación
  const tiles = (() => {
    if (!location) return [];
    const { x: fx, y: fy } = lonLatToTile(location.longitude, location.latitude, ZOOM);
    const cx = Math.floor(fx);
    const cy = Math.floor(fy);
    const offX = (fx - cx) * TILE_PX; // px del punto dentro del tile central
    const offY = (fy - cy) * TILE_PX;
    const baseLeft = MAP_W / 2 - offX;
    const baseTop = MAP_H / 2 - offY;
    const max = Math.pow(2, ZOOM) - 1;

    const out: { key: string; uri: string; left: number; top: number }[] = [];
    for (let dj = -2; dj <= 2; dj++) {
      for (let di = -2; di <= 2; di++) {
        const tx = cx + di;
        const ty = cy + dj;
        if (tx < 0 || ty < 0 || tx > max || ty > max) continue;
        out.push({
          key: `${tx}_${ty}`,
          uri: `${API_BASE_URL}/maps/tiles/streets-v2/${ZOOM}/${tx}/${ty}.png`,
          left: baseLeft + di * TILE_PX,
          top: baseTop + dj * TILE_PX,
        });
      }
    }
    return out;
  })();

  const abrirEnMaps = useCallback(() => {
    if (mapsUrl) Linking.openURL(mapsUrl);
  }, [mapsUrl]);

  const compartirUbicacion = useCallback(async () => {
    if (!mapsUrl) return;
    try {
      await Share.share({ message: `Mi ubicación actual: ${mapsUrl}` });
    } catch {
      Alert.alert('Error', 'No se pudo compartir la ubicación.');
    }
  }, [mapsUrl]);

  const formatCoord = (val: number, tipo: 'lat' | 'lon') => {
    const dir = tipo === 'lat' ? (val >= 0 ? 'N' : 'S') : val >= 0 ? 'E' : 'O';
    return `${Math.abs(val).toFixed(6)}° ${dir}`;
  };
  const formatHora = (ts: number) =>
    new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  return (
    <ScreenBackground isDark={isDark}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <SectionHero title="Siempre ubicable" subtitle="Comparte tu ubicación cuando la necesites." image={require('../../../assets/images/section-location.png')} isDark={isDark} />
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <Text style={[styles.msgText, { color: mutedColor }]}>
          {location ? `Actualizada a las ${formatHora(location.timestamp)}` : 'Obteniendo tu posición…'}
        </Text>
      </View>

      {loading && (
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <ActivityIndicator size="large" color={DS.colors.primary} />
          <Text style={[styles.msgText, { color: mutedColor }]}>Buscando tu ubicación…</Text>
        </View>
      )}

      {!loading && error && (
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <MaterialIcons name="location-off" size={48} color={DS.colors.error} />
          <Text style={[styles.msgText, { color: textColor }]}>{error}</Text>
          <TouchableOpacity style={styles.fullBtn} onPress={obtenerUbicacion}>
            <LinearGradient colors={DS.sectionGradients.mapa as any} style={styles.fullGradient}>
              <MaterialIcons name="refresh" size={20} color="#fff" />
              <Text style={styles.fullLabel}>Reintentar</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Mini-mapa con tiles */}
      {!loading && location && (
        <View style={[styles.mapCard, { backgroundColor: cardBg }]}>
          <View style={[styles.mapViewport, { width: MAP_W, height: MAP_H }]}>
            {tiles.map((t) => (
              <Image
                key={t.key}
                source={{ uri: t.uri }}
                style={[styles.tile, { left: t.left, top: t.top }]}
              />
            ))}
            {/* Pin centrado: la punta del ícono apunta al centro exacto */}
            <View style={styles.pinWrap} pointerEvents="none">
              <MaterialIcons name="location-on" size={44} color={DS.colors.error} />
            </View>
          </View>
        </View>
      )}

      {/* Coordenadas */}
      {!loading && location && (
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Coordenadas</Text>

          <View style={styles.coordRow}>
            <View style={[styles.coordIcon, { backgroundColor: DS.statContainers.blue.bg }]}>
              <MaterialIcons name="north" size={22} color={DS.colors.primary} />
            </View>
            <View style={styles.coordInfo}>
              <Text style={[styles.coordLabel, { color: mutedColor }]}>Latitud</Text>
              <Text style={[styles.coordValue, { color: textColor }]}>
                {formatCoord(location.latitude, 'lat')}
              </Text>
            </View>
          </View>

          <View style={[styles.coordRow, styles.coordBorder, { borderTopColor: isDark ? DS.colors.borderDark : DS.colors.border }]}>
            <View style={[styles.coordIcon, { backgroundColor: DS.statContainers.green.bg }]}>
              <MaterialIcons name="east" size={22} color={DS.colors.secondary} />
            </View>
            <View style={styles.coordInfo}>
              <Text style={[styles.coordLabel, { color: mutedColor }]}>Longitud</Text>
              <Text style={[styles.coordValue, { color: textColor }]}>
                {formatCoord(location.longitude, 'lon')}
              </Text>
            </View>
          </View>

          {location.accuracy !== null && (
            <View style={[styles.coordRow, styles.coordBorder, { borderTopColor: isDark ? DS.colors.borderDark : DS.colors.border }]}>
              <View style={[styles.coordIcon, { backgroundColor: DS.statContainers.orange.bg }]}>
                <MaterialIcons name="gps-fixed" size={22} color={DS.statContainers.orange.fg} />
              </View>
              <View style={styles.coordInfo}>
                <Text style={[styles.coordLabel, { color: mutedColor }]}>Precisión</Text>
                <Text style={[styles.coordValue, { color: textColor }]}>
                  ± {Math.round(location.accuracy)} metros
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {!loading && location && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.fullBtn} onPress={abrirEnMaps} activeOpacity={0.85}>
            <LinearGradient colors={DS.sectionGradients.mapa as any} style={styles.fullGradient}>
              <MaterialIcons name="map" size={22} color="#fff" />
              <Text style={styles.fullLabel}>Abrir en Google Maps</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.outlineBtn, { borderColor: isDark ? DS.colors.borderDark : DS.colors.border, backgroundColor: cardBg }]} onPress={compartirUbicacion} activeOpacity={0.85}>
            <MaterialIcons name="share" size={22} color={DS.colors.primary} />
            <Text style={[styles.outlineLabel, { color: DS.colors.primary }]}>Compartir ubicación</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.outlineBtn, { borderColor: isDark ? DS.colors.borderDark : DS.colors.border, backgroundColor: cardBg }]} onPress={obtenerUbicacion} activeOpacity={0.85}>
            <MaterialIcons name="refresh" size={22} color={mutedColor} />
            <Text style={[styles.outlineLabel, { color: mutedColor }]}>Actualizar posición</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 150 },
  header: {
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 32,
    paddingHorizontal: 24,
    gap: 6,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 20,
  },
  headerTitle: { fontSize: 26, fontFamily: DS.fonts.extrabold, color: '#fff', marginTop: 4 },
  headerSub: { fontSize: 15, fontFamily: DS.fonts.regular, color: 'rgba(255,255,255,0.85)' },

  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: DS.borderRadius.xl,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    ...DS.shadows.sm,
  },
  msgText: { fontSize: 16, fontFamily: DS.fonts.medium, textAlign: 'center', lineHeight: 24 },

  mapCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: DS.borderRadius.xl,
    overflow: 'hidden',
    ...DS.shadows.sm,
  },
  mapViewport: {
    overflow: 'hidden',
    backgroundColor: DS.colors.surfaceContainer,
  },
  tile: {
    position: 'absolute',
    width: TILE_PX,
    height: TILE_PX,
  },
  pinWrap: {
    position: 'absolute',
    left: MAP_W / 2 - 22,
    top: MAP_H / 2 - 44, // la punta del pin (abajo) cae en el centro
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  sectionTitle: { fontSize: 18, fontFamily: DS.fonts.bold, alignSelf: 'flex-start', marginBottom: 4 },
  coordRow: { flexDirection: 'row', alignItems: 'center', gap: 14, width: '100%', paddingVertical: 10 },
  coordBorder: { borderTopWidth: 1 },
  coordIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  coordInfo: { flex: 1 },
  coordLabel: { fontSize: 13, fontFamily: DS.fonts.medium, marginBottom: 2 },
  coordValue: { fontSize: 17, fontFamily: DS.fonts.bold },

  actions: { marginHorizontal: 20, gap: 12 },
  fullBtn: { width: '100%', borderRadius: DS.borderRadius.full, overflow: 'hidden' },
  fullGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 17,
  },
  fullLabel: { fontSize: 17, fontFamily: DS.fonts.bold, color: '#fff' },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: DS.borderRadius.full,
    borderWidth: 1.5,
    borderColor: DS.colors.border,
  },
  outlineLabel: { fontSize: 16, fontFamily: DS.fonts.semibold },
});

export default MapaScreen;
