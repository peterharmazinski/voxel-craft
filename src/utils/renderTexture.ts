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
  type BrickPattern,
  type BrickColorMode,
  type TileColorMode,
  type TextilesPatternType,
} from './textureGenerators';
import { SimplexNoise, NoiseType } from './noise';

export type TextureType = 'PerlinNoise' | 'Checker' | 'Brick' | 'Gradient' | 'Terrain' | 'Wood' | 'Bark' | 'Tiles' | 'Textiles' | 'Clouds' | 'Voxel' | 'CartoonOre' | 'Hexagon' | 'Octagon';

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
