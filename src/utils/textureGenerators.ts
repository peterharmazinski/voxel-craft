import { SimplexNoise, NoiseType } from './noise';
import { hexToRgb, random10Seed, rationalTanh, type RGB } from './helpers';

// ─── Perlin Noise / Clouds ───────────────────────────────────────────────────

export interface NoiseColorStop {
  position: number; // 0-1
  color: string;
}

function sampleGradient(stops: { r: number; g: number; b: number; pos: number }[], t: number): { r: number; g: number; b: number } {
  if (t <= stops[0].pos) return stops[0];
  if (t >= stops[stops.length - 1].pos) return stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].pos && t <= stops[i + 1].pos) {
      const f = (t - stops[i].pos) / (stops[i + 1].pos - stops[i].pos);
      return {
        r: stops[i].r + (stops[i + 1].r - stops[i].r) * f,
        g: stops[i].g + (stops[i + 1].g - stops[i].g) * f,
        b: stops[i].b + (stops[i + 1].b - stops[i].b) * f,
      };
    }
  }
  return stops[stops.length - 1];
}

export function generatePerlinNoise(
  canvas: HTMLCanvasElement,
  size: number,
  color1: string,
  color2: string,
  type: 'PerlinNoise' | 'FractalNoise' | 'Turbulence',
  octaves: number,
  persistence: number,
  scale: number,
  seed: number,
  percentage: number,
  colorStops?: NoiseColorStop[],
) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = size;
  canvas.height = size;
  const S = new SimplexNoise(seed);
  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  const col1 = hexToRgb(color1);
  const col2 = hexToRgb(color2);

  const gradStops = colorStops && colorStops.length >= 2
    ? colorStops.map(s => ({ ...hexToRgb(s.color), pos: s.position }))
    : null;

  const noiseType =
    type === 'FractalNoise' ? NoiseType.FRACTAL :
    type === 'Turbulence' ? NoiseType.TURBULENCE :
    NoiseType.PERLIN;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = S.simplexNoise(noiseType, size, octaves, persistence, percentage, scale, x, y);
      const i = (x + y * size) * 4;
      if (gradStops) {
        const c = sampleGradient(gradStops, v);
        d[i] = c.r; d[i + 1] = c.g; d[i + 2] = c.b;
      } else {
        d[i]     = v * col1.r + (1.0 - v) * col2.r;
        d[i + 1] = v * col1.g + (1.0 - v) * col2.g;
        d[i + 2] = v * col1.b + (1.0 - v) * col2.b;
      }
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

// ─── Checker ─────────────────────────────────────────────────────────────────

export function generateChecker(
  canvas: HTMLCanvasElement,
  size: number,
  xCount: number,
  yCount: number,
  color1: string,
  color2: string,
  seed: number,
  percentage: number,
  shadeRange: number = 0,
  textureAmount: number = 0,
) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = size;
  canvas.height = size;
  ctx.fillStyle = color2;
  ctx.fillRect(0, 0, size, size);
  const cw = size / xCount;
  const ch = size / yCount;
  let incrSeed = seed;
  for (let y = 0; y < yCount; y++) {
    for (let x = 0; x < xCount; x++) {
      const coordSeed = x * 131 + y * 97 + seed;
      const isColor1 = (x + y) % 2 === 0;
      if (isColor1 && random10Seed(incrSeed++, percentage) < 1) {
        const c = shadeRange > 0 ? shadeColor(color1, shadeRange, coordSeed) : color1;
        ctx.fillStyle = c;
        ctx.fillRect(cw * x, ch * y, cw, ch);
      } else if (!isColor1 && shadeRange > 0) {
        const c = shadeColor(color2, shadeRange, coordSeed + 99);
        ctx.fillStyle = c;
        ctx.fillRect(cw * x, ch * y, cw, ch);
      }
    }
  }
  if (textureAmount > 0) {
    applyBrickTexture(ctx, size, textureAmount, seed, 20);
  }
}

// ─── Brick ───────────────────────────────────────────────────────────────────

function drawBrickRect(
  ctx: CanvasRenderingContext2D,
  groutspace: number,
  brickGradient: number,
  brickCol: string,
  groutCol: string,
  gradientCol: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  brickGradient = Math.min(brickGradient, Math.min((h - groutspace * 2) / 2, (w - groutspace * 2) / 2));
  ctx.fillStyle = groutCol;
  ctx.fillRect(x, Math.max(y, 0), w, h);
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  const maxD = h;
  grad.addColorStop(0, groutCol);
  grad.addColorStop(groutspace / maxD, groutCol);
  grad.addColorStop(groutspace / maxD, gradientCol);
  grad.addColorStop((groutspace + brickGradient) / maxD, brickCol);
  grad.addColorStop((h - groutspace - brickGradient) / maxD, brickCol);
  grad.addColorStop((h - groutspace) / maxD, gradientCol);
  grad.addColorStop((h - groutspace) / maxD, groutCol);
  grad.addColorStop(1.0, groutCol);
  ctx.fillStyle = grad;
  const fy = y + groutspace < 0 ? 0 : y + groutspace;
  const fh = y + groutspace < 0 ? h - groutspace : h - groutspace * 2;
  ctx.fillRect(x + groutspace, fy, w - groutspace * 2, fh);

  ctx.save();
  const midX = w / 2 + x;
  const midY = h / 2 + y;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + groutspace, y + groutspace);
  ctx.lineTo(x + groutspace + brickGradient, y + groutspace + brickGradient);
  ctx.lineTo(midX, midY);
  ctx.lineTo(w + x - brickGradient - groutspace, h + y - brickGradient - groutspace);
  ctx.lineTo(w + x - brickGradient, h + y - brickGradient);
  ctx.lineTo(w + x, y + h);
  ctx.lineTo(w + x, y);
  ctx.lineTo(w + x - groutspace, y + groutspace);
  ctx.lineTo(w + x - brickGradient - groutspace, y + groutspace + brickGradient);
  ctx.lineTo(midX, midY);
  ctx.lineTo(x + brickGradient + groutspace, h + y - brickGradient - groutspace);
  ctx.lineTo(x + groutspace, h + y - groutspace);
  ctx.lineTo(x, h + y);
  ctx.lineTo(x, y);
  ctx.clip();

  const grad2 = ctx.createLinearGradient(x, 0, x + w, 0);
  const maxD2 = w;
  grad2.addColorStop(0, groutCol);
  grad2.addColorStop(groutspace / maxD2, groutCol);
  grad2.addColorStop(groutspace / maxD2, gradientCol);
  grad2.addColorStop((groutspace + brickGradient) / maxD2, brickCol);
  grad2.addColorStop((w - groutspace - brickGradient) / maxD2, brickCol);
  grad2.addColorStop((w - groutspace) / maxD2, gradientCol);
  grad2.addColorStop((w - groutspace) / maxD2, groutCol);
  grad2.addColorStop(1.0, groutCol);
  ctx.fillStyle = grad2;
  ctx.fillRect(x + groutspace, fy, w - groutspace * 2, fh);
  ctx.restore();
}

export type BrickPattern = 'straight' | 'block_wide' | 'block' | 'circle' | 'edges';
export type BrickColorMode = 'single' | 'alternating' | 'alternating_row' | 'random';

export interface BrickOptions {
  canvas: HTMLCanvasElement;
  size: number;
  brickColor: string;
  brickColor2: string;
  groutColor: string;
  gradientColor: string;
  pattern: BrickPattern;
  countX: number;
  countY: number;
  groutspace: number;
  brickGradient: number;
  colorMode: BrickColorMode;
  shadeRange: number;
  textureAmount: number;
  textureSeed: number;
  textureScale: number;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function makeRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) / 4294967296);
  };
}

function shadeColor(hex: string, amount: number, seed: number): string {
  const rgb = hexToRgb(hex);
  const variation = (seededRandom(seed) - 0.5) * 2 * amount * 255;
  const r = Math.max(0, Math.min(255, rgb.r + variation));
  const g = Math.max(0, Math.min(255, rgb.g + variation * 0.8));
  const b = Math.max(0, Math.min(255, rgb.b + variation * 0.6));
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

function wrapCoord(v: number, mod: number): number {
  return ((v % mod) + mod) % mod;
}

function pickBrickColor(opts: BrickOptions, row: number, col: number, wrapX: number, wrapY: number): string {
  const { brickColor, brickColor2, colorMode, shadeRange, textureSeed } = opts;
  const wr = wrapCoord(row, wrapY);
  const wc = wrapCoord(col, wrapX);
  let baseColor: string;
  switch (colorMode) {
    case 'alternating':
      baseColor = ((wr + wc) % 2 === 0) ? brickColor : brickColor2;
      break;
    case 'alternating_row':
      baseColor = (wr % 2 === 0) ? brickColor : brickColor2;
      break;
    case 'random':
      baseColor = seededRandom(wc * 131 + wr * 97 + textureSeed) > 0.5 ? brickColor : brickColor2;
      break;
    default:
      baseColor = brickColor;
  }
  if (shadeRange > 0) {
    return shadeColor(baseColor, shadeRange, wc * 73 + wr * 37 + textureSeed);
  }
  return baseColor;
}

function applyBrickTexture(
  ctx: CanvasRenderingContext2D,
  size: number,
  textureAmount: number,
  textureSeed: number,
  textureScale: number,
) {
  if (textureAmount <= 0) return;
  const S = new SimplexNoise(textureSeed);
  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = S.simplexNoise(NoiseType.FRACTAL, size, 4, 0.5, 1, textureScale, x, y);
      const offset = (n - 0.5) * textureAmount * 80;
      const i = (x + y * size) * 4;
      d[i]     = Math.max(0, Math.min(255, d[i] + offset));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + offset * 0.9));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + offset * 0.8));
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

