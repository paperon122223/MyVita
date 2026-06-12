import { AccessibilityValidator } from './accessibility';

interface ComponentProps {
  fontSize?: number;
  minHeight?: number;
  padding?: number;
  backgroundColor?: string;
  color?: string;
  [key: string]: any;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  report: string;
}

export const DesignValidator = {
  validate(componentName: string, props: ComponentProps): ValidationResult {
    const errors: string[] = [];

    if (props.fontSize !== undefined && !AccessibilityValidator.checkFontSize(props.fontSize)) {
      errors.push(`Fuente ${props.fontSize}px está por debajo del mínimo de 14px`);
    }

    const touchH = props.minHeight ?? props.padding;
    if (touchH !== undefined && !AccessibilityValidator.checkTouchTarget(touchH, touchH)) {
      errors.push(`Área táctil ${touchH}dp menor al mínimo de 48dp`);
    }

    if (props.backgroundColor && props.color) {
      if (!AccessibilityValidator.checkContrast(props.color, props.backgroundColor)) {
        errors.push('Contraste insuficiente — no cumple WCAG AA (ratio mínimo 4.5:1)');
      }
    }

    const isValid = errors.length === 0;

    const report = [
      `REPORTE: ${componentName}`,
      '─'.repeat(36),
      `Accesibilidad: ${isValid ? 'WCAG AA ✓' : 'Con errores ✗'}`,
      ...errors.map((e) => `  • ${e}`),
      `Touch targets 48dp: ${props.minHeight !== undefined ? (props.minHeight >= 48 ? '✓' : '✗') : '—'}`,
      `Fuente mínima 14px: ${props.fontSize !== undefined ? (props.fontSize >= 14 ? '✓' : '✗') : '—'}`,
    ].join('\n');

    return { isValid, errors, report };
  },
};
