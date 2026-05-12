import { useCallback, useEffect, useRef, useState } from 'react';
import SliderControl from '../components/SliderControl';
import MapPanel from '../components/MapPanel';
import { downloadCanvas } from '../utils/helpers';
import { useLocalState } from '../hooks/useLocalState';
import {
  renderIsometricPreview,
  generateVoxelBlockFace,
  generateVoxelBlockSide,
  type VoxelBaseType,
  type VoxelOreLayer,
  type OreStyle,
  type VoxelBlockFace,
  type VoxelBlockSideMode,
  type VoxelBlockOptions,
  type SideTransitionPattern,
  type VoxelRenderStyle,
} from '../utils/textureGenerators';
import { renderFaceTexture, type FaceTextureConfig } from '../utils/renderTexture';
import { generateNormalMap, DEFAULT_NORMAL, type NormalMapSettings } from '../utils/normalMapProcessor';
import TextureGenerator from './TextureGenerator';

function CS({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  return <input type="color" value={color} onChange={e => onChange(e.target.value)} className="color-input" />;
}

type EditorMode = 'texture' | 'voxel';

interface VoxelPreset {
  label: string;
  top: VoxelBlockFace;
  side: VoxelBlockFace;
  bottom: VoxelBlockFace;
  sideMode: VoxelBlockSideMode;
  sideSplitPos: number;
  sideTopFace: VoxelBlockFace;
}

const DEFAULT_VOXEL_FACE = (base: VoxelBaseType, ores: VoxelOreLayer[] = []): VoxelBlockFace => ({
  baseType: base,
  baseColor1: '#8b8b8b', baseColor2: '#6b6b6b', baseColor3: '#555555',
  grainStrength: 0.3, grainDirection: 'both',
  oreLayers: ores,
  depthShading: 0.4, outlineStrength: 0.2, paletteSize: 12,
});

function VoxelFaceSettings({ face, setFace }: { face: VoxelBlockFace; setFace: (f: VoxelBlockFace) => void }) {
  return (
    <div className="settings-panel">
      <div className="settings-row"><label>Base</label><select value={face.baseType} onChange={e => setFace({ ...face, baseType: e.target.value as VoxelBaseType })}><option value="stone">Stone</option><option value="deepslate">Deepslate</option><option value="dirt">Dirt</option><option value="sandstone">Sandstone</option><option value="netherrack">Netherrack</option><option value="rings">Tree Rings</option><option value="bark">Bark</option><option value="custom">Custom</option></select></div>
      {(face.baseType === 'custom' || face.baseType === 'rings' || face.baseType === 'bark') && <div className="settings-row"><label>Colors</label><CS color={face.baseColor1} onChange={c => setFace({ ...face, baseColor1: c })} /><CS color={face.baseColor2} onChange={c => setFace({ ...face, baseColor2: c })} /><CS color={face.baseColor3} onChange={c => setFace({ ...face, baseColor3: c })} /></div>}
      <SliderControl label="Grain" value={face.grainStrength} min={0} max={1} step={0.01} onChange={v => setFace({ ...face, grainStrength: v })} />
      <div className="settings-row"><label>Grain Dir</label><select value={face.grainDirection} onChange={e => setFace({ ...face, grainDirection: e.target.value as VoxelBlockFace['grainDirection'] })}><option value="none">None</option><option value="horizontal">Horizontal</option><option value="vertical">Vertical</option><option value="both">Both</option></select></div>
      <SliderControl label="Edge Shade" value={face.depthShading} min={0} max={1} step={0.01} onChange={v => setFace({ ...face, depthShading: v })} />
      <SliderControl label="Outline" value={face.outlineStrength} min={0} max={1} step={0.01} onChange={v => setFace({ ...face, outlineStrength: v })} />
      <SliderControl label="Palette" value={face.paletteSize} min={3} max={32} step={1} onChange={v => setFace({ ...face, paletteSize: v })} />

      <h4 style={{ margin: '10px 0 4px' }}>Ore Layers</h4>
      {face.oreLayers.map((ore, i) => (
        <div key={i} className="ore-layer">
          <div className="settings-row">
            <input type="text" value={ore.name} className="ore-name" onChange={e => { const n = [...face.oreLayers]; n[i] = { ...n[i], name: e.target.value }; setFace({ ...face, oreLayers: n }); }} />
            <CS color={ore.color} onChange={c => { const n = [...face.oreLayers]; n[i] = { ...n[i], color: c }; setFace({ ...face, oreLayers: n }); }} />
            <CS color={ore.highlightColor} onChange={c => { const n = [...face.oreLayers]; n[i] = { ...n[i], highlightColor: c }; setFace({ ...face, oreLayers: n }); }} />
            <button className="btn-small" onClick={() => setFace({ ...face, oreLayers: face.oreLayers.filter((_, j) => j !== i) })}>×</button>
          </div>
          <div className="settings-row"><label>Style</label><select value={ore.style} onChange={e => { const n = [...face.oreLayers]; n[i] = { ...n[i], style: e.target.value as OreStyle }; setFace({ ...face, oreLayers: n }); }}><option value="flat">Flat</option><option value="crystal">Crystal</option><option value="metal">Metal</option><option value="jewel">Jewel</option></select></div>
          <SliderControl label="Density" value={ore.density} min={0} max={15} step={0.5} onChange={v => { const n = [...face.oreLayers]; n[i] = { ...n[i], density: v }; setFace({ ...face, oreLayers: n }); }} />
          <SliderControl label="Cluster" value={ore.clusterSize} min={1} max={5} step={1} onChange={v => { const n = [...face.oreLayers]; n[i] = { ...n[i], clusterSize: v }; setFace({ ...face, oreLayers: n }); }} />
          <SliderControl label="Ore Size" value={ore.oreScale || 1} min={0.5} max={5} step={0.1} onChange={v => { const n = [...face.oreLayers]; n[i] = { ...n[i], oreScale: v }; setFace({ ...face, oreLayers: n }); }} />
        </div>
      ))}
      <div className="settings-row ore-presets">
        <button className="btn-small" onClick={() => setFace({ ...face, oreLayers: [...face.oreLayers, { color: '#4488dd', highlightColor: '#cceeff', density: 3, clusterSize: 2, name: 'Diamond', style: 'jewel', oreScale: 1 }] })}>+ Diamond</button>
        <button className="btn-small" onClick={() => setFace({ ...face, oreLayers: [...face.oreLayers, { color: '#d4af37', highlightColor: '#ffe066', density: 4, clusterSize: 2, name: 'Gold', style: 'metal', oreScale: 1.5 }] })}>+ Gold</button>
        <button className="btn-small" onClick={() => setFace({ ...face, oreLayers: [...face.oreLayers, { color: '#888899', highlightColor: '#ccccdd', density: 6, clusterSize: 2, name: 'Iron', style: 'metal', oreScale: 1.5 }] })}>+ Iron</button>
        <button className="btn-small" onClick={() => setFace({ ...face, oreLayers: [...face.oreLayers, { color: '#55cc55', highlightColor: '#aaffaa', density: 2, clusterSize: 2, name: 'Emerald', style: 'jewel', oreScale: 1 }] })}>+ Emerald</button>
      </div>
    </div>
  );
}

function applyConfigToGenerator(config: FaceTextureConfig) {
  const { type, size, seed, params: p } = config;
  const s = (key: string, val: unknown) => localStorage.setItem(key, JSON.stringify(val));

  s('tg_type', type);
  s('tg_size', size);

  switch (type) {
    case 'PerlinNoise':
      s('tg_pnC1', p.color1 || '#e6d7c3');
      s('tg_pnC2', p.color2 || '#1a1714');
      s('tg_pnT', p.noiseType || 'PerlinNoise');
      s('tg_pnOct', p.octaves ?? 6);
      s('tg_pnSc', p.scale ?? 50);
      s('tg_pnPe', p.persistence ?? 0.5);
      s('tg_pnSd', seed);
      s('tg_pnUG', !!p.colorStops);
      if (p.colorStops) s('tg_pnCS', p.colorStops);
      break;
    case 'Clouds':
      s('tg_clC1', p.color1 || '#ffffff');
      s('tg_clC2', p.color2 || '#2a4d82');
      s('tg_clSc', p.scale ?? 7);
      s('tg_clDe', p.detail ?? 0.45);
      s('tg_clPe', p.percentage ?? 0.6);
      s('tg_clSd', seed);
      break;
    case 'Checker':
      s('tg_ckC1', p.color1 || '#e6d7c3');
      s('tg_ckC2', p.color2 || '#665e52');
      s('tg_ckX', p.x ?? 6);
      s('tg_ckY', p.y ?? 6);
      s('tg_ckPe', (p.percentage as number ?? 1) * 100);
      s('tg_ckSd', seed);
      s('tg_ckSh', p.shade ?? 0);
      s('tg_ckTx', p.texture ?? 0);
      break;
    case 'Brick':
      s('tg_brC', p.color1 || '#e6d7c3');
      s('tg_brC2', p.color2 || '#c9a882');
      s('tg_brGC', p.groutColor || '#665e52');
      s('tg_brGrC', p.gradientColor || '#665e52');
      s('tg_brPa', p.pattern || 'edges');
      s('tg_brX', p.x ?? 6);
      s('tg_brY', p.y ?? 6);
      s('tg_brGr', p.grout ?? 6);
      s('tg_brGd', p.gradient ?? 3);
      s('tg_brCM', p.colorMode || 'random');
      s('tg_brSR', p.shadeRange ?? 0.15);
      s('tg_brTx', p.texture ?? 0.4);
      s('tg_brTS', seed);
      s('tg_brTSc', p.textureScale ?? 30);
      break;
    case 'Wood':
      s('tg_wdC1', p.color1 || '#c49a6c');
      s('tg_wdC2', p.color2 || '#8b5e3c');
      s('tg_wdC3', p.color3 || '#a0744c');
      s('tg_wdPl', p.planks ?? 5);
      s('tg_wdXS', p.xScale ?? 5);
      s('tg_wdSc', p.scale ?? 1);
      s('tg_wdPe', p.persistence ?? 0.5);
      s('tg_wdSd', seed);
      s('tg_wdGW', p.grainWidth ?? 1);
      s('tg_wdGp', p.gapWidth ?? 0.4);
      s('tg_wdRi', p.rings ?? false);
      break;
    case 'Bark':
      s('tg_bkC1', p.color1 || '#8b6b4a');
      s('tg_bkC2', p.color2 || '#5c3d28');
      s('tg_bkC3', p.color3 || '#3a2515');
      s('tg_bkFi', p.fissures ?? 6);
      s('tg_bkRo', p.roughness ?? 0.5);
      s('tg_bkDe', p.depth ?? 0.6);
      s('tg_bkSc', p.barkScale ?? 1);
      s('tg_bkSd', seed);
      break;
    case 'Tiles':
      s('tg_tlX', p.x ?? 2);
      s('tg_tlY', p.y ?? 2);
      s('tg_tlC', p.color1 || '#cccccc');
      s('tg_tlGC', p.groutColor || '#888888');
      s('tg_tlGrC', p.gradientColor || '#aaaaaa');
      s('tg_tlGGC', p.groutGradientColor || '#666666');
      s('tg_tlXG', p.xGrout ?? 15);
      s('tg_tlYG', p.yGrout ?? 15);
      s('tg_tlXGr', p.xGradient ?? 30);
      s('tg_tlYGr', p.yGradient ?? 30);
      s('tg_tlGE', p.gradientEnabled ?? true);
      s('tg_tlGGE', p.groutGradientEnabled ?? true);
      s('tg_tlC2', p.color2 || '#aaaaaa');
      s('tg_tlCM', p.colorMode || 'single');
      s('tg_tlSR', p.shadeRange ?? 0);
      s('tg_tlTx', p.texture ?? 0);
      s('tg_tlSd', seed);
      break;
    case 'Textiles':
      s('tg_txC1', p.color1 || '#e6d7c3');
      s('tg_txC2', p.color2 || '#665e52');
      s('tg_txPa', p.pattern ?? 4);
      s('tg_txDb', p.double ?? false);
      s('tg_txTi', p.tightness ?? 1);
      s('tg_txTh', p.thickness ?? 6);
      s('tg_txSm', p.smoothness ?? 0);
      s('tg_txSd', p.shading ?? 0);
      break;
    case 'CartoonOre':
      s('tg_coC1', p.color1 || '#7a8a8a');
      s('tg_coC2', p.color2 || '#6a7a7a');
      s('tg_coC3', p.color3 || '#5a6a6a');
      s('tg_coBN', p.bgNoise ?? 0.6);
      s('tg_coBP', p.bgPatch ?? 30);
      s('tg_coOL', p.outline ?? 1.5);
      s('tg_coSh', p.shadow ?? 0.6);
      s('tg_coSd', seed);
      s('tg_coBG', p.bgGradient ?? false);
      if (p.ores) s('tg_coOr', p.ores);
      break;
    case 'Hexagon':
      s('tg_hxC1', p.color1 || '#cccccc');
      s('tg_hxC2', p.color2 || '#aaaaaa');
      s('tg_hxGr', p.groutColor || '#666666');
      s('tg_hxCo', p.columns ?? 6);
      s('tg_hxGS', p.groutSize ?? 4);
      s('tg_hxSh', p.shade ?? 0.1);
      s('tg_hxSd', seed);
      s('tg_hxGd', p.gradient ?? false);
      break;
    case 'Octagon':
      s('tg_ocC1', p.color1 || '#cccccc');
      s('tg_ocC2', p.color2 || '#999999');
      s('tg_ocGr', p.groutColor || '#666666');
      s('tg_ocCo', p.columns ?? 5);
      s('tg_ocGS', p.groutSize ?? 4);
      s('tg_ocSh', p.shade ?? 0.1);
      s('tg_ocSd', seed);
      s('tg_ocGd', p.gradient ?? false);
      break;
    case 'Gradient':
      if (p.colors) s('tg_grCo', p.colors);
      break;
    case 'Terrain':
      s('tg_trSc', p.scale ?? 7);
      s('tg_trDe', p.detail ?? 0.45);
      s('tg_trHe', p.height ?? 0.7);
      s('tg_trSd', seed);
      break;
    case 'Voxel':
      s('tg_vxC1', p.color1 || '#8b8b8b');
      s('tg_vxC2', p.color2 || '#6b6b6b');
      s('tg_vxC3', p.color3 || '#555555');
      s('tg_vxRe', p.resolution ?? 16);
      s('tg_vxGr', p.grain ?? 0.3);
      s('tg_vxDS', p.depthShading ?? 0.5);
      s('tg_vxOL', p.outline ?? 0.3);
      s('tg_vxSd', seed);
      s('tg_vxPa', p.palette ?? 8);
      break;
  }
}

const VOXEL_PRESETS: Record<string, VoxelPreset> = {
  grass: { label: 'Grass',
    top: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#4a8c2a', baseColor2: '#3d7522', baseColor3: '#2d5a18', grainDirection: 'both', grainStrength: 0.5 },
    side: { ...DEFAULT_VOXEL_FACE('dirt'), baseColor1: '#9b7653', baseColor2: '#7a5c3a', baseColor3: '#5c4028' },
    bottom: { ...DEFAULT_VOXEL_FACE('dirt'), baseColor1: '#9b7653', baseColor2: '#7a5c3a', baseColor3: '#5c4028' },
    sideMode: 'split', sideSplitPos: 0.2,
    sideTopFace: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#4a8c2a', baseColor2: '#3d7522', baseColor3: '#2d5a18', grainStrength: 0.4 },
  },
  stone_ore: { label: 'Iron Ore',
    top: { ...DEFAULT_VOXEL_FACE('stone'), oreLayers: [{ color: '#888899', highlightColor: '#ccccdd', density: 5, clusterSize: 2, name: 'Iron', style: 'metal', oreScale: 1.5 }] },
    side: { ...DEFAULT_VOXEL_FACE('stone'), oreLayers: [{ color: '#888899', highlightColor: '#ccccdd', density: 5, clusterSize: 2, name: 'Iron', style: 'metal', oreScale: 1.5 }] },
    bottom: { ...DEFAULT_VOXEL_FACE('stone'), oreLayers: [{ color: '#888899', highlightColor: '#ccccdd', density: 5, clusterSize: 2, name: 'Iron', style: 'metal', oreScale: 1.5 }] },
    sideMode: 'uniform', sideSplitPos: 0.5, sideTopFace: DEFAULT_VOXEL_FACE('stone'),
  },
  diamond_ore: { label: 'Diamond Ore',
    top: { ...DEFAULT_VOXEL_FACE('deepslate'), oreLayers: [{ color: '#4488dd', highlightColor: '#cceeff', density: 3, clusterSize: 2, name: 'Diamond', style: 'jewel', oreScale: 1.5 }] },
    side: { ...DEFAULT_VOXEL_FACE('deepslate'), oreLayers: [{ color: '#4488dd', highlightColor: '#cceeff', density: 3, clusterSize: 2, name: 'Diamond', style: 'jewel', oreScale: 1.5 }] },
    bottom: { ...DEFAULT_VOXEL_FACE('deepslate'), oreLayers: [{ color: '#4488dd', highlightColor: '#cceeff', density: 3, clusterSize: 2, name: 'Diamond', style: 'jewel', oreScale: 1.5 }] },
    sideMode: 'uniform', sideSplitPos: 0.5, sideTopFace: DEFAULT_VOXEL_FACE('deepslate'),
  },
  sand: { label: 'Sandstone',
    top: { ...DEFAULT_VOXEL_FACE('sandstone'), baseColor1: '#e8d8a0', baseColor2: '#d4c488', baseColor3: '#c4b070', grainDirection: 'horizontal', grainStrength: 0.2 },
    side: { ...DEFAULT_VOXEL_FACE('sandstone'), baseColor1: '#d4c298', baseColor2: '#c4a86e', baseColor3: '#a08850', grainDirection: 'horizontal', grainStrength: 0.4 },
    bottom: { ...DEFAULT_VOXEL_FACE('sandstone'), baseColor1: '#c4a86e', baseColor2: '#a08850', baseColor3: '#8a7040', grainDirection: 'horizontal' },
    sideMode: 'gradient_top', sideSplitPos: 0.4,
    sideTopFace: { ...DEFAULT_VOXEL_FACE('sandstone'), baseColor1: '#e8d8a0', baseColor2: '#d4c488', baseColor3: '#c4b070' },
  },
  log: { label: 'Wood Log',
    top: { ...DEFAULT_VOXEL_FACE('rings'), baseColor1: '#c49a6c', baseColor2: '#a07848', baseColor3: '#5c3820', grainStrength: 0.4, grainDirection: 'none', depthShading: 0.5 },
    side: { ...DEFAULT_VOXEL_FACE('bark'), baseColor1: '#6b4c32', baseColor2: '#553a24', baseColor3: '#3d2818', grainStrength: 0.5, grainDirection: 'vertical', outlineStrength: 0.3 },
    bottom: { ...DEFAULT_VOXEL_FACE('rings'), baseColor1: '#c49a6c', baseColor2: '#a07848', baseColor3: '#5c3820', grainStrength: 0.4, grainDirection: 'none', depthShading: 0.5 },
    sideMode: 'uniform', sideSplitPos: 0.5, sideTopFace: DEFAULT_VOXEL_FACE('custom'),
  },
  flowery_grass: { label: 'Flowery Grass',
    top: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#4a8c2a', baseColor2: '#3d7522', baseColor3: '#2d5a18', grainDirection: 'both', grainStrength: 0.4,
      oreLayers: [
        { color: '#dd4466', highlightColor: '#ff88aa', density: 4, clusterSize: 1, name: 'Flowers', style: 'flat', oreScale: 0.5 },
        { color: '#eedd44', highlightColor: '#ffff88', density: 3, clusterSize: 1, name: 'Dandelions', style: 'flat', oreScale: 0.5 },
        { color: '#ffffff', highlightColor: '#ffffee', density: 2, clusterSize: 1, name: 'Daisies', style: 'flat', oreScale: 0.5 },
      ] },
    side: { ...DEFAULT_VOXEL_FACE('dirt'), baseColor1: '#9b7653', baseColor2: '#7a5c3a', baseColor3: '#5c4028' },
    bottom: { ...DEFAULT_VOXEL_FACE('dirt'), baseColor1: '#9b7653', baseColor2: '#7a5c3a', baseColor3: '#5c4028' },
    sideMode: 'split', sideSplitPos: 0.2,
    sideTopFace: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#4a8c2a', baseColor2: '#3d7522', baseColor3: '#2d5a18', grainStrength: 0.3 },
  },
  leaves: { label: 'Leaves',
    top: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#2d8c2a', baseColor2: '#1f6b1e', baseColor3: '#145514', grainDirection: 'both', grainStrength: 0.6, depthShading: 0.3 },
    side: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#267a24', baseColor2: '#1a6018', baseColor3: '#104810', grainDirection: 'both', grainStrength: 0.7, depthShading: 0.5 },
    bottom: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#1a5518', baseColor2: '#124010', baseColor3: '#0a300a', grainDirection: 'both', grainStrength: 0.5, depthShading: 0.6 },
    sideMode: 'uniform', sideSplitPos: 0.5, sideTopFace: DEFAULT_VOXEL_FACE('custom'),
  },
  fallen_leaves: { label: 'Fallen Leaves',
    top: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#c47a2a', baseColor2: '#a05520', baseColor3: '#7a3a15', grainDirection: 'both', grainStrength: 0.5,
      oreLayers: [
        { color: '#dd3322', highlightColor: '#ee6644', density: 5, clusterSize: 1, name: 'Red Leaves', style: 'flat', oreScale: 0.7 },
        { color: '#eebb22', highlightColor: '#ffdd55', density: 4, clusterSize: 1, name: 'Yellow Leaves', style: 'flat', oreScale: 0.7 },
      ] },
    side: { ...DEFAULT_VOXEL_FACE('dirt'), baseColor1: '#7a5c3a', baseColor2: '#5c4028', baseColor3: '#3d2818' },
    bottom: { ...DEFAULT_VOXEL_FACE('dirt'), baseColor1: '#7a5c3a', baseColor2: '#5c4028', baseColor3: '#3d2818' },
    sideMode: 'split', sideSplitPos: 0.15,
    sideTopFace: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#a06030', baseColor2: '#804820', baseColor3: '#603015', grainStrength: 0.4 },
  },
  mud: { label: 'Mud',
    top: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#5c4030', baseColor2: '#4a3528', baseColor3: '#382820', grainDirection: 'both', grainStrength: 0.3, outlineStrength: 0.1 },
    side: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#4a3528', baseColor2: '#382820', baseColor3: '#2a1e18', grainDirection: 'both', grainStrength: 0.2 },
    bottom: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#382820', baseColor2: '#2a1e18', baseColor3: '#201510', grainDirection: 'none', grainStrength: 0 },
    sideMode: 'gradient_top', sideSplitPos: 0.6,
    sideTopFace: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#5c4030', baseColor2: '#4a3528', baseColor3: '#382820' },
  },
  lava: { label: 'Lava',
    top: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#ff6600', baseColor2: '#cc3300', baseColor3: '#881100', grainDirection: 'both', grainStrength: 0.7, depthShading: 0, outlineStrength: 0.4,
      oreLayers: [{ color: '#ffcc00', highlightColor: '#ffff66', density: 8, clusterSize: 2, name: 'Hot Spots', style: 'flat', oreScale: 1.5 }] },
    side: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#cc3300', baseColor2: '#881100', baseColor3: '#440800', grainDirection: 'vertical', grainStrength: 0.5,
      oreLayers: [{ color: '#ff6600', highlightColor: '#ffaa00', density: 5, clusterSize: 2, name: 'Glow', style: 'flat', oreScale: 1.2 }] },
    bottom: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#440800', baseColor2: '#220400', baseColor3: '#110200', grainDirection: 'none', grainStrength: 0, depthShading: 0.8 },
    sideMode: 'gradient_bottom', sideSplitPos: 0.7,
    sideTopFace: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#ff6600', baseColor2: '#cc3300', baseColor3: '#881100', grainStrength: 0.4 },
  },
  tree_trunk: { label: 'Oak Trunk',
    top: { ...DEFAULT_VOXEL_FACE('rings'), baseColor1: '#c49a6c', baseColor2: '#8b6838', baseColor3: '#5c3820', grainStrength: 0.5, grainDirection: 'none', depthShading: 0.6 },
    side: { ...DEFAULT_VOXEL_FACE('bark'), baseColor1: '#7a5838', baseColor2: '#5c3f24', baseColor3: '#3d2818', grainStrength: 0.7, grainDirection: 'vertical', outlineStrength: 0.4 },
    bottom: { ...DEFAULT_VOXEL_FACE('rings'), baseColor1: '#c49a6c', baseColor2: '#8b6838', baseColor3: '#5c3820', grainStrength: 0.5, grainDirection: 'none', depthShading: 0.6 },
    sideMode: 'uniform', sideSplitPos: 0.5, sideTopFace: DEFAULT_VOXEL_FACE('custom'),
  },
  birch_trunk: { label: 'Birch Trunk',
    top: { ...DEFAULT_VOXEL_FACE('rings'), baseColor1: '#e8dcc0', baseColor2: '#c4a878', baseColor3: '#8b6838', grainStrength: 0.3, grainDirection: 'none', depthShading: 0.4 },
    side: { ...DEFAULT_VOXEL_FACE('bark'), baseColor1: '#f0ece4', baseColor2: '#d4ccc0', baseColor3: '#2a2420', grainStrength: 0.3, grainDirection: 'vertical', outlineStrength: 0.2 },
    bottom: { ...DEFAULT_VOXEL_FACE('rings'), baseColor1: '#e8dcc0', baseColor2: '#c4a878', baseColor3: '#8b6838', grainStrength: 0.3, grainDirection: 'none', depthShading: 0.4 },
    sideMode: 'uniform', sideSplitPos: 0.5, sideTopFace: DEFAULT_VOXEL_FACE('custom'),
  },
  dark_oak_trunk: { label: 'Dark Oak Trunk',
    top: { ...DEFAULT_VOXEL_FACE('rings'), baseColor1: '#6b4c28', baseColor2: '#4a3418', baseColor3: '#2a1c0c', grainStrength: 0.6, grainDirection: 'none', depthShading: 0.7 },
    side: { ...DEFAULT_VOXEL_FACE('bark'), baseColor1: '#3d2c18', baseColor2: '#2a1c0c', baseColor3: '#1a0f06', grainStrength: 0.8, grainDirection: 'vertical', outlineStrength: 0.5 },
    bottom: { ...DEFAULT_VOXEL_FACE('rings'), baseColor1: '#6b4c28', baseColor2: '#4a3418', baseColor3: '#2a1c0c', grainStrength: 0.6, grainDirection: 'none', depthShading: 0.7 },
    sideMode: 'uniform', sideSplitPos: 0.5, sideTopFace: DEFAULT_VOXEL_FACE('custom'),
  },
  spruce_trunk: { label: 'Spruce Trunk',
    top: { ...DEFAULT_VOXEL_FACE('rings'), baseColor1: '#9b7848', baseColor2: '#6b5030', baseColor3: '#3d2818', grainStrength: 0.4, grainDirection: 'none', depthShading: 0.5 },
    side: { ...DEFAULT_VOXEL_FACE('bark'), baseColor1: '#4a3828', baseColor2: '#352818', baseColor3: '#201810', grainStrength: 0.6, grainDirection: 'vertical', outlineStrength: 0.5 },
    bottom: { ...DEFAULT_VOXEL_FACE('rings'), baseColor1: '#9b7848', baseColor2: '#6b5030', baseColor3: '#3d2818', grainStrength: 0.4, grainDirection: 'none', depthShading: 0.5 },
    sideMode: 'uniform', sideSplitPos: 0.5, sideTopFace: DEFAULT_VOXEL_FACE('custom'),
  },
  jungle_trunk: { label: 'Jungle Trunk',
    top: { ...DEFAULT_VOXEL_FACE('rings'), baseColor1: '#b8944c', baseColor2: '#8b6c30', baseColor3: '#5c4820', grainStrength: 0.5, grainDirection: 'none', depthShading: 0.5 },
    side: { ...DEFAULT_VOXEL_FACE('bark'), baseColor1: '#6b5828', baseColor2: '#4a3c18', baseColor3: '#302810', grainStrength: 0.6, grainDirection: 'vertical', outlineStrength: 0.3,
      oreLayers: [{ color: '#2a5c18', highlightColor: '#3d7a24', density: 2, clusterSize: 1, name: 'Vines', style: 'flat', oreScale: 1 }] },
    bottom: { ...DEFAULT_VOXEL_FACE('rings'), baseColor1: '#b8944c', baseColor2: '#8b6c30', baseColor3: '#5c4820', grainStrength: 0.5, grainDirection: 'none', depthShading: 0.5 },
    sideMode: 'uniform', sideSplitPos: 0.5, sideTopFace: DEFAULT_VOXEL_FACE('custom'),
  },
  sand_block: { label: 'Sand',
    top: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#f0e0a0', baseColor2: '#e0d090', baseColor3: '#d0c080', grainDirection: 'both', grainStrength: 0.2, outlineStrength: 0 },
    side: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#e0d090', baseColor2: '#d0c080', baseColor3: '#c0b070', grainDirection: 'horizontal', grainStrength: 0.3 },
    bottom: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#d0c080', baseColor2: '#c0b070', baseColor3: '#b0a060', grainDirection: 'horizontal', grainStrength: 0.2 },
    sideMode: 'gradient_top', sideSplitPos: 0.3,
    sideTopFace: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#f0e0a0', baseColor2: '#e0d090', baseColor3: '#d0c080' },
  },
  shell_sand: { label: 'Shell Sand',
    top: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#f0e0a0', baseColor2: '#e8d898', baseColor3: '#d4c488', grainDirection: 'both', grainStrength: 0.15,
      oreLayers: [
        { color: '#ffe8e0', highlightColor: '#fff8f4', density: 3, clusterSize: 1, name: 'White Shell', style: 'flat', oreScale: 0.7 },
        { color: '#ffccaa', highlightColor: '#ffeedd', density: 2, clusterSize: 1, name: 'Pink Shell', style: 'jewel', oreScale: 0.6 },
        { color: '#c0a080', highlightColor: '#e0c8a8', density: 2, clusterSize: 1, name: 'Brown Shell', style: 'flat', oreScale: 0.5 },
      ] },
    side: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#e0d090', baseColor2: '#d0c080', baseColor3: '#c0b070', grainDirection: 'horizontal', grainStrength: 0.2 },
    bottom: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#d0c080', baseColor2: '#c0b070', baseColor3: '#b0a060', grainDirection: 'horizontal', grainStrength: 0.2 },
    sideMode: 'gradient_top', sideSplitPos: 0.25,
    sideTopFace: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#f0e0a0', baseColor2: '#e8d898', baseColor3: '#d4c488' },
  },
  bouncy: { label: 'Bouncy',
    top: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#44cc55', baseColor2: '#33aa44', baseColor3: '#228833', grainDirection: 'none', grainStrength: 0, depthShading: 0.7, outlineStrength: 0.1, paletteSize: 6 },
    side: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#33aa44', baseColor2: '#228833', baseColor3: '#116622', grainDirection: 'none', grainStrength: 0, depthShading: 0.8, outlineStrength: 0.1, paletteSize: 6 },
    bottom: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#228833', baseColor2: '#116622', baseColor3: '#005511', grainDirection: 'none', grainStrength: 0, depthShading: 0.9, outlineStrength: 0, paletteSize: 6 },
    sideMode: 'uniform', sideSplitPos: 0.5, sideTopFace: DEFAULT_VOXEL_FACE('custom'),
  },
  glass: { label: 'Glass',
    top: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#ccddee', baseColor2: '#bbccdd', baseColor3: '#aabbcc', grainDirection: 'none', grainStrength: 0, depthShading: 0.8, outlineStrength: 0.5, paletteSize: 4,
      oreLayers: [{ color: '#ffffff', highlightColor: '#ffffff', density: 2, clusterSize: 1, name: 'Glint', style: 'crystal', oreScale: 0.5 }] },
    side: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#bbccdd', baseColor2: '#aabbcc', baseColor3: '#99aabb', grainDirection: 'none', grainStrength: 0, depthShading: 0.9, outlineStrength: 0.6, paletteSize: 4,
      oreLayers: [{ color: '#ffffff', highlightColor: '#ffffff', density: 1.5, clusterSize: 1, name: 'Glint', style: 'crystal', oreScale: 0.5 }] },
    bottom: { ...DEFAULT_VOXEL_FACE('custom'), baseColor1: '#aabbcc', baseColor2: '#99aabb', baseColor3: '#8899aa', grainDirection: 'none', grainStrength: 0, depthShading: 0.7, outlineStrength: 0.4, paletteSize: 4 },
    sideMode: 'uniform', sideSplitPos: 0.5, sideTopFace: DEFAULT_VOXEL_FACE('custom'),
  },
};

