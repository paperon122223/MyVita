import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { DesignSystem } from '../../theme/designSystem';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface AdherenceRingProps {
  /** Porcentaje 0-100 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  /** Colores para usar sobre fondo con gradiente (anillo blanco) */
  onGradient?: boolean;
  /** Etiqueta pequeña bajo el porcentaje (ej. "META") */
  sublabel?: string;
  /** Ajusta el track/texto para verse bien sobre fondo oscuro (sin gradiente) */
  isDark?: boolean;
}

export function AdherenceRing({
  progress,
  size = 104,
  strokeWidth = 12,
  onGradient = false,
  sublabel,
  isDark = false,
}: AdherenceRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animated = useSharedValue(0);
  const gradientId = 'adherenceRingGradient';

  useEffect(() => {
    animated.value = withTiming(Math.min(100, Math.max(0, progress)), {
      duration: 1100,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, animated]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animated.value / 100),
  }));

  const trackColor = onGradient
    ? 'rgba(255,255,255,0.25)'
    : isDark
      ? 'rgba(242,246,255,0.12)'
      : 'rgba(0,123,255,0.12)';
  const ringColor = onGradient ? '#ffffff' : `url(#${gradientId})`;
  const textColor = onGradient ? '#ffffff' : isDark ? DesignSystem.colors.textDark : DesignSystem.colors.text;

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size },
        !onGradient && DesignSystem.shadows.glowBlue,
      ]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={DesignSystem.statGradients.signature[0]} />
            <Stop offset="100%" stopColor={DesignSystem.statGradients.signature[1]} />
          </SvgLinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.value, { color: textColor, fontSize: size * 0.26 }]}>
          {Math.round(progress)}%
        </Text>
        {!!sublabel && (
          <Text style={[styles.sublabel, { color: textColor }]}>{sublabel}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: DesignSystem.fonts.extrabold,
  },
  sublabel: {
    fontFamily: DesignSystem.fonts.bold,
    fontSize: 11,
    letterSpacing: 1.5,
    marginTop: -2,
    opacity: 0.85,
  },
});

export default AdherenceRing;