export function generateBrick(
  canvas: HTMLCanvasElement,
  size: number,
  brickColor: string,
  groutColor: string,
  gradientColor: string,
  pattern: BrickPattern,
  countX: number,
  countY: number,
  groutspace: number,
  brickGradient: number,
  colorMode: BrickColorMode = 'single',
  brickColor2: string = brickColor,
  shadeRange: number = 0,
  textureAmount: number = 0,
  textureSeed: number = 1,
  textureScale: number = 30,
) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = size;
  canvas.height = size;
  groutspace = groutspace * (size / 512);
  brickGradient = brickGradient * (size / 512);
  let width = Math.round(size / countX);
  let height = Math.round(size / countY);

  const opts: BrickOptions = {
    canvas, size, brickColor, brickColor2, groutColor, gradientColor,
    pattern, countX, countY, groutspace, brickGradient,
    colorMode, shadeRange, textureAmount, textureSeed, textureScale,
  };

  let wrapX = countX;
  let wrapY = countY;

  const dr = (gs: number, bg: number, gc: string, grc: string, x: number, y: number, w: number, h: number, row: number, col: number) => {
    const bc = pickBrickColor(opts, row, col, wrapX, wrapY);
    const wr = wrapCoord(row, wrapY);
    const wc = wrapCoord(col, wrapX);
    const shadedGrc = shadeRange > 0 ? shadeColor(grc, shadeRange * 0.3, wc * 53 + wr * 29 + textureSeed + 99) : grc;
    drawBrickRect(ctx, gs, bg, bc, gc, shadedGrc, x, y, w, h);
  };

  switch (pattern) {
    case 'straight': {
      wrapX = countX; wrapY = countY;
      const hh = Math.round(height / 2);
      for (let y = 0; y < countY + 1; y++)
        for (let x = 0; x < countX + 1; x++)
          dr(groutspace, brickGradient, groutColor, gradientColor, x * width, y * height - (x % 2 === 1 ? hh : 0), width, height, y, x);
      break;
    }
    case 'block_wide': {
      width = Math.round(width / 2); height = Math.round(height / 2);
      const cy = countY * 2, cx = countX * 2;
      wrapX = cx; wrapY = cy;
      ctx.fillStyle = groutColor; ctx.fillRect(0, 0, size, size);
      for (let y = 0; y < cy + 1; y += 2)
        for (let x = 0; x < cx + 1; x += 3) {
          dr(groutspace, brickGradient, groutColor, gradientColor, x * width, y * height, width, height * 2, y, x);
          dr(groutspace, brickGradient, groutColor, gradientColor, x * width + width, y * height, width * 2, height, y, x + 1);
          dr(groutspace, brickGradient, groutColor, gradientColor, x * width + width, y * height + height, width * 2, height, y + 1, x + 1);
        }
      break;
    }
    case 'block': {
      width = Math.round(width / 2); height = Math.round(height / 2);
      const cy = countY * 2, cx = countX * 2;
      wrapX = cx; wrapY = cy;
      for (let y = 0; y < cy + 1; y += 2)
        for (let x = 0; x < cx + 1; x += 2) {
          if ((x + y) % 4 === 0) {
            dr(groutspace, brickGradient, groutColor, gradientColor, x * width, y * height, width, height * 2, y, x);
            dr(groutspace, brickGradient, groutColor, gradientColor, x * width + width, y * height, width, height * 2, y, x + 1);
          } else {
            dr(groutspace, brickGradient, groutColor, gradientColor, x * width, y * height, width * 2, height, y, x);
            dr(groutspace, brickGradient, groutColor, gradientColor, x * width, y * height + height, width * 2, height, y + 1, x);
          }
        }
      break;
    }
    case 'circle': {
      width = Math.round(width / 3); height = Math.round(height / 3);
      const cy = countY * 3, cx = countX * 3;
      wrapX = cx; wrapY = cy;
      for (let y = 0; y < cy + 1; y += 3)
        for (let x = 0; x < cx + 1; x += 3) {
          dr(groutspace, brickGradient, groutColor, gradientColor, x * width, y * height, width * 2, height, y, x);
          dr(groutspace, brickGradient, groutColor, gradientColor, x * width + width, y * height + 2 * height, width * 2, height, y + 2, x + 1);
          dr(groutspace, brickGradient, groutColor, gradientColor, x * width, y * height + height, width, height * 2, y + 1, x);
          dr(groutspace, brickGradient, groutColor, gradientColor, x * width + 2 * width, y * height, width, height * 2, y, x + 2);
          dr(groutspace, brickGradient, groutColor, gradientColor, x * width + width, y * height + height, width, height, y + 1, x + 1);
        }
      break;
    }
    case 'edges': {
      width = Math.round(width / 2); height = Math.round(height / 2);
      const cy = countY * 2, cx = countX * 2;
      wrapX = cx; wrapY = cy;
      ctx.translate(-width, -height);
      for (let y = 0; y < cy + 2; y++)
        for (let x = 0; x < cx + 2; x++) {
          if (y % 4 === x % 4)
            dr(groutspace, brickGradient, groutColor, gradientColor, x * width, y * height, width * 2, height, y, x);
          else if (y % 4 === (x % 4 + 1) || (y % 4 === 0 && x % 4 === 3))
            dr(groutspace, brickGradient, groutColor, gradientColor, x * width, y * height, width, height * 2, y, x);
        }
      ctx.translate(width, height);
      break;
    }
  }

  applyBrickTexture(ctx, size, textureAmount, textureSeed, textureScale);
}

// ─── Gradient ────────────────────────────────────────────────────────────────

export function generateGradient(
  canvas: HTMLCanvasElement,
  size: number,
  colors: Array<{ color: string; position: number }>,
  type: 'linear' | 'radial',
) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = size;
  canvas.height = size;

  const sorted = [...colors].sort((a, b) => a.position - b.position);
  let grad: CanvasGradient;
  if (type === 'linear') grad = ctx.createLinearGradient(0, 0, size, 0);
  else grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2 + size / 4);

  for (const c of sorted) {
    grad.addColorStop(Math.max(c.position, 0) / 100, c.color);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
}

// ─── Terrain ─────────────────────────────────────────────────────────────────

export function generateTerrain(
  canvas: HTMLCanvasElement,
  size: number,
  scale: number,
  persistence: number,
  seed: number,
  height: number,
  shadowEnabled: boolean,
  colorEnabled: boolean,
  shadowStrength: number,
  sunHeight: number,
  sunX: number,
  sunY: number,
  gradientColors: Array<{ color: RGB; position: number }>,
) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = size;
  canvas.height = size;

  const heightCanvas = document.createElement('canvas');
  heightCanvas.width = size;
  heightCanvas.height = size;
  const hCtx = heightCanvas.getContext('2d')!;
  const hData = hCtx.getImageData(0, 0, size, size);
  const hd = hData.data;

  const S = new SimplexNoise(seed);
  const minHeight = 1 - height;
  let maxV = 0, minV = 255;

  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const v = S.simplexNoise(NoiseType.FRACTAL, size, 7, persistence, 1, scale, x, y);
      maxV = Math.max(v * 255, maxV);
      minV = Math.min(v * 255, minV);
      const i = (x + y * size) * 4;
      hd[i] = hd[i + 1] = hd[i + 2] = v * 255;
      hd[i + 3] = 255;
    }

  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (x + y * size) * 4;
      const v = ((hd[i] + minV) / maxV) * 255;
      hd[i] = hd[i + 1] = hd[i + 2] = v;
    }

  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let v = S.simplexNoise(NoiseType.PERLIN, size, 3, 0.2, 1, 0.8 * scale, x, y);
      v = Math.min(v * Math.max((1 + (1 - minHeight / 4)) - minHeight, 0), 1);
      v = v * v;
      const i = (x + y * size) * 4;
      const old = hd[i];
      hd[i] = hd[i + 1] = hd[i + 2] = v * old;
    }
  hCtx.putImageData(hData, 0, 0);

  if (colorEnabled && gradientColors.length > 0) {
    const sorted = [...gradientColors].sort((a, b) => a.position - b.position);
    const colorData = ctx.getImageData(0, 0, size, size);
    const cd = colorData.data;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const i = (x + y * size) * 4;
        const v = hd[i] / 255;
        let r = 0, g = 0, b = 0;
        if (sorted[0].position > v) {
          r = sorted[0].color.r; g = sorted[0].color.g; b = sorted[0].color.b;
        } else {
          for (let c = 1; c < sorted.length; c++) {
            if (sorted[c].position > v) {
              const per = 1 - (v - sorted[c - 1].position) / (sorted[c].position - sorted[c - 1].position);
              r = per * sorted[c - 1].color.r + (1 - per) * sorted[c].color.r;
              g = per * sorted[c - 1].color.g + (1 - per) * sorted[c].color.g;
              b = per * sorted[c - 1].color.b + (1 - per) * sorted[c].color.b;
              break;
            }
          }
          if (v >= sorted[sorted.length - 1].position) {
            const last = sorted[sorted.length - 1].color;
            r = last.r; g = last.g; b = last.b;
          }
        }
        cd[i] = r; cd[i + 1] = g; cd[i + 2] = b; cd[i + 3] = 255;
      }

    if (shadowEnabled) {
      const shadowSunH = sunHeight * 40 + 255;
      const ss = shadowStrength * 255;
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const i = (x + y * size) * 4;
          let inShadow = false;
          const dx = Math.abs(x - sunX);
          const dy = Math.abs(y - sunY);
          let currH = hd[i];
          const dz = Math.abs(shadowSunH - currH);
          const dzX = dx > 0 ? dx / (dx + dy) * dz / dx : 0;
          const dzY = dy > 0 ? dy / (dx + dy) * dz / dy : 0;
          let f = dy - Math.trunc(dx / 2);
          let lfar: number, lnear: number, deltafar: number, deltanear: number;
          let incrfar = 0, incrnear = 0, incrZfar = 0, incrZnear = 0;
          if (dy > dx) {
            deltafar = dy; deltanear = dx; lfar = y; lnear = x;
            incrfar = y > sunY ? -1 : 1;
            incrnear = x > sunX ? -1 : 1;
            incrZfar = dzY; incrZnear = dzX;
          } else {
            deltafar = dx; deltanear = dy; lfar = x; lnear = y;
            incrnear = y > sunY ? -1 : 1;
            incrfar = x > sunX ? -1 : 1;
            incrZfar = dzX; incrZnear = dzY;
          }
          for (let p = 1; p < deltafar; p++) {
            const ix = dy > dx ? lnear : lfar;
            const iy = dy > dx ? lfar : lnear;
            if (ix >= 0 && iy >= 0 && ix < size && iy < size && currH < 255) {
              if (currH < hd[(ix + iy * size) * 4]) { inShadow = true; break; }
            } else break;
            lfar += incrfar; currH += incrZfar;
            if (f > 0) { lnear += incrnear; currH += incrZnear; f -= deltafar; }
            f += deltanear;
          }
          if (inShadow) {
            cd[i] = (cd[i] / 255) * ss;
            cd[i + 1] = (cd[i + 1] / 255) * ss;
            cd[i + 2] = (cd[i + 2] / 255) * ss;
          }
        }
    }
    ctx.putImageData(colorData, 0, 0);
  } else {
    ctx.drawImage(heightCanvas, 0, 0);
  }
}

// ─── Wood ────────────────────────────────────────────────────────────────────