type FaceName = 'top' | 'side' | 'bottom';

interface BlockPreset {
  label: string;
  top: FaceTextureConfig;
  side: FaceTextureConfig;
  bottom: FaceTextureConfig;
}

const WORKBENCH_PRESETS: Record<string, BlockPreset> = {
  oak_trunk: {
    label: 'Oak Tree Trunk',
    top: { type: 'Wood', size: 256, seed: 1, params: { color1: '#c49a6c', color2: '#8b5e3c', color3: '#a0744c', planks: 0, xScale: 5, scale: 1, persistence: 0.5, grainWidth: 1, gapWidth: 0.3, rings: true } },
    side: { type: 'Bark', size: 256, seed: 1, params: { color1: '#7a5838', color2: '#5c3f24', color3: '#3d2818', fissures: 8, roughness: 0.6, depth: 0.7, barkScale: 1 } },
    bottom: { type: 'Wood', size: 256, seed: 2, params: { color1: '#c49a6c', color2: '#8b5e3c', color3: '#a0744c', planks: 0, xScale: 5, scale: 1, persistence: 0.5, grainWidth: 1, gapWidth: 0.3, rings: true } },
  },
  birch_trunk: {
    label: 'Birch Tree Trunk',
    top: { type: 'Wood', size: 256, seed: 3, params: { color1: '#e8dcc0', color2: '#c4a878', color3: '#8b6838', planks: 0, xScale: 4, scale: 0.8, persistence: 0.4, grainWidth: 0.8, gapWidth: 0.3, rings: true } },
    side: { type: 'Bark', size: 256, seed: 3, params: { color1: '#f0ece4', color2: '#d4ccc0', color3: '#2a2420', fissures: 4, roughness: 0.2, depth: 0.4, barkScale: 1 } },
    bottom: { type: 'Wood', size: 256, seed: 4, params: { color1: '#e8dcc0', color2: '#c4a878', color3: '#8b6838', planks: 0, xScale: 4, scale: 0.8, persistence: 0.4, grainWidth: 0.8, gapWidth: 0.3, rings: true } },
  },
  grass_block: {
    label: 'Grass Block',
    top: { type: 'PerlinNoise', size: 256, seed: 1, params: { color1: '#4a8c2a', color2: '#2d5a18', noiseType: 'FractalNoise', scale: 40, octaves: 5, persistence: 0.5 } },
    side: { type: 'PerlinNoise', size: 256, seed: 2, params: { color1: '#9b7653', color2: '#5c4028', noiseType: 'FractalNoise', scale: 30, octaves: 4, persistence: 0.6, grassOverlay: { color1: '#4a8c2a', color2: '#2d5a18', height: 0.15, seed: 1 } } },
    bottom: { type: 'PerlinNoise', size: 256, seed: 3, params: { color1: '#9b7653', color2: '#5c4028', noiseType: 'FractalNoise', scale: 30, octaves: 4, persistence: 0.6 } },
  },
  stone_brick: {
    label: 'Stone Brick',
    top: { type: 'Brick', size: 256, seed: 1, params: { color1: '#9a9a9a', color2: '#7a7a7a', groutColor: '#555555', gradientColor: '#555555', pattern: 'edges', x: 4, y: 4, grout: 4, gradient: 2, colorMode: 'random', shadeRange: 0.1, texture: 0.3, textureScale: 40 } },
    side: { type: 'Brick', size: 256, seed: 2, params: { color1: '#9a9a9a', color2: '#7a7a7a', groutColor: '#555555', gradientColor: '#555555', pattern: 'edges', x: 8, y: 6, grout: 4, gradient: 2, colorMode: 'random', shadeRange: 0.1, texture: 0.3, textureScale: 40 } },
    bottom: { type: 'Brick', size: 256, seed: 3, params: { color1: '#8a8a8a', color2: '#6a6a6a', groutColor: '#444444', gradientColor: '#444444', pattern: 'edges', x: 4, y: 4, grout: 4, gradient: 2, colorMode: 'random', shadeRange: 0.1, texture: 0.4, textureScale: 40 } },
  },
  wood_planks: {
    label: 'Wood Planks',
    top: { type: 'Wood', size: 256, seed: 1, params: { color1: '#c49a6c', color2: '#8b5e3c', color3: '#a0744c', planks: 5, xScale: 5, scale: 1, persistence: 0.5, grainWidth: 1, gapWidth: 0.4 } },
    side: { type: 'Wood', size: 256, seed: 2, params: { color1: '#b08858', color2: '#7a5030', color3: '#906840', planks: 4, xScale: 5, scale: 1, persistence: 0.5, grainWidth: 1, gapWidth: 0.5 } },
    bottom: { type: 'Wood', size: 256, seed: 3, params: { color1: '#c49a6c', color2: '#8b5e3c', color3: '#a0744c', planks: 5, xScale: 5, scale: 1, persistence: 0.5, grainWidth: 1, gapWidth: 0.4 } },
  },
  sand_block: {
    label: 'Sand Block',
    top: { type: 'PerlinNoise', size: 256, seed: 5, params: { color1: '#f0e0a0', color2: '#d4c080', noiseType: 'FractalNoise', scale: 25, octaves: 4, persistence: 0.4 } },
    side: { type: 'PerlinNoise', size: 256, seed: 6, params: { color1: '#e0d090', color2: '#c4b070', noiseType: 'FractalNoise', scale: 30, octaves: 4, persistence: 0.4 } },
    bottom: { type: 'PerlinNoise', size: 256, seed: 7, params: { color1: '#d4c080', color2: '#b4a060', noiseType: 'FractalNoise', scale: 30, octaves: 4, persistence: 0.5 } },
  },
  cobblestone: {
    label: 'Cobblestone',
    top: { type: 'CartoonOre', size: 256, seed: 1, params: { color1: '#7a7a7a', color2: '#6a6a6a', color3: '#5a5a5a', bgNoise: 0.5, bgPatch: 40, outline: 1.2, shadow: 0.5, ores: [{ color: '#999999', highlightColor: '#bbbbbb', shape: 'round', count: 15, minSize: 25, maxSize: 55, name: 'Stone', useGradient: false }] } },
    side: { type: 'CartoonOre', size: 256, seed: 2, params: { color1: '#7a7a7a', color2: '#6a6a6a', color3: '#5a5a5a', bgNoise: 0.5, bgPatch: 40, outline: 1.2, shadow: 0.5, ores: [{ color: '#999999', highlightColor: '#bbbbbb', shape: 'round', count: 15, minSize: 25, maxSize: 55, name: 'Stone', useGradient: false }] } },
    bottom: { type: 'CartoonOre', size: 256, seed: 3, params: { color1: '#6a6a6a', color2: '#5a5a5a', color3: '#4a4a4a', bgNoise: 0.5, bgPatch: 40, outline: 1.2, shadow: 0.5, ores: [{ color: '#888888', highlightColor: '#aaaaaa', shape: 'round', count: 12, minSize: 25, maxSize: 55, name: 'Stone', useGradient: false }] } },
  },
  tiled_floor: {
    label: 'Tiled Floor',
    top: { type: 'Tiles', size: 256, seed: 1, params: { x: 3, y: 3, color1: '#ddd8d0', groutColor: '#999999', gradientColor: '#cccccc', groutGradientColor: '#777777', xGrout: 12, yGrout: 12, xGradient: 20, yGradient: 20, gradientEnabled: true, groutGradientEnabled: true, color2: '#c8c0b8', colorMode: 'single', shadeRange: 0.05, texture: 0 } },
    side: { type: 'PerlinNoise', size: 256, seed: 2, params: { color1: '#c8c0b8', color2: '#a8a098', noiseType: 'FractalNoise', scale: 30, octaves: 3, persistence: 0.4 } },
    bottom: { type: 'Tiles', size: 256, seed: 3, params: { x: 3, y: 3, color1: '#c8c0b8', groutColor: '#888888', gradientColor: '#b0a8a0', groutGradientColor: '#666666', xGrout: 12, yGrout: 12, xGradient: 20, yGradient: 20, gradientEnabled: true, groutGradientEnabled: true, color2: '#b8b0a8', colorMode: 'single', shadeRange: 0.05, texture: 0 } },
  },
  hex_stone: {
    label: 'Hexagonal Stone',
    top: { type: 'Hexagon', size: 256, seed: 1, params: { color1: '#b0a898', color2: '#908880', groutColor: '#555555', columns: 5, groutSize: 5, shade: 0.15 } },
    side: { type: 'Hexagon', size: 256, seed: 2, params: { color1: '#a09888', color2: '#887868', groutColor: '#555555', columns: 5, groutSize: 5, shade: 0.15 } },
    bottom: { type: 'Hexagon', size: 256, seed: 3, params: { color1: '#a09888', color2: '#887868', groutColor: '#555555', columns: 5, groutSize: 5, shade: 0.15 } },
  },
  lava: {
    label: 'Lava',
    top: { type: 'PerlinNoise', size: 256, seed: 10, params: { color1: '#ffee44', color2: '#1a0500', noiseType: 'FractalNoise', scale: 12, octaves: 5, persistence: 0.5, colorStops: [{ position: 0, color: '#1a0500' }, { position: 0.25, color: '#881100' }, { position: 0.5, color: '#ee4400' }, { position: 0.75, color: '#ffaa00' }, { position: 1, color: '#ffee44' }] } },
    side: { type: 'PerlinNoise', size: 256, seed: 14, params: { color1: '#ffcc22', color2: '#100400', noiseType: 'FractalNoise', scale: 14, octaves: 5, persistence: 0.5, colorStops: [{ position: 0, color: '#100400' }, { position: 0.25, color: '#771100' }, { position: 0.5, color: '#dd3300' }, { position: 0.75, color: '#ff8800' }, { position: 1, color: '#ffcc22' }] } },
    bottom: { type: 'PerlinNoise', size: 256, seed: 17, params: { color1: '#ffaa00', color2: '#0a0200', noiseType: 'FractalNoise', scale: 16, octaves: 5, persistence: 0.5, colorStops: [{ position: 0, color: '#0a0200' }, { position: 0.3, color: '#661100' }, { position: 0.55, color: '#cc3300' }, { position: 0.8, color: '#ff7700' }, { position: 1, color: '#ffaa00' }] } },
  },
  woven_fabric: {
    label: 'Woven Fabric',
    top: { type: 'Textiles', size: 256, seed: 1, params: { color1: '#cc6644', color2: '#884422', pattern: 4, double: false, tightness: 1, thickness: 6, smoothness: 0, shading: 0.3 } },
    side: { type: 'Textiles', size: 256, seed: 1, params: { color1: '#cc6644', color2: '#884422', pattern: 4, double: false, tightness: 1, thickness: 6, smoothness: 0, shading: 0.3 } },
    bottom: { type: 'Textiles', size: 256, seed: 1, params: { color1: '#cc6644', color2: '#884422', pattern: 4, double: false, tightness: 1, thickness: 6, smoothness: 0, shading: 0.3 } },
  },
  ore_block: {
    label: 'Diamond Ore',
    top: { type: 'CartoonOre', size: 256, seed: 5, params: { color1: '#6a6a70', color2: '#5a5a60', color3: '#4a4a50', bgNoise: 0.5, bgPatch: 30, outline: 1.5, shadow: 0.6, ores: [{ color: '#4488dd', highlightColor: '#88ccff', shape: 'diamond', count: 6, minSize: 15, maxSize: 35, name: 'Diamond', useGradient: true }] } },
    side: { type: 'CartoonOre', size: 256, seed: 6, params: { color1: '#6a6a70', color2: '#5a5a60', color3: '#4a4a50', bgNoise: 0.5, bgPatch: 30, outline: 1.5, shadow: 0.6, ores: [{ color: '#4488dd', highlightColor: '#88ccff', shape: 'diamond', count: 5, minSize: 15, maxSize: 35, name: 'Diamond', useGradient: true }] } },
    bottom: { type: 'CartoonOre', size: 256, seed: 7, params: { color1: '#5a5a60', color2: '#4a4a50', color3: '#3a3a40', bgNoise: 0.5, bgPatch: 30, outline: 1.5, shadow: 0.6, ores: [{ color: '#4488dd', highlightColor: '#88ccff', shape: 'diamond', count: 4, minSize: 15, maxSize: 35, name: 'Diamond', useGradient: true }] } },
  },
  iron_ore: {
    label: 'Iron Ore',
    top: { type: 'CartoonOre', size: 256, seed: 20, params: { color1: '#8a8a8a', color2: '#6e6e6e', color3: '#555555', bgNoise: 0.5, bgPatch: 30, outline: 1.2, shadow: 0.5, ores: [{ color: '#d4a574', highlightColor: '#f0c8a0', shape: 'round', count: 8, minSize: 10, maxSize: 28, name: 'Iron', useGradient: false }] } },
    side: { type: 'CartoonOre', size: 256, seed: 21, params: { color1: '#8a8a8a', color2: '#6e6e6e', color3: '#555555', bgNoise: 0.5, bgPatch: 30, outline: 1.2, shadow: 0.5, ores: [{ color: '#d4a574', highlightColor: '#f0c8a0', shape: 'round', count: 7, minSize: 10, maxSize: 28, name: 'Iron', useGradient: false }] } },
    bottom: { type: 'CartoonOre', size: 256, seed: 22, params: { color1: '#7a7a7a', color2: '#5e5e5e', color3: '#454545', bgNoise: 0.5, bgPatch: 30, outline: 1.2, shadow: 0.5, ores: [{ color: '#d4a574', highlightColor: '#f0c8a0', shape: 'round', count: 6, minSize: 10, maxSize: 28, name: 'Iron', useGradient: false }] } },
  },
  gold_ore: {
    label: 'Gold Ore',
    top: { type: 'CartoonOre', size: 256, seed: 30, params: { color1: '#8a8a8a', color2: '#6e6e6e', color3: '#555555', bgNoise: 0.5, bgPatch: 30, outline: 1.3, shadow: 0.5, ores: [{ color: '#ffd700', highlightColor: '#ffee88', shape: 'square', count: 6, minSize: 12, maxSize: 30, name: 'Gold', useGradient: true }] } },
    side: { type: 'CartoonOre', size: 256, seed: 31, params: { color1: '#8a8a8a', color2: '#6e6e6e', color3: '#555555', bgNoise: 0.5, bgPatch: 30, outline: 1.3, shadow: 0.5, ores: [{ color: '#ffd700', highlightColor: '#ffee88', shape: 'square', count: 5, minSize: 12, maxSize: 30, name: 'Gold', useGradient: true }] } },
    bottom: { type: 'CartoonOre', size: 256, seed: 32, params: { color1: '#7a7a7a', color2: '#5e5e5e', color3: '#454545', bgNoise: 0.5, bgPatch: 30, outline: 1.3, shadow: 0.5, ores: [{ color: '#ffd700', highlightColor: '#ffee88', shape: 'square', count: 4, minSize: 12, maxSize: 30, name: 'Gold', useGradient: true }] } },
  },
  emerald_ore: {
    label: 'Emerald Ore',
    top: { type: 'CartoonOre', size: 256, seed: 40, params: { color1: '#8a8a8a', color2: '#6e6e6e', color3: '#555555', bgNoise: 0.5, bgPatch: 30, outline: 1.4, shadow: 0.6, ores: [{ color: '#22cc44', highlightColor: '#66ff88', shape: 'hexagon', count: 4, minSize: 14, maxSize: 32, name: 'Emerald', useGradient: true }] } },
    side: { type: 'CartoonOre', size: 256, seed: 41, params: { color1: '#8a8a8a', color2: '#6e6e6e', color3: '#555555', bgNoise: 0.5, bgPatch: 30, outline: 1.4, shadow: 0.6, ores: [{ color: '#22cc44', highlightColor: '#66ff88', shape: 'hexagon', count: 3, minSize: 14, maxSize: 32, name: 'Emerald', useGradient: true }] } },
    bottom: { type: 'CartoonOre', size: 256, seed: 42, params: { color1: '#7a7a7a', color2: '#5e5e5e', color3: '#454545', bgNoise: 0.5, bgPatch: 30, outline: 1.4, shadow: 0.6, ores: [{ color: '#22cc44', highlightColor: '#66ff88', shape: 'hexagon', count: 3, minSize: 14, maxSize: 32, name: 'Emerald', useGradient: true }] } },
  },
  redstone_ore: {
    label: 'Redstone Ore',
    top: { type: 'CartoonOre', size: 256, seed: 50, params: { color1: '#7a7070', color2: '#5e5555', color3: '#4a4040', bgNoise: 0.5, bgPatch: 30, outline: 1.2, shadow: 0.5, ores: [{ color: '#dd2222', highlightColor: '#ff6644', shape: 'round', count: 10, minSize: 6, maxSize: 18, name: 'Redstone', useGradient: false }] } },
    side: { type: 'CartoonOre', size: 256, seed: 51, params: { color1: '#7a7070', color2: '#5e5555', color3: '#4a4040', bgNoise: 0.5, bgPatch: 30, outline: 1.2, shadow: 0.5, ores: [{ color: '#dd2222', highlightColor: '#ff6644', shape: 'round', count: 9, minSize: 6, maxSize: 18, name: 'Redstone', useGradient: false }] } },
    bottom: { type: 'CartoonOre', size: 256, seed: 52, params: { color1: '#6a6060', color2: '#4e4545', color3: '#3a3030', bgNoise: 0.5, bgPatch: 30, outline: 1.2, shadow: 0.5, ores: [{ color: '#dd2222', highlightColor: '#ff6644', shape: 'round', count: 8, minSize: 6, maxSize: 18, name: 'Redstone', useGradient: false }] } },
  },
  coal_ore: {
    label: 'Coal Ore',
    top: { type: 'CartoonOre', size: 256, seed: 60, params: { color1: '#8a8a8a', color2: '#6e6e6e', color3: '#555555', bgNoise: 0.4, bgPatch: 35, outline: 1.0, shadow: 0.4, ores: [{ color: '#1a1a1a', highlightColor: '#333333', shape: 'round', count: 7, minSize: 18, maxSize: 45, name: 'Coal', useGradient: false }] } },
    side: { type: 'CartoonOre', size: 256, seed: 61, params: { color1: '#8a8a8a', color2: '#6e6e6e', color3: '#555555', bgNoise: 0.4, bgPatch: 35, outline: 1.0, shadow: 0.4, ores: [{ color: '#1a1a1a', highlightColor: '#333333', shape: 'round', count: 6, minSize: 18, maxSize: 45, name: 'Coal', useGradient: false }] } },
    bottom: { type: 'CartoonOre', size: 256, seed: 62, params: { color1: '#7a7a7a', color2: '#5e5e5e', color3: '#454545', bgNoise: 0.4, bgPatch: 35, outline: 1.0, shadow: 0.4, ores: [{ color: '#1a1a1a', highlightColor: '#333333', shape: 'round', count: 5, minSize: 18, maxSize: 45, name: 'Coal', useGradient: false }] } },
  },
  copper_ore: {
    label: 'Copper Ore',
    top: { type: 'CartoonOre', size: 256, seed: 70, params: { color1: '#8a8a8a', color2: '#6e6e6e', color3: '#555555', bgNoise: 0.5, bgPatch: 30, outline: 1.3, shadow: 0.5, ores: [{ color: '#cc7744', highlightColor: '#ee9966', shape: 'round', count: 9, minSize: 10, maxSize: 26, name: 'Copper', useGradient: false }] } },
    side: { type: 'CartoonOre', size: 256, seed: 71, params: { color1: '#8a8a8a', color2: '#6e6e6e', color3: '#555555', bgNoise: 0.5, bgPatch: 30, outline: 1.3, shadow: 0.5, ores: [{ color: '#cc7744', highlightColor: '#ee9966', shape: 'round', count: 8, minSize: 10, maxSize: 26, name: 'Copper', useGradient: false }] } },
    bottom: { type: 'CartoonOre', size: 256, seed: 72, params: { color1: '#7a7a7a', color2: '#5e5e5e', color3: '#454545', bgNoise: 0.5, bgPatch: 30, outline: 1.3, shadow: 0.5, ores: [{ color: '#cc7744', highlightColor: '#ee9966', shape: 'round', count: 7, minSize: 10, maxSize: 26, name: 'Copper', useGradient: false }] } },
  },
  spruce_trunk: {
    label: 'Spruce Trunk',
    top: { type: 'Wood', size: 256, seed: 10, params: { color1: '#a07848', color2: '#6b4c2a', color3: '#7d5c38', planks: 0, xScale: 5, scale: 1, persistence: 0.5, grainWidth: 1, gapWidth: 0.35, rings: true } },
    side: { type: 'Bark', size: 256, seed: 10, params: { color1: '#4a3828', color2: '#3a2818', color3: '#2a1a10', fissures: 10, roughness: 0.7, depth: 0.8, barkScale: 1.2 } },
    bottom: { type: 'Wood', size: 256, seed: 11, params: { color1: '#a07848', color2: '#6b4c2a', color3: '#7d5c38', planks: 0, xScale: 5, scale: 1, persistence: 0.5, grainWidth: 1, gapWidth: 0.35, rings: true } },
  },
  jungle_trunk: {
    label: 'Jungle Trunk',
    top: { type: 'Wood', size: 256, seed: 15, params: { color1: '#b89060', color2: '#8a6838', color3: '#9c7848', planks: 0, xScale: 6, scale: 1.2, persistence: 0.5, grainWidth: 1.2, gapWidth: 0.3, rings: true } },
    side: { type: 'Bark', size: 256, seed: 15, params: { color1: '#6a5030', color2: '#4a3820', color3: '#3a2810', fissures: 6, roughness: 0.5, depth: 0.5, barkScale: 0.8 } },
    bottom: { type: 'Wood', size: 256, seed: 16, params: { color1: '#b89060', color2: '#8a6838', color3: '#9c7848', planks: 0, xScale: 6, scale: 1.2, persistence: 0.5, grainWidth: 1.2, gapWidth: 0.3, rings: true } },
  },
  dark_oak_trunk: {
    label: 'Dark Oak Trunk',
    top: { type: 'Wood', size: 256, seed: 20, params: { color1: '#5c4028', color2: '#3a2818', color3: '#4a3420', planks: 0, xScale: 4, scale: 1, persistence: 0.6, grainWidth: 1, gapWidth: 0.4, rings: true } },
    side: { type: 'Bark', size: 256, seed: 20, params: { color1: '#3a2818', color2: '#2a1a10', color3: '#1a0c08', fissures: 12, roughness: 0.8, depth: 0.9, barkScale: 1.1 } },
    bottom: { type: 'Wood', size: 256, seed: 21, params: { color1: '#5c4028', color2: '#3a2818', color3: '#4a3420', planks: 0, xScale: 4, scale: 1, persistence: 0.6, grainWidth: 1, gapWidth: 0.4, rings: true } },
  },
  acacia_trunk: {
    label: 'Acacia Trunk',
    top: { type: 'Wood', size: 256, seed: 25, params: { color1: '#c87838', color2: '#a05828', color3: '#b06830', planks: 0, xScale: 5, scale: 0.9, persistence: 0.4, grainWidth: 0.9, gapWidth: 0.3, rings: true } },
    side: { type: 'Bark', size: 256, seed: 25, params: { color1: '#8a8070', color2: '#6a6050', color3: '#504840', fissures: 5, roughness: 0.3, depth: 0.4, barkScale: 0.9 } },
    bottom: { type: 'Wood', size: 256, seed: 26, params: { color1: '#c87838', color2: '#a05828', color3: '#b06830', planks: 0, xScale: 5, scale: 0.9, persistence: 0.4, grainWidth: 0.9, gapWidth: 0.3, rings: true } },
  },
  flowery_grass: {
    label: 'Flowery Grass',
    top: { type: 'CartoonOre', size: 256, seed: 80, params: { color1: '#4a8c2a', color2: '#3d7522', color3: '#2d5a18', bgNoise: 0.6, bgPatch: 25, outline: 0.8, shadow: 0.3, ores: [{ color: '#ff4466', highlightColor: '#ffaacc', shape: 'flower', count: 10, minSize: 16, maxSize: 32, name: 'Flowers', useGradient: true }, { color: '#ffdd44', highlightColor: '#ffee88', shape: 'flower', count: 7, minSize: 14, maxSize: 28, name: 'Daisies', useGradient: false }, { color: '#ffffff', highlightColor: '#ffffdd', shape: 'flower', count: 4, minSize: 12, maxSize: 24, name: 'White Flowers', useGradient: false }] } },
    side: { type: 'PerlinNoise', size: 256, seed: 81, params: { color1: '#9b7653', color2: '#5c4028', noiseType: 'FractalNoise', scale: 30, octaves: 4, persistence: 0.6, grassOverlay: { color1: '#4a8c2a', color2: '#2d5a18', height: 0.15, seed: 80 } } },
    bottom: { type: 'PerlinNoise', size: 256, seed: 82, params: { color1: '#9b7653', color2: '#5c4028', noiseType: 'FractalNoise', scale: 30, octaves: 4, persistence: 0.6 } },
  },
  mossy_grass: {
    label: 'Mossy Grass',
    top: { type: 'PerlinNoise', size: 256, seed: 85, params: { color1: '#2d6b1a', color2: '#1a4010', noiseType: 'FractalNoise', scale: 20, octaves: 6, persistence: 0.55 } },
    side: { type: 'PerlinNoise', size: 256, seed: 86, params: { color1: '#6a7a53', color2: '#4a5838', noiseType: 'FractalNoise', scale: 25, octaves: 5, persistence: 0.5, grassOverlay: { color1: '#2d6b1a', color2: '#1a4010', height: 0.2, seed: 85 } } },
    bottom: { type: 'PerlinNoise', size: 256, seed: 87, params: { color1: '#8a7653', color2: '#5c4828', noiseType: 'FractalNoise', scale: 30, octaves: 4, persistence: 0.5 } },
  },
  dry_grass: {
    label: 'Dry Grass',
    top: { type: 'PerlinNoise', size: 256, seed: 90, params: { color1: '#b8a848', color2: '#8a7830', noiseType: 'FractalNoise', scale: 35, octaves: 5, persistence: 0.5 } },
    side: { type: 'PerlinNoise', size: 256, seed: 91, params: { color1: '#9b7653', color2: '#5c4028', noiseType: 'FractalNoise', scale: 30, octaves: 4, persistence: 0.5, grassOverlay: { color1: '#b8a848', color2: '#8a7830', height: 0.12, seed: 90 } } },
    bottom: { type: 'PerlinNoise', size: 256, seed: 92, params: { color1: '#9b7653', color2: '#5c4028', noiseType: 'FractalNoise', scale: 30, octaves: 4, persistence: 0.6 } },
  },
  red_sand: {
    label: 'Red Sand',
    top: { type: 'PerlinNoise', size: 256, seed: 95, params: { color1: '#d4884a', color2: '#b06830', noiseType: 'FractalNoise', scale: 25, octaves: 4, persistence: 0.4 } },
    side: { type: 'PerlinNoise', size: 256, seed: 96, params: { color1: '#c47840', color2: '#a05828', noiseType: 'FractalNoise', scale: 30, octaves: 4, persistence: 0.4 } },
    bottom: { type: 'PerlinNoise', size: 256, seed: 97, params: { color1: '#b06830', color2: '#8a4820', noiseType: 'FractalNoise', scale: 30, octaves: 4, persistence: 0.5 } },
  },
  gravel: {
    label: 'Gravel',
    top: { type: 'CartoonOre', size: 256, seed: 100, params: { color1: '#8a8a88', color2: '#6e6e6c', color3: '#555553', bgNoise: 0.6, bgPatch: 20, outline: 0.8, shadow: 0.3, ores: [{ color: '#aaaaaa', highlightColor: '#cccccc', shape: 'round', count: 20, minSize: 12, maxSize: 35, name: 'Pebble', useGradient: false }, { color: '#666666', highlightColor: '#888888', shape: 'round', count: 15, minSize: 10, maxSize: 28, name: 'Dark Pebble', useGradient: false }] } },
    side: { type: 'CartoonOre', size: 256, seed: 101, params: { color1: '#8a8a88', color2: '#6e6e6c', color3: '#555553', bgNoise: 0.6, bgPatch: 20, outline: 0.8, shadow: 0.3, ores: [{ color: '#aaaaaa', highlightColor: '#cccccc', shape: 'round', count: 18, minSize: 12, maxSize: 35, name: 'Pebble', useGradient: false }, { color: '#666666', highlightColor: '#888888', shape: 'round', count: 12, minSize: 10, maxSize: 28, name: 'Dark Pebble', useGradient: false }] } },
    bottom: { type: 'CartoonOre', size: 256, seed: 102, params: { color1: '#7a7a78', color2: '#5e5e5c', color3: '#454543', bgNoise: 0.6, bgPatch: 20, outline: 0.8, shadow: 0.3, ores: [{ color: '#999999', highlightColor: '#bbbbbb', shape: 'round', count: 18, minSize: 12, maxSize: 35, name: 'Pebble', useGradient: false }] } },
  },
  mud: {
    label: 'Mud',
    top: { type: 'PerlinNoise', size: 256, seed: 110, params: { color1: '#5c4028', color2: '#3a2818', noiseType: 'FractalNoise', scale: 20, octaves: 5, persistence: 0.6 } },
    side: { type: 'PerlinNoise', size: 256, seed: 111, params: { color1: '#4a3420', color2: '#2a1a10', noiseType: 'FractalNoise', scale: 22, octaves: 5, persistence: 0.6 } },
    bottom: { type: 'PerlinNoise', size: 256, seed: 112, params: { color1: '#4a3420', color2: '#2a1a10', noiseType: 'FractalNoise', scale: 25, octaves: 4, persistence: 0.5 } },
  },
  glass: {
    label: 'Glass',
    top: { type: 'PerlinNoise', size: 256, seed: 120, params: { color1: '#c8e8f8', color2: '#a0d0e8', noiseType: 'PerlinNoise', scale: 60, octaves: 2, persistence: 0.3, alpha: 0.25 } },
    side: { type: 'PerlinNoise', size: 256, seed: 121, params: { color1: '#b8e0f0', color2: '#90c8e0', noiseType: 'PerlinNoise', scale: 60, octaves: 2, persistence: 0.3, alpha: 0.25 } },
    bottom: { type: 'PerlinNoise', size: 256, seed: 122, params: { color1: '#a8d8e8', color2: '#80c0d8', noiseType: 'PerlinNoise', scale: 60, octaves: 2, persistence: 0.3, alpha: 0.25 } },
  },
  stained_glass: {
    label: 'Stained Glass (Red)',
    top: { type: 'PerlinNoise', size: 256, seed: 125, params: { color1: '#ff4444', color2: '#cc2222', noiseType: 'PerlinNoise', scale: 70, octaves: 2, persistence: 0.3, alpha: 0.35 } },
    side: { type: 'PerlinNoise', size: 256, seed: 126, params: { color1: '#ee3333', color2: '#bb1111', noiseType: 'PerlinNoise', scale: 70, octaves: 2, persistence: 0.3, alpha: 0.35 } },
    bottom: { type: 'PerlinNoise', size: 256, seed: 127, params: { color1: '#dd2222', color2: '#aa0000', noiseType: 'PerlinNoise', scale: 70, octaves: 2, persistence: 0.3, alpha: 0.35 } },
  },
  oak_leaves: {
    label: 'Oak Leaves',
    top: { type: 'PerlinNoise', size: 256, seed: 130, params: { color1: '#3d8c28', color2: '#1a5c10', noiseType: 'FractalNoise', scale: 18, octaves: 5, persistence: 0.5, cutout: 0.15 } },
    side: { type: 'PerlinNoise', size: 256, seed: 131, params: { color1: '#2d7a1a', color2: '#104a08', noiseType: 'FractalNoise', scale: 18, octaves: 5, persistence: 0.5, cutout: 0.15 } },
    bottom: { type: 'PerlinNoise', size: 256, seed: 132, params: { color1: '#2d7a1a', color2: '#104a08', noiseType: 'FractalNoise', scale: 18, octaves: 5, persistence: 0.5, cutout: 0.2 } },
  },
  birch_leaves: {
    label: 'Birch Leaves',
    top: { type: 'PerlinNoise', size: 256, seed: 135, params: { color1: '#5aac38', color2: '#3d8820', noiseType: 'FractalNoise', scale: 16, octaves: 5, persistence: 0.5, cutout: 0.15 } },
    side: { type: 'PerlinNoise', size: 256, seed: 136, params: { color1: '#4a9c28', color2: '#2d7818', noiseType: 'FractalNoise', scale: 16, octaves: 5, persistence: 0.5, cutout: 0.15 } },
    bottom: { type: 'PerlinNoise', size: 256, seed: 137, params: { color1: '#4a9c28', color2: '#2d7818', noiseType: 'FractalNoise', scale: 16, octaves: 5, persistence: 0.5, cutout: 0.2 } },
  },
  autumn_leaves: {
    label: 'Autumn Leaves',
    top: { type: 'PerlinNoise', size: 256, seed: 140, params: { color1: '#cc6620', color2: '#884410', noiseType: 'FractalNoise', scale: 16, octaves: 5, persistence: 0.5, cutout: 0.15 } },
    side: { type: 'PerlinNoise', size: 256, seed: 141, params: { color1: '#bb5518', color2: '#773308', noiseType: 'FractalNoise', scale: 16, octaves: 5, persistence: 0.5, cutout: 0.15 } },
    bottom: { type: 'PerlinNoise', size: 256, seed: 142, params: { color1: '#aa4410', color2: '#662200', noiseType: 'FractalNoise', scale: 16, octaves: 5, persistence: 0.5, cutout: 0.2 } },
  },
  cherry_leaves: {
    label: 'Cherry Blossoms',
    top: { type: 'PerlinNoise', size: 256, seed: 145, params: { color1: '#ffaacc', color2: '#dd6699', noiseType: 'FractalNoise', scale: 15, octaves: 5, persistence: 0.5, cutout: 0.12 } },
    side: { type: 'PerlinNoise', size: 256, seed: 146, params: { color1: '#ee99bb', color2: '#cc5588', noiseType: 'FractalNoise', scale: 15, octaves: 5, persistence: 0.5, cutout: 0.12 } },
    bottom: { type: 'PerlinNoise', size: 256, seed: 147, params: { color1: '#dd88aa', color2: '#bb4477', noiseType: 'FractalNoise', scale: 15, octaves: 5, persistence: 0.5, cutout: 0.18 } },
  },
};

