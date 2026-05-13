import {
  generatePerlinNoise,
  generateChecker,
  generateBrick,
  generateGradient,
  generateTerrain,
  generateWood,
  generateBark,
  generateTiles,
  generateTextiles,
  generateVoxelTexture,
  generateCartoonOre,
  generateHexagon,
  generateOctagon,
  generateStoneWall,
  type BrickPattern,
  type BrickColorMode,
  type TileColorMode,
  type TextilesPatternType,
} from './textureGenerators';
import { SimplexNoise, NoiseType } from './noise';

export type TextureType = 'PerlinNoise' | 'Checker' | 'Brick' | 'Gradient' | 'Terrain' | 'Wood' | 'Bark' | 'Tiles' | 'Textiles' | 'Clouds' | 'Voxel' | 'CartoonOre' | 'Hexagon' | 'Octagon' | 'StoneWall';

export const TEXTURE_TYPES: { id: TextureType; label: string }[] = [
  { id: 'PerlinNoise', label: 'Perlin Noise' },
  { id: 'Clouds', label: 'Clouds' },
  { id: 'Checker', label: 'Checker' },
  { id: 'Brick', label: 'Brick' },
  { id: 'Hexagon', label: 'Hexagon' },
  { id: 'Octagon', label: 'Octagon' },
  { id: 'Gradient', label: 'Gradient' },
  { id: 'Terrain', label: 'Terrain' },
  { id: 'Textiles', label: 'Textiles' },
  { id: 'Tiles', label: 'Tiles' },
  { id: 'Wood', label: 'Wood' },
  { id: 'Bark', label: 'Bark' },
  { id: 'CartoonOre', label: 'Cartoon Ore' },
  { id: 'StoneWall', label: 'Stone Wall' },
  { id: 'Voxel', label: 'Voxel / Pixel' },
];

export interface FaceTextureConfig {
  type: TextureType;
  size: number;
  seed: number;
  // Generic params stored as a flat object — each generator reads what it needs
  params: Record<string, unknown>;
}

export const DEFAULT_FACE_CONFIG: FaceTextureConfig = {
  type: 'Wood',
  size: 256,
  seed: 1,
  params: {
    color1: '#c49a6c', color2: '#8b5e3c', color3: '#a0744c',
    planks: 5, xScale: 5, scale: 1, persistence: 0.5,
    grainWidth: 1, gapWidth: 0.4,
  },
};