export function generateWood(
  canvas: HTMLCanvasElement,
  size: number,
  color1: string,
  color2: string,
  color3: string,
  planks: number,
  xScale: number,
  scale: number,
  persistence: number,
  seed: number,
  grainWidth: number = 1,
  gapWidth: number = 0.4,
  rings: boolean = false,
) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = size;
  canvas.height = size;
  const col1 = hexToRgb(color1);
  const col2 = hexToRgb(color2);
  const col3 = hexToRgb(color3);
  const S = new SimplexNoise(seed);
  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;

  const freq = planks * grainWidth;
  const threshold = Math.max(0.05, Math.min(0.95, gapWidth));
  const ringCount = Math.max(3, Math.round(xScale * 2));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v: number;
      if (rings) {
        const cx = (x / size - 0.5) * 2;
        const cy = (y / size - 0.5) * 2;
        const dist = Math.sqrt(cx * cx + cy * cy);
        const noise1 = S.simplexNoise(NoiseType.PERLIN, size, 4, persistence, 1, scale * 8, x, y) * 0.15;
        const ring = Math.sin((dist * ringCount + noise1) * Math.PI * 2);
        v = (ring + 1) * 0.5;
      } else {
        const nx = x / size;
        const noise1 = S.simplexNoise(NoiseType.PERLIN, size, 6, persistence, 1, scale * 10, x, y);
        const ring = Math.sin((nx * xScale + noise1 * 0.5) * freq * Math.PI * 2);
        v = (ring + 1) * 0.5;
      }
      const i = (x + y * size) * 4;
      if (v < threshold) {
        const t = v / threshold;
        d[i] = col2.r * (1 - t) + col3.r * t;
        d[i + 1] = col2.g * (1 - t) + col3.g * t;
        d[i + 2] = col2.b * (1 - t) + col3.b * t;
      } else {
        const t = (v - threshold) / (1 - threshold);
        d[i] = col3.r * (1 - t) + col1.r * t;
        d[i + 1] = col3.g * (1 - t) + col1.g * t;
        d[i + 2] = col3.b * (1 - t) + col1.b * t;
      }
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

// ─── Bark ────────────────────────────────────────────────────────────────────

export function generateBark(
  canvas: HTMLCanvasElement,
  size: number,
  color1: string,
  color2: string,
  color3: string,
  fissures: number,
  roughness: number,
  depth: number,
  scale: number,
  seed: number,
) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = size;
  canvas.height = size;
  const col1 = hexToRgb(color1);
  const col2 = hexToRgb(color2);
  const col3 = hexToRgb(color3);
  const S = new SimplexNoise(seed);
  const S2 = new SimplexNoise(seed + 42);
  const imgData = ctx.createImageData(size, size);
  const d = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const ny = y / size;

      const warp = S.simplexNoise(NoiseType.FRACTAL, size, 4, 0.5, 1, scale * 6, x, y) * 0.3;
      const vertNoise = S2.noise((nx + warp) * fissures * 2, ny * scale * 0.5) * 0.5 + 0.5;

      const fissure = Math.sin((nx + warp) * fissures * Math.PI * 2);
      const fissureV = Math.pow(Math.abs(fissure), 0.6) * (fissure > 0 ? 1 : -1);
      const fissureNorm = (fissureV + 1) * 0.5;

      const coarseNoise = S.simplexNoise(NoiseType.FRACTAL, size, 3, 0.6, 1, scale * 3, x, y) * 0.5 + 0.5;
      const fineNoise = S2.simplexNoise(NoiseType.TURBULENCE, size, 4, 0.5, 1, scale * 15, x, y) * roughness;

      const horizRidge = Math.sin(ny * size * 0.08 + S.noise(nx * 4, ny * 2) * 3) * 0.5 + 0.5;

      const combined = fissureNorm * 0.4 + coarseNoise * 0.25 + vertNoise * 0.15 + horizRidge * 0.2;
      const v = Math.max(0, Math.min(1, combined + fineNoise * 0.3));

      const shadow = 1.0 - depth * (1 - fissureNorm) * 0.6;

      let r: number, g: number, b: number;
      if (v < 0.35) {
        const t = v / 0.35;
        r = col2.r * (1 - t) + col3.r * t;
        g = col2.g * (1 - t) + col3.g * t;
        b = col2.b * (1 - t) + col3.b * t;
      } else if (v < 0.65) {
        const t = (v - 0.35) / 0.3;
        r = col3.r * (1 - t) + col1.r * t;
        g = col3.g * (1 - t) + col1.g * t;
        b = col3.b * (1 - t) + col1.b * t;
      } else {
        const t = (v - 0.65) / 0.35;
        r = col1.r * (1 - t) + col3.r * t * 0.8;
        g = col1.g * (1 - t) + col3.g * t * 0.8;
        b = col1.b * (1 - t) + col3.b * t * 0.8;
      }

      const i = (x + y * size) * 4;
      d[i]     = Math.max(0, Math.min(255, r * shadow));
      d[i + 1] = Math.max(0, Math.min(255, g * shadow));
      d[i + 2] = Math.max(0, Math.min(255, b * shadow));
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

// ─── Tiles ───────────────────────────────────────────────────────────────────

export type TileColorMode = 'single' | 'alternating' | 'random';

export function generateTiles(
  canvas: HTMLCanvasElement,
  size: number,
  countX: number,
  countY: number,
  tileColor: string,
  groutColor: string,
  gradientColor: string,
  groutGradientColor: string,
  xGrout: number,
  yGrout: number,
  xGradient: number,
  yGradient: number,
  tileGradientEnabled: boolean,
  groutGradientEnabled: boolean,
  tileColor2: string = tileColor,
  tileColorMode: TileColorMode = 'single',
  tileShadeRange: number = 0,
  tileTexture: number = 0,
  tileSeed: number = 1,
) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = size;
  canvas.height = size;
  const tileW = size / countX;
  const tileH = size / countY;
  const xg = xGrout * (size / 512);
  const yg = yGrout * (size / 512);
  const xgr = tileGradientEnabled ? xGradient * (size / 512) : 0;
  const ygr = tileGradientEnabled ? yGradient * (size / 512) : 0;

  ctx.fillStyle = groutGradientEnabled ? groutGradientColor : groutColor;
  ctx.fillRect(0, 0, size, size);

  for (let ty = 0; ty < countY; ty++) {
    for (let tx = 0; tx < countX; tx++) {
      const x = tx * tileW + xg / 2;
      const y = ty * tileH + yg / 2;
      const w = tileW - xg;
      const h = tileH - yg;

      const coordSeed = tx * 131 + ty * 97 + tileSeed;
      let curTileColor = tileColor;
      if (tileColorMode === 'alternating') {
        curTileColor = ((tx + ty) % 2 === 0) ? tileColor : tileColor2;
      } else if (tileColorMode === 'random') {
        curTileColor = seededRandom(coordSeed) > 0.5 ? tileColor : tileColor2;
      }
      if (tileShadeRange > 0) {
        curTileColor = shadeColor(curTileColor, tileShadeRange, coordSeed + 7);
      }

      if (tileGradientEnabled && (xgr > 0 || ygr > 0)) {
        const curGradColor = tileShadeRange > 0 ? shadeColor(gradientColor, tileShadeRange * 0.5, coordSeed + 13) : gradientColor;
        const grad = ctx.createLinearGradient(0, y, 0, y + h);
        grad.addColorStop(0, curGradColor);
        grad.addColorStop(Math.min(ygr / h, 0.49), curTileColor);
        grad.addColorStop(Math.max(1 - ygr / h, 0.51), curTileColor);
        grad.addColorStop(1, curGradColor);
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, h);

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        const grad2 = ctx.createLinearGradient(x, 0, x + w, 0);
        grad2.addColorStop(0, curGradColor);
        grad2.addColorStop(Math.min(xgr / w, 0.49), curTileColor);
        grad2.addColorStop(Math.max(1 - xgr / w, 0.51), curTileColor);
        grad2.addColorStop(1, curGradColor);
        ctx.fillStyle = grad2;
        ctx.fillRect(x, y, w, h);
        ctx.restore();
      } else {
        ctx.fillStyle = curTileColor;
        ctx.fillRect(x, y, w, h);
      }
    }
  }

  if (tileTexture > 0) {
    applyBrickTexture(ctx, size, tileTexture, tileSeed, 25);
  }
}

// ─── Textiles ────────────────────────────────────────────────────────────────

enum PatternPart { TOP = 0, MIDDLE = 1, BOTTOM = 2, BLOCK = 3 }
enum PatternDir { HORIZONTAL = 0, VERTICAL = 1 }

function calcTextilesPattern(
  x: number, y: number, dir: PatternDir, part: PatternPart,
  facetlength: number, delta: number, smoothness: number, offset: number,
  steepness: number, depth: number, round: boolean,
): number {
  delta = 1.0 / (8.0 - delta);
  const TwistTrajectory = ((Math.asin(2.0 * y - 1.0) / (Math.PI / 2.0) + 1.0) * facetlength) / 2.0;
  const displacement = 2.0 * ((x + TwistTrajectory) - Math.trunc((x + TwistTrajectory) / delta) * delta) / delta - 1.0;
  const randValue = Math.random() * delta;
  const pdisplacement = smoothness * displacement + (1.0 - smoothness) * randValue;
  const TwistShading = Math.exp(-Math.abs(Math.pow(pdisplacement * depth, round ? 2 : 1)));
  const YShading = offset + (1.0 - offset) * Math.sin(y * Math.PI);
  let tanhValue = 0.5 * steepness;
  const shadingBorder = 0.5;

  if (dir === PatternDir.VERTICAL) {
    if ((part === PatternPart.TOP && x < shadingBorder) ||
        (part === PatternPart.BOTTOM && x > shadingBorder) ||
        part === PatternPart.BLOCK) {
      if (x < shadingBorder) tanhValue = x * steepness;
      else if (x > shadingBorder) tanhValue = (1.0 - x) * steepness;
    }
  }
  if (dir === PatternDir.HORIZONTAL) {
    if ((part === PatternPart.TOP && x < shadingBorder) ||
        (part === PatternPart.BOTTOM && x > shadingBorder) ||
        part === PatternPart.BLOCK) {
      if (x < shadingBorder) tanhValue = x * steepness;
      else if (x > shadingBorder) tanhValue = (1.0 - x) * steepness;
    }
  }

  const XShading = offset + (1.0 - offset) * rationalTanh(tanhValue);
  return TwistShading * XShading * YShading;
}

function createTextilesPatternCanvas(
  dir: PatternDir, part: PatternPart, width: number, height: number,
  facetlength: number, delta: number, smoothness: number, offset: number,
  steepness: number, depth: number, round: boolean, col: RGB, colBg: RGB,
): CanvasPattern | null {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d')!;
  const imgData = ctx.getImageData(0, 0, width, height);
  const d = imgData.data;
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const first = dir === PatternDir.VERTICAL ? y / height : x / width;
      const second = dir === PatternDir.VERTICAL ? x / height : y / width;
      const v = calcTextilesPattern(first, second, dir, part, facetlength, delta, smoothness, offset, steepness, depth, round);
      const i = (x + y * width) * 4;
      d[i] = v * col.r + (1 - v) * colBg.r;
      d[i + 1] = v * col.g + (1 - v) * colBg.g;
      d[i + 2] = v * col.b + (1 - v) * colBg.b;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return ctx.createPattern(c, 'repeat');
}

export type TextilesPatternType = 1 | 2 | 3 | 4 | 5;

const TEXTILE_PATTERNS: Record<TextilesPatternType, number[][]> = {
  1: [[0,1],[1,0]],
  2: [[0,0,1,1],[1,1,0,0]],
  3: [[0,1,0,1],[1,0,1,0],[0,1,0,1],[1,0,1,0]],
  4: [[0,0,1,1],[0,0,1,1],[1,1,0,0],[1,1,0,0]],
  5: [[0,0,0,1,1,1],[0,0,0,1,1,1],[0,0,0,1,1,1],[1,1,1,0,0,0],[1,1,1,0,0,0],[1,1,1,0,0,0]],
};

