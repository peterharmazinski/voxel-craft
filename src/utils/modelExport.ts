/**
 * 3D model export utilities — OBJ+MTL (ZIP), GLB (GLTF binary), and STL.
 *
 * All three formats represent the same unit cube (1m × 1m × 1m, centred at
 * origin) with top / side / bottom face textures.  The geometry is always the
 * same; only the textures differ per export.
 *
 * All winding orders are CCW when viewed from outside the cube (right-hand
 * rule, as required by GLTF 2.0 and expected by Blender / most DCC tools).
 */

import { createZip, canvasToPngBytes } from './zipExport';

// ─── Shared types ──────────────────────────────────────────────────────────────

export interface ModelExportFaces {
  top: HTMLCanvasElement | null;
  side: HTMLCanvasElement | null;
  bottom: HTMLCanvasElement | null;
}

export interface ModelExportParams {
  /** Sanitised block / file name used for file naming inside the archive. */
  name: string;
  /** Target texture size in pixels (power of 2). */
  size: number;
  faces: ModelExportFaces;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function scaleCanvas(src: HTMLCanvasElement, size: number): HTMLCanvasElement {
  if (src.width === size && src.height === size) return src;
  const tmp = document.createElement('canvas');
  tmp.width = size;
  tmp.height = size;
  const ctx = tmp.getContext('2d')!;
  ctx.imageSmoothingEnabled = size > src.width;
  ctx.drawImage(src, 0, 0, size, size);
  return tmp;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// ─── OBJ + MTL ────────────────────────────────────────────────────────────────
//
// Unit cube with 8 shared vertex positions, 6 normals, and 4 UV coords.
// Faces split into 3 material groups: mat_top, mat_side, mat_bottom.
//
// UV convention (OBJ / Blender): V=1 is top of image, V=0 is bottom.
//   vt 1 = (0, 1) = image top-left
//   vt 2 = (1, 1) = image top-right
//   vt 3 = (1, 0) = image bottom-right
//   vt 4 = (0, 0) = image bottom-left
//
// All winding orders verified against right-hand rule for the stated normal.

const OBJ_GEOMETRY = `\
# 8 corner vertices
v -0.5  0.5 -0.5
v  0.5  0.5 -0.5
v  0.5  0.5  0.5
v -0.5  0.5  0.5
v -0.5 -0.5 -0.5
v  0.5 -0.5 -0.5
v  0.5 -0.5  0.5
v -0.5 -0.5  0.5

# UV coords  (V=1 → image top,  V=0 → image bottom)
vt 0 1
vt 1 1
vt 1 0
vt 0 0

# Face normals
vn  0  1  0
vn  0 -1  0
vn  0  0  1
vn  0  0 -1
vn  1  0  0
vn -1  0  0
`;

// Faces reference 1-based indices: v/vt/vn
// Each face group has 2 triangles covering the quad.
const OBJ_FACES = `\
g top
usemtl mat_top
f 1/1/1 3/3/1 2/2/1
f 4/4/1 3/3/1 1/1/1

g bottom
usemtl mat_bottom
f 8/4/2 5/1/2 6/2/2
f 8/4/2 6/2/2 7/3/2

g front
usemtl mat_side
f 4/1/3 8/4/3 7/3/3
f 4/1/3 7/3/3 3/2/3

g back
usemtl mat_side
f 2/1/4 6/4/4 5/3/4
f 2/1/4 5/3/4 1/2/4

g right
usemtl mat_side
f 3/1/5 7/4/5 6/3/5
f 3/1/5 6/3/5 2/2/5

g left
usemtl mat_side
f 1/1/6 5/4/6 8/3/6
f 1/1/6 8/3/6 4/2/6
`;

function buildMtl(name: string, hasTop: boolean, hasSide: boolean, hasBot: boolean): string {
  const mat = (id: string, tex: string | null) =>
    tex
      ? `newmtl ${id}\nKa 1 1 1\nKd 1 1 1\nKs 0 0 0\nd 1\nillum 1\nmap_Kd ${tex}\n`
      : `newmtl ${id}\nKa 1 1 1\nKd 1 1 1\nKs 0 0 0\nd 1\nillum 1\n`;

  return [
    `# VoxelCraft OBJ material library\n`,
    mat('mat_top',    hasTop  ? `${name}_top.png`    : null),
    mat('mat_side',   hasSide ? `${name}_side.png`   : null),
    mat('mat_bottom', hasBot  ? `${name}_bottom.png` : null),
  ].join('\n');
}

/**
 * Build a ZIP containing:
 *   <name>/<name>.obj
 *   <name>/<name>.mtl
 *   <name>/<name>_top.png    (if face present)
 *   <name>/<name>_side.png
 *   <name>/<name>_bottom.png
 */
export async function buildObjZip(params: ModelExportParams): Promise<Blob> {
  const { name, size, faces } = params;
  const enc = new TextEncoder();
  const entries: { name: string; data: Uint8Array }[] = [];

  const hasTop  = !!faces.top;
  const hasSide = !!faces.side;
  const hasBot  = !!faces.bottom;

  // Textures
  for (const face of ['top', 'side', 'bottom'] as const) {
    const src = faces[face];
    if (!src) continue;
    const scaled = scaleCanvas(src, size);
    entries.push({ name: `${name}/${name}_${face}.png`, data: await canvasToPngBytes(scaled) });
  }

  // OBJ file
  const obj = [
    `# VoxelCraft — OBJ export\n# Unit cube (1m × 1m × 1m) centred at origin\n`,
    `mtllib ${name}.mtl\n`,
    `o ${name}\n`,
    OBJ_GEOMETRY,
    OBJ_FACES,
  ].join('\n');
  entries.push({ name: `${name}/${name}.obj`, data: enc.encode(obj) });

  // MTL file
  entries.push({ name: `${name}/${name}.mtl`, data: enc.encode(buildMtl(name, hasTop, hasSide, hasBot)) });

  return createZip(entries);
}

// ─── GLB (GLTF 2.0 binary) ────────────────────────────────────────────────────
//
// Self-contained single file: geometry in the BIN chunk, textures embedded
// as base64 data URIs in the JSON chunk.
//
// 3 mesh primitives share one Mesh node:
//   primitive 0 — top face    (4 verts, 6 indices)
//   primitive 1 — side faces  (16 verts, 24 indices — front/back/right/left)
//   primitive 2 — bottom face (4 verts, 6 indices)
//
// Geometry buffer layout (552 bytes total):
//   [0..287]   positions  (24 verts × 3 × float32)
//   [288..479] texcoords  (24 verts × 2 × float32)
//   [480..551] indices    (36 × uint16)
//
// GLTF UV convention: (0,0) = upper-left of image.

// Positions ─────────────────────────────────────────────────────────────────────
// Top face (4 verts, written first)
const TOP_POS = new Float32Array([
  -0.5, 0.5, -0.5,
   0.5, 0.5, -0.5,
   0.5, 0.5,  0.5,
  -0.5, 0.5,  0.5,
]);

// Side faces: front (+Z), back (-Z), right (+X), left (-X)  — 4 verts each
const SIDE_POS = new Float32Array([
  // Front
  -0.5, -0.5,  0.5,   0.5, -0.5,  0.5,   0.5,  0.5,  0.5,  -0.5,  0.5,  0.5,
  // Back
   0.5, -0.5, -0.5,  -0.5, -0.5, -0.5,  -0.5,  0.5, -0.5,   0.5,  0.5, -0.5,
  // Right
   0.5, -0.5,  0.5,   0.5, -0.5, -0.5,   0.5,  0.5, -0.5,   0.5,  0.5,  0.5,
  // Left
  -0.5, -0.5, -0.5,  -0.5, -0.5,  0.5,  -0.5,  0.5,  0.5,  -0.5,  0.5, -0.5,
]);

// Bottom face (4 verts)
const BOT_POS = new Float32Array([
  -0.5, -0.5,  0.5,
   0.5, -0.5,  0.5,
   0.5, -0.5, -0.5,
  -0.5, -0.5, -0.5,
]);

// UV coordinates ────────────────────────────────────────────────────────────────
// Top face: (0,0)=back-left → image top-left ... (1,1)=front-right → image bottom-right
const TOP_UV = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);

// Side faces: each face has bottom-left=(0,1), bottom-right=(1,1), top-right=(1,0), top-left=(0,0)
const SIDE_UV_FACE = [0, 1, 1, 1, 1, 0, 0, 0];
const SIDE_UV = new Float32Array([
  ...SIDE_UV_FACE, ...SIDE_UV_FACE, ...SIDE_UV_FACE, ...SIDE_UV_FACE,
]);

// Bottom face
const BOT_UV = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);

