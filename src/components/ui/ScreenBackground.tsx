import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DesignSystem as DS } from '../../theme/designSystem';

interface ScreenBackgroundProps {
  isDark: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
}

// Fondo de pantalla: degradado azul noche → verde oscuro en modo oscuro,
// color plano de superficie clara en modo claro.
export function ScreenBackground({ isDark, children, style }: ScreenBackgroundProps) {
  if (!isDark) {
    return <View style={[styles.flex, { backgroundColor: DS.colors.surface }, style]}>{children}</View>;
  }
  return (
    <LinearGradient colors={DS.statGradients.appBackground} style={[styles.flex, style]}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});

export default ScreenBackground;
