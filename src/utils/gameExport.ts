/**
 * Game engine export utilities — VP3 and Minecraft resource pack.
 *
 * Both exporters take already-rendered face canvases (with snow/glow baked in)
 * plus optional per-face generator configs for height-buffer normal baking.
 */

import { createZip, canvasToPngBytes } from './zipExport';
import {
  generateNormalMap,
  generateNormalMapFromHeightBuffer,
  generateAOMap,
  generateSpecularMap,
  generateDisplacementMap,
  generateMetallicMap,
  generateRoughnessMap,
  DEFAULT_AO,
  DEFAULT_SPECULAR,
  DEFAULT_DISPLACEMENT,
  DEFAULT_METALLIC,
  DEFAULT_ROUGHNESS,
  type NormalMapSettings,
  type AOSettings,
  type SpecularSettings,
  type DisplacementSettings,
  type MetallicSettings,
  type RoughnessSettings,
} from './normalMapProcessor';
import {
  computeHeightBuffer,
  generateEmissionMap,
  type FaceTextureConfig,
  type GlowOptions,
} from './renderTexture';

// ─── Shared types ─────────────────────────────────────────────────────────────

export type NormalBakeMode = 'none' | 'smart' | 'all';

// ─── World Hopper metadata ────────────────────────────────────────────────────

/** Gameplay role hint consumed by the Unity VoxelCraftImporter to seed the VoxelRoleType profile. */
export type WHVoxelRole =
  | 'Stone' | 'Wood' | 'Dirt' | 'Ore' | 'Sand'
  | 'Ice' | 'Hazard' | 'Light' | 'Fluid' | 'Custom';

export const WH_ROLE_OPTIONS: WHVoxelRole[] = [
  'Stone', 'Wood', 'Dirt', 'Ore', 'Sand', 'Ice', 'Hazard', 'Light', 'Fluid', 'Custom',
];

/**
 * Written into <blockId>.whmeta.json when exporting for World Hopper.
 * The Unity VoxelCraftImporter reads this to auto-create the VoxelDefinition,
 * VoxelRoleType SO, ItemData asset, and VoxelItemBindingDatabase entry.
 */
export interface WHMetadata {
  displayName: string;
  role: WHVoxelRole;
  resistancePoints: number;
  canBeCollected: boolean;
  itemId: string;
}

export interface GameExportFaces {
  top: HTMLCanvasElement | null;
  side: HTMLCanvasElement | null;
  bottom: HTMLCanvasElement | null;
}

export interface GameExportFaceConfigs {
  top: FaceTextureConfig | null;
  side: FaceTextureConfig | null;
  bottom: FaceTextureConfig | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Scale a canvas to `size × size`, returning the original if already correct. */
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

/**
 * Smart normal-map gate: bake only when the diffuse has enough contrast
 * to benefit. A face passes when luminance std-dev > 0.06 AND average
 * alpha > 0.8. Flat/gradient/glass faces are skipped automatically.
 */
function shouldBakeNormal(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const n = canvas.width * canvas.height;
  let sum = 0, sumSq = 0, alphaSum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
    sum += lum;
    sumSq += lum * lum;
    alphaSum += data[i + 3];
  }
  const mean = sum / n;
  const stdDev = Math.sqrt(Math.max(0, sumSq / n - mean * mean));
  const avgAlpha = alphaSum / (n * 255);
  return stdDev > 0.06 && avgAlpha > 0.8;
}

/** Bake a normal map, preferring generator height buffer over color→gray. */
function bakeNormal(
  scaled: HTMLCanvasElement,
  size: number,
  settings: NormalMapSettings,
  faceConfig: FaceTextureConfig | null | undefined,
): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const heightBuf = faceConfig ? computeHeightBuffer(faceConfig) : null;
  if (heightBuf) {
    generateNormalMapFromHeightBuffer(heightBuf, size, size, c, settings);
  } else {
    generateNormalMap(scaled, c, settings);
  }
  return c;
}

// ─── VP3 export ───────────────────────────────────────────────────────────────

export interface VP3ExportParams {
  blockId: string;
  size: number;
  faces: GameExportFaces;
  faceConfigs: GameExportFaceConfigs;
  normalMode: NormalBakeMode;
  normalSettings: NormalMapSettings;
  includeEmission: boolean;
  glowOptions: GlowOptions;
  includeAO: boolean;
  aoSettings?: AOSettings;
  includeSpecular: boolean;
  specularSettings?: SpecularSettings;
  includeDisplacement: boolean;
  displacementSettings?: DisplacementSettings;
  includeMetallic: boolean;
  metallicSettings?: MetallicSettings;
  includeRoughness: boolean;
  roughnessSettings?: RoughnessSettings;
  /** When set, adds a <blockId>.whmeta.json sidecar for the Unity VoxelCraftImporter. */
  whMetadata?: WHMetadata;
  /**
   * When set, adds a <blockId>_icon.png to the ZIP — used by the Unity importer
   * as the SE ItemData icon sprite. Pass the isometric preview canvas scaled to
   * the desired icon resolution (128×128 recommended).
   */
  iconCanvas?: HTMLCanvasElement | null;
  /**
   * When set, adds <blockId>_snow_top/side/bottom.png alongside the base textures.
   * The Unity importer creates a companion <blockId>_snow VoxelDefinition and wires
   * it into VoxelSnowVariantDatabase for runtime weather accumulation.
   */
  snowFaces?: GameExportFaces;
}