// Indices (verified CCW / right-hand normal) ────────────────────────────────────
// Top: +Y normal
const TOP_IDX = new Uint16Array([0, 2, 1, 3, 2, 0]);
// Side: front, back, right, left — each quad split the same way
const SIDE_IDX = new Uint16Array([
  0, 1, 2, 0, 2, 3,     // front
  4, 5, 6, 4, 6, 7,     // back
  8, 9, 10, 8, 10, 11,  // right
  12, 13, 14, 12, 14, 15, // left
]);
// Bottom: -Y normal
const BOT_IDX = new Uint16Array([0, 2, 1, 0, 3, 2]);

function buildGeomBuffer(): ArrayBuffer {
  // Byte lengths
  const posBytes  = (TOP_POS.length + SIDE_POS.length + BOT_POS.length) * 4; // 288
  const uvBytes   = (TOP_UV.length  + SIDE_UV.length  + BOT_UV.length)  * 4; // 192
  const idxBytes  = (TOP_IDX.length + SIDE_IDX.length + BOT_IDX.length) * 2; // 72
  const total = posBytes + uvBytes + idxBytes; // 552

  const buf = new ArrayBuffer(total);
  const u8  = new Uint8Array(buf);

  let off = 0;
  for (const fa of [TOP_POS, SIDE_POS, BOT_POS]) {
    u8.set(new Uint8Array(fa.buffer), off);
    off += fa.byteLength;
  }
  for (const fa of [TOP_UV, SIDE_UV, BOT_UV]) {
    u8.set(new Uint8Array(fa.buffer), off);
    off += fa.byteLength;
  }
  for (const fa of [TOP_IDX, SIDE_IDX, BOT_IDX]) {
    u8.set(new Uint8Array(fa.buffer), off);
    off += fa.byteLength;
  }

  return buf;
}

