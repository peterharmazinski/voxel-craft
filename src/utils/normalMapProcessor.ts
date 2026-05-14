// CPU-based normal map generation from height maps
// Ported from the GPU shaders in NormalMap-Online (MIT License, Christian Petry)

export interface NormalMapSettings {
  strength: number;
  level: number;
  blurSharp: number;
  filterType: 'sobel' | 'scharr';
  invertR: boolean;
  invertG: boolean;
  invertHeight: boolean;
  zRange: boolean;
}

export interface DisplacementSettings {
  contrast: number;
  blurSharp: number;
  invert: boolean;
}

export interface AOSettings {
  strength: number;
  mean: number;
  range: number;
  blurSharp: number;
  invert: boolean;
}

export interface SpecularSettings {
  strength: number;
  mean: number;
  range: number;
  falloff: 'no' | 'linear' | 'square';
}

export const DEFAULT_NORMAL: NormalMapSettings = {
  strength: 2.5,
  level: 7,
  blurSharp: 0,
  filterType: 'sobel',
  invertR: false,
  invertG: false,
  invertHeight: false,
  zRange: true,
};

function n(strength: number, level: number, blurSharp: number, filterType: 'sobel' | 'scharr', invertHeight = false): NormalMapSettings {
  return { strength, level, blurSharp, filterType, invertR: false, invertG: false, invertHeight, zRange: true };
}

export const NORMAL_PRESETS: Record<string, NormalMapSettings> = {
  // ── Depth strength ────────────────────────────────────────────────────────
  subtle:     n(1.0, 7,   2, 'sobel'),
  default:    { ...DEFAULT_NORMAL },
  strong:     n(4.0, 7,   0, 'sobel'),
  extreme:    n(5.0, 8,  -4, 'scharr'),
  // ── Sharpness / blur ──────────────────────────────────────────────────────
  smooth:     n(2.0, 6,   8, 'sobel'),
  sharp:      n(3.0, 8, -12, 'scharr'),
  deep_carve: n(5.0, 10,  -6, 'scharr'),
  // ── Material surfaces ─────────────────────────────────────────────────────
  wood_grain: n(2.2, 7,   3, 'sobel'),   // softens harsh plank transitions
  stone_rock: n(3.5, 8,  -2, 'scharr'),  // crisp mortar channels + face bump
  ore_gem:    n(4.5, 9,  -3, 'scharr'),  // dome pop on cartoon ore/gems
  brick_tile: n(3.5, 9,  -2, 'scharr'),  // hard-edged rectangular blocks
  organic:    n(1.8, 6,   4, 'sobel'),   // bark, moss, soft surfaces
  fabric:     n(0.5, 5,  12, 'sobel'),   // textiles, barely-there depth
  metal:      n(0.8, 5,   6, 'sobel'),   // smooth metallic faces
  crystal:    n(0.3, 4,  18, 'sobel'),   // ice, glass, almost flat
  pixel_art:  n(1.8, 6,   0, 'scharr'),  // voxel/pixel: no blur, clean edges
  // ── Direction ─────────────────────────────────────────────────────────────
  inverted:   n(2.5, 7,   0, 'sobel', true),  // emboss / inverted depth
};

export const NORMAL_PRESET_LABELS: Record<string, string> = {
  subtle:     'Subtle',
  default:    'Default',
  strong:     'Strong',
  extreme:    'Extreme',
  smooth:     'Smooth',
  sharp:      'Sharp / Crisp',
  deep_carve: 'Deep Carve',
  wood_grain: 'Wood Grain',
  stone_rock: 'Rock / Stone',
  ore_gem:    'Ore / Gem',
  brick_tile: 'Brick / Tile',
  organic:    'Organic / Soft',
  fabric:     'Fabric / Cloth',
  metal:      'Metal / Flat',
  crystal:    'Crystal / Ice',
  pixel_art:  'Pixel Art',
  inverted:   'Inverted (Emboss)',
};

export const DEFAULT_DISPLACEMENT: DisplacementSettings = {
  contrast: -0.5,
  blurSharp: 0,
  invert: false,
};

export const DEFAULT_AO: AOSettings = {
  strength: 0.5,
  mean: 1,
  range: 1,
  blurSharp: 0,
  invert: false,
};

export const DEFAULT_SPECULAR: SpecularSettings = {
  strength: 1,
  mean: 1,
  range: 1,
  falloff: 'linear',
};

export interface MetallicSettings {
  /** Output strength 0–2. */
  strength: number;
  /** How much low-saturation promotes metallic value (0 = ignore, 2 = heavy). */
  saturationWeight: number;
  /** How much brightness promotes metallic value (0 = ignore, 1 = full). */
  brightnessWeight: number;
  invert: boolean;
}