export function renderFaceTexture(canvas: HTMLCanvasElement, config: FaceTextureConfig) {
  const { type, size, seed, params: p } = config;

  switch (type) {
    case 'PerlinNoise':
      generatePerlinNoise(canvas, size,
        p.color1 as string || '#e6d7c3', p.color2 as string || '#1a1714',
        p.noiseType as 'PerlinNoise' | 'FractalNoise' | 'Turbulence' || 'PerlinNoise',
        p.octaves as number || 6, p.persistence as number || 0.5,
        p.scale as number || 50, seed, 1,
        p.colorStops as { position: number; color: string }[] | undefined);
      break;
    case 'Clouds':
      generatePerlinNoise(canvas, size,
        p.color1 as string || '#ffffff', p.color2 as string || '#2a4d82',
        'PerlinNoise', 7, p.detail as number || 0.45,
        (p.scale as number || 7) * 2, seed, p.percentage as number || 0.6);
      break;
    case 'Checker':
      generateChecker(canvas, size,
        p.x as number || 6, p.y as number || 6,
        p.color1 as string || '#e6d7c3', p.color2 as string || '#665e52',
        seed, (p.percentage as number ?? 100) / 100,
        p.shade as number || 0, p.texture as number || 0);
      break;
    case 'Brick':
      generateBrick(canvas, size,
        p.color1 as string || '#e6d7c3', p.groutColor as string || '#665e52',
        p.gradientColor as string || '#665e52', p.pattern as BrickPattern || 'edges',
        p.x as number || 12, p.y as number || 6,
        p.grout as number || 6, p.gradient as number || 3,
        p.colorMode as BrickColorMode || 'random', p.color2 as string || '#c9a882',
        p.shadeRange as number || 0.15, p.texture as number || 0.4,
        seed, p.textureScale as number || 30);
      break;
    case 'Gradient':
      generateGradient(canvas, size,
        p.colors as { color: string; position: number }[] || [
          { color: '#ff0000', position: 0 }, { color: '#0000ff', position: 100 }
        ], p.gradType as 'linear' | 'radial' || 'radial');
      break;
    case 'Terrain':
      generateTerrain(canvas, size,
        p.scale as number || 7, p.detail as number || 0.45, seed,
        p.height as number || 0.7, p.shadow as boolean ?? true,
        p.colored as boolean ?? true, p.shadowStrength as number || 0.6,
        p.sunHeight as number || 52, -1400, -1400,
        [
          { color: { r: 96, g: 99, b: 46 }, position: 0.04 },
          { color: { r: 58, g: 79, b: 34 }, position: 0.16 },
          { color: { r: 128, g: 154, b: 96 }, position: 0.49 },
          { color: { r: 104, g: 99, b: 89 }, position: 0.7 },
          { color: { r: 255, g: 255, b: 255 }, position: 0.94 },
        ]);
      break;
    case 'Wood':
      generateWood(canvas, size,
        p.color1 as string || '#c49a6c', p.color2 as string || '#8b5e3c',
        p.color3 as string || '#a0744c', p.planks as number || 5,
        p.xScale as number || 5, p.scale as number || 1,
        p.persistence as number || 0.5, seed,
        p.grainWidth as number || 1, p.gapWidth as number || 0.4,
        p.rings as boolean || false);
      break;
    case 'Bark':
      generateBark(canvas, size,
        p.color1 as string || '#8b6b4a', p.color2 as string || '#5c3d28',
        p.color3 as string || '#3a2515', p.fissures as number || 6,
        p.roughness as number || 0.5, p.depth as number || 0.6,
        p.barkScale as number || 1, seed);
      break;
    case 'Tiles':
      generateTiles(canvas, size,
        p.x as number || 2, p.y as number || 2,
        p.color1 as string || '#cccccc', p.groutColor as string || '#888888',
        p.gradientColor as string || '#aaaaaa', p.groutGradientColor as string || '#666666',
        p.xGrout as number || 15, p.yGrout as number || 15,
        p.xGradient as number || 30, p.yGradient as number || 30,
        p.gradientEnabled as boolean ?? true, p.groutGradientEnabled as boolean ?? true,
        p.color2 as string || '#aaaaaa', p.colorMode as TileColorMode || 'single',
        p.shadeRange as number || 0, p.texture as number || 0, seed);
      break;
    case 'Textiles':
      generateTextiles(canvas, size,
        p.color1 as string || '#e6d7c3', p.color2 as string || '#665e52',
        p.pattern as TextilesPatternType || 4, p.double as boolean || false,
        p.tightness as number || 1, p.thickness as number || 6,
        p.smoothness as number || 0, p.shading as number || 0);
      break;
    case 'Voxel':
      generateVoxelTexture(canvas, size, {
        resolution: p.resolution as number || 16,
        baseType: p.baseType as string || 'stone',
        baseColor1: p.color1 as string || '#8b8b8b',
        baseColor2: p.color2 as string || '#6b6b6b',
        baseColor3: p.color3 as string || '#555555',
        grainStrength: p.grain as number || 0.3,
        grainDirection: p.grainDir as string || 'both',
        oreLayers: p.ores as [] || [],
        depthShading: p.depthShading as number || 0.5,
        outlineStrength: p.outline as number || 0.3,
        seed, paletteSize: p.palette as number || 8,
        renderStyle: p.renderStyle as string || 'pixelated',
      } as any);
      break;
    case 'CartoonOre':
      generateCartoonOre(canvas, size, {
        baseColor1: p.color1 as string || '#7a8a8a',
        baseColor2: p.color2 as string || '#6a7a7a',
        baseColor3: p.color3 as string || '#5a6a6a',
        bgNoise: p.bgNoise as number || 0.6,
        bgPatchSize: p.bgPatch as number || 30,
        bgGradient: p.bgGradient as boolean || false,
        oreLayers: p.ores as [] || [],
        seed, outlineWidth: p.outline as number || 1.5,
        shadowStrength: p.shadow as number || 0.6,
      });
      break;
    case 'Hexagon':
      generateHexagon(canvas, size,
        p.color1 as string || '#cccccc', p.color2 as string || '#aaaaaa',
        p.groutColor as string || '#666666', p.columns as number || 6,
        p.groutSize as number || 4, p.shade as number || 0.1, seed,
        p.gradient as boolean || false);
      break;
    case 'Octagon':
      generateOctagon(canvas, size,
        p.color1 as string || '#cccccc', p.color2 as string || '#999999',
        p.groutColor as string || '#666666', p.columns as number || 5,
        p.groutSize as number || 4, p.shade as number || 0.1, seed,
        p.gradient as boolean || false);
      break;
    case 'StoneWall':
      generateStoneWall(canvas, size, {
        stoneColor1: p.color1 as string || '#a09888',
        stoneColor2: p.color2 as string || '#887868',
        mortarColor: p.mortarColor as string || '#484038',
        columns: p.columns as number || 6,
        rows: p.rows as number || 6,
        mortarWidth: p.mortarWidth as number || 3,
        jitter: p.jitter as number || 0.8,
        shading: p.shading as number || 0.5,
        textureNoise: p.textureNoise as number || 0.4,
        seed,
      });
      break;
  }

  // Post-processing: grass-side overlay (green strip at top fading into base)
  const grassOverlay = p.grassOverlay as { color1: string; color2: string; height: number; seed: number } | undefined;
  if (grassOverlay) {
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = canvas.width;
    tmpCanvas.height = canvas.height;
    generatePerlinNoise(tmpCanvas, size,
      grassOverlay.color1, grassOverlay.color2,
      'FractalNoise', 5, 0.5, 40, grassOverlay.seed, 1);
    const ctx = canvas.getContext('2d')!;
    const baseData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const grassCtx = tmpCanvas.getContext('2d')!;
    const grassData = grassCtx.getImageData(0, 0, canvas.width, canvas.height);
    const bd = baseData.data;
    const gd = grassData.data;
    const h = canvas.height;
    const edgeNoise = new SimplexNoise(grassOverlay.seed + 50);
    const stripH = grassOverlay.height * h;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const wobble = edgeNoise.simplexNoise(NoiseType.FRACTAL, canvas.width, 3, 0.5, 1, 8, x, y * 0.3) * stripH * 0.5;
        const edge = stripH + wobble;
        const blend = y < edge - 2 ? 1 : y > edge + 2 ? 0 : (edge + 2 - y) / 4;
        if (blend > 0) {
          const i = (y * canvas.width + x) * 4;
          bd[i]     = Math.round(bd[i] * (1 - blend) + gd[i] * blend);
          bd[i + 1] = Math.round(bd[i + 1] * (1 - blend) + gd[i + 1] * blend);
          bd[i + 2] = Math.round(bd[i + 2] * (1 - blend) + gd[i + 2] * blend);
        }
      }
    }
    ctx.putImageData(baseData, 0, 0);
  }

  // Post-processing: alpha and cutout
  const alpha = p.alpha as number | undefined;
  const cutout = p.cutout as number | undefined;
  if (alpha !== undefined || cutout !== undefined) {
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    const S = cutout !== undefined ? new SimplexNoise(seed + 99) : null;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        let a = d[i + 3] / 255;
        if (alpha !== undefined) a *= alpha;
        if (cutout !== undefined && S) {
          const n = S.simplexNoise(NoiseType.FRACTAL, canvas.width, 4, 0.5, 1, 20, x, y);
          if (n < cutout) a = 0;
        }
        d[i + 3] = Math.round(a * 255);
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }
}