/**
 * Build a ZIP ready to drop into a Unity/VP3 project:
 *
 *   <blockId>/
 *     <blockId>_top.png
 *     <blockId>_side.png
 *     <blockId>_bottom.png
 *     <blockId>_top_normal.png      (smart/all, when contrast passes)
 *     <blockId>_side_normal.png
 *     <blockId>_bottom_normal.png
 *     <blockId>_top_emissive.png    (when includeEmission)
 *     <blockId>_side_emissive.png
 *     <blockId>_bottom_emissive.png
 *     <blockId>.voxeldef.json       (VoxelDefinition stub)
 */
export async function buildVP3Zip(params: VP3ExportParams): Promise<Blob> {
  const {
    blockId, size, faces, faceConfigs,
    normalMode, normalSettings,
    includeEmission, glowOptions,
    includeAO, aoSettings = DEFAULT_AO,
    includeSpecular, specularSettings = DEFAULT_SPECULAR,
    includeDisplacement, displacementSettings = DEFAULT_DISPLACEMENT,
    includeMetallic, metallicSettings = DEFAULT_METALLIC,
    includeRoughness, roughnessSettings = DEFAULT_ROUGHNESS,
  } = params;

  const entries: { name: string; data: Uint8Array }[] = [];
  const enc = new TextEncoder();
  const faceNames = ['top', 'side', 'bottom'] as const;
  const bakedNormals = new Set<string>();

  for (const face of faceNames) {
    const src = faces[face];
    if (!src) continue;

    const scaled = scaleCanvas(src, size);
    const prefix = `${blockId}/${blockId}_${face}`;

    // Diffuse
    entries.push({ name: `${prefix}.png`, data: await canvasToPngBytes(scaled) });

    // Normal map
    if (normalMode !== 'none') {
      const doBake = normalMode === 'all' || shouldBakeNormal(scaled);
      if (doBake) {
        const nc = bakeNormal(scaled, size, normalSettings, faceConfigs[face]);
        entries.push({ name: `${prefix}_normal.png`, data: await canvasToPngBytes(nc) });
        bakedNormals.add(face);
      }
    }

    // Emission
    if (includeEmission) {
      const ec = document.createElement('canvas');
      generateEmissionMap(scaled, ec, glowOptions);
      entries.push({ name: `${prefix}_emissive.png`, data: await canvasToPngBytes(ec) });
    }

    // AO
    if (includeAO) {
      const aoc = document.createElement('canvas');
      generateAOMap(scaled, aoc, aoSettings);
      entries.push({ name: `${prefix}_ao.png`, data: await canvasToPngBytes(aoc) });
    }

    // Specular
    if (includeSpecular) {
      const sc = document.createElement('canvas');
      generateSpecularMap(scaled, sc, specularSettings);
      entries.push({ name: `${prefix}_specular.png`, data: await canvasToPngBytes(sc) });
    }

    // Displacement
    if (includeDisplacement) {
      const dc = document.createElement('canvas');
      generateDisplacementMap(scaled, dc, displacementSettings);
      entries.push({ name: `${prefix}_displacement.png`, data: await canvasToPngBytes(dc) });
    }

    // Metallic
    if (includeMetallic) {
      const mc = document.createElement('canvas');
      generateMetallicMap(scaled, mc, metallicSettings);
      entries.push({ name: `${prefix}_metallic.png`, data: await canvasToPngBytes(mc) });
    }

    // Roughness
    if (includeRoughness) {
      const rc = document.createElement('canvas');
      generateRoughnessMap(scaled, rc, roughnessSettings);
      entries.push({ name: `${prefix}_roughness.png`, data: await canvasToPngBytes(rc) });
    }
  }

  // VoxelDefinition JSON sidecar
  const voxelDef: Record<string, unknown> = {
    blockId,
    textureTop:    `${blockId}_top`,
    textureSide:   `${blockId}_side`,
    textureBottom: `${blockId}_bottom`,
    normalStrength: 0.8,
    renderType: 'Opaque',
    canBeCollected: true,
    resistancePoints: 9,
    gpuInstancing: true,
    tintColor: 'white',
  };
  if (bakedNormals.has('top'))    voxelDef.normalTop    = `${blockId}_top_normal`;
  if (bakedNormals.has('side'))   voxelDef.normalSide   = `${blockId}_side_normal`;
  if (bakedNormals.has('bottom')) voxelDef.normalBottom = `${blockId}_bottom_normal`;
  if (includeEmission) {
    voxelDef.emissiveTop    = `${blockId}_top_emissive`;
    voxelDef.emissiveSide   = `${blockId}_side_emissive`;
    voxelDef.emissiveBottom = `${blockId}_bottom_emissive`;
  }
  if (includeAO) {
    if (faces.top)    voxelDef.aoTop    = `${blockId}_top_ao`;
    if (faces.side)   voxelDef.aoSide   = `${blockId}_side_ao`;
    if (faces.bottom) voxelDef.aoBottom = `${blockId}_bottom_ao`;
  }
  if (includeSpecular) {
    if (faces.top)    voxelDef.specularTop    = `${blockId}_top_specular`;
    if (faces.side)   voxelDef.specularSide   = `${blockId}_side_specular`;
    if (faces.bottom) voxelDef.specularBottom = `${blockId}_bottom_specular`;
  }
  if (includeDisplacement) {
    if (faces.top)    voxelDef.displacementTop    = `${blockId}_top_displacement`;
    if (faces.side)   voxelDef.displacementSide   = `${blockId}_side_displacement`;
    if (faces.bottom) voxelDef.displacementBottom = `${blockId}_bottom_displacement`;
  }
  if (includeMetallic) {
    if (faces.top)    voxelDef.metallicTop    = `${blockId}_top_metallic`;
    if (faces.side)   voxelDef.metallicSide   = `${blockId}_side_metallic`;
    if (faces.bottom) voxelDef.metallicBottom = `${blockId}_bottom_metallic`;
  }
  if (includeRoughness) {
    if (faces.top)    voxelDef.roughnessTop    = `${blockId}_top_roughness`;
    if (faces.side)   voxelDef.roughnessSide   = `${blockId}_side_roughness`;
    if (faces.bottom) voxelDef.roughnessBottom = `${blockId}_bottom_roughness`;
  }

  entries.push({
    name: `${blockId}/${blockId}.voxeldef.json`,
    data: enc.encode(JSON.stringify(voxelDef, null, 2)),
  });

  if (params.whMetadata) {
    entries.push({
      name: `${blockId}/${blockId}.whmeta.json`,
      data: enc.encode(JSON.stringify(params.whMetadata, null, 2)),
    });
  }

  if (params.iconCanvas) {
    entries.push({
      name: `${blockId}/${blockId}_icon.png`,
      data: await canvasToPngBytes(params.iconCanvas),
    });
  }

  // Snow variant textures — stored in the same folder with a _snow_ infix so the
  // Unity importer can detect them by name and create a companion VoxelDefinition.
  if (params.snowFaces) {
    for (const face of faceNames) {
      const src = params.snowFaces[face];
      if (!src) continue;
      const scaled = scaleCanvas(src, size);
      entries.push({
        name: `${blockId}/${blockId}_snow_${face}.png`,
        data: await canvasToPngBytes(scaled),
      });
    }
  }

  return createZip(entries);
}