export const DEFAULT_METALLIC: MetallicSettings = {
  strength: 1,
  saturationWeight: 1,
  brightnessWeight: 0.5,
  invert: false,
};

export interface RoughnessSettings {
  /** Output strength 0–2. */
  strength: number;
  /** Contrast adjustment −1 to 1. */
  contrast: number;
  /** When true outputs smoothness (1 − roughness) instead. */
  invert: boolean;
}

export const DEFAULT_ROUGHNESS: RoughnessSettings = {
  strength: 1,
  contrast: 0,
  invert: false,
};

function getColorData(image: HTMLImageElement | HTMLCanvasElement): ImageData {
  const c = document.createElement('canvas');
  const w = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
  const h = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, w, h);
}

function getGrayscaleData(image: HTMLImageElement | HTMLCanvasElement): ImageData {
  const c = document.createElement('canvas');
  const w = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
  const h = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, w, h);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = (d[i] + d[i + 1] + d[i + 2]) / 3;
    d[i] = d[i + 1] = d[i + 2] = gray;
  }
  return data;
}

function clampWrap(v: number, max: number): number {
  if (v < 0) return v + max;
  if (v >= max) return v - max;
  return v;
}

function simpleBlur(data: ImageData, amount: number): ImageData {
  if (amount === 0) return data;
  const w = data.width, h = data.height;
  const src = new Uint8ClampedArray(data.data);
  const dst = data.data;
  const radius = Math.abs(Math.round(amount));
  const isSharp = amount > 0;

  for (let pass = 0; pass < radius; pass++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        let sum = 0, count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = clampWrap(y + dy, h);
            const nx = clampWrap(x + dx, w);
            sum += src[(ny * w + nx) * 4];
            count++;
          }
        }
        const blurred = sum / count;
        if (isSharp) {
          const sharp = src[i] + (src[i] - blurred);
          dst[i] = dst[i + 1] = dst[i + 2] = Math.max(0, Math.min(255, sharp));
        } else {
          dst[i] = dst[i + 1] = dst[i + 2] = blurred;
        }
        dst[i + 3] = 255;
      }
    }
    src.set(dst);
  }
  return data;
}

function blurFloat32(buf: Float32Array, w: number, h: number, amount: number): Float32Array {
  if (amount === 0) return buf;
  const src = new Float32Array(buf);
  const radius = Math.abs(Math.round(amount));
  const isSharp = amount > 0;
  for (let pass = 0; pass < radius; pass++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0, count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            sum += src[clampWrap(y + dy, h) * w + clampWrap(x + dx, w)];
            count++;
          }
        }
        const blurred = sum / count;
        const idx = y * w + x;
        buf[idx] = isSharp
          ? Math.max(0, Math.min(1, src[idx] + (src[idx] - blurred)))
          : blurred;
      }
    }
    src.set(buf);
  }
  return buf;
}

export function generateNormalMapFromHeightBuffer(
  buf: Float32Array,
  w: number,
  h: number,
  outputCanvas: HTMLCanvasElement,
  settings: NormalMapSettings,
): void {
  const s = blurFloat32(new Float32Array(buf), w, h, settings.blurSharp);

  outputCanvas.width = w;
  outputCanvas.height = h;
  const ctx = outputCanvas.getContext('2d')!;
  const outData = ctx.createImageData(w, h);
  const d = outData.data;

  const dz = (1.0 / settings.strength) * (1.0 + Math.pow(2.0, settings.level));
  const invR = settings.invertR ? -1 : 1;
  const invG = settings.invertG ? -1 : 1;
  const invH = settings.invertHeight ? -1 : 1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = s[clampWrap(y - 1, h) * w + clampWrap(x - 1, w)];
      const l  = s[y * w + clampWrap(x - 1, w)];
      const bl = s[clampWrap(y + 1, h) * w + clampWrap(x - 1, w)];
      const t  = s[clampWrap(y - 1, h) * w + x];
      const b  = s[clampWrap(y + 1, h) * w + x];
      const tr = s[clampWrap(y - 1, h) * w + clampWrap(x + 1, w)];
      const r  = s[y * w + clampWrap(x + 1, w)];
      const br = s[clampWrap(y + 1, h) * w + clampWrap(x + 1, w)];

      let gx: number, gy: number;
      if (settings.filterType === 'sobel') {
        gx = tl + l * 2 + bl - tr - r * 2 - br;
        gy = tl + t * 2 + tr - bl - b * 2 - br;
      } else {
        gx = tl * 3 + l * 10 + bl * 3 - tr * 3 - r * 10 - br * 3;
        gy = tl * 3 + t * 10 + tr * 3 - bl * 3 - b * 10 - br * 3;
      }

      const nx = gx * invR * invH * 255;
      const ny = gy * invG * invH * 255;
      const len = Math.sqrt(nx * nx + ny * ny + dz * dz);
      const nnx = nx / len;
      const nny = ny / len;
      const nnz = dz / len;

      const i = (y * w + x) * 4;
      if (settings.zRange) {
        d[i]     = (nnx * 0.5 + 0.5) * 255;
        d[i + 1] = (nny * 0.5 + 0.5) * 255;
        d[i + 2] = nnz * 255;
      } else {
        d[i]     = (nnx * 0.5 + 0.5) * 255;
        d[i + 1] = (nny * 0.5 + 0.5) * 255;
        d[i + 2] = (nnz * 0.5 + 0.5) * 255;
      }
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(outData, 0, 0);
}

