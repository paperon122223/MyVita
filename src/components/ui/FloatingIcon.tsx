import React, { useEffect } from 'react';
import { Image, ImageSourcePropType, ImageStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface FloatingIconProps {
  source: ImageSourcePropType;
  style?: ImageStyle;
  /** Retraso inicial (ms) para que varios íconos no floten sincronizados */
  delay?: number;
}

// Ícono con un ligero vaivén vertical continuo (puramente decorativo).
export function FloatingIcon({ source, style, delay = 0 }: FloatingIconProps) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      translateY.value = withRepeat(
        withSequence(
          withTiming(-6, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    }, delay);
    return () => clearTimeout(timeout);
  }, [delay, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.Image source={source} style={[style, animatedStyle]} resizeMode="contain" />
  );
}

export default FloatingIcon;
