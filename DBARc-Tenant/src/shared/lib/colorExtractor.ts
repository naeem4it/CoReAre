/**
 * Utility for client-side dominant and accent color extraction from an image,
 * contrast calculation (WCAG AA), and shade generation.
 */

export interface ExtractedPalette {
  primary: string;
  secondary: string;
  isLightPrimary: boolean;
  contrastText: string;
  shades: {
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
}

// Convert Hex to RGB
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleanHex = hex.replace(/^#/, '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

// Convert RGB to Hex
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Relative Luminance for WCAG Contrast
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Calculate high contrast text (White vs Dark Charcoal)
export function getContrastColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const lum = getRelativeLuminance(r, g, b);
  // (lum + 0.05) / (0.05) is contrast against black
  return lum > 0.35 ? '#0f172a' : '#ffffff';
}

// Mix two colors
export function mixColors(hex1: string, hex2: string, weight: number): string {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  const p = Math.max(0, Math.min(1, weight));
  const r = c1.r * (1 - p) + c2.r * p;
  const g = c1.g * (1 - p) + c2.g * p;
  const b = c1.b * (1 - p) + c2.b * p;
  return rgbToHex(r, g, b);
}

// Generate complete 50-900 tonal scale from base primary hex
export function generateTonalShades(primaryHex: string) {
  return {
    50: mixColors(primaryHex, '#ffffff', 0.92),
    100: mixColors(primaryHex, '#ffffff', 0.82),
    200: mixColors(primaryHex, '#ffffff', 0.65),
    300: mixColors(primaryHex, '#ffffff', 0.45),
    400: mixColors(primaryHex, '#ffffff', 0.22),
    500: primaryHex,
    600: mixColors(primaryHex, '#000000', 0.12),
    700: mixColors(primaryHex, '#000000', 0.25),
    800: mixColors(primaryHex, '#000000', 0.42),
    900: mixColors(primaryHex, '#000000', 0.6),
  };
}

// Convert RGB to HSL
function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * Extract dominant primary and accent colors from an image File or image URL using Canvas.
 */
export async function extractPaletteFromImage(
  imageSource: File | string,
  fallbackPrimary = '#003ec7',
  fallbackSecondary = '#565e74'
): Promise<ExtractedPalette> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    let objectUrlToRevoke: string | null = null;
    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      objectUrlToRevoke = URL.createObjectURL(imageSource);
      img.src = objectUrlToRevoke;
    }

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas not supported');
        }

        // Downscale for speed and noise reduction
        const sampleSize = 100;
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

        const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const data = imgData.data;

        // Color quantization / bucketing by HSL
        const buckets: { [key: string]: { count: number; r: number; g: number; b: number; h: number; s: number; l: number } } = {};

        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          // Skip transparent pixels
          if (a < 128) continue;

          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Skip near whites (> 245) and near blacks (< 18) to ignore canvas backgrounds
          if (r > 245 && g > 245 && b > 245) continue;
          if (r < 18 && g < 18 && b < 18) continue;

          const hsl = rgbToHsl(r, g, b);
          // Filter out very low saturation gray pixels unless logo is totally grayscale
          const hueBucket = Math.floor(hsl.h / 15) * 15;
          const satBucket = Math.floor(hsl.s / 25) * 25;
          const key = `${hueBucket}-${satBucket}`;

          if (!buckets[key]) {
            buckets[key] = { count: 0, r: 0, g: 0, b: 0, h: hsl.h, s: hsl.s, l: hsl.l };
          }
          buckets[key].count += 1;
          buckets[key].r += r;
          buckets[key].g += g;
          buckets[key].b += b;
        }

        const sortedClusters = Object.values(buckets).sort((a, b) => {
          // Weight by frequency and saturation (favor vibrant brand colors over dull grays)
          const scoreA = a.count * (1 + (a.s / 100) * 1.5);
          const scoreB = b.count * (1 + (b.s / 100) * 1.5);
          return scoreB - scoreA;
        });

        let primaryHex = fallbackPrimary;
        let secondaryHex = fallbackSecondary;

        if (sortedClusters.length > 0) {
          const top = sortedClusters[0];
          primaryHex = rgbToHex(top.r / top.count, top.g / top.count, top.b / top.count);

          // Find distinct secondary color (at least 35 degrees apart in hue, or distinct saturation)
          const distinctSecond = sortedClusters.find(c => {
            const hueDiff = Math.abs(c.h - top.h);
            const wrappedDiff = Math.min(hueDiff, 360 - hueDiff);
            return wrappedDiff >= 35 && c.s > 20;
          });

          if (distinctSecond) {
            secondaryHex = rgbToHex(distinctSecond.r / distinctSecond.count, distinctSecond.g / distinctSecond.count, distinctSecond.b / distinctSecond.count);
          } else if (sortedClusters.length > 1) {
            const second = sortedClusters[1];
            secondaryHex = rgbToHex(second.r / second.count, second.g / second.count, second.b / second.count);
          } else {
            // Generate complementary accent
            const topHsl = rgbToHsl(top.r / top.count, top.g / top.count, top.b / top.count);
            const compH = (topHsl.h + 180) % 360;
            secondaryHex = mixColors(primaryHex, '#565e74', 0.5);
          }
        }

        if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);

        const shades = generateTonalShades(primaryHex);
        const contrastText = getContrastColor(primaryHex);
        const isLightPrimary = contrastText === '#0f172a';

        resolve({
          primary: primaryHex,
          secondary: secondaryHex,
          isLightPrimary,
          contrastText,
          shades,
        });
      } catch (err) {
        console.warn('Color extraction fallback triggered:', err);
        if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
        resolve({
          primary: fallbackPrimary,
          secondary: fallbackSecondary,
          isLightPrimary: false,
          contrastText: '#ffffff',
          shades: generateTonalShades(fallbackPrimary),
        });
      }
    };

    img.onerror = () => {
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
      resolve({
        primary: fallbackPrimary,
        secondary: fallbackSecondary,
        isLightPrimary: false,
        contrastText: '#ffffff',
        shades: generateTonalShades(fallbackPrimary),
      });
    };
  });
}