export function generateNormalMap(
  heightSource: HTMLImageElement | HTMLCanvasElement,
  outputCanvas: HTMLCanvasElement,
  settings: NormalMapSettings,
): void {
  const gray = getGrayscaleData(heightSource);
  const blurred = simpleBlur(gray, settings.blurSharp);
  const w = blurred.width, h = blurred.height;
  const s = blurred.data;

  outputCanvas.width = w;
  outputCanvas.height = h;
  const ctx = outputCanvas.getContext('2d')!;
  const outData = ctx.createImageData(w, h);
  const d = outData.data;

  const dz = (1.0 / settings.strength) * (1.0 + Math.pow(2.0, settings.level));
  const invR = settings.invertR ? -1 : 1;
  const invG = settings.invertG ? -1 : 1;
  const invH = settings.invertHeight ? -1 : 1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = s[(clampWrap(y - 1, h) * w + clampWrap(x - 1, w)) * 4] / 255;
      const l  = s[(y * w + clampWrap(x - 1, w)) * 4] / 255;
      const bl = s[(clampWrap(y + 1, h) * w + clampWrap(x - 1, w)) * 4] / 255;
      const t  = s[(clampWrap(y - 1, h) * w + x) * 4] / 255;
      const b  = s[(clampWrap(y + 1, h) * w + x) * 4] / 255;
      const tr = s[(clampWrap(y - 1, h) * w + clampWrap(x + 1, w)) * 4] / 255;
      const r  = s[(y * w + clampWrap(x + 1, w)) * 4] / 255;
      const br = s[(clampWrap(y + 1, h) * w + clampWrap(x + 1, w)) * 4] / 255;

      let dx: number, dy: number;
      if (settings.filterType === 'sobel') {
        dx = tl + l * 2 + bl - tr - r * 2 - br;
        dy = tl + t * 2 + tr - bl - b * 2 - br;
      } else {
        dx = tl * 3 + l * 10 + bl * 3 - tr * 3 - r * 10 - br * 3;
        dy = tl * 3 + t * 10 + tr * 3 - bl * 3 - b * 10 - br * 3;
      }

      const nx = dx * invR * invH * 255;
      const ny = dy * invG * invH * 255;
      const len = Math.sqrt(nx * nx + ny * ny + dz * dz);
      const nnx = nx / len;
      const nny = ny / len;
      const nnz = dz / len;

      const i = (y * w + x) * 4;
      if (settings.zRange) {
        d[i]     = (nnx * 0.5 + 0.5) * 255;
        d[i + 1] = (nny * 0.5 + 0.5) * 255;
        d[i + 2] = nnz * 255;
      } else {
        d[i]     = (nnx * 0.5 + 0.5) * 255;
        d[i + 1] = (nny * 0.5 + 0.5) * 255;
        d[i + 2] = (nnz * 0.5 + 0.5) * 255;
      }
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(outData, 0, 0);
}

export function generateDisplacementMap(
  heightSource: HTMLImageElement | HTMLCanvasElement,
  outputCanvas: HTMLCanvasElement,
  settings: DisplacementSettings,
): void {
  const gray = getGrayscaleData(heightSource);
  const w = gray.width, h = gray.height;
  const d = gray.data;

  const factor = (settings.contrast + 1) / (1 - settings.contrast);
  for (let i = 0; i < d.length; i += 4) {
    let v = d[i] / 255;
    v = factor * (v - 0.5) + 0.5;
    if (settings.invert) v = 1.0 - v;
    v = Math.max(0, Math.min(1, v));
    d[i] = d[i + 1] = d[i + 2] = v * 255;
  }

  simpleBlur(gray, settings.blurSharp);

  outputCanvas.width = w;
  outputCanvas.height = h;
  const ctx = outputCanvas.getContext('2d')!;
  ctx.putImageData(gray, 0, 0);
}

