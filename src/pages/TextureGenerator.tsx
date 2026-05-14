import { useCallback, useEffect, useRef, useState } from 'react';

import SliderControl from '../components/SliderControl';
import MapPanel from '../components/MapPanel';
import { downloadCanvas } from '../utils/helpers';
import { useLocalState } from '../hooks/useLocalState';
import { setFaceImage } from '../hooks/useFaceStore';
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
  generatePlain,
  type BrickPattern,
  type BrickColorMode,
  type TileColorMode,
  type TextilesPatternType,
  type VoxelBaseType,
  type VoxelOreLayer,
  type OreStyle,
  type CartoonOreShape,
  type CartoonOreLayer,
  type VoxelRenderStyle,
} from '../utils/textureGenerators';

type TextureType = 'Plain' | 'PerlinNoise' | 'Checker' | 'Brick' | 'Gradient' | 'Terrain' | 'Wood' | 'Bark' | 'Tiles' | 'Textiles' | 'Clouds' | 'Voxel' | 'CartoonOre' | 'Hexagon' | 'Octagon' | 'StoneWall';

const TEXTURE_TYPES: { id: TextureType; label: string }[] = [
  { id: 'Plain', label: 'Plain' },
  { id: 'PerlinNoise', label: 'Perlin Noise' },
  { id: 'Clouds', label: 'Clouds' },
  { id: 'Checker', label: 'Checker' },
  { id: 'Brick', label: 'Brick' },
  { id: 'Hexagon', label: 'Hexagon' },
  { id: 'Octagon', label: 'Octagon' },
  { id: 'StoneWall', label: 'Stone Wall' },
  { id: 'Gradient', label: 'Gradient' },
  { id: 'Terrain', label: 'Terrain' },
  { id: 'Textiles', label: 'Textiles' },
  { id: 'Tiles', label: 'Tiles' },
  { id: 'Wood', label: 'Wood' },
  { id: 'Bark', label: 'Bark' },
  { id: 'CartoonOre', label: 'Cartoon Ore' },
  { id: 'Voxel', label: 'Voxel / Pixel' },
];

function CS({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  return <input type="color" value={color} onChange={e => onChange(e.target.value)} className="color-input" />;
}

const DiceBtn = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} title="Randomize seed" className="btn-icon">&#x1F3B2;</button>
);