export function generateTextiles(
  canvas: HTMLCanvasElement,
  size: number,
  color1: string,
  color2: string,
  patternType: TextilesPatternType,
  doubleSize: boolean,
  tightness: number,
  thickness: number,
  smoothness: number,
  shading: number,
) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = size;
  canvas.height = size;
  const col1 = hexToRgb(color1);
  const col2 = hexToRgb(color2);
  const colBg: RGB = { r: 0, g: 0, b: 0 };
  const pat = TEXTILE_PATTERNS[patternType];
  const patW = pat[0].length;
  const patH = pat.length;
  const scale = doubleSize ? 2 : 1;
  const pw = patW * scale;
  const ph = patH * scale;
  const cellW = Math.round(size / pw);
  const cellH = Math.round(size / ph);
  const smoothnessV = 1 - smoothness;

  const patterns: Record<string, CanvasPattern | null> = {};
  for (const dir of [PatternDir.VERTICAL, PatternDir.HORIZONTAL]) {
    for (const part of [PatternPart.TOP, PatternPart.MIDDLE, PatternPart.BOTTOM, PatternPart.BLOCK]) {
      const w = dir === PatternDir.VERTICAL ? cellW : cellH;
      const h = dir === PatternDir.VERTICAL ? cellH : cellW;
      const col = dir === PatternDir.VERTICAL ? col1 : col2;
      patterns[`${dir}-${part}`] = createTextilesPatternCanvas(
        dir, part, w, h, tightness, thickness, smoothnessV, shading, 2, 1, true, col, colBg,
      );
    }
  }

  for (let py = 0; py < ph; py++) {
    for (let px = 0; px < pw; px++) {
      const srcY = py % patH;
      const srcX = px % patW;
      const isVertical = pat[srcY][srcX] === 0;
      const dir = isVertical ? PatternDir.VERTICAL : PatternDir.HORIZONTAL;
      let part: PatternPart;
      if (isVertical) {
        const above = pat[(srcY - 1 + patH) % patH][srcX] === 0;
        const below = pat[(srcY + 1) % patH][srcX] === 0;
        if (above && below) part = PatternPart.MIDDLE;
        else if (above && !below) part = PatternPart.BOTTOM;
        else if (!above && below) part = PatternPart.TOP;
        else part = PatternPart.BLOCK;
      } else {
        const left = pat[srcY][(srcX - 1 + patW) % patW] !== 0;
        const right = pat[srcY][(srcX + 1) % patW] !== 0;
        if (left && right) part = PatternPart.MIDDLE;
        else if (!left && right) part = PatternPart.TOP;
        else if (left && !right) part = PatternPart.BOTTOM;
        else part = PatternPart.BLOCK;
      }
      const p = patterns[`${dir}-${part}`];
      if (p) {
        ctx.fillStyle = p;
        ctx.fillRect(px * cellW, py * cellH, cellW, cellH);
      }
    }
  }
}

// ─── Voxel / Pixel Art ──────────────────────────────────────────────────────

export type VoxelBaseType = 'stone' | 'dirt' | 'deepslate' | 'sandstone' | 'netherrack' | 'rings' | 'bark' | 'custom';

export type OreStyle = 'flat' | 'crystal' | 'metal' | 'jewel';

export type VoxelRenderStyle = 'pixelated' | 'cartoon' | 'realistic' | 'painterly' | 'flat';

export interface VoxelOreLayer {
  color: string;
  highlightColor: string;
  density: number;
  clusterSize: number;
  name: string;
  style: OreStyle;
  oreScale: number;
}

export interface VoxelOptions {
  resolution: number;
  baseType: VoxelBaseType;
  baseColor1: string;
  baseColor2: string;
  baseColor3: string;
  grainStrength: number;
  grainDirection: 'horizontal' | 'vertical' | 'both' | 'none';
  oreLayers: VoxelOreLayer[];
  depthShading: number;
  outlineStrength: number;
  seed: number;
  paletteSize: number;
  renderStyle?: VoxelRenderStyle;
}

const VOXEL_PRESETS: Record<Exclude<VoxelBaseType, 'custom' | 'rings' | 'bark'>, { c1: string; c2: string; c3: string }> = {
  stone:      { c1: '#8b8b8b', c2: '#6b6b6b', c3: '#555555' },
  dirt:       { c1: '#9b7653', c2: '#7a5c3a', c3: '#5c4028' },
  deepslate:  { c1: '#5a5a5e', c2: '#3d3d42', c3: '#2a2a2e' },
  sandstone:  { c1: '#d4c298', c2: '#c4a86e', c3: '#a08850' },
  netherrack: { c1: '#6b2020', c2: '#4a1515', c3: '#3d1010' },
};

function voxelSeeded(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 374.761 + y * 668.265 + seed * 1013.571) * 43758.5453;
  return n - Math.floor(n);
}

function quantizeColor(r: number, g: number, b: number, levels: number): [number, number, number] {
  const step = 255 / (levels - 1);
  return [
    Math.round(Math.round(r / step) * step),
    Math.round(Math.round(g / step) * step),
    Math.round(Math.round(b / step) * step),
  ];
}