export function generateAOMap(
  heightSource: HTMLImageElement | HTMLCanvasElement,
  outputCanvas: HTMLCanvasElement,
  settings: AOSettings,
): void {
  const gray = getGrayscaleData(heightSource);
  const w = gray.width, h = gray.height;
  const d = gray.data;

  for (let i = 0; i < d.length; i += 4) {
    const v = d[i] / 255;
    let percDist = (settings.range - Math.abs(v - settings.mean)) / settings.range;
    percDist = percDist > 0 ? Math.sqrt(percDist) : 0;
    let result = percDist + (1 - percDist) * (1 - settings.strength);
    if (settings.invert) result = 1 - result;
    result = Math.max(0, Math.min(1, result));
    d[i] = d[i + 1] = d[i + 2] = result * 255;
  }

  simpleBlur(gray, settings.blurSharp);

  outputCanvas.width = w;
  outputCanvas.height = h;
  const ctx = outputCanvas.getContext('2d')!;
  ctx.putImageData(gray, 0, 0);
}

export function generateSpecularMap(
  heightSource: HTMLImageElement | HTMLCanvasElement,
  outputCanvas: HTMLCanvasElement,
  settings: SpecularSettings,
): void {
  const gray = getGrayscaleData(heightSource);
  const w = gray.width, h = gray.height;
  const d = gray.data;

  for (let i = 0; i < d.length; i += 4) {
    const v = d[i] / 255;
    let percDist = (settings.range - Math.abs(v - settings.mean)) / settings.range;
    if (settings.falloff === 'no') percDist = percDist > 0 ? 1.0 : 0.0;
    else if (settings.falloff === 'linear') percDist = percDist > 0 ? percDist : 0;
    else percDist = percDist > 0 ? Math.sqrt(percDist) : 0;
    let result = percDist * settings.strength;
    result = Math.max(0, Math.min(1, result));
    d[i] = d[i + 1] = d[i + 2] = result * 255;
  }

  outputCanvas.width = w;
  outputCanvas.height = h;
  const ctx = outputCanvas.getContext('2d')!;
  ctx.putImageData(gray, 0, 0);
}

/**
 * Metallic map: bright, desaturated pixels read as metallic (white);
 * saturated or dark pixels read as dielectric (black). Weights for
 * saturation vs brightness are tunable so stylised/cartoon textures
 * can still produce usable metallic masks.
 */
export function generateMetallicMap(
  source: HTMLImageElement | HTMLCanvasElement,
  outputCanvas: HTMLCanvasElement,
  settings: MetallicSettings,
): void {
  const data = getColorData(source);
  const w = data.width, h = data.height;
  const d = data.data;
  const totalWeight = settings.saturationWeight + settings.brightnessWeight || 1;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    const lum = r * 0.299 + g * 0.587 + b * 0.114;
    const sat = mx > 0.001 ? (mx - mn) / mx : 0;

    // Low saturation → metallic; scale contribution by respective weights
    let metal = (lum * settings.brightnessWeight + (1 - sat) * settings.saturationWeight)
      / totalWeight * settings.strength;
    if (settings.invert) metal = 1 - metal;
    metal = Math.max(0, Math.min(1, metal));
    d[i] = d[i + 1] = d[i + 2] = metal * 255;
  }

  outputCanvas.width = w;
  outputCanvas.height = h;
  const ctx = outputCanvas.getContext('2d')!;
  ctx.putImageData(data, 0, 0);
}

/**
 * Roughness map: dark pixels → rough, bright pixels → smooth, mirroring
 * how most PBR surfaces work (highlights = smoother areas). Set
 * `invert: true` to output smoothness instead of roughness.
 */
export function generateRoughnessMap(
  source: HTMLImageElement | HTMLCanvasElement,
  outputCanvas: HTMLCanvasElement,
  settings: RoughnessSettings,
): void {
  const gray = getGrayscaleData(source);
  const w = gray.width, h = gray.height;
  const d = gray.data;

  for (let i = 0; i < d.length; i += 4) {
    const v = d[i] / 255;
    // roughness = inverted brightness; contrast bends the mid-tones
    let roughness = 1 - v;
    if (settings.contrast !== 0) {
      const factor = (settings.contrast + 1) / (1 - settings.contrast + 0.0001);
      roughness = Math.max(0, Math.min(1, factor * (roughness - 0.5) + 0.5));
    }
    roughness = Math.max(0, Math.min(1, roughness * settings.strength));
    if (settings.invert) roughness = 1 - roughness;
    d[i] = d[i + 1] = d[i + 2] = roughness * 255;
  }

  outputCanvas.width = w;
  outputCanvas.height = h;
  const ctx = outputCanvas.getContext('2d')!;
  ctx.putImageData(gray, 0, 0);
}
