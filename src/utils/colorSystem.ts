const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

const rgbToHex = (r: number, g: number, b: number): string =>
  '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');

const clamp = (value: number, min = 0, max = 255): number =>
  Math.max(min, Math.min(max, value));

export type ColorScale = {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
};

export const ColorSystemGenerator = {
  generateScale(baseColor: string): ColorScale | null {
    const rgb = hexToRgb(baseColor);
    if (!rgb) return null;

    const { r, g, b } = rgb;

    return {
      50:  rgbToHex(clamp(r + 215), clamp(g + 215), clamp(b + 215)),
      100: rgbToHex(clamp(r + 180), clamp(g + 180), clamp(b + 180)),
      200: rgbToHex(clamp(r + 140), clamp(g + 140), clamp(b + 140)),
      300: rgbToHex(clamp(r + 100), clamp(g + 100), clamp(b + 100)),
      400: rgbToHex(clamp(r + 50),  clamp(g + 50),  clamp(b + 50)),
      500: baseColor,
      600: rgbToHex(clamp(r - 30),  clamp(g - 30),  clamp(b - 30)),
      700: rgbToHex(clamp(r - 60),  clamp(g - 60),  clamp(b - 60)),
      800: rgbToHex(clamp(r - 90),  clamp(g - 90),  clamp(b - 90)),
      900: rgbToHex(clamp(r - 120), clamp(g - 120), clamp(b - 120)),
    };
  },
};
