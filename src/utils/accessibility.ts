const getLuminance = (hex: string): number => {
  const rgb = parseInt(hex.replace('#', ''), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = rgb & 0xff;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

export const AccessibilityValidator = {
  checkContrast(foreground: string, background: string): boolean {
    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    const contrast = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    return contrast >= 4.5; // WCAG AA
  },

  checkTouchTarget(width: number, height: number): boolean {
    return width >= 48 && height >= 48;
  },

  checkFontSize(fontSize: number): boolean {
    return fontSize >= 14;
  },
};
