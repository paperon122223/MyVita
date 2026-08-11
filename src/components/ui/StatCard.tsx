import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { DesignSystem as DS } from '../../theme/designSystem';

type Variant = 'blue' | 'green' | 'orange' | 'red';

interface StatCardProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  variant: Variant;
  dark?: boolean;
}

// Tile suave (contenedor de color claro + ícono en color fuerte),
// como el rediseño "Premium Wellness".
export function StatCard({ icon, label, value, variant, dark }: StatCardProps) {
  const tile = DS.statContainers[variant];
  return (
    <View style={[styles.card, dark && styles.cardDark]}>
      <View style={[styles.iconTile, { backgroundColor: tile.bg }]}>
        <MaterialIcons name={icon} size={26} color={tile.fg} />
      </View>
      <Text style={[styles.label, dark && styles.labelDark]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.value, { color: tile.fg }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DS.colors.card,
    borderRadius: DS.borderRadius.xl,
    padding: 18,
    width: '48%',
    ...DS.shadows.sm,
  },
  cardDark: {
    backgroundColor: DS.colors.cardDark,
  },
  iconTile: {
    width: 52,
    height: 52,
    borderRadius: DS.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
});

export default StatCard;
