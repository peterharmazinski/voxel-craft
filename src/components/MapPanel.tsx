import { useCallback, useEffect, useRef, useState } from 'react';
import SliderControl from './SliderControl';
import { downloadCanvas } from '../utils/helpers';
import {
  generateNormalMap,
  generateDisplacementMap,
  generateAOMap,
  generateSpecularMap,
  DEFAULT_NORMAL,
  DEFAULT_DISPLACEMENT,
  DEFAULT_AO,
  DEFAULT_SPECULAR,
  type NormalMapSettings,
  type DisplacementSettings,
  type AOSettings,
  type SpecularSettings,
} from '../utils/normalMapProcessor';

type MapType = 'normal' | 'displacement' | 'ao' | 'specular';

interface MapPanelProps {
  sourceCanvas: HTMLCanvasElement | null;
  filePrefix?: string;
  version?: number;
  onNormalSettingsChange?: (settings: NormalMapSettings) => void;
}

function renderLitPreview(
  outCanvas: HTMLCanvasElement,
  diffuseCanvas: HTMLCanvasElement,
  normalCanvas: HTMLCanvasElement,
  specCanvas: HTMLCanvasElement | null,
  aoCanvas: HTMLCanvasElement | null,
  lightX: number,
  lightY: number,
  lightZ: number,
  ambientStrength: number,
  specPower: number,
) {
  const w = diffuseCanvas.width;
  const h = diffuseCanvas.height;
  outCanvas.width = w;
  outCanvas.height = h;
  const ctx = outCanvas.getContext('2d')!;

  const diffCtx = diffuseCanvas.getContext('2d')!;
  const normCtx = normalCanvas.getContext('2d')!;
  const diffData = diffCtx.getImageData(0, 0, w, h).data;
  const normData = normCtx.getImageData(0, 0, w, h).data;

  let specData: Uint8ClampedArray | null = null;
  if (specCanvas && specCanvas.width > 0) {
    specData = specCanvas.getContext('2d')!.getImageData(0, 0, w, h).data;
  }
  let aoData: Uint8ClampedArray | null = null;
  if (aoCanvas && aoCanvas.width > 0) {
    aoData = aoCanvas.getContext('2d')!.getImageData(0, 0, w, h).data;
  }

  const outImg = ctx.createImageData(w, h);
  const out = outImg.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;

      const nx = (normData[i] / 255) * 2 - 1;
      const ny = (normData[i + 1] / 255) * 2 - 1;
      const nz = normData[i + 2] / 255;

      let lx = lightX - x / w;
      let ly = lightY - y / h;
      const lz = lightZ;
      const lLen = Math.sqrt(lx * lx + ly * ly + lz * lz);
      lx /= lLen; ly /= lLen;
      const lzn = lz / lLen;

      const diffuse = Math.max(0, nx * lx + ny * ly + nz * lzn);

      let spec = 0;
      if (specPower > 0) {
        const hx = lx;
        const hy = ly;
        const hz = lzn + 1;
        const hLen = Math.sqrt(hx * hx + hy * hy + hz * hz);
        const dot = Math.max(0, (nx * hx + ny * hy + nz * hz) / hLen);
        spec = Math.pow(dot, specPower) * 0.6;
        if (specData) spec *= specData[i] / 255;
      }

      let ao = 1;
      if (aoData) ao = aoData[i] / 255;

      const light = (ambientStrength + (1 - ambientStrength) * diffuse) * ao;

      out[i]     = Math.min(255, diffData[i] * light + spec * 255);
      out[i + 1] = Math.min(255, diffData[i + 1] * light + spec * 255);
      out[i + 2] = Math.min(255, diffData[i + 2] * light + spec * 255);
      out[i + 3] = 255;
    }
  }

  ctx.putImageData(outImg, 0, 0);
}