// ─── Minecraft resource pack export ───────────────────────────────────────────

export interface MinecraftExportParams {
  blockName: string;
  size: number;
  faces: GameExportFaces;
  packFormat: number;
  description: string;
}

/**
 * Build a Minecraft resource pack ZIP:
 *
 *   pack.mcmeta
 *   assets/minecraft/textures/block/
 *     <name>_top.png
 *     <name>_side.png
 *     <name>_bottom.png
 *   assets/minecraft/models/block/
 *     <name>.json    (cube model referencing per-face textures)
 */
export async function buildMinecraftZip(params: MinecraftExportParams): Promise<Blob> {
  const { blockName, size, faces, packFormat, description } = params;

  const entries: { name: string; data: Uint8Array }[] = [];
  const enc = new TextEncoder();

  // pack.mcmeta
  entries.push({
    name: 'pack.mcmeta',
    data: enc.encode(JSON.stringify({ pack: { pack_format: packFormat, description } }, null, 2)),
  });

  // Face textures
  const faceNames = ['top', 'side', 'bottom'] as const;
  for (const face of faceNames) {
    const src = faces[face];
    if (!src) continue;
    const scaled = scaleCanvas(src, size);
    entries.push({
      name: `assets/minecraft/textures/block/${blockName}_${face}.png`,
      data: await canvasToPngBytes(scaled),
    });
  }

  // Block model — cube with per-face texture references
  const model = {
    parent: 'block/cube',
    textures: {
      particle: `minecraft:block/${blockName}_side`,
      down:     `minecraft:block/${blockName}_bottom`,
      up:       `minecraft:block/${blockName}_top`,
      north:    `minecraft:block/${blockName}_side`,
      south:    `minecraft:block/${blockName}_side`,
      west:     `minecraft:block/${blockName}_side`,
      east:     `minecraft:block/${blockName}_side`,
    },
  };
  entries.push({
    name: `assets/minecraft/models/block/${blockName}.json`,
    data: enc.encode(JSON.stringify(model, null, 2)),
  });

  return createZip(entries);
}

/** Sanitise a user-typed block name to safe lowercase_snake_case. */
export function sanitiseBlockName(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '') || 'my_block';
}
