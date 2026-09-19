import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DesignSystem as DS } from '../../theme/designSystem';

type SectionHeroProps = {
  title: string;
  subtitle: string;
  image: ImageSourcePropType;
  isDark?: boolean;
  accent?: readonly [string, string];
};

/** A common illustrated introduction for the tools below the home screen. */
export function SectionHero({ title, subtitle, image, isDark = false, accent = DS.statGradients.signature }: SectionHeroProps) {
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 380 || fontScale > 1.25;
  return (
    <LinearGradient colors={accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <View style={styles.copy}>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={[styles.imageWell, compact && { width: 64, height: 64 }]} accessible={false} importantForAccessibility="no-hide-descendants">
        <Image source={image} style={styles.image} resizeMode="contain" accessibilityIgnoresInvertColors />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 16, marginBottom: 18, minHeight: 142, flexDirection: 'row', alignItems: 'center', borderRadius: 24, overflow: 'hidden', ...DS.shadows.md },
  copy: { flex: 1, paddingLeft: 18, paddingVertical: 18, paddingRight: 7 },
  title: { fontFamily: DS.fonts.bold, fontSize: 21, lineHeight: 27, color: '#fff' },
  subtitle: { fontFamily: DS.fonts.medium, fontSize: 16, lineHeight: 24, marginTop: 5, color: 'rgba(255,255,255,0.95)' },
  imageWell: { width: 102, height: 102, borderRadius: 20, backgroundColor: '#fff', overflow: 'hidden', marginRight: 12 },
  image: { width: '100%', height: '100%' },
});