export default function TextureGenerator({ hideMapPanel = false }: { hideMapPanel?: boolean } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasReady, setCanvasReady] = useState(0);
  const [activeType, setActiveType] = useLocalState<TextureType>('tg_type', 'PerlinNoise');
  const [size, setSize] = useLocalState('tg_size', 512);
  const [rotation, setRotation] = useLocalState('tg_rot', 0);

  const [pnColor1, setPnColor1] = useLocalState('tg_pnC1', '#e6d7c3');
  const [pnColor2, setPnColor2] = useLocalState('tg_pnC2', '#1a1714');
  const [pnType, setPnType] = useLocalState<'PerlinNoise' | 'FractalNoise' | 'Turbulence'>('tg_pnT', 'PerlinNoise');
  const [pnOctaves, setPnOctaves] = useLocalState('tg_pnOct', 6);
  const [pnScale, setPnScale] = useLocalState('tg_pnSc', 50);
  const [pnPersistence, setPnPersistence] = useLocalState('tg_pnPe', 0.5);
  const [pnSeed, setPnSeed] = useLocalState('tg_pnSd', 1);
  const [pnUseGradient, setPnUseGradient] = useLocalState('tg_pnUG', false);
  const [pnColorStops, setPnColorStops] = useLocalState<{ position: number; color: string }[]>('tg_pnCS', [
    { position: 0, color: '#1a1714' }, { position: 0.5, color: '#8a6040' }, { position: 1, color: '#e6d7c3' },
  ]);

  const [clColor1, setClColor1] = useLocalState('tg_clC1', '#ffffff');
  const [clColor2, setClColor2] = useLocalState('tg_clC2', '#2a4d82');
  const [clScale, setClScale] = useLocalState('tg_clSc', 7);
  const [clDetail, setClDetail] = useLocalState('tg_clDe', 0.45);
  const [clPercentage, setClPercentage] = useLocalState('tg_clPe', 0.6);
  const [clSeed, setClSeed] = useLocalState('tg_clSd', 1);

  const [ckColor1, setCkColor1] = useLocalState('tg_ckC1', '#e6d7c3');
  const [ckColor2, setCkColor2] = useLocalState('tg_ckC2', '#665e52');
  const [ckX, setCkX] = useLocalState('tg_ckX', 6);
  const [ckY, setCkY] = useLocalState('tg_ckY', 6);
  const [ckPercentage, setCkPercentage] = useLocalState('tg_ckPe', 100);
  const [ckSeed, setCkSeed] = useLocalState('tg_ckSd', 1);
  const [ckShade, setCkShade] = useLocalState('tg_ckSh', 0);
  const [ckTexture, setCkTexture] = useLocalState('tg_ckTx', 0);

  const [brColor, setBrColor] = useLocalState('tg_brC', '#e6d7c3');
  const [brColor2, setBrColor2] = useLocalState('tg_brC2', '#c9a882');
  const [brGroutColor, setBrGroutColor] = useLocalState('tg_brGC', '#665e52');
  const [brGradientColor, setBrGradientColor] = useLocalState('tg_brGrC', '#665e52');
  const [brPattern, setBrPattern] = useLocalState<BrickPattern>('tg_brPa', 'edges');
  const [brColorMode, setBrColorMode] = useLocalState<BrickColorMode>('tg_brCM', 'random');
  const [brShape, setBrShape] = useLocalState<'rectangular' | 'square'>('tg_brSh', 'rectangular');
  const [brCount, setBrCount] = useLocalState('tg_brCn', 6);
  const [brAspect, setBrAspect] = useLocalState('tg_brAs', 2.5);
  const [brX, setBrX] = useLocalState('tg_brX', 6);
  const [brY, setBrY] = useLocalState('tg_brY', 6);
  const [brGrout, setBrGrout] = useLocalState('tg_brGr', 6);
  const [brGradient, setBrGradient] = useLocalState('tg_brGd', 3);
  const [brGradientEnabled, setBrGradientEnabled] = useLocalState('tg_brGE', true);
  const [brShadeRange, setBrShadeRange] = useLocalState('tg_brSR', 0.15);
  const [brTexture, setBrTexture] = useLocalState('tg_brTx', 0.4);
  const [brTextureSeed, setBrTextureSeed] = useLocalState('tg_brTS', 1);
  const [brTextureScale, setBrTextureScale] = useLocalState('tg_brTSc', 30);

  const [grType, setGrType] = useLocalState<'linear' | 'radial'>('tg_grT', 'radial');
  const [grColors, setGrColors] = useLocalState('tg_grCo', [
    { color: '#ff0000', position: 0 },
    { color: '#0000ff', position: 50 },
    { color: '#00ff00', position: 100 },
  ]);

  const [trScale, setTrScale] = useLocalState('tg_trSc', 7);
  const [trDetail, setTrDetail] = useLocalState('tg_trDe', 0.45);
  const [trHeight, setTrHeight] = useLocalState('tg_trHe', 0.7);
  const [trSeed, setTrSeed] = useLocalState('tg_trSd', 1);
  const [trShadow, setTrShadow] = useLocalState('tg_trSh', true);
  const [trColored, setTrColored] = useLocalState('tg_trCo', true);
  const [trShadowStrength, setTrShadowStrength] = useLocalState('tg_trSS', 0.6);
  const [trSunHeight, setTrSunHeight] = useLocalState('tg_trSH', 52);

  const [wdColor1, setWdColor1] = useLocalState('tg_wdC1', '#c49a6c');
  const [wdColor2, setWdColor2] = useLocalState('tg_wdC2', '#8b5e3c');
  const [wdColor3, setWdColor3] = useLocalState('tg_wdC3', '#a0744c');
  const [wdPlanks, setWdPlanks] = useLocalState('tg_wdPl', 5);
  const [wdXScale, setWdXScale] = useLocalState('tg_wdXS', 5);
  const [wdScale, setWdScale] = useLocalState('tg_wdSc', 1);
  const [wdPersistence, setWdPersistence] = useLocalState('tg_wdPe', 0.5);
  const [wdSeed, setWdSeed] = useLocalState('tg_wdSd', 1);
  const [wdGrainWidth, setWdGrainWidth] = useLocalState('tg_wdGW', 1);
  const [wdGapWidth, setWdGapWidth] = useLocalState('tg_wdGp', 0.4);
  const [wdRings, setWdRings] = useLocalState('tg_wdRi', false);

  const [bkColor1, setBkColor1] = useLocalState('tg_bkC1', '#8b6b4a');
  const [bkColor2, setBkColor2] = useLocalState('tg_bkC2', '#5c3d28');
  const [bkColor3, setBkColor3] = useLocalState('tg_bkC3', '#3a2515');
  const [bkFissures, setBkFissures] = useLocalState('tg_bkFi', 6);
  const [bkRoughness, setBkRoughness] = useLocalState('tg_bkRo', 0.5);
  const [bkDepth, setBkDepth] = useLocalState('tg_bkDe', 0.6);
  const [bkScale, setBkScale] = useLocalState('tg_bkSc', 1);
  const [bkSeed, setBkSeed] = useLocalState('tg_bkSd', 1);

  const [tlX, setTlX] = useLocalState('tg_tlX', 2);
  const [tlY, setTlY] = useLocalState('tg_tlY', 2);
  const [tlColor, setTlColor] = useLocalState('tg_tlC', '#cccccc');
  const [tlGroutColor, setTlGroutColor] = useLocalState('tg_tlGC', '#888888');
  const [tlGradientColor, setTlGradientColor] = useLocalState('tg_tlGrC', '#aaaaaa');
  const [tlGroutGradientColor, setTlGroutGradientColor] = useLocalState('tg_tlGGC', '#666666');
  const [tlXGrout, setTlXGrout] = useLocalState('tg_tlXG', 15);
  const [tlYGrout, setTlYGrout] = useLocalState('tg_tlYG', 15);
  const [tlXGradient, setTlXGradient] = useLocalState('tg_tlXGr', 30);
  const [tlYGradient, setTlYGradient] = useLocalState('tg_tlYGr', 30);
  const [tlGradientEnabled, setTlGradientEnabled] = useLocalState('tg_tlGE', true);
  const [tlGroutGradientEnabled, setTlGroutGradientEnabled] = useLocalState('tg_tlGGE', true);
  const [tlColor2, setTlColor2] = useLocalState('tg_tlC2', '#aaaaaa');
  const [tlColorMode, setTlColorMode] = useLocalState<TileColorMode>('tg_tlCM', 'single');
  const [tlShadeRange, setTlShadeRange] = useLocalState('tg_tlSR', 0);
  const [tlTexture, setTlTexture] = useLocalState('tg_tlTx', 0);
  const [tlSeed, setTlSeed] = useLocalState('tg_tlSd', 1);

  const [txColor1, setTxColor1] = useLocalState('tg_txC1', '#e6d7c3');
  const [txColor2, setTxColor2] = useLocalState('tg_txC2', '#665e52');
  const [txPattern, setTxPattern] = useLocalState<TextilesPatternType>('tg_txPa', 4);
  const [txDouble, setTxDouble] = useLocalState('tg_txDb', false);
  const [txTightness, setTxTightness] = useLocalState('tg_txTi', 1);
  const [txThickness, setTxThickness] = useLocalState('tg_txTh', 6);
  const [txSmoothness, setTxSmoothness] = useLocalState('tg_txSm', 0);
  const [txShading, setTxShading] = useLocalState('tg_txSd', 0);

  const [vxBaseType, setVxBaseType] = useLocalState<VoxelBaseType>('tg_vxBT', 'stone');
  const [vxRenderStyle, setVxRenderStyle] = useLocalState<VoxelRenderStyle>('tg_vxRS', 'pixelated');
  const [vxResolution, setVxResolution] = useLocalState('tg_vxRe', 16);
  const [vxBaseColor1, setVxBaseColor1] = useLocalState('tg_vxC1', '#8b8b8b');
  const [vxBaseColor2, setVxBaseColor2] = useLocalState('tg_vxC2', '#6b6b6b');
  const [vxBaseColor3, setVxBaseColor3] = useLocalState('tg_vxC3', '#555555');
  const [vxGrain, setVxGrain] = useLocalState('tg_vxGr', 0.3);
  const [vxGrainDir, setVxGrainDir] = useLocalState<'horizontal' | 'vertical' | 'both' | 'none'>('tg_vxGD', 'both');
  const [vxDepthShading, setVxDepthShading] = useLocalState('tg_vxDS', 0.5);
  const [vxOutline, setVxOutline] = useLocalState('tg_vxOL', 0.3);
  const [vxSeed, setVxSeed] = useLocalState('tg_vxSd', 1);
  const [vxPalette, setVxPalette] = useLocalState('tg_vxPa', 8);
  const [vxOres, setVxOres] = useLocalState<VoxelOreLayer[]>('tg_vxOr', [
    { color: '#4488dd', highlightColor: '#88ccff', density: 3, clusterSize: 2, name: 'Diamond', style: 'jewel', oreScale: 1 },
  ]);

  // Cartoon Ore
  const [coBaseColor1, setCoBaseColor1] = useLocalState('tg_coC1', '#7a8a8a');
  const [coBaseColor2, setCoBaseColor2] = useLocalState('tg_coC2', '#6a7a7a');
  const [coBaseColor3, setCoBaseColor3] = useLocalState('tg_coC3', '#5a6a6a');
  const [coBgNoise, setCoBgNoise] = useLocalState('tg_coBN', 0.6);
  const [coBgPatch, setCoBgPatch] = useLocalState('tg_coBP', 30);
  const [coOutline, setCoOutline] = useLocalState('tg_coOL', 1.5);
  const [coShadow, setCoShadow] = useLocalState('tg_coSh', 0.6);
  const [coSeed, setCoSeed] = useLocalState('tg_coSd', 1);
  const [coBgGradient, setCoBgGradient] = useLocalState('tg_coBG', false);
  const [coOres, setCoOres] = useLocalState<CartoonOreLayer[]>('tg_coOr', [
    { color: '#3a3a44', highlightColor: '#5a5a66', shape: 'diamond', count: 8, minSize: 12, maxSize: 30, name: 'Coal', useGradient: true },
  ]);

  // Hexagon
  const [hxColor1, setHxColor1] = useLocalState('tg_hxC1', '#cccccc');
  const [hxColor2, setHxColor2] = useLocalState('tg_hxC2', '#aaaaaa');
  const [hxGrout, setHxGrout] = useLocalState('tg_hxGr', '#666666');
  const [hxColumns, setHxColumns] = useLocalState('tg_hxCo', 6);
  const [hxGroutSize, setHxGroutSize] = useLocalState('tg_hxGS', 4);
  const [hxShade, setHxShade] = useLocalState('tg_hxSh', 0.1);
  const [hxSeed, setHxSeed] = useLocalState('tg_hxSd', 1);
  const [hxGradient, setHxGradient] = useLocalState('tg_hxGd', false);

  // Octagon
  const [ocColor1, setOcColor1] = useLocalState('tg_ocC1', '#cccccc');
  const [ocColor2, setOcColor2] = useLocalState('tg_ocC2', '#999999');
  const [ocGrout, setOcGrout] = useLocalState('tg_ocGr', '#666666');
  const [ocColumns, setOcColumns] = useLocalState('tg_ocCo', 5);
  const [ocGroutSize, setOcGroutSize] = useLocalState('tg_ocGS', 4);
  const [ocShade, setOcShade] = useLocalState('tg_ocSh', 0.1);
  const [ocSeed, setOcSeed] = useLocalState('tg_ocSd', 1);
  const [ocGradient, setOcGradient] = useLocalState('tg_ocGd', false);

  // Stone Wall
  const [swColor1, setSwColor1] = useLocalState('tg_swC1', '#b0a898');
  const [swColor2, setSwColor2] = useLocalState('tg_swC2', '#908070');
  const [swMortar, setSwMortar] = useLocalState('tg_swMC', '#484038');
  const [swColumns, setSwColumns] = useLocalState('tg_swCo', 6);
  const [swRows, setSwRows] = useLocalState('tg_swRo', 6);
  const [swMortarWidth, setSwMortarWidth] = useLocalState('tg_swMW', 3);
  const [swJitter, setSwJitter] = useLocalState('tg_swJi', 0.85);
  const [swShading, setSwShading] = useLocalState('tg_swSh', 0.5);
  const [swTextureNoise, setSwTextureNoise] = useLocalState('tg_swTN', 0.4);
  const [swSeed, setSwSeed] = useLocalState('tg_swSd', 1);

  // Plain
  const [plColor, setPlColor] = useLocalState('tg_plC', '#cccccc');
  const [plGrain, setPlGrain] = useLocalState('tg_plGr', 0);
  const [plSeed, setPlSeed] = useLocalState('tg_plSd', 1);

  // Paint layer
  const [paintMode, setPaintMode] = useState(false);
  const [paintTool, setPaintTool] = useLocalState<'brush' | 'eraser' | 'fill'>('tg_ptTool', 'brush');
  const [paintColor, setPaintColor] = useLocalState('tg_ptColor', '#ff0000');
  const [paintSize, setPaintSize] = useLocalState('tg_ptSize', 8);
  const paintCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const [pixelate, setPixelate] = useLocalState('tg_pxOn', false);
  const [pixelRes, setPixelRes] = useLocalState('tg_pxRe', 16);
  const [pixelPalette, setPixelPalette] = useLocalState('tg_pxPa', 0);

  const updateTexture = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    switch (activeType) {
      case 'Plain':
        generatePlain(canvas, size, plColor, plGrain, plSeed);
        break;
      case 'PerlinNoise':
        generatePerlinNoise(canvas, size, pnColor1, pnColor2, pnType, pnOctaves, pnPersistence, pnScale, pnSeed, 1, pnUseGradient ? pnColorStops : undefined);
        break;
      case 'Clouds':
        generatePerlinNoise(canvas, size, clColor1, clColor2, 'PerlinNoise', 7, clDetail, clScale * 2, clSeed, clPercentage);
        break;
      case 'Checker':
        generateChecker(canvas, size, ckX, ckY, ckColor1, ckColor2, ckSeed, ckPercentage / 100, ckShade, ckTexture);
        break;
      case 'Brick': {
        const bx = brShape === 'square' ? brCount : Math.round(brCount * brAspect);
        const by = brCount;
        generateBrick(canvas, size, brColor, brGroutColor, brGradientColor, brPattern, bx, by, brGrout, brGradientEnabled ? brGradient : 0,
          brColorMode, brColor2, brShadeRange, brTexture, brTextureSeed, brTextureScale);
        break;
      }
      case 'Gradient':
        generateGradient(canvas, size, grColors, grType);
        break;
      case 'Terrain':
        generateTerrain(canvas, size, trScale, trDetail, trSeed, trHeight, trShadow, trColored, trShadowStrength, trSunHeight, -1400, -1400,
          [
            { color: { r: 96, g: 99, b: 46 }, position: 0.04 },
            { color: { r: 58, g: 79, b: 34 }, position: 0.16 },
            { color: { r: 128, g: 154, b: 96 }, position: 0.49 },
            { color: { r: 104, g: 99, b: 89 }, position: 0.7 },
            { color: { r: 255, g: 255, b: 255 }, position: 0.94 },
          ]);
        break;
      case 'Wood':
        generateWood(canvas, size, wdColor1, wdColor2, wdColor3, wdPlanks, wdXScale, wdScale, wdPersistence, wdSeed, wdGrainWidth, wdGapWidth, wdRings);
        break;
      case 'Bark':
        generateBark(canvas, size, bkColor1, bkColor2, bkColor3, bkFissures, bkRoughness, bkDepth, bkScale, bkSeed);
        break;
      case 'Tiles':
        generateTiles(canvas, size, tlX, tlY, tlColor, tlGroutColor, tlGradientColor, tlGroutGradientColor,
          tlXGrout, tlYGrout, tlXGradient, tlYGradient, tlGradientEnabled, tlGroutGradientEnabled,
          tlColor2, tlColorMode, tlShadeRange, tlTexture, tlSeed);
        break;
      case 'Textiles':
        generateTextiles(canvas, size, txColor1, txColor2, txPattern, txDouble, txTightness, txThickness, txSmoothness, txShading);
        break;
      case 'Voxel':
        generateVoxelTexture(canvas, size, {
          resolution: vxResolution, baseType: vxBaseType,
          baseColor1: vxBaseColor1, baseColor2: vxBaseColor2, baseColor3: vxBaseColor3,
          grainStrength: vxGrain, grainDirection: vxGrainDir,
          oreLayers: vxOres, depthShading: vxDepthShading,
          outlineStrength: vxOutline, seed: vxSeed, paletteSize: vxPalette,
          renderStyle: vxRenderStyle,
        });
        break;
      case 'CartoonOre':
        generateCartoonOre(canvas, size, {
          baseColor1: coBaseColor1, baseColor2: coBaseColor2, baseColor3: coBaseColor3,
          bgNoise: coBgNoise, bgPatchSize: coBgPatch, bgGradient: coBgGradient,
          oreLayers: coOres, seed: coSeed,
          outlineWidth: coOutline, shadowStrength: coShadow,
        });
        break;
      case 'Hexagon':
        generateHexagon(canvas, size, hxColor1, hxColor2, hxGrout, hxColumns, hxGroutSize, hxShade, hxSeed, hxGradient);
        break;
      case 'Octagon':
        generateOctagon(canvas, size, ocColor1, ocColor2, ocGrout, ocColumns, ocGroutSize, ocShade, ocSeed, ocGradient);
        break;
      case 'StoneWall':
        generateStoneWall(canvas, size, {
          stoneColor1: swColor1, stoneColor2: swColor2, mortarColor: swMortar,
          columns: swColumns, rows: swRows, mortarWidth: swMortarWidth,
          jitter: swJitter, shading: swShading, textureNoise: swTextureNoise,
          seed: swSeed,
        });
        break;
    }
    if (rotation !== 0) {
      const ctx = canvas.getContext('2d')!;
      const tmp = document.createElement('canvas');
      tmp.width = size; tmp.height = size;
      tmp.getContext('2d')!.drawImage(canvas, 0, 0);
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate(rotation * Math.PI / 180);
      ctx.translate(-size / 2, -size / 2);
      const pat = ctx.createPattern(tmp, 'repeat');
      if (pat) { ctx.fillStyle = pat; ctx.fillRect(-size / 2, -size / 2, size * 2, size * 2); }
      ctx.restore();
    }
    if (pixelate && activeType !== 'Voxel') {
      const ctx = canvas.getContext('2d')!;
      const small = document.createElement('canvas');
      small.width = pixelRes; small.height = pixelRes;
      const sctx = small.getContext('2d')!;
      sctx.imageSmoothingEnabled = true;
      sctx.drawImage(canvas, 0, 0, pixelRes, pixelRes);
      if (pixelPalette > 0) {
        const imgData = sctx.getImageData(0, 0, pixelRes, pixelRes);
        const d = imgData.data;
        const levels = pixelPalette;
        for (let i = 0; i < d.length; i += 4) {
          d[i]     = Math.round(d[i] / 255 * (levels - 1)) / (levels - 1) * 255;
          d[i + 1] = Math.round(d[i + 1] / 255 * (levels - 1)) / (levels - 1) * 255;
          d[i + 2] = Math.round(d[i + 2] / 255 * (levels - 1)) / (levels - 1) * 255;
        }
        sctx.putImageData(imgData, 0, 0);
      }
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(small, 0, 0, size, size);
    }
    // Save base for paint recomposite, then apply any existing paint on top
    if (baseCanvasRef.current) {
      baseCanvasRef.current.width = canvas.width;
      baseCanvasRef.current.height = canvas.height;
      baseCanvasRef.current.getContext('2d')!.drawImage(canvas, 0, 0);
    }
    if (paintCanvasRef.current) {
      canvas.getContext('2d')!.drawImage(paintCanvasRef.current, 0, 0);
    }
    setCanvasReady(c => c + 1);
  }, [activeType, size, rotation, pixelate, pixelRes, pixelPalette,
    plColor, plGrain, plSeed,
    pnColor1, pnColor2, pnType, pnOctaves, pnScale, pnPersistence, pnSeed, pnUseGradient, pnColorStops,
    clColor1, clColor2, clScale, clDetail, clPercentage, clSeed,
    ckColor1, ckColor2, ckX, ckY, ckPercentage, ckSeed, ckShade, ckTexture,
    brColor, brColor2, brGroutColor, brGradientColor, brPattern, brColorMode, brShape, brCount, brAspect, brX, brY, brGrout, brGradient, brGradientEnabled, brShadeRange, brTexture, brTextureSeed, brTextureScale,
    grType, grColors,
    trScale, trDetail, trHeight, trSeed, trShadow, trColored, trShadowStrength, trSunHeight,
    wdColor1, wdColor2, wdColor3, wdPlanks, wdXScale, wdScale, wdPersistence, wdSeed, wdGrainWidth, wdGapWidth, wdRings,
    bkColor1, bkColor2, bkColor3, bkFissures, bkRoughness, bkDepth, bkScale, bkSeed,
    tlX, tlY, tlColor, tlColor2, tlColorMode, tlGroutColor, tlGradientColor, tlGroutGradientColor, tlXGrout, tlYGrout, tlXGradient, tlYGradient, tlGradientEnabled, tlGroutGradientEnabled, tlShadeRange, tlTexture, tlSeed,
    txColor1, txColor2, txPattern, txDouble, txTightness, txThickness, txSmoothness, txShading,
    vxBaseType, vxRenderStyle, vxResolution, vxBaseColor1, vxBaseColor2, vxBaseColor3, vxGrain, vxGrainDir, vxDepthShading, vxOutline, vxSeed, vxPalette, vxOres,
    coBaseColor1, coBaseColor2, coBaseColor3, coBgNoise, coBgPatch, coBgGradient, coOutline, coShadow, coSeed, coOres,
    hxColor1, hxColor2, hxGrout, hxColumns, hxGroutSize, hxShade, hxSeed, hxGradient,
    ocColor1, ocColor2, ocGrout, ocColumns, ocGroutSize, ocShade, ocSeed, ocGradient,
    swColor1, swColor2, swMortar, swColumns, swRows, swMortarWidth, swJitter, swShading, swTextureNoise, swSeed,
  ]);

  useEffect(() => { updateTexture(); }, [updateTexture]);

  // Reset paint canvas when size changes
  useEffect(() => {
    if (paintCanvasRef.current) {
      paintCanvasRef.current.width = size;
      paintCanvasRef.current.height = size;
    }
    if (baseCanvasRef.current) {
      baseCanvasRef.current.width = size;
      baseCanvasRef.current.height = size;
    }
  }, [size]);

  const recomposite = useCallback(() => {
    const canvas = canvasRef.current;
    const base = baseCanvasRef.current;
    const paint = paintCanvasRef.current;
    if (!canvas || !base || !paint) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0);
    ctx.drawImage(paint, 0, 0);
    setCanvasReady(c => c + 1);
  }, []);

  const floodFill = useCallback((px: number, py: number, fillColor: string) => {
    const paint = paintCanvasRef.current;
    if (!paint) return;
    const ctx = paint.getContext('2d')!;
    const w = paint.width; const h = paint.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    const idx = (py * w + px) * 4;
    const tr = d[idx]; const tg = d[idx + 1]; const tb = d[idx + 2]; const ta = d[idx + 3];
    const fc = parseInt(fillColor.slice(1), 16);
    const fr = (fc >> 16) & 255; const fg = (fc >> 8) & 255; const fb = fc & 255;
    if (fr === tr && fg === tg && fb === tb && ta === 255) return;
    const stack: [number, number][] = [[px, py]];
    const visited = new Uint8Array(w * h);
    while (stack.length) {
      const [x, y] = stack.pop()!;
      if (x < 0 || x >= w || y < 0 || y >= h) continue;
      const i4 = (y * w + x) * 4;
      if (visited[y * w + x]) continue;
      if (d[i4] !== tr || d[i4 + 1] !== tg || d[i4 + 2] !== tb || d[i4 + 3] !== ta) continue;
      visited[y * w + x] = 1;
      d[i4] = fr; d[i4 + 1] = fg; d[i4 + 2] = fb; d[i4 + 3] = 255;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    ctx.putImageData(imgData, 0, 0);
    recomposite();
  }, [recomposite]);

  const drawStroke = useCallback((x: number, y: number, fromX?: number, fromY?: number) => {
    const paint = paintCanvasRef.current;
    if (!paint) return;
    const ctx = paint.getContext('2d')!;
    if (paintTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = paintColor;
    }
    ctx.lineWidth = paintSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(fromX ?? x, fromY ?? y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    recomposite();
  }, [paintTool, paintColor, paintSize, recomposite]);

  const canvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const handlePaintDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!paintMode) return;
    const { x, y } = canvasCoords(e);
    if (paintTool === 'fill') { floodFill(Math.floor(x), Math.floor(y), paintColor); return; }
    isDrawingRef.current = true;
    lastPosRef.current = { x, y };
    drawStroke(x, y, x, y);
  }, [paintMode, paintTool, paintColor, floodFill, drawStroke]);

  const handlePaintMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!paintMode || !isDrawingRef.current) return;
    const { x, y } = canvasCoords(e);
    const last = lastPosRef.current;
    drawStroke(x, y, last?.x, last?.y);
    lastPosRef.current = { x, y };
  }, [paintMode, drawStroke]);

  const handlePaintUp = useCallback(() => { isDrawingRef.current = false; lastPosRef.current = null; }, []);

  const clearPaint = useCallback(() => {
    const paint = paintCanvasRef.current;
    if (!paint) return;
    paint.getContext('2d')!.clearRect(0, 0, paint.width, paint.height);
    recomposite();
  }, [recomposite]);

  const renderSettings = () => {
    const applyPnPreset = (key: string) => {
      const p: Record<string, any> | undefined = { marble: { c1: '#e6e0d4', c2: '#2a2520', type: 'FractalNoise', octaves: 6, scale: 50, persistence: 0.5 }, organic: { c1: '#88aa44', c2: '#223310', type: 'PerlinNoise', octaves: 4, scale: 30, persistence: 0.65 }, static: { c1: '#ffffff', c2: '#000000', type: 'Turbulence', octaves: 8, scale: 80, persistence: 0.5 }, lava_flow: { c1: '#ff4400', c2: '#220800', type: 'FractalNoise', octaves: 5, scale: 35, persistence: 0.55 }, water: { c1: '#4488cc', c2: '#0a1e3a', type: 'PerlinNoise', octaves: 5, scale: 40, persistence: 0.45 } }[key];
      if (!p) return;
      setPnColor1(p.c1); setPnColor2(p.c2); setPnType(p.type); setPnOctaves(p.octaves); setPnScale(p.scale); setPnPersistence(p.persistence);
    };
    const applyClPreset = (key: string) => {
      const p: Record<string, any> | undefined = { cumulus: { c1: '#ffffff', c2: '#4488cc', scale: 7, detail: 0.45, percentage: 0.6 }, storm: { c1: '#cccccc', c2: '#1a1a2e', scale: 5, detail: 0.55, percentage: 0.75 }, fog: { c1: '#cccccc', c2: '#888888', scale: 15, detail: 0.3, percentage: 0.4 }, sunset: { c1: '#ff8844', c2: '#4422aa', scale: 8, detail: 0.5, percentage: 0.55 }, aurora: { c1: '#44ff88', c2: '#2222aa', scale: 10, detail: 0.4, percentage: 0.5 } }[key];
      if (!p) return;
      setClColor1(p.c1); setClColor2(p.c2); setClScale(p.scale); setClDetail(p.detail); setClPercentage(p.percentage);
    };
    const applyCkPreset = (key: string) => {
      const p: Record<string, any> | undefined = { chess: { c1: '#f0f0f0', c2: '#222222', x: 8, y: 8, pct: 100, shade: 0, texture: 0 }, retro: { c1: '#ff6644', c2: '#ffcc22', x: 10, y: 10, pct: 100, shade: 0.1, texture: 0 }, kitchen_floor: { c1: '#e8e0d0', c2: '#665e52', x: 6, y: 6, pct: 100, shade: 0.05, texture: 0.3 }, gingham: { c1: '#dd4444', c2: '#ffffff', x: 12, y: 12, pct: 100, shade: 0.08, texture: 0 } }[key];
      if (!p) return;
      setCkColor1(p.c1); setCkColor2(p.c2); setCkX(p.x); setCkY(p.y); setCkPercentage(p.pct); setCkShade(p.shade); setCkTexture(p.texture);
    };
    const applyBrPreset = (key: string) => {
      const p: Record<string, any> | undefined = { red_brick: { color: '#c0553a', color2: '#a84430', grout: '#888888', gc: '#995533', pattern: 'edges', cm: 'random', shape: 'rectangular', count: 6, aspect: 2.5, gs: 6, gradient: 3, ge: true, sr: 0.15, texture: 0.4, ts: 30 }, sandstone: { color: '#d4b896', color2: '#c4a878', grout: '#a08860', gc: '#b09870', pattern: 'straight', cm: 'random', shape: 'rectangular', count: 8, aspect: 2, gs: 4, gradient: 2, ge: true, sr: 0.1, texture: 0.3, ts: 40 }, cobblestone: { color: '#888888', color2: '#666666', grout: '#444444', gc: '#777777', pattern: 'edges', cm: 'random', shape: 'square', count: 8, aspect: 1, gs: 5, gradient: 4, ge: true, sr: 0.2, texture: 0.5, ts: 25 }, white_brick: { color: '#f0ece8', color2: '#e0dcd8', grout: '#cccccc', gc: '#e8e4e0', pattern: 'straight', cm: 'single', shape: 'rectangular', count: 8, aspect: 2.5, gs: 3, gradient: 2, ge: true, sr: 0.05, texture: 0.15, ts: 35 }, old_brick: { color: '#8b5a3c', color2: '#6b4028', grout: '#554433', gc: '#7a4a30', pattern: 'block', cm: 'random', shape: 'rectangular', count: 6, aspect: 2, gs: 6, gradient: 5, ge: true, sr: 0.25, texture: 0.6, ts: 20 } }[key];
      if (!p) return;
      setBrColor(p.color); setBrColor2(p.color2); setBrGroutColor(p.grout); setBrGradientColor(p.gc); setBrPattern(p.pattern); setBrColorMode(p.cm); setBrShape(p.shape); setBrCount(p.count); setBrAspect(p.aspect); setBrGrout(p.gs); setBrGradient(p.gradient); setBrGradientEnabled(p.ge); setBrShadeRange(p.sr); setBrTexture(p.texture); setBrTextureScale(p.ts);
    };
    const applyGrPreset = (key: string) => {
      const p: Record<string, any> | undefined = { sunset: { type: 'linear', stops: [{ color: '#ff4400', position: 0 }, { color: '#ff8844', position: 30 }, { color: '#8844aa', position: 70 }, { color: '#221144', position: 100 }] }, ocean: { type: 'linear', stops: [{ color: '#003344', position: 0 }, { color: '#006688', position: 40 }, { color: '#44aacc', position: 70 }, { color: '#88ccdd', position: 100 }] }, fire: { type: 'radial', stops: [{ color: '#ffcc00', position: 0 }, { color: '#ff4400', position: 50 }, { color: '#220000', position: 100 }] }, neon: { type: 'linear', stops: [{ color: '#ff00ff', position: 0 }, { color: '#00ffff', position: 50 }, { color: '#ff00ff', position: 100 }] }, earth: { type: 'linear', stops: [{ color: '#2d5a1e', position: 0 }, { color: '#8b6b4a', position: 40 }, { color: '#d4c4a0', position: 70 }, { color: '#87ceeb', position: 100 }] } }[key];
      if (!p) return;
      setGrType(p.type); setGrColors(p.stops);
    };
    const applyTrPreset = (key: string) => {
      const p: Record<string, any> | undefined = { mountains: { scale: 7, detail: 0.45, height: 0.7, shadow: true, colored: true, ss: 0.6, sun: 52 }, islands: { scale: 5, detail: 0.4, height: 0.3, shadow: true, colored: true, ss: 0.4, sun: 60 }, desert: { scale: 9, detail: 0.35, height: 0.5, shadow: true, colored: true, ss: 0.7, sun: 40 }, plains: { scale: 4, detail: 0.5, height: 0.15, shadow: true, colored: true, ss: 0.3, sun: 70 }, alps: { scale: 8, detail: 0.55, height: 0.9, shadow: true, colored: true, ss: 0.8, sun: 35 } }[key];
      if (!p) return;
      setTrScale(p.scale); setTrDetail(p.detail); setTrHeight(p.height); setTrShadow(p.shadow); setTrColored(p.colored); setTrShadowStrength(p.ss); setTrSunHeight(p.sun);
    };
    const applyWdPreset = (key: string) => {
      const p: Record<string, any> | undefined = { oak: { c1: '#c49a6c', c2: '#8b5e3c', c3: '#a0744c', planks: 5, gw: 1, gap: 0.4, xs: 5, scale: 1, per: 0.5 }, pine: { c1: '#e0c8a0', c2: '#b8985c', c3: '#d0b080', planks: 7, gw: 0.7, gap: 0.3, xs: 4, scale: 1.2, per: 0.4 }, cherry: { c1: '#c06050', c2: '#7a2828', c3: '#993838', planks: 4, gw: 1.2, gap: 0.45, xs: 6, scale: 0.8, per: 0.55 }, walnut: { c1: '#6b4832', c2: '#3a2418', c3: '#503020', planks: 5, gw: 1.5, gap: 0.5, xs: 5, scale: 1, per: 0.6 }, maple: { c1: '#ddc8a0', c2: '#b09060', c3: '#c4a880', planks: 6, gw: 0.8, gap: 0.35, xs: 4, scale: 0.9, per: 0.45 }, ebony: { c1: '#2a2020', c2: '#0e0808', c3: '#1a1212', planks: 6, gw: 2, gap: 0.55, xs: 5, scale: 1.2, per: 0.5 } }[key];
      if (!p) return;
      setWdColor1(p.c1); setWdColor2(p.c2); setWdColor3(p.c3); setWdPlanks(p.planks); setWdGrainWidth(p.gw); setWdGapWidth(p.gap); setWdXScale(p.xs); setWdScale(p.scale); setWdPersistence(p.per);
    };
    const applyBkPreset = (key: string) => {
      const p: Record<string, any> | undefined = { oak_bark: { c1: '#8b6b4a', c2: '#5c3d28', c3: '#3a2515', fissures: 6, roughness: 0.5, depth: 0.6, scale: 1 }, birch: { c1: '#e8e0d0', c2: '#c0b8a0', c3: '#888070', fissures: 3, roughness: 0.2, depth: 0.3, scale: 1.5 }, pine_bark: { c1: '#7a5a3a', c2: '#4a3020', c3: '#2a1810', fissures: 10, roughness: 0.7, depth: 0.7, scale: 0.8 }, redwood: { c1: '#8b3a1a', c2: '#5c2010', c3: '#3a1508', fissures: 4, roughness: 0.4, depth: 0.8, scale: 1.2 }, palm: { c1: '#9a8a6a', c2: '#6a6040', c3: '#4a4030', fissures: 15, roughness: 0.3, depth: 0.4, scale: 0.6 }, aspen: { c1: '#d8d0c0', c2: '#b0a888', c3: '#e8e0d0', fissures: 2, roughness: 0.15, depth: 0.2, scale: 2 } }[key];
      if (!p) return;
      setBkColor1(p.c1); setBkColor2(p.c2); setBkColor3(p.c3); setBkFissures(p.fissures); setBkRoughness(p.roughness); setBkDepth(p.depth); setBkScale(p.scale);
    };
    const applyTlPreset = (key: string) => {
      const p: Record<string, any> | undefined = { subway: { x: 2, y: 4, color: '#f0f0f0', gc: '#cccccc', grc: '#e8e8e8', ggc: '#bbbbbb', xg: 8, yg: 8, xgr: 20, ygr: 20, ge: true, gge: false, cm: 'single', sr: 0.03, texture: 0.1 }, marble: { x: 2, y: 2, color: '#f0ece8', gc: '#aaaaaa', grc: '#e8e0d8', ggc: '#999999', xg: 10, yg: 10, xgr: 40, ygr: 40, ge: true, gge: true, cm: 'single', sr: 0.08, texture: 0.4 }, mosaic: { x: 10, y: 10, color: '#4488aa', color2: '#44aa66', gc: '#e8e0d0', grc: '#3377aa', ggc: '#d0c8b0', xg: 15, yg: 15, xgr: 10, ygr: 10, ge: true, gge: false, cm: 'random', sr: 0.2, texture: 0.15 }, terracotta: { x: 3, y: 3, color: '#c47850', gc: '#aa9080', grc: '#b06840', ggc: '#998070', xg: 12, yg: 12, xgr: 30, ygr: 30, ge: true, gge: true, cm: 'single', sr: 0.1, texture: 0.35 } }[key];
      if (!p) return;
      setTlX(p.x); setTlY(p.y); setTlColor(p.color); setTlGroutColor(p.gc); setTlGradientColor(p.grc); setTlGroutGradientColor(p.ggc); setTlXGrout(p.xg); setTlYGrout(p.yg); setTlXGradient(p.xgr); setTlYGradient(p.ygr); setTlGradientEnabled(p.ge); setTlGroutGradientEnabled(p.gge); setTlColorMode(p.cm); setTlShadeRange(p.sr); setTlTexture(p.texture); if (p.color2) setTlColor2(p.color2);
    };
    const applyTxPreset = (key: string) => {
      const p: Record<string, any> | undefined = { denim: { c1: '#3355aa', c2: '#2244aa', pattern: 4, double: false, tightness: 0.8, thickness: 4, smoothness: 0.3, shading: 0.4 }, linen: { c1: '#e8dcc8', c2: '#d4c8b4', pattern: 1, double: false, tightness: 0.5, thickness: 3, smoothness: 0.6, shading: 0.2 }, plaid: { c1: '#cc3333', c2: '#336633', pattern: 3, double: true, tightness: 0.7, thickness: 6, smoothness: 0.2, shading: 0.5 }, silk: { c1: '#d4a0c0', c2: '#b080a0', pattern: 2, double: false, tightness: 0.9, thickness: 2, smoothness: 0.9, shading: 0.1 }, burlap: { c1: '#b09060', c2: '#8a6a40', pattern: 5, double: true, tightness: 0.3, thickness: 7, smoothness: 0.1, shading: 0.6 } }[key];
      if (!p) return;
      setTxColor1(p.c1); setTxColor2(p.c2); setTxPattern(p.pattern); setTxDouble(p.double); setTxTightness(p.tightness); setTxThickness(p.thickness); setTxSmoothness(p.smoothness); setTxShading(p.shading);
    };
    const applyHxPreset = (key: string) => {
      const p: Record<string, any> | undefined = { honeycomb: { c1: '#f0c040', c2: '#e0a820', grout: '#886600', cols: 8, gs: 3, shade: 0.1, gradient: false }, bathroom: { c1: '#ffffff', c2: '#e8e8e8', grout: '#cccccc', cols: 6, gs: 4, shade: 0.05, gradient: true }, slate: { c1: '#556666', c2: '#445555', grout: '#333333', cols: 5, gs: 5, shade: 0.15, gradient: false }, pastel: { c1: '#ffccdd', c2: '#ccddff', grout: '#ffffff', cols: 7, gs: 3, shade: 0.08, gradient: true } }[key];
      if (!p) return;
      setHxColor1(p.c1); setHxColor2(p.c2); setHxGrout(p.grout); setHxColumns(p.cols); setHxGroutSize(p.gs); setHxShade(p.shade); setHxGradient(p.gradient);
    };
    const applyOcPreset = (key: string) => {
      const p: Record<string, any> | undefined = { classic: { c1: '#ffffff', c2: '#333333', grout: '#888888', cols: 5, gs: 4, shade: 0.05, gradient: false }, terracotta: { c1: '#c47850', c2: '#f0e0c0', grout: '#aa9080', cols: 4, gs: 5, shade: 0.12, gradient: true }, marble: { c1: '#e8e0d8', c2: '#aa9988', grout: '#cccccc', cols: 4, gs: 3, shade: 0.08, gradient: true }, retro: { c1: '#44aa88', c2: '#ff8844', grout: '#ffffff', cols: 5, gs: 4, shade: 0.1, gradient: false } }[key];
      if (!p) return;
      setOcColor1(p.c1); setOcColor2(p.c2); setOcGrout(p.grout); setOcColumns(p.cols); setOcGroutSize(p.gs); setOcShade(p.shade); setOcGradient(p.gradient);
    };
    const applySwPreset = (key: string) => {
      const p: Record<string, any> | undefined = {
        fieldstone: { c1: '#b0a898', c2: '#908070', mortar: '#484038', cols: 6, rows: 6, mw: 3, jitter: 0.85, shading: 0.5, tn: 0.4 },
        rough: { c1: '#9a9088', c2: '#706860', mortar: '#3a3228', cols: 5, rows: 5, mw: 4, jitter: 0.95, shading: 0.7, tn: 0.6 },
        mossy: { c1: '#8a9880', c2: '#607858', mortar: '#304830', cols: 6, rows: 6, mw: 3, jitter: 0.85, shading: 0.5, tn: 0.5 },
        cobble: { c1: '#a0a0a0', c2: '#787878', mortar: '#505050', cols: 7, rows: 7, mw: 2.5, jitter: 0.8, shading: 0.6, tn: 0.35 },
        slate_stone: { c1: '#6a7080', c2: '#4a5060', mortar: '#2a3038', cols: 6, rows: 8, mw: 2, jitter: 0.5, shading: 0.4, tn: 0.3 },
        sandstone_wall: { c1: '#d4b896', c2: '#b89878', mortar: '#806848', cols: 6, rows: 6, mw: 2.5, jitter: 0.7, shading: 0.4, tn: 0.45 },
      }[key];
      if (!p) return;
      setSwColor1(p.c1); setSwColor2(p.c2); setSwMortar(p.mortar);
      setSwColumns(p.cols); setSwRows(p.rows); setSwMortarWidth(p.mw);
      setSwJitter(p.jitter); setSwShading(p.shading); setSwTextureNoise(p.tn);
    };
    const applyCoPreset = (key: string) => {
      const presets: Record<string, any> = { coal_stone: { c1: '#7a8a8a', c2: '#6a7a7a', c3: '#5a6a6a', bgNoise: 0.6, bgPatch: 30, bgGradient: false, outline: 1.5, shadow: 0.6, ores: [{ color: '#3a3a44', highlightColor: '#5a5a66', shape: 'diamond', count: 8, minSize: 12, maxSize: 30, name: 'Coal', useGradient: true }] }, diamond_cave: { c1: '#4a5566', c2: '#3a4555', c3: '#2a3545', bgNoise: 0.7, bgPatch: 25, bgGradient: false, outline: 1.5, shadow: 0.6, ores: [{ color: '#66bbee', highlightColor: '#aaddff', shape: 'pentagon', count: 5, minSize: 14, maxSize: 35, name: 'Diamond', useGradient: true }] }, gold_vein: { c1: '#8a7a6a', c2: '#7a6a5a', c3: '#6a5a4a', bgNoise: 0.5, bgPatch: 35, bgGradient: false, outline: 2, shadow: 0.7, ores: [{ color: '#d4af37', highlightColor: '#ffe066', shape: 'hexagon', count: 6, minSize: 12, maxSize: 28, name: 'Gold', useGradient: true }] }, mixed_ore: { c1: '#7a8a8a', c2: '#6a7a7a', c3: '#5a6a6a', bgNoise: 0.6, bgPatch: 30, bgGradient: false, outline: 1.5, shadow: 0.6, ores: [{ color: '#3a3a44', highlightColor: '#5a5a66', shape: 'diamond', count: 4, minSize: 10, maxSize: 22, name: 'Coal', useGradient: true }, { color: '#cc8844', highlightColor: '#eebb66', shape: 'square', count: 3, minSize: 12, maxSize: 28, name: 'Iron', useGradient: true }, { color: '#66bbee', highlightColor: '#aaddff', shape: 'pentagon', count: 2, minSize: 14, maxSize: 30, name: 'Diamond', useGradient: true }] } };
      const p = presets[key];
      if (!p) return;
      setCoBaseColor1(p.c1); setCoBaseColor2(p.c2); setCoBaseColor3(p.c3); setCoBgNoise(p.bgNoise); setCoBgPatch(p.bgPatch); setCoBgGradient(p.bgGradient); setCoOutline(p.outline); setCoShadow(p.shadow); setCoOres(p.ores);
    };
    switch (activeType) {
      case 'Plain': return (
        <div className="settings-panel"><h3>Plain</h3>
          <div className="settings-row"><label>Color</label><CS color={plColor} onChange={setPlColor} /></div>
          <SliderControl label="Grain" value={plGrain} min={0} max={1} step={0.01} onChange={setPlGrain} />
          {plGrain > 0 && <SliderControl label="Seed" value={plSeed} min={1} max={1000} step={1} onChange={setPlSeed} extra={<DiceBtn onClick={() => setPlSeed(Math.floor(Math.random() * 999) + 1)} />} />}
          <div className="settings-row" style={{ marginTop: 12, borderTop: '1px solid #333', paddingTop: 10 }}>
            <label><input type="checkbox" checked={paintMode} onChange={e => setPaintMode(e.target.checked)} /> Paint Mode</label>
          </div>
          {paintMode && <>
            <div className="settings-row">
              <label>Tool</label>
              {(['brush', 'eraser', 'fill'] as const).map(t => (
                <button key={t} className={`btn-small ${paintTool === t ? 'active' : ''}`} onClick={() => setPaintTool(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
              ))}
            </div>
            {paintTool !== 'eraser' && <div className="settings-row"><label>Color</label><CS color={paintColor} onChange={setPaintColor} /></div>}
            {paintTool !== 'fill' && <SliderControl label="Brush Size" value={paintSize} min={1} max={64} step={1} onChange={setPaintSize} />}
            <div className="settings-row">
              <button className="btn-small" onClick={clearPaint}>Clear Paint</button>
            </div>
          </>}
        </div>);
      case 'PerlinNoise': return (
        <div className="settings-panel"><h3>Perlin Noise</h3>
          <div className="settings-row"><label>Preset</label><select defaultValue="" onChange={e => { if (e.target.value) applyPnPreset(e.target.value); e.target.value = ''; }}><option value="">— Select —</option><option value="marble">Marble</option><option value="organic">Organic</option><option value="static">Static</option><option value="lava_flow">Lava Flow</option><option value="water">Water</option></select></div>
          <div className="settings-row"><label>Color</label><CS color={pnColor1} onChange={setPnColor1} /><CS color={pnColor2} onChange={setPnColor2} /></div>
          <div className="settings-row"><label><input type="checkbox" checked={pnUseGradient} onChange={e => setPnUseGradient(e.target.checked)} /> Multi-Color Gradient</label></div>
          {pnUseGradient && (
            <div className="gradient-stops">
              {pnColorStops.map((stop, i) => (
                <div key={i} className="settings-row">
                  <CS color={stop.color} onChange={c => { const s = [...pnColorStops]; s[i] = { ...s[i], color: c }; setPnColorStops(s); }} />
                  <SliderControl label={`Pos ${i + 1}`} value={stop.position} min={0} max={1} step={0.01} onChange={v => { const s = [...pnColorStops]; s[i] = { ...s[i], position: v }; setPnColorStops(s); }} />
                  {pnColorStops.length > 2 && <button className="btn-small" onClick={() => setPnColorStops(pnColorStops.filter((_, j) => j !== i))}>×</button>}
                </div>
              ))}
              <button className="btn-small" onClick={() => setPnColorStops([...pnColorStops, { position: 1, color: '#ffffff' }])}>+ Color Stop</button>
            </div>
          )}
          <div className="settings-row"><label>Type</label><select value={pnType} onChange={e => setPnType(e.target.value as typeof pnType)}><option value="PerlinNoise">Perlin</option><option value="FractalNoise">Fractal</option><option value="Turbulence">Turbulence</option></select></div>
          <SliderControl label="Octaves" value={pnOctaves} min={1} max={10} step={1} onChange={setPnOctaves} />
          <SliderControl label="Scale" value={pnScale} min={1} max={100} step={1} onChange={setPnScale} />
          <SliderControl label="Persistence" value={pnPersistence} min={0} max={1} step={0.01} onChange={setPnPersistence} />
          <SliderControl label="Seed" value={pnSeed} min={1} max={1000} step={1} onChange={setPnSeed} extra={<DiceBtn onClick={() => setPnSeed(Math.floor(Math.random() * 999) + 1)} />} />
        </div>);
      case 'Clouds': return (
        <div className="settings-panel"><h3>Clouds</h3>
          <div className="settings-row"><label>Preset</label><select defaultValue="" onChange={e => { if (e.target.value) applyClPreset(e.target.value); e.target.value = ''; }}><option value="">— Select —</option><option value="cumulus">Cumulus</option><option value="storm">Storm</option><option value="fog">Fog</option><option value="sunset">Sunset</option><option value="aurora">Aurora</option></select></div>
          <div className="settings-row"><label>Color</label><CS color={clColor1} onChange={setClColor1} /><CS color={clColor2} onChange={setClColor2} /></div>
          <SliderControl label="Scale" value={clScale} min={1} max={20} step={1} onChange={setClScale} />
          <SliderControl label="Detail" value={clDetail} min={0} max={1} step={0.01} onChange={setClDetail} />
          <SliderControl label="Percentage" value={clPercentage} min={0} max={1} step={0.01} onChange={setClPercentage} />
          <SliderControl label="Seed" value={clSeed} min={1} max={1000} step={1} onChange={setClSeed} extra={<DiceBtn onClick={() => setClSeed(Math.floor(Math.random() * 999) + 1)} />} />
        </div>);
      case 'Checker': return (
        <div className="settings-panel"><h3>Checker</h3>
          <div className="settings-row"><label>Preset</label><select defaultValue="" onChange={e => { if (e.target.value) applyCkPreset(e.target.value); e.target.value = ''; }}><option value="">— Select —</option><option value="chess">Chess</option><option value="retro">Retro</option><option value="kitchen_floor">Kitchen Floor</option><option value="gingham">Gingham</option></select></div>
          <div className="settings-row"><label>Color</label><CS color={ckColor1} onChange={setCkColor1} /><CS color={ckColor2} onChange={setCkColor2} /></div>
          <SliderControl label="Count X" value={ckX} min={1} max={50} step={1} onChange={setCkX} />
          <SliderControl label="Count Y" value={ckY} min={1} max={50} step={1} onChange={setCkY} />
          <SliderControl label="Percentage" value={ckPercentage} min={0} max={100} step={1} onChange={setCkPercentage} />
          {ckPercentage < 100 && <SliderControl label="Seed" value={ckSeed} min={1} max={1000} step={1} onChange={setCkSeed} extra={<DiceBtn onClick={() => setCkSeed(Math.floor(Math.random() * 999) + 1)} />} />}
          <SliderControl label="Shade Variation" value={ckShade} min={0} max={0.5} step={0.01} onChange={setCkShade} />
          <SliderControl label="Surface Texture" value={ckTexture} min={0} max={1} step={0.01} onChange={setCkTexture} />
        </div>);
      case 'Brick': return (
        <div className="settings-panel"><h3>Brick</h3>
          <div className="settings-row"><label>Preset</label><select defaultValue="" onChange={e => { if (e.target.value) applyBrPreset(e.target.value); e.target.value = ''; }}><option value="">— Select —</option><option value="red_brick">Red Brick</option><option value="sandstone">Sandstone</option><option value="cobblestone">Cobblestone</option><option value="white_brick">White Brick</option><option value="old_brick">Old Brick</option></select></div>
          <div className="settings-row"><label>Pattern</label><select value={brPattern} onChange={e => setBrPattern(e.target.value as BrickPattern)}><option value="straight">Straight</option><option value="block_wide">Block Wide</option><option value="block">Block</option><option value="circle">Circle</option><option value="edges">Edges</option></select></div>
          <div className="settings-row"><label>Shape</label><select value={brShape} onChange={e => setBrShape(e.target.value as 'rectangular' | 'square')}><option value="rectangular">Rectangular</option><option value="square">Square</option></select></div>
          <SliderControl label="Rows" value={brCount} min={1} max={30} step={1} onChange={setBrCount} />
          {brShape === 'rectangular' && <SliderControl label="Aspect Ratio" value={brAspect} min={1} max={5} step={0.1} onChange={setBrAspect} />}
          <div className="settings-row"><label>Color Mode</label><select value={brColorMode} onChange={e => setBrColorMode(e.target.value as BrickColorMode)}><option value="single">Single</option><option value="alternating">Alternating</option><option value="alternating_row">Alternating Row</option><option value="random">Random</option></select></div>
          <div className="settings-row"><label>Brick Color 1</label><CS color={brColor} onChange={setBrColor} /></div>
          {brColorMode !== 'single' && <div className="settings-row"><label>Brick Color 2</label><CS color={brColor2} onChange={setBrColor2} /></div>}
          <SliderControl label="Shade Variation" value={brShadeRange} min={0} max={0.5} step={0.01} onChange={setBrShadeRange} />
          <div className="settings-row"><label><input type="checkbox" checked={brGradientEnabled} onChange={e => setBrGradientEnabled(e.target.checked)} /> Edge Gradient</label><CS color={brGradientColor} onChange={setBrGradientColor} /></div>
          {brGradientEnabled && <SliderControl label="Gradient Size" value={brGradient} min={0} max={100} step={1} onChange={setBrGradient} />}
          <div className="settings-row"><label>Grout</label><CS color={brGroutColor} onChange={setBrGroutColor} /></div>
          <SliderControl label="Grout Size" value={brGrout} min={0} max={50} step={1} onChange={setBrGrout} />
          <SliderControl label="Surface Texture" value={brTexture} min={0} max={1} step={0.01} onChange={setBrTexture} />
          {brTexture > 0 && <>
            <SliderControl label="Texture Scale" value={brTextureScale} min={5} max={80} step={1} onChange={setBrTextureScale} />
            <SliderControl label="Texture Seed" value={brTextureSeed} min={1} max={1000} step={1} onChange={setBrTextureSeed} extra={<DiceBtn onClick={() => setBrTextureSeed(Math.floor(Math.random() * 999) + 1)} />} />
          </>}
        </div>);
      case 'Gradient': return (
        <div className="settings-panel"><h3>Gradient</h3>
          <div className="settings-row"><label>Preset</label><select defaultValue="" onChange={e => { if (e.target.value) applyGrPreset(e.target.value); e.target.value = ''; }}><option value="">— Select —</option><option value="sunset">Sunset</option><option value="ocean">Ocean</option><option value="fire">Fire</option><option value="neon">Neon</option><option value="earth">Earth</option></select></div>
          <div className="settings-row"><label>Type</label><select value={grType} onChange={e => setGrType(e.target.value as 'linear' | 'radial')}><option value="linear">Linear</option><option value="radial">Radial</option></select></div>
          {grColors.map((c, i) => (
            <div key={i} className="settings-row">
              <label>Stop {i + 1}</label><CS color={c.color} onChange={color => { const n = [...grColors]; n[i] = { ...n[i], color }; setGrColors(n); }} />
              <input type="number" className="slider-number" min={0} max={100} value={c.position} onChange={e => { const n = [...grColors]; n[i] = { ...n[i], position: parseFloat(e.target.value) }; setGrColors(n); }} />%
              {grColors.length > 2 && <button className="btn-small" onClick={() => setGrColors(grColors.filter((_, j) => j !== i))}>×</button>}
            </div>
          ))}
          <button className="btn-small" onClick={() => setGrColors([...grColors, { color: '#ffffff', position: 50 }])}>+ Add Stop</button>
        </div>);
      case 'Terrain': return (
        <div className="settings-panel"><h3>Terrain</h3>
          <div className="settings-row"><label>Preset</label><select defaultValue="" onChange={e => { if (e.target.value) applyTrPreset(e.target.value); e.target.value = ''; }}><option value="">— Select —</option><option value="mountains">Mountains</option><option value="islands">Islands</option><option value="desert">Desert</option><option value="plains">Plains</option><option value="alps">Alps</option></select></div>
          <SliderControl label="Scale" value={trScale} min={2} max={15} step={1} onChange={setTrScale} />
          <SliderControl label="Detail" value={trDetail} min={0.25} max={0.6} step={0.01} onChange={setTrDetail} />
          <SliderControl label="Mountains" value={trHeight} min={0} max={1} step={0.01} onChange={setTrHeight} />
          <SliderControl label="Seed" value={trSeed} min={1} max={1000} step={1} onChange={setTrSeed} extra={<DiceBtn onClick={() => setTrSeed(Math.floor(Math.random() * 999) + 1)} />} />
          <div className="settings-row"><label><input type="checkbox" checked={trShadow} onChange={e => setTrShadow(e.target.checked)} /> Shadow</label></div>
          {trShadow && <><SliderControl label="Shadow Strength" value={trShadowStrength} min={0} max={1} step={0.01} onChange={setTrShadowStrength} /><SliderControl label="Sun Height" value={trSunHeight} min={0} max={100} step={1} onChange={setTrSunHeight} /></>}
          <div className="settings-row"><label><input type="checkbox" checked={trColored} onChange={e => setTrColored(e.target.checked)} /> Colored</label></div>
        </div>);
      case 'Wood': return (
        <div className="settings-panel"><h3>Wood</h3>
          <div className="settings-row"><label>Preset</label><select defaultValue="" onChange={e => { if (e.target.value) applyWdPreset(e.target.value); e.target.value = ''; }}><option value="">— Select —</option><option value="oak">Oak</option><option value="pine">Pine</option><option value="cherry">Cherry</option><option value="walnut">Walnut</option><option value="maple">Maple</option><option value="ebony">Ebony</option></select></div>
          <div className="settings-row"><label>Mode</label><select value={wdRings ? 'rings' : 'grain'} onChange={e => setWdRings(e.target.value === 'rings')}><option value="grain">Linear Grain</option><option value="rings">Tree Rings</option></select></div>
          <div className="settings-row"><label>Color</label><CS color={wdColor1} onChange={setWdColor1} /><CS color={wdColor2} onChange={setWdColor2} /><CS color={wdColor3} onChange={setWdColor3} /></div>
          {!wdRings && <SliderControl label="Planks" value={wdPlanks} min={1} max={10} step={0.1} onChange={setWdPlanks} />}
          <SliderControl label="Grain Width" value={wdGrainWidth} min={0.2} max={5} step={0.1} onChange={setWdGrainWidth} />
          <SliderControl label="Gap Width" value={wdGapWidth} min={0.1} max={0.9} step={0.05} onChange={setWdGapWidth} />
          <SliderControl label={wdRings ? 'Ring Count' : 'X Scale'} value={wdXScale} min={1} max={10} step={0.1} onChange={setWdXScale} />
          <SliderControl label="Scale" value={wdScale} min={0.2} max={5} step={0.01} onChange={setWdScale} />
          <SliderControl label="Persistence" value={wdPersistence} min={0} max={1} step={0.01} onChange={setWdPersistence} />
          <SliderControl label="Seed" value={wdSeed} min={1} max={1000} step={1} onChange={setWdSeed} extra={<DiceBtn onClick={() => setWdSeed(Math.floor(Math.random() * 999) + 1)} />} />
        </div>);
      case 'Bark': return (
        <div className="settings-panel"><h3>Tree Bark</h3>
          <div className="settings-row"><label>Preset</label><select defaultValue="" onChange={e => { if (e.target.value) applyBkPreset(e.target.value); e.target.value = ''; }}><option value="">— Select —</option><option value="oak_bark">Oak</option><option value="birch">Birch</option><option value="pine_bark">Pine</option><option value="redwood">Redwood</option><option value="palm">Palm</option><option value="aspen">Aspen</option></select></div>
          <div className="settings-row"><label>Color</label><CS color={bkColor1} onChange={setBkColor1} /><CS color={bkColor2} onChange={setBkColor2} /><CS color={bkColor3} onChange={setBkColor3} /></div>
          <SliderControl label="Fissures" value={bkFissures} min={1} max={20} step={1} onChange={setBkFissures} />
          <SliderControl label="Roughness" value={bkRoughness} min={0} max={1} step={0.05} onChange={setBkRoughness} />
          <SliderControl label="Depth" value={bkDepth} min={0} max={1} step={0.05} onChange={setBkDepth} />
          <SliderControl label="Scale" value={bkScale} min={0.2} max={5} step={0.1} onChange={setBkScale} />
          <SliderControl label="Seed" value={bkSeed} min={1} max={1000} step={1} onChange={setBkSeed} extra={<DiceBtn onClick={() => setBkSeed(Math.floor(Math.random() * 999) + 1)} />} />
        </div>);
      case 'Tiles': return (
        <div className="settings-panel"><h3>Tiles</h3>
          <div className="settings-row"><label>Preset</label><select defaultValue="" onChange={e => { if (e.target.value) applyTlPreset(e.target.value); e.target.value = ''; }}><option value="">— Select —</option><option value="subway">Subway</option><option value="marble">Marble</option><option value="mosaic">Mosaic</option><option value="terracotta">Terracotta</option></select></div>
          <SliderControl label="Count X" value={tlX} min={1} max={50} step={1} onChange={setTlX} />
          <SliderControl label="Count Y" value={tlY} min={1} max={50} step={1} onChange={setTlY} />
          <div className="settings-row"><label>Color Mode</label><select value={tlColorMode} onChange={e => setTlColorMode(e.target.value as TileColorMode)}><option value="single">Single</option><option value="alternating">Alternating</option><option value="random">Random</option></select></div>
          <div className="settings-row"><label>Tile Color 1</label><CS color={tlColor} onChange={setTlColor} /></div>
          {tlColorMode !== 'single' && <div className="settings-row"><label>Tile Color 2</label><CS color={tlColor2} onChange={setTlColor2} /></div>}
          <SliderControl label="Shade Variation" value={tlShadeRange} min={0} max={0.5} step={0.01} onChange={setTlShadeRange} />
          <div className="settings-row"><label><input type="checkbox" checked={tlGradientEnabled} onChange={e => setTlGradientEnabled(e.target.checked)} /> Tile Gradient</label><CS color={tlGradientColor} onChange={setTlGradientColor} /></div>
          {tlGradientEnabled && <><SliderControl label="Gradient X" value={tlXGradient} min={0} max={500} step={1} onChange={setTlXGradient} /><SliderControl label="Gradient Y" value={tlYGradient} min={0} max={500} step={1} onChange={setTlYGradient} /></>}
          <div className="settings-row"><label>Grout</label><CS color={tlGroutColor} onChange={setTlGroutColor} /></div>
          <SliderControl label="Grout X" value={tlXGrout} min={1} max={100} step={1} onChange={setTlXGrout} />
          <SliderControl label="Grout Y" value={tlYGrout} min={1} max={100} step={1} onChange={setTlYGrout} />
          <div className="settings-row"><label><input type="checkbox" checked={tlGroutGradientEnabled} onChange={e => setTlGroutGradientEnabled(e.target.checked)} /> Grout Gradient</label><CS color={tlGroutGradientColor} onChange={setTlGroutGradientColor} /></div>
          <SliderControl label="Surface Texture" value={tlTexture} min={0} max={1} step={0.01} onChange={setTlTexture} />
          {(tlTexture > 0 || tlColorMode === 'random') && <SliderControl label="Seed" value={tlSeed} min={1} max={1000} step={1} onChange={setTlSeed} extra={<DiceBtn onClick={() => setTlSeed(Math.floor(Math.random() * 999) + 1)} />} />}
        </div>);
      case 'Textiles': return (
        <div className="settings-panel"><h3>Textiles</h3>
          <div className="settings-row"><label>Preset</label><select defaultValue="" onChange={e => { if (e.target.value) applyTxPreset(e.target.value); e.target.value = ''; }}><option value="">— Select —</option><option value="denim">Denim</option><option value="linen">Linen</option><option value="plaid">Plaid</option><option value="silk">Silk</option><option value="burlap">Burlap</option></select></div>
          <div className="settings-row"><label>Pattern</label>{([1, 2, 3, 4, 5] as TextilesPatternType[]).map(p => (<button key={p} className={`btn-small ${txPattern === p ? 'active' : ''}`} onClick={() => setTxPattern(p)}>{p}</button>))}</div>
          <div className="settings-row"><label>Color</label><CS color={txColor1} onChange={setTxColor1} /><CS color={txColor2} onChange={setTxColor2} /></div>
          <div className="settings-row"><label><input type="checkbox" checked={txDouble} onChange={e => setTxDouble(e.target.checked)} /> Double Size</label></div>
          <SliderControl label="Tightness" value={txTightness} min={0} max={1} step={0.01} onChange={setTxTightness} />
          <SliderControl label="Thickness" value={txThickness} min={1} max={7} step={1} onChange={setTxThickness} />
          <SliderControl label="Smoothness" value={txSmoothness} min={0} max={1} step={0.01} onChange={setTxSmoothness} />
          <SliderControl label="Shading" value={txShading} min={0} max={1} step={0.01} onChange={setTxShading} />
        </div>);
      case 'Voxel': return (
        <div className="settings-panel"><h3>Voxel / Pixel Art</h3>
          <div className="settings-row"><label>Resolution</label><select value={vxResolution} onChange={e => setVxResolution(parseInt(e.target.value))}><option value="8">8×8</option><option value="16">16×16</option><option value="32">32×32</option><option value="64">64×64</option><option value="128">128×128</option><option value="256">256×256</option><option value="512">512×512</option><option value="1024">1024×1024</option></select></div>
          <div className="settings-row"><label>Render Style</label><select value={vxRenderStyle} onChange={e => setVxRenderStyle(e.target.value as VoxelRenderStyle)}><option value="pixelated">Pixelated</option><option value="cartoon">Cartoon</option><option value="realistic">Realistic</option><option value="painterly">Painterly</option><option value="flat">Flat / Minimal</option></select></div>
          <div className="settings-row"><label>Base Material</label><select value={vxBaseType} onChange={e => setVxBaseType(e.target.value as VoxelBaseType)}><option value="stone">Stone</option><option value="deepslate">Deepslate</option><option value="dirt">Dirt</option><option value="sandstone">Sandstone</option><option value="netherrack">Netherrack</option><option value="rings">Tree Rings</option><option value="bark">Bark</option><option value="custom">Custom</option></select></div>
          {(vxBaseType === 'custom' || vxBaseType === 'rings' || vxBaseType === 'bark') && <div className="settings-row"><label>Base Colors</label><CS color={vxBaseColor1} onChange={setVxBaseColor1} /><CS color={vxBaseColor2} onChange={setVxBaseColor2} /><CS color={vxBaseColor3} onChange={setVxBaseColor3} /></div>}
          <SliderControl label="Grain" value={vxGrain} min={0} max={1} step={0.01} onChange={setVxGrain} />
          <div className="settings-row"><label>Grain Dir</label><select value={vxGrainDir} onChange={e => setVxGrainDir(e.target.value as typeof vxGrainDir)}><option value="none">None</option><option value="horizontal">Horizontal</option><option value="vertical">Vertical</option><option value="both">Both</option></select></div>
          <SliderControl label="Edge Shading" value={vxDepthShading} min={0} max={1} step={0.01} onChange={setVxDepthShading} />
          <SliderControl label="Outline" value={vxOutline} min={0} max={1} step={0.01} onChange={setVxOutline} />
          <SliderControl label="Palette Colors" value={vxPalette} min={3} max={32} step={1} onChange={setVxPalette} />
          <SliderControl label="Seed" value={vxSeed} min={1} max={1000} step={1} onChange={setVxSeed} extra={<DiceBtn onClick={() => setVxSeed(Math.floor(Math.random() * 999) + 1)} />} />

          <h4 style={{margin: '12px 0 6px'}}>Ore / Crystal Layers</h4>
          {vxOres.map((ore, i) => (
            <div key={i} className="ore-layer">
              <div className="settings-row">
                <input type="text" value={ore.name} className="ore-name" onChange={e => { const n = [...vxOres]; n[i] = { ...n[i], name: e.target.value }; setVxOres(n); }} />
                <CS color={ore.color} onChange={c => { const n = [...vxOres]; n[i] = { ...n[i], color: c }; setVxOres(n); }} />
                <CS color={ore.highlightColor} onChange={c => { const n = [...vxOres]; n[i] = { ...n[i], highlightColor: c }; setVxOres(n); }} />
                <button className="btn-small" onClick={() => setVxOres(vxOres.filter((_, j) => j !== i))}>×</button>
              </div>
              <div className="settings-row"><label>Style</label><select value={ore.style || 'flat'} onChange={e => { const n = [...vxOres]; n[i] = { ...n[i], style: e.target.value as OreStyle }; setVxOres(n); }}><option value="flat">Flat</option><option value="crystal">Crystal</option><option value="metal">Metal</option><option value="jewel">Jewel</option></select></div>
              <SliderControl label="Density" value={ore.density} min={0} max={15} step={0.5} onChange={v => { const n = [...vxOres]; n[i] = { ...n[i], density: v }; setVxOres(n); }} />
              <SliderControl label="Cluster" value={ore.clusterSize} min={1} max={5} step={1} onChange={v => { const n = [...vxOres]; n[i] = { ...n[i], clusterSize: v }; setVxOres(n); }} />
              <SliderControl label="Ore Size" value={ore.oreScale || 1} min={0.5} max={5} step={0.1} onChange={v => { const n = [...vxOres]; n[i] = { ...n[i], oreScale: v }; setVxOres(n); }} />
            </div>
          ))}
          <div className="settings-row ore-presets">
            <button className="btn-small" onClick={() => setVxOres([...vxOres, { color: '#4488dd', highlightColor: '#cceeff', density: 3, clusterSize: 2, name: 'Diamond', style: 'jewel', oreScale: 1 }])}>+ Diamond</button>
            <button className="btn-small" onClick={() => setVxOres([...vxOres, { color: '#d4af37', highlightColor: '#ffe066', density: 4, clusterSize: 2, name: 'Gold', style: 'metal', oreScale: 1.5 }])}>+ Gold</button>
            <button className="btn-small" onClick={() => setVxOres([...vxOres, { color: '#c83232', highlightColor: '#ff6666', density: 5, clusterSize: 2, name: 'Redstone', style: 'crystal', oreScale: 1 }])}>+ Redstone</button>
            <button className="btn-small" onClick={() => setVxOres([...vxOres, { color: '#55cc55', highlightColor: '#aaffaa', density: 2, clusterSize: 2, name: 'Emerald', style: 'jewel', oreScale: 1 }])}>+ Emerald</button>
            <button className="btn-small" onClick={() => setVxOres([...vxOres, { color: '#888899', highlightColor: '#ccccdd', density: 6, clusterSize: 2, name: 'Iron', style: 'metal', oreScale: 1.5 }])}>+ Iron</button>
            <button className="btn-small" onClick={() => setVxOres([...vxOres, { color: '#222222', highlightColor: '#444444', density: 4, clusterSize: 2, name: 'Coal', style: 'flat', oreScale: 1 }])}>+ Coal</button>
            <button className="btn-small" onClick={() => setVxOres([...vxOres, { color: '#6633aa', highlightColor: '#cc88ff', density: 3, clusterSize: 3, name: 'Amethyst', style: 'crystal', oreScale: 2 }])}>+ Amethyst</button>
            <button className="btn-small" onClick={() => setVxOres([...vxOres, { color: '#cc6633', highlightColor: '#ffaa66', density: 5, clusterSize: 2, name: 'Copper', style: 'metal', oreScale: 1.5 }])}>+ Copper</button>
          </div>
        </div>);
      case 'CartoonOre': return (
        <div className="settings-panel"><h3>Cartoon Ore</h3>
          <div className="settings-row"><label>Preset</label><select defaultValue="" onChange={e => { if (e.target.value) applyCoPreset(e.target.value); e.target.value = ''; }}><option value="">— Select —</option><option value="coal_stone">Coal &amp; Stone</option><option value="diamond_cave">Diamond Cave</option><option value="gold_vein">Gold Vein</option><option value="mixed_ore">Mixed Ore</option></select></div>
          <div className="settings-row"><label>Stone Colors</label><CS color={coBaseColor1} onChange={setCoBaseColor1} /><CS color={coBaseColor2} onChange={setCoBaseColor2} /><CS color={coBaseColor3} onChange={setCoBaseColor3} /></div>
          <div className="settings-row"><label><input type="checkbox" checked={coBgGradient} onChange={e => setCoBgGradient(e.target.checked)} /> Background Gradient</label></div>
          <SliderControl label="Background Noise" value={coBgNoise} min={0} max={1} step={0.01} onChange={setCoBgNoise} />
          <SliderControl label="Patch Size" value={coBgPatch} min={5} max={100} step={1} onChange={setCoBgPatch} />
          <SliderControl label="Outline" value={coOutline} min={0} max={5} step={0.5} onChange={setCoOutline} />
          <SliderControl label="Shadow" value={coShadow} min={0} max={1} step={0.05} onChange={setCoShadow} />
          <SliderControl label="Seed" value={coSeed} min={1} max={1000} step={1} onChange={setCoSeed} extra={<DiceBtn onClick={() => setCoSeed(Math.floor(Math.random() * 999) + 1)} />} />

          <h4 style={{margin: '12px 0 6px'}}>Ore Layers</h4>
          {coOres.map((ore, i) => (
            <div key={i} className="ore-layer">
              <div className="settings-row">
                <input type="text" value={ore.name} className="ore-name" onChange={e => { const n = [...coOres]; n[i] = { ...n[i], name: e.target.value }; setCoOres(n); }} />
                <CS color={ore.color} onChange={c => { const n = [...coOres]; n[i] = { ...n[i], color: c }; setCoOres(n); }} />
                <CS color={ore.highlightColor} onChange={c => { const n = [...coOres]; n[i] = { ...n[i], highlightColor: c }; setCoOres(n); }} />
                <button className="btn-small" onClick={() => setCoOres(coOres.filter((_, j) => j !== i))}>×</button>
              </div>
              <div className="settings-row"><label>Shape</label><select value={ore.shape} onChange={e => { const n = [...coOres]; n[i] = { ...n[i], shape: e.target.value as CartoonOreShape }; setCoOres(n); }}><option value="triangle">Triangle</option><option value="square">Square</option><option value="diamond">Diamond</option><option value="pentagon">Pentagon</option><option value="hexagon">Hexagon</option><option value="octagon">Octagon</option><option value="round">Round</option><option value="flower">Flower</option><option value="mixed">Mixed</option></select></div>
              <div className="settings-row"><label><input type="checkbox" checked={ore.useGradient !== false} onChange={e => { const n = [...coOres]; n[i] = { ...n[i], useGradient: e.target.checked }; setCoOres(n); }} /> Gradient Fill</label></div>
              <SliderControl label="Count" value={ore.count} min={1} max={30} step={1} onChange={v => { const n = [...coOres]; n[i] = { ...n[i], count: v }; setCoOres(n); }} />
              <SliderControl label="Min Size" value={ore.minSize} min={5} max={60} step={1} onChange={v => { const n = [...coOres]; n[i] = { ...n[i], minSize: v }; setCoOres(n); }} />
              <SliderControl label="Max Size" value={ore.maxSize} min={10} max={100} step={1} onChange={v => { const n = [...coOres]; n[i] = { ...n[i], maxSize: v }; setCoOres(n); }} />
            </div>
          ))}
          <div className="settings-row ore-presets">
            <button className="btn-small" onClick={() => setCoOres([...coOres, { color: '#3a3a44', highlightColor: '#5a5a66', shape: 'diamond', count: 8, minSize: 12, maxSize: 30, name: 'Coal', useGradient: true }])}>+ Coal</button>
            <button className="btn-small" onClick={() => setCoOres([...coOres, { color: '#cc8844', highlightColor: '#eebb66', shape: 'square', count: 6, minSize: 15, maxSize: 35, name: 'Iron', useGradient: true }])}>+ Iron</button>
            <button className="btn-small" onClick={() => setCoOres([...coOres, { color: '#66bbee', highlightColor: '#aaddff', shape: 'pentagon', count: 5, minSize: 14, maxSize: 32, name: 'Diamond', useGradient: true }])}>+ Diamond</button>
            <button className="btn-small" onClick={() => setCoOres([...coOres, { color: '#d4af37', highlightColor: '#ffe066', shape: 'hexagon', count: 5, minSize: 14, maxSize: 30, name: 'Gold', useGradient: true }])}>+ Gold</button>
            <button className="btn-small" onClick={() => setCoOres([...coOres, { color: '#55cc55', highlightColor: '#aaffaa', shape: 'round', count: 4, minSize: 12, maxSize: 28, name: 'Emerald', useGradient: true }])}>+ Emerald</button>
            <button className="btn-small" onClick={() => setCoOres([...coOres, { color: '#cc3333', highlightColor: '#ff6666', shape: 'flower', count: 6, minSize: 10, maxSize: 24, name: 'Ruby', useGradient: true }])}>+ Ruby</button>
          </div>
        </div>);
      case 'Hexagon': return (
        <div className="settings-panel"><h3>Hexagon</h3>
          <div className="settings-row"><label>Preset</label><select defaultValue="" onChange={e => { if (e.target.value) applyHxPreset(e.target.value); e.target.value = ''; }}><option value="">— Select —</option><option value="honeycomb">Honeycomb</option><option value="bathroom">Bathroom</option><option value="slate">Slate</option><option value="pastel">Pastel</option></select></div>
          <div className="settings-row"><label>Tile Colors</label><CS color={hxColor1} onChange={setHxColor1} /><CS color={hxColor2} onChange={setHxColor2} /></div>
          <div className="settings-row"><label>Grout</label><CS color={hxGrout} onChange={setHxGrout} /></div>
          <SliderControl label="Columns" value={hxColumns} min={2} max={20} step={1} onChange={setHxColumns} />
          <SliderControl label="Grout Size" value={hxGroutSize} min={0} max={20} step={1} onChange={setHxGroutSize} />
          <SliderControl label="Shade Variation" value={hxShade} min={0} max={0.4} step={0.01} onChange={setHxShade} />
          <div className="settings-row"><label><input type="checkbox" checked={hxGradient} onChange={e => setHxGradient(e.target.checked)} /> Gradient Fill</label></div>
          <SliderControl label="Seed" value={hxSeed} min={1} max={1000} step={1} onChange={setHxSeed} extra={<DiceBtn onClick={() => setHxSeed(Math.floor(Math.random() * 999) + 1)} />} />
        </div>);
      case 'Octagon': return (
        <div className="settings-panel"><h3>Octagon + Square</h3>
          <div className="settings-row"><label>Preset</label><select defaultValue="" onChange={e => { if (e.target.value) applyOcPreset(e.target.value); e.target.value = ''; }}><option value="">— Select —</option><option value="classic">Classic</option><option value="terracotta">Terracotta</option><option value="marble">Marble</option><option value="retro">Retro</option></select></div>
          <div className="settings-row"><label>Octagon Color</label><CS color={ocColor1} onChange={setOcColor1} /></div>
          <div className="settings-row"><label>Square Color</label><CS color={ocColor2} onChange={setOcColor2} /></div>
          <div className="settings-row"><label>Grout</label><CS color={ocGrout} onChange={setOcGrout} /></div>
          <SliderControl label="Columns" value={ocColumns} min={2} max={15} step={1} onChange={setOcColumns} />
          <SliderControl label="Grout Size" value={ocGroutSize} min={0} max={20} step={1} onChange={setOcGroutSize} />
          <SliderControl label="Shade Variation" value={ocShade} min={0} max={0.4} step={0.01} onChange={setOcShade} />
          <div className="settings-row"><label><input type="checkbox" checked={ocGradient} onChange={e => setOcGradient(e.target.checked)} /> Gradient Fill</label></div>
          <SliderControl label="Seed" value={ocSeed} min={1} max={1000} step={1} onChange={setOcSeed} extra={<DiceBtn onClick={() => setOcSeed(Math.floor(Math.random() * 999) + 1)} />} />
        </div>);
      case 'StoneWall': return (
        <div className="settings-panel"><h3>Stone Wall</h3>
          <div className="settings-row"><label>Preset</label><select defaultValue="" onChange={e => { if (e.target.value) applySwPreset(e.target.value); e.target.value = ''; }}><option value="">— Select —</option><option value="fieldstone">Fieldstone</option><option value="rough">Rough Stone</option><option value="mossy">Mossy Stone</option><option value="cobble">Cobblestone</option><option value="slate_stone">Slate Stone</option><option value="sandstone_wall">Sandstone Wall</option></select></div>
          <div className="settings-row"><label>Stone Colors</label><CS color={swColor1} onChange={setSwColor1} /><CS color={swColor2} onChange={setSwColor2} /></div>
          <div className="settings-row"><label>Mortar</label><CS color={swMortar} onChange={setSwMortar} /></div>
          <SliderControl label="Columns" value={swColumns} min={2} max={16} step={1} onChange={setSwColumns} />
          <SliderControl label="Rows" value={swRows} min={2} max={16} step={1} onChange={setSwRows} />
          <SliderControl label="Mortar Width" value={swMortarWidth} min={0.5} max={10} step={0.5} onChange={setSwMortarWidth} />
          <SliderControl label="Stone Irregularity" value={swJitter} min={0} max={1} step={0.05} onChange={setSwJitter} />
          <SliderControl label="Shading / Bevel" value={swShading} min={0} max={1.5} step={0.05} onChange={setSwShading} />
          <SliderControl label="Surface Roughness" value={swTextureNoise} min={0} max={1} step={0.05} onChange={setSwTextureNoise} />
          <SliderControl label="Seed" value={swSeed} min={1} max={1000} step={1} onChange={setSwSeed} extra={<DiceBtn onClick={() => setSwSeed(Math.floor(Math.random() * 999) + 1)} />} />
        </div>);
    }
  };

  return (
    <div className="page-layout">
      <div className="preview-column">
        <canvas ref={canvasRef} width={size} height={size} className="texture-canvas"
          style={{ cursor: paintMode ? (paintTool === 'fill' ? 'crosshair' : 'cell') : 'default' }}
          onMouseDown={handlePaintDown} onMouseMove={handlePaintMove} onMouseUp={handlePaintUp} onMouseLeave={handlePaintUp} />
        <canvas ref={paintCanvasRef} width={size} height={size} style={{ display: 'none' }} />
        <canvas ref={baseCanvasRef} width={size} height={size} style={{ display: 'none' }} />
        <div className="download-bar">
          <select value={size} onChange={e => setSize(parseInt(e.target.value))}>
            <option value="256">256×256</option><option value="512">512×512</option><option value="1024">1024×1024</option><option value="2048">2048×2048</option>
          </select>
          <select defaultValue="png" id="texgen-filetype"><option value="png">PNG</option><option value="jpg">JPG</option></select>
          <button className="btn-primary" onClick={() => {
            const ft = (document.getElementById('texgen-filetype') as HTMLSelectElement).value as 'png' | 'jpg';
            if (canvasRef.current) downloadCanvas(canvasRef.current, 'texture', ft);
          }}>Download</button>
        </div>
        {!hideMapPanel && <div className="download-bar" style={{ marginTop: 4 }}>
          <span style={{ fontSize: '0.85em', opacity: 0.7 }}>Send to Voxel Block:</span>
          {(['top', 'side', 'bottom'] as const).map(face => (
            <button key={face} className="btn-small" onClick={() => {
              if (canvasRef.current) setFaceImage(face, canvasRef.current.toDataURL('image/png'));
            }}>{face.charAt(0).toUpperCase() + face.slice(1)}</button>
          ))}
        </div>}
        {!hideMapPanel && canvasReady > 0 && <MapPanel sourceCanvas={canvasRef.current} filePrefix={activeType.toLowerCase()} version={canvasReady} />}
      </div>
      <div className="controls-column">
        <div className="type-selector">{TEXTURE_TYPES.map(t => (
          <button key={t.id} className={`type-btn ${activeType === t.id ? 'active' : ''}`} onClick={() => setActiveType(t.id)}>{t.label}</button>
        ))}</div>
        {renderSettings()}
        <SliderControl label="Rotation" value={rotation} min={0} max={360} step={1} onChange={setRotation} />
        {activeType !== 'Voxel' && (
          <div className="settings-panel" style={{ marginTop: 12 }}>
            <div className="settings-row">
              <label><input type="checkbox" checked={pixelate} onChange={e => setPixelate(e.target.checked)} /> Pixelate</label>
            </div>
            {pixelate && <>
              <div className="settings-row"><label>Pixel Resolution</label><select value={pixelRes} onChange={e => setPixelRes(parseInt(e.target.value))}><option value="8">8×8</option><option value="16">16×16</option><option value="32">32×32</option><option value="64">64×64</option><option value="128">128×128</option><option value="256">256×256</option></select></div>
              <SliderControl label="Color Quantize" value={pixelPalette} min={0} max={32} step={1} onChange={setPixelPalette} />
              <div className="settings-row" style={{ fontSize: 11, color: '#888' }}>{pixelPalette === 0 ? 'No color reduction' : `${pixelPalette} color levels per channel`}</div>
            </>}
          </div>
        )}
      </div>
    </div>
  );
}
