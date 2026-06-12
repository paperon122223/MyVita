import { AccessibilityInfo } from 'react-native';

export const AnimationPresets = {
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
    duration: 300,
  },
  slideUp: {
    from: { transform: [{ translateY: 50 }] },
    to: { transform: [{ translateY: 0 }] },
    duration: 300,
  },
};

export const getAnimationDuration = async (duration: number): Promise<number> => {
  const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
  return reduceMotion ? 0 : duration;
};