function assembleGlb(jsonStr: string, binBuffer: ArrayBuffer): Blob {
  const enc = new TextEncoder();
  const jsonRaw = enc.encode(jsonStr);
  const jsonPad = (4 - (jsonRaw.length % 4)) % 4;
  const jsonChunk = new Uint8Array(jsonRaw.length + jsonPad);
  jsonChunk.set(jsonRaw);
  jsonChunk.fill(0x20, jsonRaw.length); // pad with spaces

  const binRaw = new Uint8Array(binBuffer);
  const binPad = (4 - (binRaw.length % 4)) % 4;
  const binChunk = new Uint8Array(binRaw.length + binPad); // zeros by default
  binChunk.set(binRaw);

  const totalLength = 12 + 8 + jsonChunk.length + 8 + binChunk.length;
  const glb  = new Uint8Array(totalLength);
  const view = new DataView(glb.buffer);

  // GLB header
  view.setUint32(0, 0x46546C67, true); // magic 'glTF'
  view.setUint32(4, 2, true);           // version
  view.setUint32(8, totalLength, true);

  // JSON chunk
  view.setUint32(12, jsonChunk.length, true);
  view.setUint32(16, 0x4E4F534A, true); // 'JSON'
  glb.set(jsonChunk, 20);

  // BIN chunk
  const binStart = 20 + jsonChunk.length;
  view.setUint32(binStart,     binChunk.length, true);
  view.setUint32(binStart + 4, 0x004E4942, true); // 'BIN\0'
  glb.set(binChunk, binStart + 8);

  return new Blob([glb], { type: 'model/gltf-binary' });
}

/**
 * Build a self-contained GLB file (GLTF 2.0 binary).
 * Textures are embedded as base64 data URIs; geometry lives in the BIN chunk.
 * Import in Blender (File → Import → glTF 2.0) or any modern 3D tool.
 */