// ─── Block-level style filter ─────────────────────────────────────────────
// Mirrors the voxel renderer's `renderStyle` (pixelated/cartoon/realistic/
// painterly/flat) as a post-process so texture-rendered faces can opt into
// the same look. Applied AFTER the underlying texture is drawn.
export type BlockRenderStyle = 'pixelated' | 'cartoon' | 'realistic' | 'painterly' | 'flat';

export function applyBlockStylePostProcess(canvas: HTMLCanvasElement, style: BlockRenderStyle) {
  if (style === 'pixelated' || style === 'realistic') return; // no-op styles
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  if (style === 'cartoon' || style === 'flat') {
    // Posterize to a small number of levels per channel — fewer levels
    // for "flat" so it reads as a poster-paint look. Skips alpha so
    // cutouts (leaves, glass) keep their original edges.
    const levels = style === 'flat' ? 4 : 6;
    const step = 255 / (levels - 1);
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.round(Math.round(d[i] / step) * step);
      d[i + 1] = Math.round(Math.round(d[i + 1] / step) * step);
      d[i + 2] = Math.round(Math.round(d[i + 2] / step) * step);
    }
    ctx.putImageData(img, 0, 0);
    return;
  }

  if (style === 'painterly') {
    // 3x3 box blur to soften details into broad strokes. One pass keeps
    // it subtle so the preset's identity stays recognizable.
    const out = new Uint8ClampedArray(d.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0, a = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
            const j = (ny * w + nx) * 4;
            r += d[j]; g += d[j + 1]; b += d[j + 2]; a += d[j + 3]; n++;
          }
        }
        const i = (y * w + x) * 4;
        out[i] = r / n;
        out[i + 1] = g / n;
        out[i + 2] = b / n;
        out[i + 3] = a / n;
      }
    }
    img.data.set(out);
    ctx.putImageData(img, 0, 0);
  }
}