export function generateVoxelTexture(
  canvas: HTMLCanvasElement,
  outputSize: number,
  opts: VoxelOptions,
) {
  const { resolution, baseType, grainStrength, grainDirection, oreLayers,
    depthShading, outlineStrength, seed, paletteSize, renderStyle = 'pixelated' } = opts;

  let { baseColor1, baseColor2, baseColor3 } = opts;
  const isSpecialBase = baseType === 'rings' || baseType === 'bark';
  if (baseType !== 'custom' && !isSpecialBase) {
    const preset = VOXEL_PRESETS[baseType];
    baseColor1 = preset.c1;
    baseColor2 = preset.c2;
    baseColor3 = preset.c3;
  }

  const c1 = hexToRgb(baseColor1);
  const c2 = hexToRgb(baseColor2);
  const c3 = hexToRgb(baseColor3);

  const res = resolution;
  const pixels: [number, number, number][] = new Array(res * res);

  // Use simplex noise in normalized (0-1) space so patterns scale correctly at any resolution
  const baseNoise = new SimplexNoise(seed);
  const baseNoise2 = new SimplexNoise(seed + 50);
  const grainNoise = new SimplexNoise(seed + 100);

  // Style-dependent parameters for base generation
  const isCartoon = renderStyle === 'cartoon';
  const isRealistic = renderStyle === 'realistic';
  const isPainterly = renderStyle === 'painterly';
  const isFlat = renderStyle === 'flat';
  // Cartoon: low-frequency noise = big smooth patches; Realistic: multi-octave; Flat: very smooth
  const baseFreq = isCartoon ? 2 : isFlat ? 2.5 : isRealistic ? 6 : 4;
  const baseFreq2 = isCartoon ? 1.5 : isFlat ? 2 : isRealistic ? 8 : 6;
  const grainFreq = isCartoon ? 2 : isFlat ? 2 : isRealistic ? 10 : 6;

  if (baseType === 'rings') {
    const cx = res / 2 + (voxelSeeded(3, 7, seed) - 0.5) * res * 0.06;
    const cy = res / 2 + (voxelSeeded(11, 13, seed) - 0.5) * res * 0.06;
    // Fixed number of rings regardless of resolution — more res = sharper rings
    const ringCount = 8;
    const ringSpacing = (res * 0.45) / ringCount;

    for (let y = 0; y < res; y++) {
      for (let x = 0; x < res; x++) {
        const idx = x + y * res;
        const dx = x - cx, dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Subtle angular wobble using coherent noise in normalized space
        const nx = x / res, ny = y / res;
        const wobble = grainNoise.noise(nx * 4, ny * 4) * ringSpacing * 0.12 * grainStrength;
        const wobbledDist = Math.max(0, dist + wobble);
        const ringPhase = (wobbledDist / ringSpacing) % 1.0;
        const isRingLine = ringPhase < 0.35;
        const ringEdge = isRingLine
          ? Math.min(ringPhase / 0.08, (0.35 - ringPhase) / 0.08, 1.0)
          : 0;

        // Coherent wood grain texture (not per-pixel hash)
        const woodGrain = baseNoise.noise(nx * 6, ny * 6) * 0.04 * grainStrength;

        let r: number, g: number, b: number;
        if (isRingLine) {
          r = c3.r + (c2.r - c3.r) * (1 - ringEdge) * 0.2;
          g = c3.g + (c2.g - c3.g) * (1 - ringEdge) * 0.2;
          b = c3.b + (c2.b - c3.b) * (1 - ringEdge) * 0.2;
        } else {
          const bandPos = (ringPhase - 0.35) / 0.65;
          r = c1.r * (1 - bandPos * 0.2) + c2.r * (bandPos * 0.2);
          g = c1.g * (1 - bandPos * 0.2) + c2.g * (bandPos * 0.2);
          b = c1.b * (1 - bandPos * 0.2) + c2.b * (bandPos * 0.2);
        }
        pixels[idx] = [
          Math.max(0, Math.min(255, r + woodGrain * 255)),
          Math.max(0, Math.min(255, g + woodGrain * 255)),
          Math.max(0, Math.min(255, b + woodGrain * 255)),
        ];
      }
    }
  } else if (baseType === 'bark') {
    // Fixed visual fissure count — resolution just adds sharpness
    const fissureCount = 6;

    for (let y = 0; y < res; y++) {
      for (let x = 0; x < res; x++) {
        const idx = x + y * res;
        const nx = x / res;
        const ny = y / res;
        // All noise in normalized space — same look at any resolution
        const warp = baseNoise.noise(nx * 3, ny * 2) * 0.15;
        const fissure = Math.sin((nx + warp) * fissureCount * Math.PI * 2);
        const fissureV = (fissure + 1) * 0.5;
        const vertGrain = grainNoise.noise(nx * 2, ny * 8) * grainStrength * 0.3;
        const hRidge = baseNoise2.noise(nx * 5, ny * 12) * 0.12;

        const v = Math.max(0, Math.min(1, fissureV * 0.7 + vertGrain + hRidge + 0.15));

        let r: number, g: number, b: number;
        if (v < 0.35) {
          const u = v / 0.35;
          r = c3.r * (1 - u) + c2.r * u;
          g = c3.g * (1 - u) + c2.g * u;
          b = c3.b * (1 - u) + c2.b * u;
        } else {
          const u = (v - 0.35) / 0.65;
          r = c2.r * (1 - u) + c1.r * u;
          g = c2.g * (1 - u) + c1.g * u;
          b = c2.b * (1 - u) + c1.b * u;
        }
        pixels[idx] = [
          Math.max(0, Math.min(255, r)),
          Math.max(0, Math.min(255, g)),
          Math.max(0, Math.min(255, b)),
        ];
      }
    }
  } else {
    for (let y = 0; y < res; y++) {
      for (let x = 0; x < res; x++) {
        const idx = x + y * res;
        const nx = x / res, ny = y / res;
        const n1raw = baseNoise.noise(nx * baseFreq, ny * baseFreq);
        const n2raw = baseNoise2.noise(nx * baseFreq2, ny * baseFreq2);
        // Cartoon/flat: hard-step the noise into discrete patches
        let n1 = (n1raw + 1) * 0.5;
        let n2 = (n2raw + 1) * 0.5;
        if (isCartoon) {
          n1 = Math.round(n1 * 2) / 2; // 3 discrete levels
          n2 = Math.round(n2 * 2) / 2;
        } else if (isFlat) {
          n1 = Math.round(n1 * 3) / 3;
          n2 = Math.round(n2 * 3) / 3;
        }

        let grain = 0;
        if (grainDirection === 'horizontal') grain = grainNoise.noise(nx * grainFreq * 0.5, ny * grainFreq * 2) * grainStrength;
        else if (grainDirection === 'vertical') grain = grainNoise.noise(nx * grainFreq * 2, ny * grainFreq * 0.5) * grainStrength;
        else if (grainDirection === 'both') grain = grainNoise.noise(nx * grainFreq, ny * grainFreq) * grainStrength;
        if (isCartoon) grain *= 0.3;

        // Realistic: add a second octave of finer detail
        if (isRealistic) {
          const fine = baseNoise.noise(nx * 12, ny * 12) * 0.08;
          n1 = Math.max(0, Math.min(1, n1 + fine));
        }

        let baseR: number, baseG: number, baseB: number;
        if (n1 < 0.35) {
          const t = isCartoon ? 0 : n2 * 0.3;
          baseR = c1.r * (1 - t) + c2.r * t;
          baseG = c1.g * (1 - t) + c2.g * t;
          baseB = c1.b * (1 - t) + c2.b * t;
        } else if (n1 < 0.7) {
          const t = isCartoon ? 0 : n2 * 0.3;
          baseR = c2.r * (1 - t) + c3.r * t;
          baseG = c2.g * (1 - t) + c3.g * t;
          baseB = c2.b * (1 - t) + c3.b * t;
        } else {
          const t = isCartoon ? 0 : n2 * 0.4;
          baseR = c3.r * (1 - t) + c1.r * t;
          baseG = c3.g * (1 - t) + c1.g * t;
          baseB = c3.b * (1 - t) + c1.b * t;
        }

        baseR += grain * 40;
        baseG += grain * 40;
        baseB += grain * 40;

        pixels[idx] = [
          Math.max(0, Math.min(255, baseR)),
          Math.max(0, Math.min(255, baseG)),
          Math.max(0, Math.min(255, baseB)),
        ];
      }
    }
  }

  for (let oi = 0; oi < oreLayers.length; oi++) {
    const ore = oreLayers[oi];
    if (ore.density <= 0) continue;
    const oreCol = hexToRgb(ore.color);
    const hlCol = hexToRgb(ore.highlightColor);
    const darkCol: RGB = { r: oreCol.r * 0.4, g: oreCol.g * 0.4, b: oreCol.b * 0.4 };
    const style = ore.style || 'flat';
    const isHiRes = res >= 64;
    const oreScale = ore.oreScale || 1;
    const blobRadius = Math.max(1, Math.round(ore.clusterSize * oreScale * (res / 16)));

    const oreNoise = new SimplexNoise(seed + oi * 73);
    const blobMap = new Float32Array(res * res);
    const edgeMargin = Math.max(1, Math.ceil(blobRadius * 0.5));
    for (let y = 0; y < res; y++) {
      for (let x = 0; x < res; x++) {
        const noiseScale = 3 + (1 / Math.max(oreScale, 0.5)) * 2;
        const n = oreNoise.simplexNoise(NoiseType.FRACTAL, res, 3, 0.5, 1, noiseScale, x, y);
        const threshold = 1 - ore.density * 0.012;
        let val = n > threshold ? (n - threshold) / (1 - threshold) : 0;
        const distToEdge = Math.min(x, y, res - 1 - x, res - 1 - y);
        if (distToEdge < edgeMargin) {
          val *= distToEdge / edgeMargin;
        }
        blobMap[x + y * res] = val;
      }
    }

    for (let y = 0; y < res; y++) {
      for (let x = 0; x < res; x++) {
        const blobV = blobMap[x + y * res];
        if (blobV <= 0) continue;

        const idx = x + y * res;
        const localR = voxelSeeded(x + 50, y + 50, seed + oi * 200);

        let nearestEdge = 1.0;
        const checkR = Math.min(blobRadius, 8);
        for (let dy = -checkR; dy <= checkR; dy++) {
          for (let dx = -checkR; dx <= checkR; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            const outOfBounds = nx < 0 || nx >= res || ny < 0 || ny >= res;
            if (outOfBounds || blobMap[nx + ny * res] <= 0) {
              const d = Math.sqrt(dx * dx + dy * dy) / blobRadius;
              nearestEdge = Math.min(nearestEdge, d);
            }
          }
        }
        const dist = 1 - Math.min(nearestEdge * 2, 1);

        if (style === 'crystal') {
          const facetAngle = Math.abs(((x + y * 1.5 + seed) % (5 * oreScale)) / (5 * oreScale) - 0.5) * 2;
          const edgeDist = dist;
          const facet = facetAngle * 0.6 + (1 - edgeDist) * 0.4;
          const specular = (isHiRes && localR > 0.85) ? 1.0 : 0;
          const t = Math.min(1, facet + specular * 0.5);
          pixels[idx] = [
            Math.min(255, oreCol.r * (1 - t) + hlCol.r * t + specular * 80),
            Math.min(255, oreCol.g * (1 - t) + hlCol.g * t + specular * 80),
            Math.min(255, oreCol.b * (1 - t) + hlCol.b * t + specular * 80),
          ];
          if (dist > 0.7) {
            const edge = (dist - 0.7) / 0.3;
            pixels[idx][0] = pixels[idx][0] * (1 - edge) + darkCol.r * edge;
            pixels[idx][1] = pixels[idx][1] * (1 - edge) + darkCol.g * edge;
            pixels[idx][2] = pixels[idx][2] * (1 - edge) + darkCol.b * edge;
          }
        } else if (style === 'metal') {
          const brushAngle = voxelSeeded(x * 2, y, seed + oi * 77);
          const brushLine = Math.sin((x + y * 0.3) * (1.5 / oreScale) + seed) * 0.5 + 0.5;
          const reflectivity = (1 - dist * 0.4) * (0.6 + brushLine * 0.4);
          const specHit = (isHiRes && localR > 0.9) ? 0.8 : 0;
          const t = reflectivity * 0.7 + brushAngle * 0.2 + specHit;
          pixels[idx] = [
            Math.min(255, oreCol.r * (1 - t) + hlCol.r * t + specHit * 100),
            Math.min(255, oreCol.g * (1 - t) + hlCol.g * t + specHit * 100),
            Math.min(255, oreCol.b * (1 - t) + hlCol.b * t + specHit * 100),
          ];
          if (dist > 0.8) {
            const edge = (dist - 0.8) / 0.2;
            pixels[idx][0] = pixels[idx][0] * (1 - edge * 0.4) + darkCol.r * edge * 0.4;
            pixels[idx][1] = pixels[idx][1] * (1 - edge * 0.4) + darkCol.g * edge * 0.4;
            pixels[idx][2] = pixels[idx][2] * (1 - edge * 0.4) + darkCol.b * edge * 0.4;
          }
        } else if (style === 'jewel') {
          const cx = x, cy = y;
          let avgX = 0, avgY = 0, count = 0;
          const scanR = Math.min(blobRadius, 6);
          for (let dy = -scanR; dy <= scanR; dy++) {
            for (let dx = -scanR; dx <= scanR; dx++) {
              const nx = cx + dx;
              const ny = cy + dy;
              if (nx >= 0 && nx < res && ny >= 0 && ny < res && blobMap[nx + ny * res] > 0) { avgX += dx; avgY += dy; count++; }
            }
          }
          if (count > 0) { avgX /= count; avgY /= count; }
          const angleFromCenter = Math.atan2(-avgY, -avgX);
          const facetCount = 6;
          const facetPhase = ((angleFromCenter / (Math.PI * 2) * facetCount) % 1 + 1) % 1;
          const facetBright = Math.abs(facetPhase - 0.5) * 2;
          const radialGrad = 1 - dist * 0.6;
          const brilliance = facetBright * 0.5 + radialGrad * 0.5;
          const specular = (localR > 0.82 && dist < 0.4) ? 1.0 : 0;
          const t = Math.min(1, brilliance + specular * 0.6);
          pixels[idx] = [
            Math.min(255, darkCol.r * (1 - t) + hlCol.r * t + specular * 120),
            Math.min(255, darkCol.g * (1 - t) + hlCol.g * t + specular * 120),
            Math.min(255, darkCol.b * (1 - t) + hlCol.b * t + specular * 120),
          ];
          if (dist > 0.8) {
            pixels[idx][0] = darkCol.r * 0.8;
            pixels[idx][1] = darkCol.g * 0.8;
            pixels[idx][2] = darkCol.b * 0.8;
          }
        } else {
          const isHighlight = localR > 0.6;
          pixels[idx] = isHighlight
            ? [hlCol.r, hlCol.g, hlCol.b]
            : [oreCol.r, oreCol.g, oreCol.b];
        }
      }
    }
  }


  // ─── Style-specific post-processing ─────────────────────────────────────

  if (isCartoon) {
    // Posterize BRIGHTNESS into bands while preserving color ratios
    const bands = 4;
    for (let i = 0; i < pixels.length; i++) {
      const [pr, pg, pb] = pixels[i];
      const lum = Math.max(1, pr * 0.299 + pg * 0.587 + pb * 0.114);
      const bandedLum = Math.round(lum / 255 * (bands - 1)) / (bands - 1) * 255;
      const scale = bandedLum / lum;
      pixels[i] = [
        Math.max(0, Math.min(255, pr * scale)),
        Math.max(0, Math.min(255, pg * scale)),
        Math.max(0, Math.min(255, pb * scale)),
      ];
    }
    // Slight saturation boost for vibrancy
    for (let i = 0; i < pixels.length; i++) {
      const [pr, pg, pb] = pixels[i];
      const gray = pr * 0.299 + pg * 0.587 + pb * 0.114;
      const sat = 1.2;
      pixels[i] = [
        Math.max(0, Math.min(255, gray + (pr - gray) * sat)),
        Math.max(0, Math.min(255, gray + (pg - gray) * sat)),
        Math.max(0, Math.min(255, gray + (pb - gray) * sat)),
      ];
    }
  } else if (isRealistic) {
    // Multi-scale detail: add medium and fine noise layers
    const medNoise = new SimplexNoise(seed + 999);
    const fineNoise = new SimplexNoise(seed + 1234);
    for (let y = 0; y < res; y++) {
      for (let x = 0; x < res; x++) {
        const idx = x + y * res;
        const nx = x / res, ny = y / res;
        const med = medNoise.noise(nx * 10, ny * 10) * 8;
        const fine = fineNoise.noise(nx * 20, ny * 20) * 4;
        pixels[idx][0] = Math.max(0, Math.min(255, pixels[idx][0] + med + fine));
        pixels[idx][1] = Math.max(0, Math.min(255, pixels[idx][1] + med * 0.9 + fine * 0.9));
        pixels[idx][2] = Math.max(0, Math.min(255, pixels[idx][2] + med * 0.8 + fine * 0.8));
      }
    }
  } else if (isPainterly) {
    // Multi-pass directional smear at resolution-proportional radius
    const brushNoise = new SimplexNoise(seed + 777);
    const smearR = Math.max(1, Math.round(res * 0.06));
    for (let pass = 0; pass < 2; pass++) {
      const src = pixels.map(p => [...p] as [number, number, number]);
      for (let y = 0; y < res; y++) {
        for (let x = 0; x < res; x++) {
          const idx = x + y * res;
          const nx = x / res, ny = y / res;
          const angle = brushNoise.noise(nx * 3 + pass, ny * 3 + pass) * Math.PI;
          const ddx = Math.round(Math.cos(angle) * smearR);
          const ddy = Math.round(Math.sin(angle) * smearR);
          const sx = Math.max(0, Math.min(res - 1, x + ddx));
          const sy = Math.max(0, Math.min(res - 1, y + ddy));
          const srcIdx = sx + sy * res;
          const blend = 0.45;
          pixels[idx] = [
            src[idx][0] * (1 - blend) + src[srcIdx][0] * blend,
            src[idx][1] * (1 - blend) + src[srcIdx][1] * blend,
            src[idx][2] * (1 - blend) + src[srcIdx][2] * blend,
          ];
        }
      }
    }
  } else if (isFlat) {
    // Posterize brightness into few bands, preserving color ratios
    const bands = 3;
    for (let i = 0; i < pixels.length; i++) {
      const [pr, pg, pb] = pixels[i];
      const lum = Math.max(1, pr * 0.299 + pg * 0.587 + pb * 0.114);
      const bandedLum = Math.round(lum / 255 * (bands - 1)) / (bands - 1) * 255;
      const scale = bandedLum / lum;
      pixels[i] = [
        Math.max(0, Math.min(255, pr * scale)),
        Math.max(0, Math.min(255, pg * scale)),
        Math.max(0, Math.min(255, pb * scale)),
      ];
    }
    // Desaturate slightly for minimal aesthetic
    for (let i = 0; i < pixels.length; i++) {
      const [pr, pg, pb] = pixels[i];
      const gray = pr * 0.299 + pg * 0.587 + pb * 0.114;
      pixels[i] = [
        gray * 0.2 + pr * 0.8,
        gray * 0.2 + pg * 0.8,
        gray * 0.2 + pb * 0.8,
      ];
    }
  }

  // Depth shading — scaled per edge width proportional to resolution
  if (depthShading > 0) {
    const edgePx = isRealistic ? Math.max(2, Math.round(res * 0.06))
      : isCartoon ? Math.max(1, Math.round(res * 0.08))
      : Math.max(1, Math.round(res * 0.04));
    const strength = isCartoon ? depthShading * 0.5 : isFlat ? depthShading * 0.3 : depthShading;
    for (let y = 0; y < res; y++) {
      for (let x = 0; x < res; x++) {
        const idx = x + y * res;
        const edge = Math.min(x, y, res - 1 - x, res - 1 - y);
        if (edge < edgePx) {
          const factor = 1 - strength * (1 - edge / edgePx) * 0.4;
          pixels[idx][0] *= factor;
          pixels[idx][1] *= factor;
          pixels[idx][2] *= factor;
        }
      }
    }
  }

  // Outlines
  if (outlineStrength > 0 || isCartoon) {
    const outlined = pixels.map(p => [...p] as [number, number, number]);
    for (let y = 0; y < res; y++) {
      for (let x = 0; x < res; x++) {
        const idx = x + y * res;
        const cur = pixels[idx];
        let diff = 0;
        for (const [ddx, ddy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
          const nx2 = (x + ddx + res) % res;
          const ny2 = (y + ddy + res) % res;
          const nb = pixels[nx2 + ny2 * res];
          diff += Math.abs(cur[0] - nb[0]) + Math.abs(cur[1] - nb[1]) + Math.abs(cur[2] - nb[2]);
        }
        if (isCartoon) {
          // Bold black outlines between color regions
          if (diff > 30) {
            outlined[idx] = [
              cur[0] * 0.15,
              cur[1] * 0.15,
              cur[2] * 0.15,
            ];
          }
        } else if (isFlat) {
          if (diff > 100 * (1.1 - outlineStrength)) {
            outlined[idx] = [cur[0] * 0.7, cur[1] * 0.7, cur[2] * 0.7];
          }
        } else if (isRealistic) {
          // Very subtle ambient-occlusion-like darkening
          if (diff > 120) {
            const d = Math.min(1, (diff - 120) / 200) * outlineStrength * 0.2;
            outlined[idx] = [cur[0] * (1 - d), cur[1] * (1 - d), cur[2] * (1 - d)];
          }
        } else {
          if (diff > 80 * (1.1 - outlineStrength)) {
            const darken = 1 - outlineStrength * 0.5;
            outlined[idx] = [cur[0] * darken, cur[1] * darken, cur[2] * darken];
          }
        }
      }
    }
    for (let i = 0; i < pixels.length; i++) pixels[i] = outlined[i];
  }

  // Color quantization (skip for cartoon/flat since they already posterized)
  if (!isCartoon && !isFlat && !isRealistic && paletteSize > 0 && paletteSize < 32) {
    for (let i = 0; i < pixels.length; i++) {
      pixels[i] = quantizeColor(pixels[i][0], pixels[i][1], pixels[i][2], paletteSize);
    }
  }

  // ─── Final render to canvas ─────────────────────────────────────────────

  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d')!;

  const tmp = document.createElement('canvas');
  tmp.width = res;
  tmp.height = res;
  const tCtx = tmp.getContext('2d')!;
  const imgData = tCtx.getImageData(0, 0, res, res);
  const d = imgData.data;
  for (let i = 0; i < pixels.length; i++) {
    d[i * 4] = pixels[i][0];
    d[i * 4 + 1] = pixels[i][1];
    d[i * 4 + 2] = pixels[i][2];
    d[i * 4 + 3] = 255;
  }
  tCtx.putImageData(imgData, 0, 0);

  // Realistic/painterly use bilinear smoothing; pixelated/cartoon/flat use nearest-neighbor
  const smooth = isRealistic || isPainterly;
  ctx.imageSmoothingEnabled = smooth;
  if (smooth) ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(tmp, 0, 0, outputSize, outputSize);
}

// ─── Voxel Block (Top / Sides / Bottom) ─────────────────────────────────────

export interface VoxelBlockFace {
  baseType: VoxelBaseType;
  baseColor1: string;
  baseColor2: string;
  baseColor3: string;
  grainStrength: number;
  grainDirection: 'horizontal' | 'vertical' | 'both' | 'none';
  oreLayers: VoxelOreLayer[];
  depthShading: number;
  outlineStrength: number;
  paletteSize: number;
  renderStyle?: VoxelRenderStyle;
}

export type VoxelBlockSideMode = 'uniform' | 'gradient_top' | 'gradient_bottom' | 'split';
export type SideTransitionPattern = 'straight' | 'jagged' | 'mossy' | 'layered' | 'drip' | 'rounded';

export interface VoxelBlockOptions {
  resolution: number;
  seed: number;
  top: VoxelBlockFace;
  side: VoxelBlockFace;
  bottom: VoxelBlockFace;
  sideMode: VoxelBlockSideMode;
  sideSplitPos: number;
  sideTopFace: VoxelBlockFace;
  transitionPattern: SideTransitionPattern;
  transitionNoise: number;
}

export function generateVoxelBlockFace(
  canvas: HTMLCanvasElement,
  outputSize: number,
  face: VoxelBlockFace,
  resolution: number,
  seed: number,
) {
  generateVoxelTexture(canvas, outputSize, {
    resolution,
    baseType: face.baseType,
    baseColor1: face.baseColor1,
    baseColor2: face.baseColor2,
    baseColor3: face.baseColor3,
    grainStrength: face.grainStrength,
    grainDirection: face.grainDirection,
    oreLayers: face.oreLayers,
    depthShading: face.depthShading,
    outlineStrength: face.outlineStrength,
    seed,
    paletteSize: face.paletteSize,
    renderStyle: face.renderStyle,
  });
}

function getTransitionOffset(
  x: number, res: number, pattern: SideTransitionPattern, noise: number, seed: number,
): number {
  const nx = x / res;
  switch (pattern) {
    case 'straight': return 0;
    case 'jagged': {
      const v = voxelSeeded(x * 5, 0, seed + 400);
      return (v - 0.5) * noise * res * 0.3;
    }
    case 'mossy': {
      const v1 = Math.sin(nx * Math.PI * 6 + seed) * 0.3;
      const v2 = voxelSeeded(x * 3, 1, seed + 500) - 0.5;
      return (v1 + v2 * 0.7) * noise * res * 0.25;
    }
    case 'layered': {
      const band = Math.sin(nx * Math.PI * 3 + seed * 0.1) * 0.5;
      return band * noise * res * 0.15;
    }
    case 'drip': {
      const drip = Math.pow(Math.sin(nx * Math.PI * 4 + seed * 0.3), 2);
      const randDrip = voxelSeeded(x * 2, 2, seed + 600);
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

export function generateVoxelBlockSide(
  canvas: HTMLCanvasElement,
  outputSize: number,
  opts: VoxelBlockOptions,
) {
  const { resolution, seed, side, sideMode, sideSplitPos, sideTopFace,
    transitionPattern = 'straight', transitionNoise = 0.5 } = opts;
  const res = resolution;

  const topCanvas = document.createElement('canvas');
  generateVoxelBlockFace(topCanvas, res, sideTopFace, res, seed + 10);
  const topCtx = topCanvas.getContext('2d')!;
  const topData = topCtx.getImageData(0, 0, res, res);

  const botCanvas = document.createElement('canvas');
  generateVoxelBlockFace(botCanvas, res, side, res, seed + 20);
  const botCtx = botCanvas.getContext('2d')!;
  const botData = botCtx.getImageData(0, 0, res, res);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = res;
  outCanvas.height = res;
  const outCtx = outCanvas.getContext('2d')!;
  const outImgData = outCtx.getImageData(0, 0, res, res);
  const d = outImgData.data;

  const baseSplitRow = Math.round(res * sideSplitPos);

  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const i = (x + y * res) * 4;
      if (sideMode === 'uniform') {
        d[i] = botData.data[i];
        d[i + 1] = botData.data[i + 1];
        d[i + 2] = botData.data[i + 2];
        d[i + 3] = 255;
      } else {
        const offset = getTransitionOffset(x, res, transitionPattern, transitionNoise, seed);
        const splitRow = baseSplitRow + offset;

        if (sideMode === 'split') {
          const src = y < splitRow ? topData.data : botData.data;
          d[i] = src[i]; d[i + 1] = src[i + 1]; d[i + 2] = src[i + 2]; d[i + 3] = 255;
        } else if (sideMode === 'gradient_top') {
          const t = Math.max(0, Math.min(1, (y - splitRow * 0.5) / Math.max(splitRow, 1)));
          d[i] = topData.data[i] * (1 - t) + botData.data[i] * t;
          d[i + 1] = topData.data[i + 1] * (1 - t) + botData.data[i + 1] * t;
          d[i + 2] = topData.data[i + 2] * (1 - t) + botData.data[i + 2] * t;
          d[i + 3] = 255;
        } else {
          const t = Math.max(0, Math.min(1, 1 - (res - y - (res - splitRow) * 0.5) / Math.max(res - splitRow, 1)));
          d[i] = botData.data[i] * (1 - t) + topData.data[i] * t;
          d[i + 1] = botData.data[i + 1] * (1 - t) + topData.data[i + 1] * t;
          d[i + 2] = botData.data[i + 2] * (1 - t) + topData.data[i + 2] * t;
          d[i + 3] = 255;
        }
      }
    }
  }
  outCtx.putImageData(outImgData, 0, 0);

  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(outCanvas, 0, 0, outputSize, outputSize);
}

export function renderIsometricPreview(
  canvas: HTMLCanvasElement,
  topCanvas: HTMLCanvasElement,
  leftSideCanvas: HTMLCanvasElement,
  rightSideCanvas: HTMLCanvasElement,
  previewSize: number,
  skipShading = false,
  skipClear = false,
) {
  const size = previewSize;
  if (!skipClear) {
    canvas.width = size;
    canvas.height = size;
  }
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  if (!skipClear) ctx.clearRect(0, 0, size, size);

  const w = Math.floor(size * 0.3);
  const sideH = w;
  const cx = size / 2;
  const totalH = Math.floor(w * 1.5);
  const dcy = Math.floor((size - totalH) / 2 + w / 2);

  // Top face — isometric diamond
  ctx.save();
  ctx.translate(cx, dcy);
  ctx.transform(1, 0.5, -1, 0.5, 0, 0);
  ctx.drawImage(topCanvas, -w / 2, -w / 2, w, w);
  ctx.restore();

  // Left side face
  ctx.save();
  ctx.translate(cx - w, dcy);
  ctx.transform(1, 0.5, 0, 1, 0, 0);
  ctx.scale(w / leftSideCanvas.width, sideH / leftSideCanvas.height);
  ctx.drawImage(leftSideCanvas, 0, 0);
  if (!skipShading) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, leftSideCanvas.width, leftSideCanvas.height);
  }
  ctx.restore();

  // Right side face
  ctx.save();
  ctx.translate(cx, dcy + w / 2);
  ctx.transform(1, -0.5, 0, 1, 0, 0);
  ctx.scale(w / rightSideCanvas.width, sideH / rightSideCanvas.height);
  ctx.drawImage(rightSideCanvas, 0, 0);
  if (!skipShading) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, rightSideCanvas.width, rightSideCanvas.height);
  }
  ctx.restore();
}

