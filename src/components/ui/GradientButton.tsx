import React from 'react';
import { Text, StyleSheet, ActivityIndicator, ViewStyle, Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { DesignSystem } from '../../theme/designSystem';

interface GradientButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  icon?: keyof typeof MaterialIcons.glyphMap;
  /** Gradiente propio de la sección (por defecto, el gradiente "firma") */
  gradientColors?: readonly [string, string];
}

export function GradientButton({ label, onPress, disabled, loading, style, icon, gradientColors }: GradientButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 18, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 250 });
      }}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={style}
    >
      <Animated.View style={animatedStyle}>
        <LinearGradient
          colors={
            disabled
              ? [DesignSystem.colors.gray[300], DesignSystem.colors.gray[400]]
              : gradientColors ?? DesignSystem.statGradients.signature
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              {icon && <MaterialIcons name={icon} size={22} color="#fff" />}
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gradient: {
    borderRadius: DesignSystem.borderRadius.full,
    paddingVertical: 19,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 62,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    ...DesignSystem.shadows.glowBlue,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: '#fff',
    fontSize: 19,
    letterSpacing: 0.3,
    fontFamily: DesignSystem.fonts.bold,
  },
});

export default GradientButton;
