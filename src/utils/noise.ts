// Simplex Noise - Ported from Stefan Gustavson's java implementation
// http://staffwww.itn.liu.se/~stegu/simplexnoise/simplexnoise.pdf
// Original JS port by Christian Petry (MIT License)

function fastfloor(x: number): number {
  const xi = Math.trunc(x);
  return x < xi ? xi - 1 : xi;
}

function randomSeed(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function fastmod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export enum NoiseType {
  PERLIN = 0,
  FRACTAL = 1,
  TURBULENCE = 2,
}

export class SimplexNoise {
  private grad3 = [
    [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
    [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
    [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],
  ];

  private grad4 = [
    [0,1,1,1],[0,1,1,-1],[0,1,-1,1],[0,1,-1,-1],
    [0,-1,1,1],[0,-1,1,-1],[0,-1,-1,1],[0,-1,-1,-1],
    [1,0,1,1],[1,0,1,-1],[1,0,-1,1],[1,0,-1,-1],
    [-1,0,1,1],[-1,0,1,-1],[-1,0,-1,1],[-1,0,-1,-1],
    [1,1,0,1],[1,1,0,-1],[1,-1,0,1],[1,-1,0,-1],
    [-1,1,0,1],[-1,1,0,-1],[-1,-1,0,1],[-1,-1,0,-1],
    [1,1,1,0],[1,1,-1,0],[1,-1,1,0],[1,-1,-1,0],
    [-1,1,1,0],[-1,1,-1,0],[-1,-1,1,0],[-1,-1,-1,0],
  ];

  private perm: number[] = [];
  private permMod12: number[] = [];

  private F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
  private G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

  private simplex = [
    [0,1,2,3],[0,1,3,2],[0,0,0,0],[0,2,3,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,3,0],
    [0,2,1,3],[0,0,0,0],[0,3,1,2],[0,3,2,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,3,2,0],
    [0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],
    [1,2,0,3],[0,0,0,0],[1,3,0,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,3,0,1],[2,3,1,0],
    [1,0,2,3],[1,0,3,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,3,1],[0,0,0,0],[2,1,3,0],
    [0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],
    [2,0,1,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,0,1,2],[3,0,2,1],[0,0,0,0],[3,1,2,0],
    [2,1,0,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,1,0,2],[0,0,0,0],[3,2,0,1],[3,2,1,0],
  ];

  constructor(seed?: number) {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p[i] = fastfloor(seed === undefined ? Math.random() * 256 : randomSeed(seed++) * 256);
    }
    for (let i = 0; i < 512; i++) {
      const v = p[i & 255];
      this.perm[i] = v;
      this.permMod12[i] = fastmod(v, 12);
    }
  }

  private dot(g: number[], x: number, y: number): number {
    return g[0] * x + g[1] * y;
  }

  private dot4(g: number[], x: number, y: number, z: number, w: number): number {
    return g[0] * x + g[1] * y + g[2] * z + g[3] * w;
  }

  noise(xin: number, yin: number): number {
    let n0: number, n1: number, n2: number;
    const s = (xin + yin) * this.F2;
    const i = fastfloor(xin + s);
    const j = fastfloor(yin + s);
    const t = (i + j) * this.G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;
    let i1: number, j1: number;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }
    const x1 = x0 - i1 + this.G2;
    const y1 = y0 - j1 + this.G2;
    const x2 = x0 - 1.0 + 2.0 * this.G2;
    const y2 = y0 - 1.0 + 2.0 * this.G2;
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.permMod12[ii + this.perm[jj]];
    const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
    const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) n0 = 0.0;
    else { t0 *= t0; n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) n1 = 0.0;
    else { t1 *= t1; n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) n2 = 0.0;
    else { t2 *= t2; n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2); }
    return 70.0 * (n0 + n1 + n2);
  }

  noise4d(x: number, y: number, z: number, w: number): number {
    const { grad4, simplex, perm } = this;
    const F4 = (Math.sqrt(5.0) - 1.0) / 4.0;
    const G4 = (5.0 - Math.sqrt(5.0)) / 20.0;
    let n0: number, n1: number, n2: number, n3: number, n4: number;
    const s = (x + y + z + w) * F4;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);
    const l = Math.floor(w + s);
    const t = (i + j + k + l) * G4;
    const X0 = i - t; const Y0 = j - t; const Z0 = k - t; const W0 = l - t;
    const x0 = x - X0; const y0 = y - Y0; const z0 = z - Z0; const w0 = w - W0;
    const c1 = (x0 > y0) ? 32 : 0;
    const c2 = (x0 > z0) ? 16 : 0;
    const c3 = (y0 > z0) ? 8 : 0;
    const c4 = (x0 > w0) ? 4 : 0;
    const c5 = (y0 > w0) ? 2 : 0;
    const c6 = (z0 > w0) ? 1 : 0;
    const c = c1 + c2 + c3 + c4 + c5 + c6;
    const i1 = simplex[c][0] >= 3 ? 1 : 0, j1 = simplex[c][1] >= 3 ? 1 : 0, k1 = simplex[c][2] >= 3 ? 1 : 0, l1 = simplex[c][3] >= 3 ? 1 : 0;
    const i2 = simplex[c][0] >= 2 ? 1 : 0, j2 = simplex[c][1] >= 2 ? 1 : 0, k2 = simplex[c][2] >= 2 ? 1 : 0, l2 = simplex[c][3] >= 2 ? 1 : 0;
    const i3 = simplex[c][0] >= 1 ? 1 : 0, j3 = simplex[c][1] >= 1 ? 1 : 0, k3 = simplex[c][2] >= 1 ? 1 : 0, l3 = simplex[c][3] >= 1 ? 1 : 0;
    const x1 = x0 - i1 + G4, y1 = y0 - j1 + G4, z1 = z0 - k1 + G4, w1 = w0 - l1 + G4;
    const x2 = x0 - i2 + 2*G4, y2 = y0 - j2 + 2*G4, z2 = z0 - k2 + 2*G4, w2 = w0 - l2 + 2*G4;
    const x3 = x0 - i3 + 3*G4, y3 = y0 - j3 + 3*G4, z3 = z0 - k3 + 3*G4, w3 = w0 - l3 + 3*G4;
    const x4 = x0 - 1.0 + 4*G4, y4 = y0 - 1.0 + 4*G4, z4 = z0 - 1.0 + 4*G4, w4 = w0 - 1.0 + 4*G4;
    const ii = i & 255, jj = j & 255, kk = k & 255, ll = l & 255;
    const gi0 = perm[ii+perm[jj+perm[kk+perm[ll]]]] % 32;
    const gi1 = perm[ii+i1+perm[jj+j1+perm[kk+k1+perm[ll+l1]]]] % 32;
    const gi2 = perm[ii+i2+perm[jj+j2+perm[kk+k2+perm[ll+l2]]]] % 32;
    const gi3 = perm[ii+i3+perm[jj+j3+perm[kk+k3+perm[ll+l3]]]] % 32;
    const gi4 = perm[ii+1+perm[jj+1+perm[kk+1+perm[ll+1]]]] % 32;
    let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0 - w0*w0;
    if (t0 < 0) n0 = 0.0; else { t0 *= t0; n0 = t0 * t0 * this.dot4(grad4[gi0], x0, y0, z0, w0); }
    let t1 = 0.6 - x1*x1 - y1*y1 - z1*z1 - w1*w1;
    if (t1 < 0) n1 = 0.0; else { t1 *= t1; n1 = t1 * t1 * this.dot4(grad4[gi1], x1, y1, z1, w1); }
    let t2 = 0.6 - x2*x2 - y2*y2 - z2*z2 - w2*w2;
    if (t2 < 0) n2 = 0.0; else { t2 *= t2; n2 = t2 * t2 * this.dot4(grad4[gi2], x2, y2, z2, w2); }
    let t3 = 0.6 - x3*x3 - y3*y3 - z3*z3 - w3*w3;
    if (t3 < 0) n3 = 0.0; else { t3 *= t3; n3 = t3 * t3 * this.dot4(grad4[gi3], x3, y3, z3, w3); }
    let t4 = 0.6 - x4*x4 - y4*y4 - z4*z4 - w4*w4;
    if (t4 < 0) n4 = 0.0; else { t4 *= t4; n4 = t4 * t4 * this.dot4(grad4[gi4], x4, y4, z4, w4); }
    return 27.0 * (n0 + n1 + n2 + n3 + n4);
  }

  seamlessNoise(x: number, y: number, dx: number, dy: number, xyoffset: number): number {
    const s = x, t = y;
    const nx = xyoffset + Math.cos(s * 2.0 * Math.PI) * dx / (2.0 * Math.PI);
    const ny = xyoffset + Math.cos(t * 2.0 * Math.PI) * dy / (2.0 * Math.PI);
    const nz = xyoffset + Math.sin(s * 2.0 * Math.PI) * dx / (2.0 * Math.PI);
    const nw = xyoffset + Math.sin(t * 2.0 * Math.PI) * dy / (2.0 * Math.PI);
    return this.noise4d(nx, ny, nz, nw);
  }

  simplexNoise(type: NoiseType, size: number, octaves: number, persistence: number, percentage: number, scale: number, x: number, y: number): number {
    let total = 0;
    let frequency = 0.25;
    let amplitude = 1;
    const offset = size;
    let maxAmplitude = 0;

    for (let i = 0; i < octaves; i++) {
      const x01 = x / size * frequency;
      const y01 = y / size * frequency;
      const noiseV = this.seamlessNoise(x01, y01, scale, scale, offset);

      if (type === NoiseType.PERLIN) total += noiseV * amplitude;
      else total += Math.abs(noiseV) * amplitude;

      frequency *= 2;
      maxAmplitude += amplitude;
      amplitude *= persistence;
    }

    if (type === NoiseType.TURBULENCE) total = Math.sin((x / scale) + total);

    let retnoise = total / maxAmplitude;
    if (type === NoiseType.TURBULENCE) retnoise = total;
    if (type === NoiseType.PERLIN || type === NoiseType.TURBULENCE)
      retnoise = Math.max(retnoise + percentage, 0) / (1.0 + percentage);
    retnoise = Math.pow(retnoise, 1 + 2 * (1 - percentage));

    return retnoise;
  }
}