// ─── Texture-mode side composition ────────────────────────────────────────
// Mirrors `generateVoxelBlockSide` for texture-rendered faces. Takes a
// pre-rendered side canvas and pre-rendered top canvas and overwrites the
// upper portion of `sideCanvas` with the top texture, using the same
// sideMode / splitPos / transitionPattern / transitionNoise semantics the
// voxel pipeline uses.

export type SideBlendMode = 'uniform' | 'gradient_top' | 'gradient_bottom' | 'split';
export type SideTransitionPattern = 'straight' | 'jagged' | 'mossy' | 'layered' | 'drip' | 'rounded';

// Local copy of the voxel renderer's transition offset so texture
// composition produces visually-matching edges. Kept in this file to
// avoid widening the textureGenerators export surface.
function _transitionOffset(
  x: number, res: number, pattern: SideTransitionPattern, noise: number, seed: number,
): number {
  const nx = x / res;
  const r = (a: number, b: number) => {
    const s = Math.sin(a * 12.9898 + b * 78.233 + seed) * 43758.5453;
    return s - Math.floor(s);
  };
  switch (pattern) {
    case 'straight': return 0;
    case 'jagged': {
      const v = r(x * 5, 0);
      return (v - 0.5) * noise * res * 0.3;
    }
    case 'mossy': {
      const v1 = Math.sin(nx * Math.PI * 6 + seed) * 0.3;
      const v2 = r(x * 3, 1) - 0.5;
      return (v1 + v2 * 0.7) * noise * res * 0.25;
    }
    case 'layered': {
      const band = Math.sin(nx * Math.PI * 3 + seed * 0.1) * 0.5;
      return band * noise * res * 0.15;
    }
    case 'drip': {
      const drip = Math.pow(Math.sin(nx * Math.PI * 4 + seed * 0.3), 2);
      const randDrip = r(x * 2, 2);
      return (drip * 0.6 + randDrip * 0.4) * noise * res * 0.35;
    }
    case 'rounded': {
      const curve = Math.sin(nx * Math.PI) * 0.4;
      const wiggle = Math.sin(nx * Math.PI * 5 + seed) * 0.1;
      return (curve + wiggle) * noise * res * 0.2;
    }
    default: return 0;
  }
}

export interface SideCompositionOptions {
  sideMode: SideBlendMode;
  sideSplitPos: number;     // 0..1
  transitionPattern: SideTransitionPattern;
  transitionNoise: number;  // 0..1
  seed: number;
}