export default function MapPanel({ sourceCanvas, filePrefix = 'texture', version = 0, onNormalSettingsChange }: MapPanelProps) {
  const normalRef = useRef<HTMLCanvasElement>(null);
  const dispRef = useRef<HTMLCanvasElement>(null);
  const aoRef = useRef<HTMLCanvasElement>(null);
  const specRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [enabled, setEnabled] = useState(false);
  const [activeMap, setActiveMap] = useState<MapType>('normal');
  const [normalSettings, setNormalSettings] = useState<NormalMapSettings>({ ...DEFAULT_NORMAL });
  const [dispSettings, setDispSettings] = useState<DisplacementSettings>({ ...DEFAULT_DISPLACEMENT });
  const [aoSettings, setAoSettings] = useState<AOSettings>({ ...DEFAULT_AO });
  const [specSettings, setSpecSettings] = useState<SpecularSettings>({ ...DEFAULT_SPECULAR });

  const [showPreview, setShowPreview] = useState(true);
  const [lightX, setLightX] = useState(0.7);
  const [lightY, setLightY] = useState(0.3);
  const [lightZ, setLightZ] = useState(0.8);
  const [ambient, setAmbient] = useState(0.2);
  const [specPower, setSpecPower] = useState(16);
  const [dragging, setDragging] = useState(false);

  const [customHeight, setCustomHeight] = useState<HTMLCanvasElement | null>(null);
  const [customHeightName, setCustomHeightName] = useState<string>('');

  const heightSource = customHeight ?? sourceCanvas;

  useEffect(() => {
    if (onNormalSettingsChange) onNormalSettingsChange(normalSettings);
  }, [normalSettings, onNormalSettingsChange]);

  const handleHeightUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext('2d')!.drawImage(img, 0, 0);
        setCustomHeight(c);
        setCustomHeightName(file.name);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  const generate = useCallback(() => {
    if (!enabled || !heightSource || heightSource.width === 0) return;
    if (normalRef.current) generateNormalMap(heightSource, normalRef.current, normalSettings);
    if (dispRef.current) generateDisplacementMap(heightSource, dispRef.current, dispSettings);
    if (aoRef.current) generateAOMap(heightSource, aoRef.current, aoSettings);
    if (specRef.current) generateSpecularMap(heightSource, specRef.current, specSettings);
  }, [enabled, heightSource, normalSettings, dispSettings, aoSettings, specSettings, version]);

  useEffect(() => { generate(); }, [generate]);

  const updatePreview = useCallback(() => {
    if (!showPreview || !enabled || !sourceCanvas || !normalRef.current || !previewRef.current) return;
    if (normalRef.current.width === 0) return;
    renderLitPreview(
      previewRef.current, sourceCanvas, normalRef.current,
      specRef.current, aoRef.current,
      lightX, lightY, lightZ, ambient, specPower,
    );
  }, [showPreview, enabled, sourceCanvas, lightX, lightY, lightZ, ambient, specPower, version, normalSettings, dispSettings, aoSettings, specSettings]);

  useEffect(() => { updatePreview(); }, [updatePreview]);

  const handlePreviewMouse = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging && e.type !== 'mousedown') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setLightX(x);
    setLightY(y);
  }, [dragging]);

  const activeCanvas = activeMap === 'normal' ? normalRef :
                       activeMap === 'displacement' ? dispRef :
                       activeMap === 'ao' ? aoRef : specRef;

  if (!enabled) {
    return (
      <div className="map-panel-toggle">
        <button className="btn-primary" onClick={() => setEnabled(true)}>Generate Maps (Normal, Displacement, AO, Specular)</button>
      </div>
    );
  }

  return (
    <div className="map-panel">
      <div className="map-panel-header">
        <h3>Material Maps</h3>
        <button className="btn-small" onClick={() => setEnabled(false)}>Hide</button>
      </div>

      <div className="settings-row" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleHeightUpload(f); e.target.value = ''; }}
        />
        <button className="btn-small" onClick={() => fileInputRef.current?.click()} title="Use a custom image as the height map source">
          {customHeight ? 'Replace height map…' : 'Upload custom height map…'}
        </button>
        {customHeight && (
          <>
            <span style={{ fontSize: '0.7rem', opacity: 0.7, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {customHeightName}
            </span>
            <button className="btn-small" onClick={() => { setCustomHeight(null); setCustomHeightName(''); }} title="Use the active face texture as the height map">
              Use face texture
            </button>
          </>
        )}
      </div>

      {showPreview && (
        <div className="lit-preview-section">
          <div className="lit-preview-header">
            <span>Lit Preview <em>(drag to move light)</em></span>
            <button className="btn-small" onClick={() => setShowPreview(false)}>Hide</button>
          </div>
          <canvas
            ref={previewRef}
            className="lit-preview-canvas"
            onMouseDown={(e) => { setDragging(true); handlePreviewMouse(e); }}
            onMouseMove={handlePreviewMouse}
            onMouseUp={() => setDragging(false)}
            onMouseLeave={() => setDragging(false)}
          />
          <div className="lit-preview-controls">
            <SliderControl label="Light Height" value={lightZ} min={0.1} max={2} step={0.05} onChange={setLightZ} />
            <SliderControl label="Ambient" value={ambient} min={0} max={1} step={0.05} onChange={setAmbient} />
            <SliderControl label="Specular Power" value={specPower} min={0} max={64} step={1} onChange={setSpecPower} />
          </div>
        </div>
      )}
      {!showPreview && (
        <div className="settings-row" style={{ marginBottom: 8 }}>
          <button className="btn-small" onClick={() => setShowPreview(true)}>Show Lit Preview</button>
        </div>
      )}

      <div className="map-tabs-row">
        {(['normal', 'displacement', 'ao', 'specular'] as MapType[]).map(t => (
          <button key={t} className={`type-btn ${activeMap === t ? 'active' : ''}`} onClick={() => setActiveMap(t)}>
            {t === 'normal' ? 'Normal' : t === 'displacement' ? 'Displace' : t === 'ao' ? 'AO' : 'Specular'}
          </button>
        ))}
      </div>

      <div className="map-preview-row">
        <canvas ref={normalRef} className={`map-thumb ${activeMap === 'normal' ? 'active' : ''}`} />
        <canvas ref={dispRef} className={`map-thumb ${activeMap === 'displacement' ? 'active' : ''}`} />
        <canvas ref={aoRef} className={`map-thumb ${activeMap === 'ao' ? 'active' : ''}`} />
        <canvas ref={specRef} className={`map-thumb ${activeMap === 'specular' ? 'active' : ''}`} />
      </div>

      {activeMap === 'normal' && (
        <div className="map-settings">
          <div className="settings-row">
            <label>Preset</label>
            <select defaultValue="" onChange={e => {
              if (!e.target.value) return;
              const presets: Record<string, NormalMapSettings> = {
                subtle: { strength: 1.0, level: 7, blurSharp: 2, filterType: 'sobel', invertR: false, invertG: false, invertHeight: false, zRange: true },
                default: { ...DEFAULT_NORMAL },
                strong: { strength: 4.0, level: 7, blurSharp: 0, filterType: 'sobel', invertR: false, invertG: false, invertHeight: false, zRange: true },
                extreme: { strength: 5.0, level: 8, blurSharp: -4, filterType: 'scharr', invertR: false, invertG: false, invertHeight: false, zRange: true },
                smooth: { strength: 2.0, level: 6, blurSharp: 8, filterType: 'sobel', invertR: false, invertG: false, invertHeight: false, zRange: true },
                sharp: { strength: 3.0, level: 8, blurSharp: -12, filterType: 'scharr', invertR: false, invertG: false, invertHeight: false, zRange: true },
                inverted: { strength: 2.5, level: 7, blurSharp: 0, filterType: 'sobel', invertR: false, invertG: false, invertHeight: true, zRange: true },
                brick_tile: { strength: 3.5, level: 9, blurSharp: -2, filterType: 'scharr', invertR: false, invertG: false, invertHeight: false, zRange: true },
                organic: { strength: 1.8, level: 6, blurSharp: 4, filterType: 'sobel', invertR: false, invertG: false, invertHeight: false, zRange: true },
                metal: { strength: 0.8, level: 5, blurSharp: 6, filterType: 'sobel', invertR: false, invertG: false, invertHeight: false, zRange: true },
              };
              if (presets[e.target.value]) setNormalSettings(presets[e.target.value]);
              e.target.value = '';
            }}>
              <option value="" disabled>Choose…</option>
              <option value="subtle">Subtle</option>
              <option value="default">Default</option>
              <option value="strong">Strong</option>
              <option value="extreme">Extreme</option>
              <option value="smooth">Smooth</option>
              <option value="sharp">Sharp / Crisp</option>
              <option value="inverted">Inverted Depth</option>
              <option value="brick_tile">Brick / Tile</option>
              <option value="organic">Organic / Soft</option>
              <option value="metal">Metal / Flat</option>
            </select>
          </div>
          <SliderControl label="Strength" value={normalSettings.strength} min={0.01} max={5} step={0.01} onChange={v => setNormalSettings(s => ({ ...s, strength: v }))} />
          <SliderControl label="Level" value={normalSettings.level} min={4} max={10} step={0.1} onChange={v => setNormalSettings(s => ({ ...s, level: v }))} />
          <SliderControl label="Blur/Sharp" value={normalSettings.blurSharp} min={-32} max={32} step={1} onChange={v => setNormalSettings(s => ({ ...s, blurSharp: v }))} />
          <div className="settings-row">
            <label>Filter</label>
            <select value={normalSettings.filterType} onChange={e => setNormalSettings(s => ({ ...s, filterType: e.target.value as 'sobel' | 'scharr' }))}>
              <option value="sobel">Sobel</option><option value="scharr">Scharr</option>
            </select>
          </div>
          <div className="settings-row">
            <label>Invert</label>
            <label className="check-label"><input type="checkbox" checked={normalSettings.invertR} onChange={e => setNormalSettings(s => ({ ...s, invertR: e.target.checked }))} /> R</label>
            <label className="check-label"><input type="checkbox" checked={normalSettings.invertG} onChange={e => setNormalSettings(s => ({ ...s, invertG: e.target.checked }))} /> G</label>
            <label className="check-label"><input type="checkbox" checked={normalSettings.invertHeight} onChange={e => setNormalSettings(s => ({ ...s, invertHeight: e.target.checked }))} /> H</label>
          </div>
          <div className="settings-row">
            <label className="check-label" title="Remap Z so that maximum tilt darkens fully (matches the standalone Normal Map page behaviour)">
              <input type="checkbox" checked={normalSettings.zRange} onChange={e => setNormalSettings(s => ({ ...s, zRange: e.target.checked }))} /> Z Range
            </label>
          </div>
        </div>
      )}

      {activeMap === 'displacement' && (
        <div className="map-settings">
          <SliderControl label="Contrast" value={dispSettings.contrast} min={-1} max={1} step={0.01} onChange={v => setDispSettings(s => ({ ...s, contrast: v }))} />
          <SliderControl label="Blur/Sharp" value={dispSettings.blurSharp} min={-32} max={32} step={1} onChange={v => setDispSettings(s => ({ ...s, blurSharp: v }))} />
          <div className="settings-row">
            <label><input type="checkbox" checked={dispSettings.invert} onChange={e => setDispSettings(s => ({ ...s, invert: e.target.checked }))} /> Invert</label>
          </div>
        </div>
      )}

      {activeMap === 'ao' && (
        <div className="map-settings">
          <SliderControl label="Strength" value={aoSettings.strength} min={0} max={1} step={0.01} onChange={v => setAoSettings(s => ({ ...s, strength: v }))} />
          <SliderControl label="Mean" value={aoSettings.mean} min={0} max={1} step={0.01} onChange={v => setAoSettings(s => ({ ...s, mean: v }))} />
          <SliderControl label="Range" value={aoSettings.range} min={0} max={1} step={0.01} onChange={v => setAoSettings(s => ({ ...s, range: v }))} />
          <SliderControl label="Blur/Sharp" value={aoSettings.blurSharp} min={-32} max={32} step={1} onChange={v => setAoSettings(s => ({ ...s, blurSharp: v }))} />
          <div className="settings-row">
            <label><input type="checkbox" checked={aoSettings.invert} onChange={e => setAoSettings(s => ({ ...s, invert: e.target.checked }))} /> Invert</label>
          </div>
        </div>
      )}

      {activeMap === 'specular' && (
        <div className="map-settings">
          <SliderControl label="Strength" value={specSettings.strength} min={0} max={1} step={0.01} onChange={v => setSpecSettings(s => ({ ...s, strength: v }))} />
          <SliderControl label="Mean" value={specSettings.mean} min={0} max={1} step={0.01} onChange={v => setSpecSettings(s => ({ ...s, mean: v }))} />
          <SliderControl label="Range" value={specSettings.range} min={0} max={1} step={0.01} onChange={v => setSpecSettings(s => ({ ...s, range: v }))} />
          <div className="settings-row">
            <label>Falloff</label>
            <select value={specSettings.falloff} onChange={e => setSpecSettings(s => ({ ...s, falloff: e.target.value as SpecularSettings['falloff'] }))}>
              <option value="no">None</option><option value="linear">Linear</option><option value="square">Square</option>
            </select>
          </div>
        </div>
      )}

      <div className="map-download-row">
        <button className="btn-primary" onClick={() => { const c = activeCanvas.current; if (c) downloadCanvas(c, `${filePrefix}_${activeMap}`, 'png'); }}>
          Download {activeMap === 'normal' ? 'Normal' : activeMap === 'displacement' ? 'Displacement' : activeMap === 'ao' ? 'AO' : 'Specular'}
        </button>
        <button className="btn-primary" onClick={() => {
          if (normalRef.current) downloadCanvas(normalRef.current, `${filePrefix}_normal`, 'png');
          if (dispRef.current) downloadCanvas(dispRef.current, `${filePrefix}_displacement`, 'png');
          if (aoRef.current) downloadCanvas(aoRef.current, `${filePrefix}_ao`, 'png');
          if (specRef.current) downloadCanvas(specRef.current, `${filePrefix}_specular`, 'png');
        }}>Download All Maps</button>
      </div>
    </div>
  );
}
