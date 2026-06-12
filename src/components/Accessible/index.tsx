import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AccessibilityRole,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { DesignSystem } from '../../theme/designSystem';

interface ButtonProps {
  onPress: () => void;
  label: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityHint?: string;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const AccessibleButton = ({
  onPress,
  label,
  accessibilityRole = 'button',
  accessibilityHint,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    accessibilityRole={accessibilityRole}
    accessibilityLabel={label}
    accessibilityHint={accessibilityHint}
    accessibilityState={{ disabled }}
    style={[styles.button, disabled && styles.buttonDisabled, style]}
  >
    <Text style={[styles.buttonText, textStyle]}>{label}</Text>
  </TouchableOpacity>
);

interface CardProps {
  children: React.ReactNode;
  title?: string;
  style?: ViewStyle;
}

export const AccessibleCard = ({ children, title, style }: CardProps) => (
  <View
    accessible={true}
    accessibilityLabel={title}
    style={[styles.card, style]}
  >
    {title && <Text style={styles.cardTitle}>{title}</Text>}
    {children}
  </View>
);

interface IconProps {
  size?: number;
  color?: string;
  accessibilityLabel: string;
}

export const AccessibleIcon = ({ size = 24, color, accessibilityLabel }: IconProps) => (
  <View
    accessible={true}
    accessibilityRole="image"
    accessibilityLabel={accessibilityLabel}
    style={{ width: size, height: size }}
  >
    {/* Renderizar ícono aquí usando react-native-vector-icons */}
  </View>
);

const styles = StyleSheet.create({
  button: {
    backgroundColor: DesignSystem.colors.primary,
    paddingVertical: DesignSystem.spacing.sm,
    paddingHorizontal: DesignSystem.spacing.md,
    borderRadius: DesignSystem.borderRadius.lg,
    minHeight: 48,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    ...DesignSystem.shadows.md,
  },
  buttonDisabled: {
    backgroundColor: DesignSystem.colors.gray[300],
  },
  buttonText: {
    ...DesignSystem.typography.button,
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: DesignSystem.borderRadius.lg,
    padding: DesignSystem.spacing.md,
    marginBottom: DesignSystem.spacing.sm,
    ...DesignSystem.shadows.md,
  },
  cardTitle: {
    ...DesignSystem.typography.subtitle1,
    color: DesignSystem.colors.gray[900],
    marginBottom: DesignSystem.spacing.sm,
  },
});
