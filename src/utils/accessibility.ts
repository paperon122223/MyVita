// Contraste sRGB según la luminancia relativa de WCAG.
// https://www.w3.org/WAI/WCAG21/Understanding/relative-luminance.html
const getLuminance = (hex: string): number => {
  if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return NaN;
  let value = hex.slice(1);
  if (value.length === 3) value = value.split('').map(char => char + char).join('');
  const components = [0, 2, 4].map(offset => {
    const channel = parseInt(value.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return components[0] * 0.2126 + components[1] * 0.7152 + components[2] * 0.0722;
};

export const AccessibilityValidator = {
  contrastRatio(foreground: string, background: string): number {
    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  },
  checkContrast(foreground: string, background: string): boolean {
    return this.contrastRatio(foreground, background) >= 4.5;
  },
  checkTouchTarget(width: number, height: number): boolean {
    return width >= 48 && height >= 48;
  },
  checkFontSize(fontSize: number): boolean {
    return fontSize >= 16;
  },
};