// ─── Cartoon Ore ──────────────────────────────────────────────────────────────

export type CartoonOreShape = 'pentagon' | 'hexagon' | 'octagon' | 'diamond' | 'triangle' | 'square' | 'round' | 'flower' | 'mixed';

export interface CartoonOreLayer {
  color: string;
  highlightColor: string;
  shape: CartoonOreShape;
  count: number;
  minSize: number;
  maxSize: number;
  name: string;
  useGradient?: boolean;
}

export interface CartoonOreOptions {
  baseColor1: string;
  baseColor2: string;
  baseColor3: string;
  bgNoise: number;
  bgPatchSize: number;
  bgGradient?: boolean;
  oreLayers: CartoonOreLayer[];
  seed: number;
  outlineWidth: number;
  shadowStrength: number;
}

function drawPolygon(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, sides: number, rotation: number) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = rotation + (Math.PI * 2 * i) / sides - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawFlower(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, petals: number, rotation: number) {
  ctx.beginPath();
  const points = petals * 2;
  for (let i = 0; i < points; i++) {
    const angle = rotation + (Math.PI * 2 * i) / points - Math.PI / 2;
    const r = i % 2 === 0 ? radius : radius * 0.5;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else {
      const prevAngle = rotation + (Math.PI * 2 * (i - 0.5)) / points - Math.PI / 2;
      const cpR = i % 2 === 0 ? radius * 0.85 : radius * 0.7;
      const cpx = cx + cpR * Math.cos(prevAngle);
      const cpy = cy + cpR * Math.sin(prevAngle);
      ctx.quadraticCurveTo(cpx, cpy, x, y);
    }
  }
  ctx.closePath();
}

function drawOreShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, shape: CartoonOreShape, sides: number, rotation: number) {
  if (shape === 'round') {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.closePath();
  } else if (shape === 'flower') {
    drawFlower(ctx, cx, cy, radius, 5 + Math.round(sides / 2), rotation);
  } else {
    drawPolygon(ctx, cx, cy, radius, sides, rotation);
  }
}

function sidesForShape(shape: CartoonOreShape, rng: () => number): number {
  switch (shape) {
    case 'triangle': return 3;
    case 'square': return 4;
    case 'diamond': return 4;
    case 'pentagon': return 5;
    case 'hexagon': return 6;
    case 'octagon': return 8;
    case 'round': return 0;
    case 'flower': return 5;
    case 'mixed': return [3, 4, 5, 6, 8, 0, 5][Math.floor(rng() * 7)];
  }
}

function mixedShapeType(sides: number): CartoonOreShape {
  if (sides === 0) return 'round';
  if (sides === 5) return 'flower';
  return 'pentagon';
}

export function generateCartoonOre(
  canvas: HTMLCanvasElement,
  size: number,
  opts: CartoonOreOptions,
) {
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const rng = makeRng(opts.seed);

  const bg1 = hexToRgb(opts.baseColor1);
  const bg2 = hexToRgb(opts.baseColor2);
  const bg3 = hexToRgb(opts.baseColor3);
  const bgColors = [bg1, bg2, bg3];

  const S = new SimplexNoise(opts.seed);
  const patchScale = opts.bgPatchSize > 0 ? opts.bgPatchSize : 30;

  if (opts.bgGradient) {
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, opts.baseColor1);
    grad.addColorStop(0.5, opts.baseColor2);
    grad.addColorStop(1, opts.baseColor3);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    if (opts.bgNoise > 0) {
      const imgData = ctx.getImageData(0, 0, size, size);
      const d = imgData.data;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const n = S.noise(x / patchScale, y / patchScale) * opts.bgNoise * 40;
          const i = (y * size + x) * 4;
          d[i]     = Math.max(0, Math.min(255, d[i] + n));
          d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
          d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }
  } else {
    const imgData = ctx.createImageData(size, size);
    const d = imgData.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const n1 = S.noise(x / patchScale, y / patchScale) * 0.5 + 0.5;
        const n2 = S.noise(x / (patchScale * 0.7) + 100, y / (patchScale * 0.7) + 100) * 0.5 + 0.5;
        const blend = n1 * opts.bgNoise + (1 - opts.bgNoise) * 0.5;
        const ci = Math.floor(n2 * 2.99);
        const base = bgColors[ci];
        const brightness = 0.85 + blend * 0.3;
        const i = (y * size + x) * 4;
        d[i]     = Math.min(255, base.r * brightness);
        d[i + 1] = Math.min(255, base.g * brightness);
        d[i + 2] = Math.min(255, base.b * brightness);
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  for (const layer of opts.oreLayers) {
    const baseRgb = hexToRgb(layer.color);
    const hiRgb = hexToRgb(layer.highlightColor);
    const shadowR = Math.max(0, baseRgb.r * 0.55);
    const shadowG = Math.max(0, baseRgb.g * 0.55);
    const shadowB = Math.max(0, baseRgb.b * 0.55);
    const useGrad = layer.useGradient !== false;

    for (let c = 0; c < layer.count; c++) {
      const radius = layer.minSize + rng() * (layer.maxSize - layer.minSize);
      const margin = radius + (opts.outlineWidth || 0);
      const cx = margin + rng() * (size - margin * 2);
      const cy = margin + rng() * (size - margin * 2);
      let sides = sidesForShape(layer.shape, rng);
      const actualShape = layer.shape === 'mixed' ? mixedShapeType(sides) : layer.shape;
      if (actualShape === 'flower') sides = 4 + Math.floor(rng() * 4);
      const rot = rng() * Math.PI * 2;

      if (opts.shadowStrength > 0) {
        ctx.save();
        drawOreShape(ctx, cx + radius * 0.15, cy + radius * 0.2, radius * 1.05, actualShape, sides, rot);
        ctx.fillStyle = `rgba(0,0,0,${opts.shadowStrength * 0.4})`;
        ctx.fill();
        ctx.restore();
      }

      drawOreShape(ctx, cx, cy, radius, actualShape, sides, rot);

      if (useGrad) {
        const grad = ctx.createRadialGradient(
          cx + Math.cos(rot - Math.PI / 4) * radius * 0.25,
          cy + Math.sin(rot - Math.PI / 4) * radius * 0.25,
          0, cx, cy, radius
        );
        grad.addColorStop(0, layer.highlightColor);
        grad.addColorStop(0.45, layer.color);
        grad.addColorStop(1, `rgb(${shadowR},${shadowG},${shadowB})`);
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = layer.color;
      }
      ctx.fill();

      if (opts.outlineWidth > 0) {
        ctx.strokeStyle = `rgb(${shadowR},${shadowG},${shadowB})`;
        ctx.lineWidth = opts.outlineWidth;
        ctx.stroke();
      }

      if (!useGrad) {
        ctx.save();
        drawOreShape(ctx, cx, cy, radius, actualShape, sides, rot);
        ctx.clip();

        const hiAngle = rot - Math.PI / 4;
        const hiX = cx + Math.cos(hiAngle) * radius * 0.3;
        const hiY = cy + Math.sin(hiAngle) * radius * 0.3;
        drawOreShape(ctx, hiX, hiY, radius * 0.55, actualShape, sides, rot);
        ctx.fillStyle = layer.highlightColor;
        ctx.fill();

        drawOreShape(ctx, hiX + Math.cos(hiAngle) * radius * 0.15, hiY + Math.sin(hiAngle) * radius * 0.15, radius * 0.25, actualShape, sides, rot);
        ctx.fillStyle = `rgba(${hiRgb.r},${hiRgb.g},${hiRgb.b},0.7)`;
        ctx.fill();

        const shAngle = rot + Math.PI * 0.75;
        const shX = cx + Math.cos(shAngle) * radius * 0.3;
        const shY = cy + Math.sin(shAngle) * radius * 0.3;
        drawOreShape(ctx, shX, shY, radius * 0.6, actualShape, sides, rot + Math.PI);
        ctx.fillStyle = `rgba(${shadowR},${shadowG},${shadowB},0.5)`;
        ctx.fill();

        ctx.restore();
      }
    }
  }
}