export default function BlockWorkbench() {
  const topRef = useRef<HTMLCanvasElement>(null);
  const sideRef = useRef<HTMLCanvasElement>(null);
  const bottomRef = useRef<HTMLCanvasElement>(null);
  const isoRef = useRef<HTMLCanvasElement>(null);

  const [activeFace, setActiveFaceRaw] = useLocalState<FaceName>('bw_face', 'top');
  const [topImg, setTopImg] = useLocalState<string | null>('bw_topImg', null);
  const [sideImg, setSideImg] = useLocalState<string | null>('bw_sideImg', null);
  const [bottomImg, setBottomImg] = useLocalState<string | null>('bw_btmImg', null);
  const [topConfig, setTopConfig] = useLocalState<FaceTextureConfig | null>('bw_topCfg', null);
  const [sideConfig, setSideConfig] = useLocalState<FaceTextureConfig | null>('bw_sideCfg', null);
  const [bottomConfig, setBottomConfig] = useLocalState<FaceTextureConfig | null>('bw_btmCfg', null);
  const [renderCount, setRenderCount] = useState(0);
  const [generatorKey, setGeneratorKey] = useState(0);
  const [litPreview, setLitPreview] = useLocalState('bw_lit', true);
  const [bgMode, setBgMode] = useLocalState<string>('bw_bg', '#2d2d2d');
  const [normalSettings, setNormalSettings] = useState<NormalMapSettings>({ ...DEFAULT_NORMAL });
  const normalSettingsRef = useRef(normalSettings);
  normalSettingsRef.current = normalSettings;

  const [editorMode, setEditorMode] = useLocalState<EditorMode>('bw_editorMode', 'texture');

  const [vxResolution, setVxResolution] = useLocalState('bw_vxRes', 16);
  const [vxSeed, setVxSeed] = useLocalState('bw_vxSeed', 1);
  const [vxSideMode, setVxSideMode] = useLocalState<VoxelBlockSideMode>('bw_vxSMode', 'split');
  const [vxSideSplitPos, setVxSideSplitPos] = useLocalState('bw_vxSPos', 0.2);
  const [vxTransitionPattern, setVxTransitionPattern] = useLocalState<SideTransitionPattern>('bw_vxTrPat', 'jagged');
  const [vxTransitionNoise, setVxTransitionNoise] = useLocalState('bw_vxTrNoi', 0.5);
  const [vxRenderStyle, setVxRenderStyle] = useLocalState<VoxelRenderStyle>('bw_vxStyle', 'pixelated');
  const [vxTopFace, setVxTopFace] = useLocalState<VoxelBlockFace>('bw_vxTop', DEFAULT_VOXEL_FACE('custom', []));
  const [vxSideFace, setVxSideFace] = useLocalState<VoxelBlockFace>('bw_vxSide', DEFAULT_VOXEL_FACE('dirt'));
  const [vxBottomFace, setVxBottomFace] = useLocalState<VoxelBlockFace>('bw_vxBtm', DEFAULT_VOXEL_FACE('dirt'));
  const [vxSideTopFace, setVxSideTopFace] = useLocalState<VoxelBlockFace>('bw_vxSTop', DEFAULT_VOXEL_FACE('custom'));
  const [vxActiveFace, setVxActiveFace] = useLocalState<'top' | 'side' | 'bottom'>('bw_vxFace', 'top');

  const currentVxFace = vxActiveFace === 'top' ? vxTopFace : vxActiveFace === 'side' ? vxSideFace : vxBottomFace;
  const setCurrentVxFace = vxActiveFace === 'top' ? setVxTopFace : vxActiveFace === 'side' ? setVxSideFace : setVxBottomFace;

  const faceConfigs: Record<FaceName, FaceTextureConfig | null> = { top: topConfig, side: sideConfig, bottom: bottomConfig };
  const setFaceConfigs: Record<FaceName, (v: FaceTextureConfig | null) => void> = { top: setTopConfig, side: setSideConfig, bottom: setBottomConfig };

  const setActiveFace = (face: FaceName) => {
    if (face === activeFace) return;
    setActiveFaceRaw(face);
    const cfg = faceConfigs[face];
    if (cfg) {
      applyConfigToGenerator(cfg);
      setGeneratorKey(k => k + 1);
    }
  };

  const imgs: Record<FaceName, string | null> = { top: topImg, side: sideImg, bottom: bottomImg };
  const setImgs: Record<FaceName, (v: string | null) => void> = { top: setTopImg, side: setSideImg, bottom: setBottomImg };

  const drawImg = useCallback((canvas: HTMLCanvasElement, dataUrl: string): Promise<void> => {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, 256, 256);
        resolve();
      };
      img.src = dataUrl;
    });
  }, []);

  const applyLighting = useCallback((diffuseCanvas: HTMLCanvasElement, lightDir: [number, number, number], darkening: number) => {
    const w = diffuseCanvas.width;
    const h = diffuseCanvas.height;
    const normCanvas = document.createElement('canvas');
    generateNormalMap(diffuseCanvas, normCanvas, normalSettingsRef.current);

    const ctx = diffuseCanvas.getContext('2d')!;
    const normCtx = normCanvas.getContext('2d')!;
    const diffData = ctx.getImageData(0, 0, w, h);
    const normData = normCtx.getImageData(0, 0, w, h).data;
    const d = diffData.data;

    const [lx, ly, lz] = lightDir;
    const lLen = Math.sqrt(lx * lx + ly * ly + lz * lz);
    const nlx = lx / lLen, nly = ly / lLen, nlz = lz / lLen;

    for (let i = 0; i < d.length; i += 4) {
      const nx = (normData[i] / 255) * 2 - 1;
      const ny = (normData[i + 1] / 255) * 2 - 1;
      const nz = normData[i + 2] / 255;
      const dot = Math.max(0, nx * nlx + ny * nly + nz * nlz);
      const light = (0.35 + 0.65 * dot) * (1 - darkening);
      d[i] = Math.min(255, d[i] * light);
      d[i + 1] = Math.min(255, d[i + 1] * light);
      d[i + 2] = Math.min(255, d[i + 2] * light);
    }
    ctx.putImageData(diffData, 0, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updatePreview = useCallback(async () => {
    const faces: [HTMLCanvasElement | null, string | null][] = [
      [topRef.current, topImg],
      [sideRef.current, sideImg],
      [bottomRef.current, bottomImg],
    ];
    for (const [canvas, img] of faces) {
      if (canvas && img) await drawImg(canvas, img);
      else if (canvas) {
        canvas.width = 256; canvas.height = 256;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#666';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No texture', 128, 128);
        ctx.fillText('Use "Capture" below', 128, 148);
      }
    }

    if (isoRef.current && topRef.current && sideRef.current && bottomRef.current) {
      // Draw background
      const isoCtx = isoRef.current.getContext('2d')!;
      isoRef.current.width = 300;
      isoRef.current.height = 300;
      if (bgMode === 'checker') {
        const sq = 12;
        for (let by = 0; by < 300; by += sq) {
          for (let bx = 0; bx < 300; bx += sq) {
            isoCtx.fillStyle = ((bx / sq + by / sq) % 2 === 0) ? '#cccccc' : '#999999';
            isoCtx.fillRect(bx, by, sq, sq);
          }
        }
      } else {
        isoCtx.fillStyle = bgMode;
        isoCtx.fillRect(0, 0, 300, 300);
      }

      if (litPreview) {
        const litTop = document.createElement('canvas');
        const litSide = document.createElement('canvas');
        const litRight = document.createElement('canvas');
        litTop.width = litTop.height = 256;
        litSide.width = litSide.height = 256;
        litRight.width = litRight.height = 256;

        litTop.getContext('2d')!.drawImage(topRef.current, 0, 0);
        litSide.getContext('2d')!.drawImage(sideRef.current, 0, 0);
        litRight.getContext('2d')!.drawImage(sideRef.current, 0, 0);

        if (topImg) applyLighting(litTop, [0, 0, 1], 0);
        if (sideImg) applyLighting(litSide, [0.5, 0.2, 0.8], 0.12);
        if (sideImg) applyLighting(litRight, [-0.3, 0.2, 0.7], 0.25);

        renderIsometricPreview(isoRef.current, litTop, litSide, litRight, 300, true, true);
      } else {
        renderIsometricPreview(isoRef.current, topRef.current, sideRef.current, sideRef.current, 300, false, true);
      }
    }
    setRenderCount(c => c + 1);
  }, [topImg, sideImg, bottomImg, drawImg, applyLighting, litPreview, normalSettings, bgMode]);

  useEffect(() => { updatePreview(); }, [updatePreview]);

  const captureFromGenerator = () => {
    const generatorCanvas = document.querySelector('.workbench-generator .texture-canvas') as HTMLCanvasElement | null;
    if (generatorCanvas) {
      setImgs[activeFace](generatorCanvas.toDataURL('image/png'));
    }
  };

  const renderVoxelToAllFaces = useCallback(() => {
    const outputSize = 256;
    const styledTop = { ...vxTopFace, renderStyle: vxRenderStyle };
    const styledSide = { ...vxSideFace, renderStyle: vxRenderStyle };
    const styledBottom = { ...vxBottomFace, renderStyle: vxRenderStyle };
    const styledSideTop = { ...vxSideTopFace, renderStyle: vxRenderStyle };

    const tmpTop = document.createElement('canvas');
    const tmpSide = document.createElement('canvas');
    const tmpBottom = document.createElement('canvas');

    generateVoxelBlockFace(tmpTop, outputSize, styledTop, vxResolution, vxSeed);
    generateVoxelBlockFace(tmpBottom, outputSize, styledBottom, vxResolution, vxSeed + 30);

    const blockOpts: VoxelBlockOptions = {
      resolution: vxResolution, seed: vxSeed, top: styledTop, side: styledSide, bottom: styledBottom,
      sideMode: vxSideMode, sideSplitPos: vxSideSplitPos, sideTopFace: styledSideTop,
      transitionPattern: vxTransitionPattern, transitionNoise: vxTransitionNoise,
    };
    generateVoxelBlockSide(tmpSide, outputSize, blockOpts);

    setTopImg(tmpTop.toDataURL('image/png'));
    setSideImg(tmpSide.toDataURL('image/png'));
    setBottomImg(tmpBottom.toDataURL('image/png'));
  }, [vxTopFace, vxSideFace, vxBottomFace, vxSideTopFace, vxResolution, vxSeed, vxSideMode, vxSideSplitPos, vxTransitionPattern, vxTransitionNoise, vxRenderStyle, setTopImg, setSideImg, setBottomImg]);

  useEffect(() => {
    if (editorMode === 'voxel') renderVoxelToAllFaces();
  }, [editorMode, renderVoxelToAllFaces]);

  const applyVoxelPreset = (name: string) => {
    const p = VOXEL_PRESETS[name];
    if (!p) return;
    setVxTopFace(p.top);
    setVxSideFace(p.side);
    setVxBottomFace(p.bottom);
    setVxSideMode(p.sideMode);
    setVxSideSplitPos(p.sideSplitPos);
    setVxSideTopFace(p.sideTopFace);
  };

  const applyPreset = (presetKey: string) => {
    const preset = WORKBENCH_PRESETS[presetKey];
    if (!preset) return;

    const tempCanvas = document.createElement('canvas');
    const configs: Record<FaceName, FaceTextureConfig> = { top: preset.top, side: preset.side, bottom: preset.bottom };

    for (const face of ['top', 'side', 'bottom'] as FaceName[]) {
      tempCanvas.width = configs[face].size;
      tempCanvas.height = configs[face].size;
      renderFaceTexture(tempCanvas, configs[face]);
      setImgs[face](tempCanvas.toDataURL('image/png'));
      setFaceConfigs[face](configs[face]);
    }

    applyConfigToGenerator(configs[activeFace]);
    setGeneratorKey(k => k + 1);
  };

  const activeCanvasRef = activeFace === 'top' ? topRef : activeFace === 'side' ? sideRef : bottomRef;

  return (
    <div className="workbench-layout">
      <div className="workbench-preview-panel">
        <canvas ref={isoRef} className="texture-canvas iso-canvas" width={300} height={300} />
        <div className="settings-row" style={{ justifyContent: 'center', gap: '12px', margin: '6px 0', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.8rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={litPreview} onChange={e => setLitPreview(e.target.checked)} />
            {' '}Normal Map Lighting
          </label>
          <span style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            BG:
            <select value={bgMode} onChange={e => setBgMode(e.target.value)} style={{ fontSize: '0.75rem', padding: '2px 4px' }}>
              <option value="#2d2d2d">Dark</option>
              <option value="#1a1a2e">Navy</option>
              <option value="#000000">Black</option>
              <option value="#ffffff">White</option>
              <option value="#4a6741">Green</option>
              <option value="#87ceeb">Sky</option>
              <option value="checker">Transparency</option>
            </select>
          </span>
        </div>
        <div className="face-previews">
          {(['top', 'side', 'bottom'] as const).map(face => (
            <div key={face} className={`face-preview ${activeFace === face ? 'active' : ''}`} onClick={() => setActiveFace(face)}>
              <canvas ref={face === 'top' ? topRef : face === 'side' ? sideRef : bottomRef} width={256} height={256} />
              <span>{face.charAt(0).toUpperCase() + face.slice(1)}{imgs[face] ? '' : ' (empty)'}</span>
            </div>
          ))}
        </div>

        <div className="workbench-presets">
          <label>Block Presets:</label>
          <select defaultValue="" onChange={e => { if (e.target.value) applyPreset(e.target.value); e.target.value = ''; }}>
            <option value="" disabled>Choose a preset…</option>
            {Object.entries(WORKBENCH_PRESETS).map(([key, preset]) => (
              <option key={key} value={key}>{preset.label}</option>
            ))}
          </select>
        </div>

        <div className="download-bar">
          {(['top', 'side', 'bottom'] as const).map(f => (
            <button key={f} className="btn-primary" onClick={() => {
              const ref = f === 'top' ? topRef : f === 'side' ? sideRef : bottomRef;
              if (ref.current) downloadCanvas(ref.current, `block_${f}`, 'png');
            }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
          ))}
          <button className="btn-primary" onClick={() => {
            if (topRef.current) downloadCanvas(topRef.current, 'block_top', 'png');
            if (sideRef.current) downloadCanvas(sideRef.current, 'block_side', 'png');
            if (bottomRef.current) downloadCanvas(bottomRef.current, 'block_bottom', 'png');
          }}>All</button>
        </div>
        {renderCount > 0 && imgs[activeFace] && <MapPanel
          sourceCanvas={activeCanvasRef.current}
          filePrefix={`block_${activeFace}`}
          version={renderCount}
          onNormalSettingsChange={setNormalSettings}
        />}
      </div>

      <div className="workbench-editor-panel">
        <div className="workbench-capture-bar">
          <div className="workbench-mode-toggle">
            <button className={`type-btn ${editorMode === 'texture' ? 'active' : ''}`} onClick={() => setEditorMode('texture')}>Texture Generator</button>
            <button className={`type-btn ${editorMode === 'voxel' ? 'active' : ''}`} onClick={() => setEditorMode('voxel')}>Voxel Block</button>
          </div>
          {editorMode === 'texture' && (
            <>
              <span className="workbench-editing-label">
                Editing: <strong>{activeFace.charAt(0).toUpperCase() + activeFace.slice(1)} Face</strong>
              </span>
              <button className="btn-primary" onClick={captureFromGenerator}>
                Capture to {activeFace.charAt(0).toUpperCase() + activeFace.slice(1)} Face
              </button>
              {imgs[activeFace] && (
                <button className="btn-small" onClick={() => setImgs[activeFace](null)}>Clear</button>
              )}
            </>
          )}
          {editorMode === 'voxel' && (
            <button className="btn-primary" onClick={renderVoxelToAllFaces}>
              Generate All Faces
            </button>
          )}
        </div>

        {editorMode === 'texture' && (
          <div className="workbench-generator">
            <TextureGenerator key={generatorKey} hideMapPanel />
          </div>
        )}

        {editorMode === 'voxel' && (
          <div className="voxel-editor">
            <div className="settings-panel">
              <h3>Block Settings</h3>
              <div className="settings-row">
                <label>Preset</label>
                <select defaultValue="" onChange={e => { if (e.target.value) applyVoxelPreset(e.target.value); e.target.value = ''; }}>
                  <option value="" disabled>Choose…</option>
                  {Object.entries(VOXEL_PRESETS).map(([key, p]) => (
                    <option key={key} value={key}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="settings-row"><label>Style</label><select value={vxRenderStyle} onChange={e => setVxRenderStyle(e.target.value as VoxelRenderStyle)}><option value="pixelated">Pixelated</option><option value="cartoon">Cartoon</option><option value="realistic">Realistic</option><option value="painterly">Painterly</option><option value="flat">Flat / Minimal</option></select></div>
              <div className="settings-row"><label>Resolution</label><select value={vxResolution} onChange={e => setVxResolution(parseInt(e.target.value))}><option value="8">8×8</option><option value="16">16×16</option><option value="32">32×32</option><option value="64">64×64</option><option value="128">128×128</option><option value="256">256×256</option><option value="512">512×512</option><option value="1024">1024×1024</option></select></div>
              <SliderControl label="Seed" value={vxSeed} min={1} max={1000} step={1} onChange={setVxSeed} />
              <div className="settings-row"><label>Side Blend</label><select value={vxSideMode} onChange={e => setVxSideMode(e.target.value as VoxelBlockSideMode)}><option value="uniform">Uniform (side only)</option><option value="split">Split (top/bottom)</option><option value="gradient_top">Gradient from top</option><option value="gradient_bottom">Gradient from bottom</option></select></div>
              {vxSideMode !== 'uniform' && <>
                <SliderControl label="Split Position" value={vxSideSplitPos} min={0.05} max={0.95} step={0.01} onChange={setVxSideSplitPos} />
                <div className="settings-row"><label>Transition</label><select value={vxTransitionPattern} onChange={e => setVxTransitionPattern(e.target.value as SideTransitionPattern)}><option value="straight">Straight</option><option value="jagged">Jagged</option><option value="mossy">Mossy</option><option value="layered">Layered</option><option value="drip">Drip</option><option value="rounded">Rounded</option></select></div>
                {vxTransitionPattern !== 'straight' && <SliderControl label="Transition Strength" value={vxTransitionNoise} min={0} max={1} step={0.01} onChange={setVxTransitionNoise} />}
              </>}
            </div>

            <div className="face-tabs">
              <button className={`type-btn ${vxActiveFace === 'top' ? 'active' : ''}`} onClick={() => setVxActiveFace('top')}>Top Face</button>
              <button className={`type-btn ${vxActiveFace === 'side' ? 'active' : ''}`} onClick={() => setVxActiveFace('side')}>Side Face</button>
              <button className={`type-btn ${vxActiveFace === 'bottom' ? 'active' : ''}`} onClick={() => setVxActiveFace('bottom')}>Bottom Face</button>
            </div>

            <div className="settings-panel" style={{ padding: '10px 16px' }}>
              <div className="settings-row" style={{ gap: 8 }}>
                <label style={{ fontSize: '0.85em' }}>Load image for {vxActiveFace} face:</label>
                <input type="file" accept="image/*" style={{ fontSize: '0.8em' }} onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setImgs[activeFace](reader.result as string);
                  reader.readAsDataURL(file);
                  e.target.value = '';
                }} />
              </div>
            </div>

            {vxActiveFace === 'top' && <VoxelFaceSettings face={vxTopFace} setFace={setVxTopFace} />}
            {vxActiveFace === 'side' && (
              <>
                <VoxelFaceSettings face={vxSideFace} setFace={setVxSideFace} />
                {vxSideMode !== 'uniform' && (
                  <div style={{ marginTop: 8 }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: 'var(--text-primary)' }}>Side — Top Layer (blended)</h4>
                    <VoxelFaceSettings face={vxSideTopFace} setFace={setVxSideTopFace} />
                  </div>
                )}
              </>
            )}
            {vxActiveFace === 'bottom' && <VoxelFaceSettings face={vxBottomFace} setFace={setVxBottomFace} />}
          </div>
        )}
      </div>
    </div>
  );
}
