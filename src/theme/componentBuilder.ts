import { ViewStyle, TextStyle } from 'react-native';
import { DesignSystem } from './designSystem';

type ButtonVariant = 'primary' | 'secondary' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonVariants: Record<ButtonVariant, { bg: string; text: string }> = {
  primary: { bg: DesignSystem.colors.primary, text: '#FFFFFF' },
  secondary: { bg: DesignSystem.colors.gray[200], text: DesignSystem.colors.gray[900] },
  danger: { bg: DesignSystem.colors.error, text: '#FFFFFF' },
};

const buttonSizes: Record<ButtonSize, { padding: number; fontSize: number }> = {
  sm: { padding: 8, fontSize: 12 },
  md: { padding: 12, fontSize: 16 },
  lg: { padding: 16, fontSize: 18 },
};

export const ComponentBuilder = {
  Button(props: {
    label: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    onPress: () => void;
  }): { style: ViewStyle; text: TextStyle; onPress: () => void } {
    const { variant = 'primary', size = 'md', onPress } = props;
    return {
      style: {
        backgroundColor: buttonVariants[variant].bg,
        padding: buttonSizes[size].padding,
        borderRadius: DesignSystem.borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
        ...DesignSystem.shadows.md,
      },
      text: {
        color: buttonVariants[variant].text,
        fontSize: buttonSizes[size].fontSize,
        fontWeight: '600',
      },
      onPress,
    };
  },

  Card(_props: {
    title?: string;
    subtitle?: string;
    image?: string;
    actions?: Array<{ label: string; onPress: () => void }>;
  }): { style: ViewStyle } {
    return {
      style: {
        backgroundColor: '#FFFFFF',
        borderRadius: DesignSystem.borderRadius.lg,
        padding: DesignSystem.spacing.md,
        marginBottom: DesignSystem.spacing.md,
        ...DesignSystem.shadows.md,
      },
    };
  },

  Input(_props: {
    placeholder: string;
    label: string;
    type?: 'text' | 'email' | 'password' | 'phone';
    required?: boolean;
  }): { containerStyle: ViewStyle; labelStyle: TextStyle; inputStyle: ViewStyle & TextStyle } {
    return {
      containerStyle: {
        marginBottom: DesignSystem.spacing.md,
      },
      labelStyle: {
        fontSize: DesignSystem.typography.body2.fontSize,
        fontWeight: '600',
        marginBottom: 4,
        color: DesignSystem.colors.gray[700],
      },
      inputStyle: {
        borderWidth: 1,
        borderColor: DesignSystem.colors.gray[300],
        borderRadius: DesignSystem.borderRadius.md,
        padding: DesignSystem.spacing.sm,
        fontSize: DesignSystem.typography.body1.fontSize,
        minHeight: 48,
      },
    };
  },

  Modal(_props: {
    title: string;
  }): { style: ViewStyle; contentStyle: ViewStyle } {
    return {
      style: {
        flex: 1,
        justifyContent: 'flex-end',
      },
      contentStyle: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: DesignSystem.spacing.md,
        maxHeight: '80%' as any,
      },
    };
  },
};
