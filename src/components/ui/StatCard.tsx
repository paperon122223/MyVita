import React from 'react';
import { View, Text, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { DesignSystem as DS } from '../../theme/designSystem';

type Variant = 'blue' | 'green' | 'orange' | 'red';

interface StatCardProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  image?: ImageSourcePropType;
  label: string;
  value: string;
  variant: Variant;
  dark?: boolean;
  /** Fila compacta (ícono + texto + flecha) en vez de la tarjeta vertical completa */
  horizontal?: boolean;
}

// Alturas de la mini-gráfica decorativa (puramente visual, sin datos reales)
const SPARK_PATTERN = [4, 7, 5, 10, 6, 12, 9];

// Tile "Premium Wellness": ícono circular grande con glow + fondo muy sutil
// (negro difuminado hacia el color de la sección) en modo oscuro.
export function StatCard({ icon, image, label, value, variant, dark, horizontal }: StatCardProps) {
  const tile = DS.statContainers[variant];
  const cardGradient = DS.statCardBg[variant];
  const badgeBg = dark ? 'rgba(255,255,255,0.04)' : tile.bg;

  if (horizontal) {
    const rowContent = (
      <>
        <View
          style={[
            styles.iconBadgeSm,
            { borderColor: tile.fg, shadowColor: tile.fg, backgroundColor: badgeBg },
          ]}
        >
          {image ? (
            <Image source={image} style={styles.iconImageSm} resizeMode="contain" />
          ) : (
            <MaterialIcons name={icon} size={20} color={tile.fg} />
          )}
        </View>
        {/* Sin mini-gráfica en la fila compacta: es decorativa y el ancho
            que ocupaba hacía que se recortaran etiquetas como "Adherencia". */}
        <View style={styles.rowText}>
          <Text style={[styles.labelSm, dark && styles.labelDark]} >
            {label}
          </Text>
          <Text style={[styles.valueSm, { color: tile.fg }]} >
            {value}
          </Text>
        </View>
      </>
    );
    if (dark) {
      return <LinearGradient colors={cardGradient} style={styles.rowCard}>{rowContent}</LinearGradient>;
    }
    return <View style={[styles.rowCard, styles.cardLight]}>{rowContent}</View>;
  }

  const content = (
    <>
      <View style={[styles.iconBadge, { borderColor: tile.fg, shadowColor: tile.fg, backgroundColor: badgeBg }]}>
        {image ? (
          <Image source={image} style={styles.iconImage} resizeMode="contain" />
        ) : (
          <MaterialIcons name={icon} size={30} color={tile.fg} />
        )}
      </View>
      <Text style={[styles.label, dark && styles.labelDark]} >
        {label}
      </Text>
      <Text style={[styles.value, { color: tile.fg }]} >
        {value}
      </Text>
      <View style={styles.sparkRow}>
        {SPARK_PATTERN.map((h, i) => (
          <View
            key={i}
            style={[
              styles.sparkBar,
              { height: h, backgroundColor: tile.fg, opacity: 0.3 + (i / SPARK_PATTERN.length) * 0.6 },
            ]}
          />
        ))}
      </View>
    </>
  );

  if (dark) {
    return (
      <LinearGradient colors={cardGradient} style={styles.card}>
        {content}
      </LinearGradient>
    );
  }
  return <View style={[styles.card, styles.cardLight]}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: DS.borderRadius.xl,
    padding: 18,
    width: '48%',
  },
  cardLight: {
    backgroundColor: DS.colors.card,
    borderWidth: 1,
    borderColor: DS.colors.border,
    ...DS.shadows.sm,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
  iconImage: {
    width: 40,
    height: 40,
  },
  label: {
    fontSize: 16,
    fontFamily: DS.fonts.semibold,
    color: DS.colors.text,
    marginBottom: 2,
  },
  labelDark: {
    color: DS.colors.textDark,
  },
  value: {
    fontSize: 18,
    fontFamily: DS.fonts.bold,
  },
  sparkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    marginTop: 10,
    height: 14,
  },
  sparkBar: {
    width: 5,
    borderRadius: 2,
  },
  // Fila compacta (usada apilada verticalmente junto al robot del Dashboard)
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: DS.borderRadius.lg,
    paddingVertical: 6,
    paddingHorizontal: 10,
    width: '100%',
  },
  iconBadgeSm: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  iconImageSm: {
    width: 30,
    height: 30,
  },
  rowText: {
    flex: 1,
  },
  sparkRowSm: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 12,
    marginLeft: 4,
  },
  sparkBarSm: {
    width: 3,
    borderRadius: 1.5,
  },
  labelSm: {
    fontSize: 14,
    fontFamily: DS.fonts.semibold,
    color: DS.colors.text,
  },
  valueSm: {
    fontSize: 15,
    fontFamily: DS.fonts.bold,
  },
});

export default StatCard;