// ─── Hexagon Pattern ──────────────────────────────────────────────────────────

export function generateHexagon(
  canvas: HTMLCanvasElement,
  size: number,
  color1: string,
  color2: string,
  groutColor: string,
  columns: number,
  groutSize: number,
  shadeRange: number,
  seed: number,
  useGradient: boolean = false,
) {
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = groutColor;
  ctx.fillRect(0, 0, size, size);

  const hexWidth = size / columns;
  const hexRadius = hexWidth / 2;
  const hexHeight = hexRadius * Math.sqrt(3);
  const rows = Math.ceil(size / hexHeight) + 1;

  const rng = makeRng(seed);
  const col1 = hexToRgb(color1);
  const col2 = hexToRgb(color2);
  const inset = groutSize / 2;

  for (let row = -1; row <= rows; row++) {
    for (let col = -1; col <= columns + 1; col++) {
      const cx = col * hexWidth + (row % 2 === 0 ? 0 : hexWidth / 2);
      const cy = row * hexHeight;

      const shade = 1.0 - shadeRange + rng() * shadeRange * 2;
      const useColor2 = rng() > 0.5;
      const base = useColor2 ? col2 : col1;

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const r = hexRadius - inset;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      if (useGradient) {
        const grad = ctx.createRadialGradient(cx, cy - hexRadius * 0.3, 0, cx, cy, hexRadius);
        grad.addColorStop(0, `rgb(${Math.min(255, base.r * shade * 1.2)},${Math.min(255, base.g * shade * 1.2)},${Math.min(255, base.b * shade * 1.2)})`);
        grad.addColorStop(1, `rgb(${Math.min(255, base.r * shade * 0.75)},${Math.min(255, base.g * shade * 0.75)},${Math.min(255, base.b * shade * 0.75)})`);
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = `rgb(${Math.min(255, base.r * shade)},${Math.min(255, base.g * shade)},${Math.min(255, base.b * shade)})`;
      }
      ctx.fill();
    }
  }
}

// ─── Octagon Pattern ──────────────────────────────────────────────────────────

export function generateOctagon(
  canvas: HTMLCanvasElement,
  size: number,
  color1: string,
  color2: string,
  groutColor: string,
  columns: number,
  groutSize: number,
  shadeRange: number,
  seed: number,
  useGradient: boolean = false,
) {
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = groutColor;
  ctx.fillRect(0, 0, size, size);

  const cellSize = size / columns;
  const rows = columns;
  const rng = makeRng(seed);
  const col1 = hexToRgb(color1);
  const col2 = hexToRgb(color2);
  const inset = groutSize / 2;

  const octCut = cellSize * 0.293;

  for (let row = -1; row <= rows; row++) {
    for (let col = -1; col <= columns; col++) {
      const x = col * cellSize;
      const y = row * cellSize;

      const shade = 1.0 - shadeRange + rng() * shadeRange * 2;
      const octCx = x + cellSize / 2;
      const octCy = y + cellSize / 2;

      ctx.beginPath();
      ctx.moveTo(x + octCut + inset, y + inset);
      ctx.lineTo(x + cellSize - octCut - inset, y + inset);
      ctx.lineTo(x + cellSize - inset, y + octCut + inset);
      ctx.lineTo(x + cellSize - inset, y + cellSize - octCut - inset);
      ctx.lineTo(x + cellSize - octCut - inset, y + cellSize - inset);
      ctx.lineTo(x + octCut + inset, y + cellSize - inset);
      ctx.lineTo(x + inset, y + cellSize - octCut - inset);
      ctx.lineTo(x + inset, y + octCut + inset);
      ctx.closePath();

      if (useGradient) {
        const grad = ctx.createRadialGradient(octCx, octCy - cellSize * 0.15, 0, octCx, octCy, cellSize * 0.5);
        grad.addColorStop(0, `rgb(${Math.min(255, col1.r * shade * 1.2)},${Math.min(255, col1.g * shade * 1.2)},${Math.min(255, col1.b * shade * 1.2)})`);
        grad.addColorStop(1, `rgb(${Math.min(255, col1.r * shade * 0.75)},${Math.min(255, col1.g * shade * 0.75)},${Math.min(255, col1.b * shade * 0.75)})`);
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = `rgb(${Math.min(255, col1.r * shade)},${Math.min(255, col1.g * shade)},${Math.min(255, col1.b * shade)})`;
      }
      ctx.fill();

      const sqShade = 1.0 - shadeRange + rng() * shadeRange * 2;
      const sqX = x + cellSize - octCut;
      const sqY = y + cellSize - octCut;
      const sqSize = octCut * 2 - groutSize;

      if (sqSize > 0) {
        if (useGradient) {
          const sqCx = sqX + inset + sqSize / 2;
          const sqCy = sqY + inset + sqSize / 2;
          const grad = ctx.createRadialGradient(sqCx, sqCy - sqSize * 0.2, 0, sqCx, sqCy, sqSize * 0.7);
          grad.addColorStop(0, `rgb(${Math.min(255, col2.r * sqShade * 1.2)},${Math.min(255, col2.g * sqShade * 1.2)},${Math.min(255, col2.b * sqShade * 1.2)})`);
          grad.addColorStop(1, `rgb(${Math.min(255, col2.r * sqShade * 0.75)},${Math.min(255, col2.g * sqShade * 0.75)},${Math.min(255, col2.b * sqShade * 0.75)})`);
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = `rgb(${Math.min(255, col2.r * sqShade)},${Math.min(255, col2.g * sqShade)},${Math.min(255, col2.b * sqShade)})`;
        }
        ctx.fillRect(sqX + inset, sqY + inset, sqSize, sqSize);
      }
    }
  }
}

// ─── Stone Wall (Voronoi) ────────────────────────────────────────────────────

export interface StoneWallOptions {
  stoneColor1: string;
  stoneColor2: string;
  mortarColor: string;
  columns: number;
  rows: number;
  mortarWidth: number;
  jitter: number;
  shading: number;
  textureNoise: number;
  seed: number;
}

export function generateStoneWall(
  canvas: HTMLCanvasElement,
  size: number,
  opts: StoneWallOptions,
) {
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  let s = opts.seed | 0;
  function rng() {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  }

  const cols = opts.columns;
  const rows = opts.rows;
  const cellW = size / cols;
  const cellH = size / rows;
  const jitter = opts.jitter;

  interface SeedPt {
    x: number; y: number; id: number;
    shade: number; blend: number;
    radius: number;
  }

  // Generate seeds for a 3x3 tile pattern so the texture can be sampled
  // seamlessly without edge artifacts. We'll wrap query points into the
  // central tile and look across all neighbors.
  const seeds: SeedPt[] = [];
  for (let gy = -1; gy <= rows; gy++) {
    for (let gx = -1; gx <= cols; gx++) {
      const cx = (gx + 0.5) * cellW + (rng() - 0.5) * cellW * jitter;
      const cy = (gy + 0.5) * cellH + (rng() - 0.5) * cellH * jitter;
      seeds.push({
        x: cx, y: cy, id: seeds.length,
        shade: 0.78 + rng() * 0.44,
        blend: rng(),
        radius: Math.min(cellW, cellH) * (0.4 + rng() * 0.25),
      });
    }
  }

  const col1 = hexToRgb(opts.stoneColor1);
  const col2 = hexToRgb(opts.stoneColor2);
  const mortarRgb = hexToRgb(opts.mortarColor);
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  const noiseGen = new SimplexNoise(opts.seed);
  const detailNoise = new SimplexNoise(opts.seed + 13);
  const mw = opts.mortarWidth;

  // Distortion strength — perturbs query position to break geometric
  // Voronoi edges into organic, stone-like curves.
  const distortAmp = Math.min(cellW, cellH) * 0.35;
  const distortScale = Math.min(cellW, cellH) * 1.5;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      // Warp the query point so cell boundaries are wavy, not straight
      const wx = noiseGen.noise2D(px / distortScale, py / distortScale, 'perlin' as NoiseType) * distortAmp;
      const wy = noiseGen.noise2D((px + 100) / distortScale, (py + 100) / distortScale, 'perlin' as NoiseType) * distortAmp;
      const qx = px + wx;
      const qy = py + wy;

      let minD = Infinity;
      let minD2 = Infinity;
      let nearest = seeds[0];

      for (const pt of seeds) {
        const dx = qx - pt.x;
        const dy = qy - pt.y;
        const d = dx * dx + dy * dy;
        if (d < minD) { minD2 = minD; minD = d; nearest = pt; }
        else if (d < minD2) { minD2 = d; }
      }

      const d1 = Math.sqrt(minD);
      const d2 = Math.sqrt(minD2);
      const edgeDist = (d2 - d1) * 0.5;

      // Wider mortar near concave junctions where 3+ stones meet
      const effectiveMw = mw + (mw * (1 - Math.min(1, edgeDist / (mw * 2))) * 0.3);

      const idx = (py * size + px) * 4;

      if (edgeDist < effectiveMw) {
        const t = edgeDist / effectiveMw;
        const dark = 0.45 + t * 0.55;
        const mn = detailNoise.noise2D(px / 6, py / 6, 'perlin' as NoiseType) * 15;
        data[idx] = Math.max(0, Math.min(255, mortarRgb.r * dark + mn));
        data[idx + 1] = Math.max(0, Math.min(255, mortarRgb.g * dark + mn));
        data[idx + 2] = Math.max(0, Math.min(255, mortarRgb.b * dark + mn));
        data[idx + 3] = 255;
      } else {
        const stoneR = col1.r + (col2.r - col1.r) * nearest.blend;
        const stoneG = col1.g + (col2.g - col1.g) * nearest.blend;
        const stoneB = col1.b + (col2.b - col1.b) * nearest.blend;

        // Bevel: stones look rounded — darken near mortar
        const bevelZone = nearest.radius * 0.45;
        const bevelT = Math.min(1, (edgeDist - mw) / bevelZone);
        const bevelShade = 0.65 + bevelT * 0.35;

        // Directional light: top-left bright, bottom-right shadow
        const relX = (qx - nearest.x) / (nearest.radius || 1);
        const relY = (qy - nearest.y) / (nearest.radius || 1);
        const light = 1.0 + (-relX * 0.35 - relY * 0.35) * opts.shading;

        // Surface roughness from noise — gives each stone a textured face
        const n1 = detailNoise.noise2D(px / 14, py / 14, 'perlin' as NoiseType);
        const n2 = detailNoise.noise2D(px / 5, py / 5, 'perlin' as NoiseType) * 0.4;
        const n3 = detailNoise.noise2D(px / 2.5, py / 2.5, 'perlin' as NoiseType) * 0.15;
        const nVal = (n1 + n2 + n3) * opts.textureNoise * 30;

        const shade = nearest.shade * bevelShade * light;
        data[idx]     = Math.max(0, Math.min(255, stoneR * shade + nVal));
        data[idx + 1] = Math.max(0, Math.min(255, stoneG * shade + nVal));
        data[idx + 2] = Math.max(0, Math.min(255, stoneB * shade + nVal));
        data[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}
