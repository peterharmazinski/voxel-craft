import { useCallback, useEffect, useRef, useState } from 'react';
import SliderControl from '../components/SliderControl';
import MapPanel from '../components/MapPanel';
import { downloadCanvas } from '../utils/helpers';
import { useLocalState } from '../hooks/useLocalState';
import { useFaceImages, clearFaceImage, setFaceImage } from '../hooks/useFaceStore';
import {
  generateVoxelBlockFace,
  generateVoxelBlockSide,
  renderIsometricPreview,
  type VoxelBaseType,
  type VoxelOreLayer,
  type OreStyle,
  type VoxelBlockFace,
  type VoxelBlockSideMode,
  type VoxelBlockOptions,
  type SideTransitionPattern,
  type VoxelRenderStyle,
} from '../utils/textureGenerators';

function CS({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  return <input type="color" value={color} onChange={e => onChange(e.target.value)} className="color-input" />;
}

type ActiveFace = 'top' | 'side' | 'bottom';

const DEFAULT_FACE = (base: VoxelBaseType, ores: VoxelOreLayer[] = []): VoxelBlockFace => ({
  baseType: base,
  baseColor1: '#8b8b8b', baseColor2: '#6b6b6b', baseColor3: '#555555',
  grainStrength: 0.3, grainDirection: 'both',
  oreLayers: ores,
  depthShading: 0.4, outlineStrength: 0.2, paletteSize: 12,
});

const BLOCK_PRESETS: Record<string, { top: VoxelBlockFace; side: VoxelBlockFace; bottom: VoxelBlockFace; sideMode: VoxelBlockSideMode; sideSplitPos: number; sideTopFace: VoxelBlockFace }> = {
  grass: {
    top: { ...DEFAULT_FACE('custom'), baseColor1: '#4a8c2a', baseColor2: '#3d7522', baseColor3: '#2d5a18', grainDirection: 'both', grainStrength: 0.5 },
    side: { ...DEFAULT_FACE('dirt'), baseColor1: '#9b7653', baseColor2: '#7a5c3a', baseColor3: '#5c4028' },
    bottom: { ...DEFAULT_FACE('dirt'), baseColor1: '#9b7653', baseColor2: '#7a5c3a', baseColor3: '#5c4028' },
    sideMode: 'split',
    sideSplitPos: 0.2,
    sideTopFace: { ...DEFAULT_FACE('custom'), baseColor1: '#4a8c2a', baseColor2: '#3d7522', baseColor3: '#2d5a18', grainStrength: 0.4 },
  },
  stone_ore: {
    top: { ...DEFAULT_FACE('stone'), oreLayers: [{ color: '#888899', highlightColor: '#ccccdd', density: 5, clusterSize: 2, name: 'Iron', style: 'metal', oreScale: 1.5 }] },
    side: { ...DEFAULT_FACE('stone'), oreLayers: [{ color: '#888899', highlightColor: '#ccccdd', density: 5, clusterSize: 2, name: 'Iron', style: 'metal', oreScale: 1.5 }] },
    bottom: { ...DEFAULT_FACE('stone'), oreLayers: [{ color: '#888899', highlightColor: '#ccccdd', density: 5, clusterSize: 2, name: 'Iron', style: 'metal', oreScale: 1.5 }] },
    sideMode: 'uniform', sideSplitPos: 0.5,
    sideTopFace: DEFAULT_FACE('stone'),
  },
  diamond_ore: {
    top: { ...DEFAULT_FACE('deepslate'), oreLayers: [{ color: '#4488dd', highlightColor: '#cceeff', density: 3, clusterSize: 2, name: 'Diamond', style: 'jewel', oreScale: 1.5 }] },
    side: { ...DEFAULT_FACE('deepslate'), oreLayers: [{ color: '#4488dd', highlightColor: '#cceeff', density: 3, clusterSize: 2, name: 'Diamond', style: 'jewel', oreScale: 1.5 }] },
    bottom: { ...DEFAULT_FACE('deepslate'), oreLayers: [{ color: '#4488dd', highlightColor: '#cceeff', density: 3, clusterSize: 2, name: 'Diamond', style: 'jewel', oreScale: 1.5 }] },
    sideMode: 'uniform', sideSplitPos: 0.5,
    sideTopFace: DEFAULT_FACE('deepslate'),
  },
  sand: {
    top: { ...DEFAULT_FACE('sandstone'), baseColor1: '#e8d8a0', baseColor2: '#d4c488', baseColor3: '#c4b070', grainDirection: 'horizontal', grainStrength: 0.2 },
    side: { ...DEFAULT_FACE('sandstone'), baseColor1: '#d4c298', baseColor2: '#c4a86e', baseColor3: '#a08850', grainDirection: 'horizontal', grainStrength: 0.4 },
    bottom: { ...DEFAULT_FACE('sandstone'), baseColor1: '#c4a86e', baseColor2: '#a08850', baseColor3: '#8a7040', grainDirection: 'horizontal' },
    sideMode: 'gradient_top', sideSplitPos: 0.4,
    sideTopFace: { ...DEFAULT_FACE('sandstone'), baseColor1: '#e8d8a0', baseColor2: '#d4c488', baseColor3: '#c4b070' },
  },
  log: {
    top: { ...DEFAULT_FACE('rings'), baseColor1: '#c49a6c', baseColor2: '#a07848', baseColor3: '#5c3820', grainStrength: 0.4, grainDirection: 'none', depthShading: 0.5 },
    side: { ...DEFAULT_FACE('bark'), baseColor1: '#6b4c32', baseColor2: '#553a24', baseColor3: '#3d2818', grainStrength: 0.5, grainDirection: 'vertical', outlineStrength: 0.3 },
    bottom: { ...DEFAULT_FACE('rings'), baseColor1: '#c49a6c', baseColor2: '#a07848', baseColor3: '#5c3820', grainStrength: 0.4, grainDirection: 'none', depthShading: 0.5 },
    sideMode: 'uniform', sideSplitPos: 0.5,
    sideTopFace: DEFAULT_FACE('custom'),
  },
  flowery_grass: {
    top: { ...DEFAULT_FACE('custom'), baseColor1: '#4a8c2a', baseColor2: '#3d7522', baseColor3: '#2d5a18', grainDirection: 'both', grainStrength: 0.4,
      oreLayers: [
        { color: '#dd4466', highlightColor: '#ff88aa', density: 4, clusterSize: 1, name: 'Flowers', style: 'flat', oreScale: 0.5 },
        { color: '#eedd44', highlightColor: '#ffff88', density: 3, clusterSize: 1, name: 'Dandelions', style: 'flat', oreScale: 0.5 },
        { color: '#ffffff', highlightColor: '#ffffee', density: 2, clusterSize: 1, name: 'Daisies', style: 'flat', oreScale: 0.5 },
      ] },
    side: { ...DEFAULT_FACE('dirt'), baseColor1: '#9b7653', baseColor2: '#7a5c3a', baseColor3: '#5c4028' },
    bottom: { ...DEFAULT_FACE('dirt'), baseColor1: '#9b7653', baseColor2: '#7a5c3a', baseColor3: '#5c4028' },
    sideMode: 'split', sideSplitPos: 0.2,
    sideTopFace: { ...DEFAULT_FACE('custom'), baseColor1: '#4a8c2a', baseColor2: '#3d7522', baseColor3: '#2d5a18', grainStrength: 0.3 },
  },
  leaves: {
    top: { ...DEFAULT_FACE('custom'), baseColor1: '#2d8c2a', baseColor2: '#1f6b1e', baseColor3: '#145514', grainDirection: 'both', grainStrength: 0.6, depthShading: 0.3 },
    side: { ...DEFAULT_FACE('custom'), baseColor1: '#267a24', baseColor2: '#1a6018', baseColor3: '#104810', grainDirection: 'both', grainStrength: 0.7, depthShading: 0.5 },
    bottom: { ...DEFAULT_FACE('custom'), baseColor1: '#1a5518', baseColor2: '#124010', baseColor3: '#0a300a', grainDirection: 'both', grainStrength: 0.5, depthShading: 0.6 },
    sideMode: 'uniform', sideSplitPos: 0.5,
    sideTopFace: DEFAULT_FACE('custom'),
  },
  fallen_leaves: {
    top: { ...DEFAULT_FACE('custom'), baseColor1: '#c47a2a', baseColor2: '#a05520', baseColor3: '#7a3a15', grainDirection: 'both', grainStrength: 0.5,
      oreLayers: [
        { color: '#dd3322', highlightColor: '#ee6644', density: 5, clusterSize: 1, name: 'Red Leaves', style: 'flat', oreScale: 0.7 },
        { color: '#eebb22', highlightColor: '#ffdd55', density: 4, clusterSize: 1, name: 'Yellow Leaves', style: 'flat', oreScale: 0.7 },
      ] },
    side: { ...DEFAULT_FACE('dirt'), baseColor1: '#7a5c3a', baseColor2: '#5c4028', baseColor3: '#3d2818' },
    bottom: { ...DEFAULT_FACE('dirt'), baseColor1: '#7a5c3a', baseColor2: '#5c4028', baseColor3: '#3d2818' },
    sideMode: 'split', sideSplitPos: 0.15,
    sideTopFace: { ...DEFAULT_FACE('custom'), baseColor1: '#a06030', baseColor2: '#804820', baseColor3: '#603015', grainStrength: 0.4 },
  },
  mud: {
    top: { ...DEFAULT_FACE('custom'), baseColor1: '#5c4030', baseColor2: '#4a3528', baseColor3: '#382820', grainDirection: 'both', grainStrength: 0.3, outlineStrength: 0.1 },
    side: { ...DEFAULT_FACE('custom'), baseColor1: '#4a3528', baseColor2: '#382820', baseColor3: '#2a1e18', grainDirection: 'both', grainStrength: 0.2 },
    bottom: { ...DEFAULT_FACE('custom'), baseColor1: '#382820', baseColor2: '#2a1e18', baseColor3: '#201510', grainDirection: 'none', grainStrength: 0 },
    sideMode: 'gradient_top', sideSplitPos: 0.6,
    sideTopFace: { ...DEFAULT_FACE('custom'), baseColor1: '#5c4030', baseColor2: '#4a3528', baseColor3: '#382820' },
  },
  lava: {
    top: { ...DEFAULT_FACE('custom'), baseColor1: '#ff6600', baseColor2: '#cc3300', baseColor3: '#881100', grainDirection: 'both', grainStrength: 0.7, depthShading: 0, outlineStrength: 0.4,
      oreLayers: [
        { color: '#ffcc00', highlightColor: '#ffff66', density: 8, clusterSize: 2, name: 'Hot Spots', style: 'flat', oreScale: 1.5 },
      ] },
    side: { ...DEFAULT_FACE('custom'), baseColor1: '#cc3300', baseColor2: '#881100', baseColor3: '#440800', grainDirection: 'vertical', grainStrength: 0.5,
      oreLayers: [
        { color: '#ff6600', highlightColor: '#ffaa00', density: 5, clusterSize: 2, name: 'Glow', style: 'flat', oreScale: 1.2 },
      ] },
    bottom: { ...DEFAULT_FACE('custom'), baseColor1: '#440800', baseColor2: '#220400', baseColor3: '#110200', grainDirection: 'none', grainStrength: 0, depthShading: 0.8 },
    sideMode: 'gradient_bottom', sideSplitPos: 0.7,
    sideTopFace: { ...DEFAULT_FACE('custom'), baseColor1: '#ff6600', baseColor2: '#cc3300', baseColor3: '#881100', grainStrength: 0.4 },
  },
  tree_trunk: {
    top: { ...DEFAULT_FACE('rings'), baseColor1: '#c49a6c', baseColor2: '#8b6838', baseColor3: '#5c3820', grainStrength: 0.5, grainDirection: 'none', depthShading: 0.6 },
    side: { ...DEFAULT_FACE('bark'), baseColor1: '#7a5838', baseColor2: '#5c3f24', baseColor3: '#3d2818', grainStrength: 0.7, grainDirection: 'vertical', outlineStrength: 0.4 },
    bottom: { ...DEFAULT_FACE('rings'), baseColor1: '#c49a6c', baseColor2: '#8b6838', baseColor3: '#5c3820', grainStrength: 0.5, grainDirection: 'none', depthShading: 0.6 },
    sideMode: 'uniform', sideSplitPos: 0.5,
    sideTopFace: DEFAULT_FACE('custom'),
  },
  birch_trunk: {
    top: { ...DEFAULT_FACE('rings'), baseColor1: '#e8dcc0', baseColor2: '#c4a878', baseColor3: '#8b6838', grainStrength: 0.3, grainDirection: 'none', depthShading: 0.4 },
    side: { ...DEFAULT_FACE('bark'), baseColor1: '#f0ece4', baseColor2: '#d4ccc0', baseColor3: '#2a2420', grainStrength: 0.3, grainDirection: 'vertical', outlineStrength: 0.2 },
    bottom: { ...DEFAULT_FACE('rings'), baseColor1: '#e8dcc0', baseColor2: '#c4a878', baseColor3: '#8b6838', grainStrength: 0.3, grainDirection: 'none', depthShading: 0.4 },
    sideMode: 'uniform', sideSplitPos: 0.5,
    sideTopFace: DEFAULT_FACE('custom'),
  },
  dark_oak_trunk: {
    top: { ...DEFAULT_FACE('rings'), baseColor1: '#6b4c28', baseColor2: '#4a3418', baseColor3: '#2a1c0c', grainStrength: 0.6, grainDirection: 'none', depthShading: 0.7 },
    side: { ...DEFAULT_FACE('bark'), baseColor1: '#3d2c18', baseColor2: '#2a1c0c', baseColor3: '#1a0f06', grainStrength: 0.8, grainDirection: 'vertical', outlineStrength: 0.5 },
    bottom: { ...DEFAULT_FACE('rings'), baseColor1: '#6b4c28', baseColor2: '#4a3418', baseColor3: '#2a1c0c', grainStrength: 0.6, grainDirection: 'none', depthShading: 0.7 },
    sideMode: 'uniform', sideSplitPos: 0.5,
    sideTopFace: DEFAULT_FACE('custom'),
  },
  spruce_trunk: {
    top: { ...DEFAULT_FACE('rings'), baseColor1: '#9b7848', baseColor2: '#6b5030', baseColor3: '#3d2818', grainStrength: 0.4, grainDirection: 'none', depthShading: 0.5 },
    side: { ...DEFAULT_FACE('bark'), baseColor1: '#4a3828', baseColor2: '#352818', baseColor3: '#201810', grainStrength: 0.6, grainDirection: 'vertical', outlineStrength: 0.5 },
    bottom: { ...DEFAULT_FACE('rings'), baseColor1: '#9b7848', baseColor2: '#6b5030', baseColor3: '#3d2818', grainStrength: 0.4, grainDirection: 'none', depthShading: 0.5 },
    sideMode: 'uniform', sideSplitPos: 0.5,
    sideTopFace: DEFAULT_FACE('custom'),
  },
  jungle_trunk: {
    top: { ...DEFAULT_FACE('rings'), baseColor1: '#b8944c', baseColor2: '#8b6c30', baseColor3: '#5c4820', grainStrength: 0.5, grainDirection: 'none', depthShading: 0.5 },
    side: { ...DEFAULT_FACE('bark'), baseColor1: '#6b5828', baseColor2: '#4a3c18', baseColor3: '#302810', grainStrength: 0.6, grainDirection: 'vertical', outlineStrength: 0.3,
      oreLayers: [{ color: '#2a5c18', highlightColor: '#3d7a24', density: 2, clusterSize: 1, name: 'Vines', style: 'flat', oreScale: 1 }] },
    bottom: { ...DEFAULT_FACE('rings'), baseColor1: '#b8944c', baseColor2: '#8b6c30', baseColor3: '#5c4820', grainStrength: 0.5, grainDirection: 'none', depthShading: 0.5 },
    sideMode: 'uniform', sideSplitPos: 0.5,
    sideTopFace: DEFAULT_FACE('custom'),
  },
  sand_block: {
    top: { ...DEFAULT_FACE('custom'), baseColor1: '#f0e0a0', baseColor2: '#e0d090', baseColor3: '#d0c080', grainDirection: 'both', grainStrength: 0.2, outlineStrength: 0 },
    side: { ...DEFAULT_FACE('custom'), baseColor1: '#e0d090', baseColor2: '#d0c080', baseColor3: '#c0b070', grainDirection: 'horizontal', grainStrength: 0.3 },
    bottom: { ...DEFAULT_FACE('custom'), baseColor1: '#d0c080', baseColor2: '#c0b070', baseColor3: '#b0a060', grainDirection: 'horizontal', grainStrength: 0.2 },
    sideMode: 'gradient_top', sideSplitPos: 0.3,
    sideTopFace: { ...DEFAULT_FACE('custom'), baseColor1: '#f0e0a0', baseColor2: '#e0d090', baseColor3: '#d0c080' },
  },
  shell_sand: {
    top: { ...DEFAULT_FACE('custom'), baseColor1: '#f0e0a0', baseColor2: '#e8d898', baseColor3: '#d4c488', grainDirection: 'both', grainStrength: 0.15,
      oreLayers: [
        { color: '#ffe8e0', highlightColor: '#fff8f4', density: 3, clusterSize: 1, name: 'White Shell', style: 'flat', oreScale: 0.7 },
        { color: '#ffccaa', highlightColor: '#ffeedd', density: 2, clusterSize: 1, name: 'Pink Shell', style: 'jewel', oreScale: 0.6 },
        { color: '#c0a080', highlightColor: '#e0c8a8', density: 2, clusterSize: 1, name: 'Brown Shell', style: 'flat', oreScale: 0.5 },
      ] },
    side: { ...DEFAULT_FACE('custom'), baseColor1: '#e0d090', baseColor2: '#d0c080', baseColor3: '#c0b070', grainDirection: 'horizontal', grainStrength: 0.2 },
    bottom: { ...DEFAULT_FACE('custom'), baseColor1: '#d0c080', baseColor2: '#c0b070', baseColor3: '#b0a060', grainDirection: 'horizontal', grainStrength: 0.2 },
    sideMode: 'gradient_top', sideSplitPos: 0.25,
    sideTopFace: { ...DEFAULT_FACE('custom'), baseColor1: '#f0e0a0', baseColor2: '#e8d898', baseColor3: '#d4c488' },
  },
  bouncy: {
    top: { ...DEFAULT_FACE('custom'), baseColor1: '#44cc55', baseColor2: '#33aa44', baseColor3: '#228833', grainDirection: 'none', grainStrength: 0, depthShading: 0.7, outlineStrength: 0.1, paletteSize: 6 },
    side: { ...DEFAULT_FACE('custom'), baseColor1: '#33aa44', baseColor2: '#228833', baseColor3: '#116622', grainDirection: 'none', grainStrength: 0, depthShading: 0.8, outlineStrength: 0.1, paletteSize: 6 },
    bottom: { ...DEFAULT_FACE('custom'), baseColor1: '#228833', baseColor2: '#116622', baseColor3: '#005511', grainDirection: 'none', grainStrength: 0, depthShading: 0.9, outlineStrength: 0, paletteSize: 6 },
    sideMode: 'uniform', sideSplitPos: 0.5,
    sideTopFace: DEFAULT_FACE('custom'),
  },
  glass: {
    top: { ...DEFAULT_FACE('custom'), baseColor1: '#ccddee', baseColor2: '#bbccdd', baseColor3: '#aabbcc', grainDirection: 'none', grainStrength: 0, depthShading: 0.8, outlineStrength: 0.5, paletteSize: 4,
      oreLayers: [
        { color: '#ffffff', highlightColor: '#ffffff', density: 2, clusterSize: 1, name: 'Glint', style: 'crystal', oreScale: 0.5 },
      ] },
    side: { ...DEFAULT_FACE('custom'), baseColor1: '#bbccdd', baseColor2: '#aabbcc', baseColor3: '#99aabb', grainDirection: 'none', grainStrength: 0, depthShading: 0.9, outlineStrength: 0.6, paletteSize: 4,
      oreLayers: [
        { color: '#ffffff', highlightColor: '#ffffff', density: 1.5, clusterSize: 1, name: 'Glint', style: 'crystal', oreScale: 0.5 },
      ] },
    bottom: { ...DEFAULT_FACE('custom'), baseColor1: '#aabbcc', baseColor2: '#99aabb', baseColor3: '#8899aa', grainDirection: 'none', grainStrength: 0, depthShading: 0.7, outlineStrength: 0.4, paletteSize: 4 },
    sideMode: 'uniform', sideSplitPos: 0.5,
    sideTopFace: DEFAULT_FACE('custom'),
  },
};

export default function VoxelBlock() {
  const topCanvasRef = useRef<HTMLCanvasElement>(null);
  const sideCanvasRef = useRef<HTMLCanvasElement>(null);
  const bottomCanvasRef = useRef<HTMLCanvasElement>(null);
  const isoCanvasRef = useRef<HTMLCanvasElement>(null);

  const [activeFace, setActiveFace] = useLocalState<ActiveFace>('vb_face', 'top');
  const [resolution, setResolution] = useLocalState('vb_res', 16);
  const [seed, setSeed] = useLocalState('vb_seed', 1);
  const [sideMode, setSideMode] = useLocalState<VoxelBlockSideMode>('vb_sMode', 'split');
  const [sideSplitPos, setSideSplitPos] = useLocalState('vb_sPos', 0.2);
  const [transitionPattern, setTransitionPattern] = useLocalState<SideTransitionPattern>('vb_trPat', 'jagged');
  const [transitionNoise, setTransitionNoise] = useLocalState('vb_trNoi', 0.5);
  const [renderStyle, setRenderStyle] = useLocalState<VoxelRenderStyle>('vb_style', 'pixelated');

  const [renderCount, setRenderCount] = useState(0);
  const [topFace, setTopFace] = useLocalState<VoxelBlockFace>('vb_top', BLOCK_PRESETS.grass.top);
  const [sideFace, setSideFace] = useLocalState<VoxelBlockFace>('vb_side', BLOCK_PRESETS.grass.side);
  const [bottomFace, setBottomFace] = useLocalState<VoxelBlockFace>('vb_btm', BLOCK_PRESETS.grass.bottom);
  const [sideTopFace, setSideTopFace] = useLocalState<VoxelBlockFace>('vb_sTop', BLOCK_PRESETS.grass.sideTopFace);

  const currentFace = activeFace === 'top' ? topFace : activeFace === 'side' ? sideFace : bottomFace;
  const setCurrentFace = activeFace === 'top' ? setTopFace : activeFace === 'side' ? setSideFace : setBottomFace;

  const customFaces = useFaceImages();

  const drawDataUrl = useCallback((canvas: HTMLCanvasElement, dataUrl: string, size: number): Promise<void> => {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, size, size);
        resolve();
      };
      img.src = dataUrl;
    });
  }, []);

  const updateAll = useCallback(async () => {
    const outputSize = 256;
    const styledTop = { ...topFace, renderStyle };
    const styledSide = { ...sideFace, renderStyle };
    const styledBottom = { ...bottomFace, renderStyle };
    const styledSideTop = { ...sideTopFace, renderStyle };

    if (topCanvasRef.current) {
      if (customFaces.top) await drawDataUrl(topCanvasRef.current, customFaces.top, outputSize);
      else generateVoxelBlockFace(topCanvasRef.current, outputSize, styledTop, resolution, seed);
    }
    if (bottomCanvasRef.current) {
      if (customFaces.bottom) await drawDataUrl(bottomCanvasRef.current, customFaces.bottom, outputSize);
      else generateVoxelBlockFace(bottomCanvasRef.current, outputSize, styledBottom, resolution, seed + 30);
    }

    if (sideCanvasRef.current) {
      if (customFaces.side) {
        await drawDataUrl(sideCanvasRef.current, customFaces.side, outputSize);
      } else {
        const blockOpts: VoxelBlockOptions = {
          resolution, seed, top: styledTop, side: styledSide, bottom: styledBottom,
          sideMode, sideSplitPos, sideTopFace: styledSideTop, transitionPattern, transitionNoise,
        };
        generateVoxelBlockSide(sideCanvasRef.current, outputSize, blockOpts);
      }
    }

    if (isoCanvasRef.current && topCanvasRef.current && sideCanvasRef.current && bottomCanvasRef.current) {
      renderIsometricPreview(isoCanvasRef.current, topCanvasRef.current, sideCanvasRef.current, sideCanvasRef.current, 300);
    }
    setRenderCount(c => c + 1);
  }, [topFace, sideFace, bottomFace, sideTopFace, resolution, seed, sideMode, sideSplitPos, transitionPattern, transitionNoise, renderStyle, customFaces.top, customFaces.side, customFaces.bottom, drawDataUrl]);

  useEffect(() => { updateAll(); }, [updateAll]);

  const applyPreset = (name: string) => {
    const p = BLOCK_PRESETS[name];
    if (!p) return;
    setTopFace(p.top);
    setSideFace(p.side);
    setBottomFace(p.bottom);
    setSideMode(p.sideMode);
    setSideSplitPos(p.sideSplitPos);
    setSideTopFace(p.sideTopFace);
  };

  const renderFaceSettings = (face: VoxelBlockFace, setFace: (f: VoxelBlockFace) => void) => (
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

  return (
    <div className="page-layout">
      <div className="preview-column">
        <canvas ref={isoCanvasRef} className="texture-canvas iso-canvas" width={300} height={300} />
        <div className="face-previews">
          {(['top', 'side', 'bottom'] as const).map(face => (
            <div key={face} className={`face-preview ${activeFace === face ? 'active' : ''}`} onClick={() => setActiveFace(face)}>
              <canvas ref={face === 'top' ? topCanvasRef : face === 'side' ? sideCanvasRef : bottomCanvasRef} width={256} height={256} />
              <span>{face.charAt(0).toUpperCase() + face.slice(1)}{customFaces[face] ? ' *' : ''}</span>
            </div>
          ))}
        </div>
        <div className="download-bar">
          <button className="btn-primary" onClick={() => { if (topCanvasRef.current) downloadCanvas(topCanvasRef.current, 'block_top', 'png'); }}>Top</button>
          <button className="btn-primary" onClick={() => { if (sideCanvasRef.current) downloadCanvas(sideCanvasRef.current, 'block_side', 'png'); }}>Side</button>
          <button className="btn-primary" onClick={() => { if (bottomCanvasRef.current) downloadCanvas(bottomCanvasRef.current, 'block_bottom', 'png'); }}>Bottom</button>
          <button className="btn-primary" onClick={() => {
            if (topCanvasRef.current) downloadCanvas(topCanvasRef.current, 'block_top', 'png');
            if (sideCanvasRef.current) downloadCanvas(sideCanvasRef.current, 'block_side', 'png');
            if (bottomCanvasRef.current) downloadCanvas(bottomCanvasRef.current, 'block_bottom', 'png');
          }}>All</button>
        </div>
        {renderCount > 0 && <MapPanel
          sourceCanvas={activeFace === 'top' ? topCanvasRef.current : activeFace === 'side' ? sideCanvasRef.current : bottomCanvasRef.current}
          filePrefix={`block_${activeFace}`}
          version={renderCount}
        />}
      </div>

      <div className="controls-column">
        <div className="settings-panel">
          <h3>Block Settings</h3>
          <div className="settings-row"><label>Preset</label><select defaultValue="" onChange={e => { if (e.target.value) applyPreset(e.target.value); e.target.value = ''; }}><option value="">— Select —</option><option value="grass">Grass</option><option value="flowery_grass">Flowery Grass</option><option value="leaves">Leaves</option><option value="fallen_leaves">Fallen Leaves</option><option value="mud">Mud</option><option value="lava">Lava</option><option value="tree_trunk">Tree Trunk (Oak)</option><option value="birch_trunk">Birch Trunk</option><option value="dark_oak_trunk">Dark Oak Trunk</option><option value="spruce_trunk">Spruce Trunk</option><option value="jungle_trunk">Jungle Trunk</option><option value="log">Wood Log</option><option value="sand_block">Sand</option><option value="shell_sand">Shell Sand</option><option value="sand">Sandstone</option><option value="stone_ore">Iron Ore</option><option value="diamond_ore">Diamond Ore</option><option value="bouncy">Bouncy</option><option value="glass">Glass</option></select></div>
          <div className="settings-row"><label>Style</label><select value={renderStyle} onChange={e => setRenderStyle(e.target.value as VoxelRenderStyle)}><option value="pixelated">Pixelated</option><option value="cartoon">Cartoon</option><option value="realistic">Realistic</option><option value="painterly">Painterly</option><option value="flat">Flat / Minimal</option></select></div>
          <div className="settings-row"><label>Resolution</label><select value={resolution} onChange={e => setResolution(parseInt(e.target.value))}><option value="8">8×8</option><option value="16">16×16</option><option value="32">32×32</option><option value="64">64×64</option><option value="128">128×128</option><option value="256">256×256</option><option value="512">512×512</option><option value="1024">1024×1024</option></select></div>
          <SliderControl label="Seed" value={seed} min={1} max={1000} step={1} onChange={setSeed} />
          <div className="settings-row"><label>Side Blend</label><select value={sideMode} onChange={e => setSideMode(e.target.value as VoxelBlockSideMode)}><option value="uniform">Uniform (side only)</option><option value="split">Split (top/bottom)</option><option value="gradient_top">Gradient from top</option><option value="gradient_bottom">Gradient from bottom</option></select></div>
          {sideMode !== 'uniform' && <>
            <SliderControl label="Split Position" value={sideSplitPos} min={0.05} max={0.95} step={0.01} onChange={setSideSplitPos} />
            <div className="settings-row"><label>Transition</label><select value={transitionPattern} onChange={e => setTransitionPattern(e.target.value as SideTransitionPattern)}><option value="straight">Straight</option><option value="jagged">Jagged</option><option value="mossy">Mossy</option><option value="layered">Layered</option><option value="drip">Drip</option><option value="rounded">Rounded</option></select></div>
            {transitionPattern !== 'straight' && <SliderControl label="Transition Strength" value={transitionNoise} min={0} max={1} step={0.01} onChange={setTransitionNoise} />}
          </>}
        </div>

        <div className="face-tabs">
          <button className={`type-btn ${activeFace === 'top' ? 'active' : ''}`} onClick={() => setActiveFace('top')}>Top Face</button>
          <button className={`type-btn ${activeFace === 'side' ? 'active' : ''}`} onClick={() => setActiveFace('side')}>Side Face</button>
          <button className={`type-btn ${activeFace === 'bottom' ? 'active' : ''}`} onClick={() => setActiveFace('bottom')}>Bottom Face</button>
          {sideMode !== 'uniform' && <button className={`type-btn ${activeFace === 'side' ? 'dim' : ''}`} onClick={() => setActiveFace('side')}>Side Top Layer</button>}
        </div>

        {customFaces[activeFace] ? (
          <div className="settings-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: '0.9em' }}>Using custom texture from Texture Generator</span>
              <button className="btn-small" onClick={() => customFaces.clear(activeFace)}>Clear &amp; use voxel</button>
            </div>
            <p style={{ fontSize: '0.8em', opacity: 0.6, margin: '6px 0 0' }}>
              Voxel settings below are ignored while a custom texture is assigned. Clear it to go back to generated voxel textures.
            </p>
          </div>
        ) : (
          <div className="settings-panel">
            <div className="settings-row" style={{ gap: 8 }}>
              <label style={{ fontSize: '0.85em' }}>Or load an image:</label>
              <input type="file" accept="image/*" style={{ fontSize: '0.8em' }} onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setFaceImage(activeFace, reader.result as string);
                reader.readAsDataURL(file);
                e.target.value = '';
              }} />
            </div>
          </div>
        )}

        {activeFace === 'top' && renderFaceSettings(topFace, setTopFace)}
        {activeFace === 'side' && (
          <>
            {renderFaceSettings(sideFace, setSideFace)}
            {sideMode !== 'uniform' && (
              <div className="settings-panel" style={{ marginTop: 8 }}>
                <h4>Side — Top Layer (blended)</h4>
                {renderFaceSettings(sideTopFace, setSideTopFace)}
              </div>
            )}
          </>
        )}
        {activeFace === 'bottom' && renderFaceSettings(bottomFace, setBottomFace)}
      </div>
    </div>
  );
}