export function compositeTextureSide(
  sideCanvas: HTMLCanvasElement,
  topCanvas: HTMLCanvasElement,
  opts: SideCompositionOptions,
) {
  if (opts.sideMode === 'uniform') return;
  const sideCtx = sideCanvas.getContext('2d')!;
  const w = sideCanvas.width;
  const h = sideCanvas.height;

  // Normalize top canvas to match side dimensions so we can sample
  // pixel-for-pixel. We assume square faces (which the rest of the app
  // also assumes); rectangular textures would still composite, just
  // anisotropically.
  let topSrc: HTMLCanvasElement = topCanvas;
  if (topCanvas.width !== w || topCanvas.height !== h) {
    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    const tCtx = tmp.getContext('2d')!;
    tCtx.imageSmoothingEnabled = false;
    tCtx.drawImage(topCanvas, 0, 0, w, h);
    topSrc = tmp;
  }
  const topCtx = topSrc.getContext('2d')!;

  const topData = topCtx.getImageData(0, 0, w, h);
  const sideData = sideCtx.getImageData(0, 0, w, h);
  const td = topData.data;
  const sd = sideData.data;
  const baseSplitRow = Math.round(h * opts.sideSplitPos);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (x + y * w) * 4;
      const offset = _transitionOffset(x, w, opts.transitionPattern, opts.transitionNoise, opts.seed);
      const splitRow = baseSplitRow + offset;
      let blend: number;
      if (opts.sideMode === 'split') {
        blend = y < splitRow ? 1 : 0;
      } else if (opts.sideMode === 'gradient_top') {
        blend = 1 - Math.max(0, Math.min(1, (y - splitRow * 0.5) / Math.max(splitRow, 1)));
      } else { // gradient_bottom
        blend = Math.max(0, Math.min(1, 1 - (h - y - (h - splitRow) * 0.5) / Math.max(h - splitRow, 1)));
      }
      if (blend <= 0) continue;
      sd[i]     = Math.round(sd[i] * (1 - blend) + td[i] * blend);
      sd[i + 1] = Math.round(sd[i + 1] * (1 - blend) + td[i + 1] * blend);
      sd[i + 2] = Math.round(sd[i + 2] * (1 - blend) + td[i + 2] * blend);
    }
  }
  sideCtx.putImageData(sideData, 0, 0);
}

export interface SnowOverlayOptions {
  color1: string;
  color2: string;
  depth: number;   // 0–1, how far down the snow extends
  seed: number;
}

export function applySnowOverlay(canvas: HTMLCanvasElement, opts: SnowOverlayOptions, face: 'top' | 'side' | 'bottom') {
  const { color1, color2, depth, seed } = opts;
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d')!;

  if (face === 'top') {
    const snowCanvas = document.createElement('canvas');
    snowCanvas.width = w;
    snowCanvas.height = h;
    generatePerlinNoise(snowCanvas, w, color1, color2, 'FractalNoise', 4, 0.4, 30, seed, 1);
    const baseData = ctx.getImageData(0, 0, w, h);
    const snowData = snowCanvas.getContext('2d')!.getImageData(0, 0, w, h);
    const bd = baseData.data;
    const sd = snowData.data;
    const coverage = 0.5 + depth * 0.5;
    for (let i = 0; i < bd.length; i += 4) {
      bd[i]     = Math.round(bd[i] * (1 - coverage) + sd[i] * coverage);
      bd[i + 1] = Math.round(bd[i + 1] * (1 - coverage) + sd[i + 1] * coverage);
      bd[i + 2] = Math.round(bd[i + 2] * (1 - coverage) + sd[i + 2] * coverage);
    }
    ctx.putImageData(baseData, 0, 0);
    return;
  }

  if (face === 'side') {
    const snowCanvas = document.createElement('canvas');
    snowCanvas.width = w;
    snowCanvas.height = h;
    generatePerlinNoise(snowCanvas, w, color1, color2, 'FractalNoise', 5, 0.5, 40, seed + 10, 1);
    const baseData = ctx.getImageData(0, 0, w, h);
    const snowData = snowCanvas.getContext('2d')!.getImageData(0, 0, w, h);
    const bd = baseData.data;
    const sd = snowData.data;
    const edgeNoise = new SimplexNoise(seed + 77);
    const stripH = depth * h;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const wobble = edgeNoise.simplexNoise(NoiseType.FRACTAL, w, 3, 0.5, 1, 8, x, y * 0.3) * stripH * 0.5;
        const edge = stripH + wobble;
        const blend = y < edge - 3 ? 1 : y > edge + 3 ? 0 : (edge + 3 - y) / 6;
        if (blend > 0) {
          const i = (y * w + x) * 4;
          bd[i]     = Math.round(bd[i] * (1 - blend) + sd[i] * blend);
          bd[i + 1] = Math.round(bd[i + 1] * (1 - blend) + sd[i + 1] * blend);
          bd[i + 2] = Math.round(bd[i + 2] * (1 - blend) + sd[i + 2] * blend);
        }
      }
    }
    ctx.putImageData(baseData, 0, 0);
  }
}