export async function buildGlbBlob(params: ModelExportParams): Promise<Blob> {
  const { name, size, faces } = params;

  // Encode face textures as base64 PNGs
  async function faceDataUri(canvas: HTMLCanvasElement | null): Promise<string | null> {
    if (!canvas) return null;
    const bytes = await canvasToPngBytes(scaleCanvas(canvas, size));
    return `data:image/png;base64,${uint8ToBase64(bytes)}`;
  }

  const [topUri, sideUri, botUri] = await Promise.all([
    faceDataUri(faces.top),
    faceDataUri(faces.side),
    faceDataUri(faces.bottom),
  ]);

  // Geometry buffer
  const geomBuf = buildGeomBuffer();
  const geomLen = geomBuf.byteLength; // 552

  // Buffer layout byte offsets
  const POS_OFFSET = 0;
  const UV_OFFSET  = 288;
  const IDX_OFFSET = 480;

  const TOP_POS_OFF  = POS_OFFSET;        // 0
  const SIDE_POS_OFF = POS_OFFSET + 48;   // 48  (4 verts × 3 × 4)
  const BOT_POS_OFF  = POS_OFFSET + 240;  // 240 (48 + 16×3×4=192)

  const TOP_UV_OFF   = UV_OFFSET;         // 288
  const SIDE_UV_OFF  = UV_OFFSET + 32;    // 320  (4×2×4)
  const BOT_UV_OFF   = UV_OFFSET + 160;   // 448  (32 + 16×2×4=128)

  const TOP_IDX_OFF  = IDX_OFFSET;        // 480
  const SIDE_IDX_OFF = IDX_OFFSET + 12;   // 492  (6×2)
  const BOT_IDX_OFF  = IDX_OFFSET + 60;   // 540  (12 + 24×2=48)

  // Build image / texture / material arrays only for faces that have canvases
  type GltfImage    = { uri: string };
  type GltfTexture  = { source: number; sampler: number };
  type GltfMaterial = { name: string; pbrMetallicRoughness: Record<string, unknown> };

  const images:    GltfImage[]    = [];
  const textures:  GltfTexture[]  = [];
  const materials: GltfMaterial[] = [];

  function pushFace(label: string, uri: string | null): number {
    const matIdx = materials.length;
    const pbr: Record<string, unknown> = { metallicFactor: 0, roughnessFactor: 1 };
    if (uri) {
      const imgIdx = images.length;
      images.push({ uri });
      textures.push({ source: imgIdx, sampler: 0 });
      pbr.baseColorTexture = { index: textures.length - 1 };
    }
    materials.push({ name: label, pbrMetallicRoughness: pbr });
    return matIdx;
  }

  const matTop  = pushFace('top',    topUri);
  const matSide = pushFace('side',   sideUri);
  const matBot  = pushFace('bottom', botUri);

  // Accessors — float32 component type = 5126, uint16 = 5123
  const FLOAT = 5126, USHORT = 5123;
  const accessors = [
    // Positions  (bv 0)
    { bufferView: 0, byteOffset: TOP_POS_OFF,  componentType: FLOAT,  type: 'VEC3',   count: 4,  min: [-0.5,-0.5,-0.5], max: [0.5,0.5,0.5] },
    { bufferView: 0, byteOffset: SIDE_POS_OFF, componentType: FLOAT,  type: 'VEC3',   count: 16, min: [-0.5,-0.5,-0.5], max: [0.5,0.5,0.5] },
    { bufferView: 0, byteOffset: BOT_POS_OFF,  componentType: FLOAT,  type: 'VEC3',   count: 4,  min: [-0.5,-0.5,-0.5], max: [0.5,0.5,0.5] },
    // UVs  (bv 1)
    { bufferView: 1, byteOffset: TOP_UV_OFF  - UV_OFFSET, componentType: FLOAT,  type: 'VEC2',   count: 4  },
    { bufferView: 1, byteOffset: SIDE_UV_OFF - UV_OFFSET, componentType: FLOAT,  type: 'VEC2',   count: 16 },
    { bufferView: 1, byteOffset: BOT_UV_OFF  - UV_OFFSET, componentType: FLOAT,  type: 'VEC2',   count: 4  },
    // Indices  (bv 2)
    { bufferView: 2, byteOffset: TOP_IDX_OFF  - IDX_OFFSET, componentType: USHORT, type: 'SCALAR', count: 6  },
    { bufferView: 2, byteOffset: SIDE_IDX_OFF - IDX_OFFSET, componentType: USHORT, type: 'SCALAR', count: 24 },
    { bufferView: 2, byteOffset: BOT_IDX_OFF  - IDX_OFFSET, componentType: USHORT, type: 'SCALAR', count: 6  },
  ];

  // BufferViews split the geometry buffer into 3 logical segments
  const bufferViews = [
    { buffer: 0, byteOffset: POS_OFFSET, byteLength: 288 }, // positions
    { buffer: 0, byteOffset: UV_OFFSET,  byteLength: 192 }, // uvs
    { buffer: 0, byteOffset: IDX_OFFSET, byteLength: 72  }, // indices
  ];

  const gltf = {
    asset: { version: '2.0', generator: `VoxelCraft — ${name}` },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes:  [{ mesh: 0, name }],
    meshes: [{
      name,
      primitives: [
        { attributes: { POSITION: 0, TEXCOORD_0: 3 }, indices: 6, material: matTop  },
        { attributes: { POSITION: 1, TEXCOORD_0: 4 }, indices: 7, material: matSide },
        { attributes: { POSITION: 2, TEXCOORD_0: 5 }, indices: 8, material: matBot  },
      ],
    }],
    materials,
    textures,
    images,
    samplers: [{ magFilter: 9728, minFilter: 9728, wrapS: 10497, wrapT: 10497 }],
    accessors,
    bufferViews,
    buffers: [{ byteLength: geomLen }],
  };

  return assembleGlb(JSON.stringify(gltf), geomBuf);
}

