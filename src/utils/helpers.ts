export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RGB {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (_m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

export function random10Seed(seed: number, percentage: number = 1.0): number {
  const x = Math.sin(seed) * 10000;
  return Math.trunc((x - Math.floor(x)) + (1.0 - percentage));
}

export function randomSeed(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function rationalTanh(x: number): number {
  if (x < -3) return -1;
  if (x > 3) return 1;
  return x * (27 + x * x) / (27 + 9 * x * x);
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string, type: 'png' | 'jpg' = 'png', quality = 0.95) {
  const imageType = type === 'jpg' ? 'image/jpeg' : 'image/png';
  canvas.toBlob(
    (blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.${type}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    },
    imageType,
    quality,
  );
}