// ─── STL (binary) ─────────────────────────────────────────────────────────────
//
// Mesh-only, no textures.  12 triangles (2 per face × 6 faces).
// Binary STL: 80-byte header + uint32 count + N × 50-byte triangle records.
//
// All normals and CCW windings verified against right-hand rule.

type Vec3 = [number, number, number];

const STL_TRIS: { n: Vec3; v: [Vec3, Vec3, Vec3] }[] = [
  // Top (+Y)
  { n: [0, 1, 0], v: [[-0.5, 0.5, -0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5]] },
  { n: [0, 1, 0], v: [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]] },
  // Bottom (-Y)
  { n: [0, -1, 0], v: [[-0.5, -0.5, 0.5], [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5]] },
  { n: [0, -1, 0], v: [[0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]] },
  // Front (+Z)
  { n: [0, 0, 1], v: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5]] },
  { n: [0, 0, 1], v: [[0.5, 0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, -0.5, 0.5]] },
  // Back (-Z)
  { n: [0, 0, -1], v: [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5]] },
  { n: [0, 0, -1], v: [[-0.5, 0.5, -0.5], [0.5, 0.5, -0.5], [0.5, -0.5, -0.5]] },
  // Right (+X)
  { n: [1, 0, 0], v: [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5]] },
  { n: [1, 0, 0], v: [[0.5, 0.5, -0.5], [0.5, 0.5, 0.5], [0.5, -0.5, 0.5]] },
  // Left (-X)
  { n: [-1, 0, 0], v: [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5]] },
  { n: [-1, 0, 0], v: [[-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5], [-0.5, -0.5, -0.5]] },
];

/**
 * Build a binary STL blob (mesh only — no textures).
 * Good for 3D printing; import via File → Import → STL in Blender.
 */
export function buildStlBlob(name: string): Blob {
  const count = STL_TRIS.length; // 12
  const buf  = new ArrayBuffer(80 + 4 + count * 50);
  const view = new DataView(buf);
  const u8   = new Uint8Array(buf);

  // 80-byte ASCII header
  const enc = new TextEncoder();
  const hdr = enc.encode(`VoxelCraft STL — ${name}`.padEnd(80).slice(0, 80));
  u8.set(hdr, 0);

  // Triangle count
  view.setUint32(80, count, true);

  let off = 84;
  for (const { n, v } of STL_TRIS) {
    // Normal
    view.setFloat32(off,      n[0], true); off += 4;
    view.setFloat32(off,      n[1], true); off += 4;
    view.setFloat32(off,      n[2], true); off += 4;
    // 3 vertices
    for (const vert of v) {
      view.setFloat32(off,    vert[0], true); off += 4;
      view.setFloat32(off,    vert[1], true); off += 4;
      view.setFloat32(off,    vert[2], true); off += 4;
    }
    // Attribute byte count
    view.setUint16(off, 0, true); off += 2;
  }

  return new Blob([buf], { type: 'application/octet-stream' });
}
