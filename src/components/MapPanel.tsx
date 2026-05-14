import { useCallback, useEffect, useRef, useState } from 'react';
import SliderControl from './SliderControl';
import { downloadCanvas } from '../utils/helpers';
import {
  generateNormalMap,
  generateNormalMapFromHeightBuffer,
  generateDisplacementMap,
  generateAOMap,
  generateSpecularMap,
  generateMetallicMap,
  generateRoughnessMap,
  NORMAL_PRESETS,
  NORMAL_PRESET_LABELS,
  DEFAULT_NORMAL,
  DEFAULT_DISPLACEMENT,
  DEFAULT_AO,
  DEFAULT_SPECULAR,
  DEFAULT_METALLIC,
  DEFAULT_ROUGHNESS,
  type NormalMapSettings,
  type DisplacementSettings,
  type AOSettings,
  type SpecularSettings,
  type MetallicSettings,
  type RoughnessSettings,
} from '../utils/normalMapProcessor';
import { computeHeightBuffer, type FaceTextureConfig } from '../utils/renderTexture';

type MapType = 'normal' | 'displacement' | 'ao' | 'specular' | 'metallic' | 'roughness';

interface MapPanelProps {
  sourceCanvas: HTMLCanvasElement | null;
  filePrefix?: string;
  version?: number;
  /**
   * Controlled normal map settings — owned by the parent so the center-column
   * preset picker stays in sync. When omitted, MapPanel manages its own state.
   */
  normalSettings?: NormalMapSettings;
  onNormalSettingsChange?: (settings: NormalMapSettings, presetKey?: string) => void;
  normalPresetKey?: string;
  /** If false, the "Generate Maps" button is shown disabled with a hint instead. Defaults to true (assume source is ready). */
  hasSource?: boolean;
  /** When provided, generator-derived height data is used for normal maps instead of a lossy color→grayscale conversion. */
  faceConfig?: FaceTextureConfig | null;
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

export default function MapPanel({ sourceCanvas, filePrefix = 'texture', version = 0, normalSettings: controlledNormalSettings, onNormalSettingsChange, normalPresetKey = '', hasSource = true, faceConfig }: MapPanelProps) {
  const normalRef = useRef<HTMLCanvasElement>(null);
  const dispRef = useRef<HTMLCanvasElement>(null);
  const aoRef = useRef<HTMLCanvasElement>(null);
  const specRef = useRef<HTMLCanvasElement>(null);
  const metallicRef = useRef<HTMLCanvasElement>(null);
  const roughnessRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [enabled, setEnabled] = useState(false);
  const [activeMap, setActiveMap] = useState<MapType>('normal');
  // Internal normal settings used when the parent does not control them.
  const [internalNormalSettings, setInternalNormalSettings] = useState<NormalMapSettings>({ ...DEFAULT_NORMAL });
  const normalSettings = controlledNormalSettings ?? internalNormalSettings;
  const handleNormalSettingsChange = (s: NormalMapSettings, presetKey?: string) => {
    if (!controlledNormalSettings) setInternalNormalSettings(s);
    onNormalSettingsChange?.(s, presetKey ?? '');
  };
  const [dispSettings, setDispSettings] = useState<DisplacementSettings>({ ...DEFAULT_DISPLACEMENT });
  const [aoSettings, setAoSettings] = useState<AOSettings>({ ...DEFAULT_AO });
  const [specSettings, setSpecSettings] = useState<SpecularSettings>({ ...DEFAULT_SPECULAR });
  const [metallicSettings, setMetallicSettings] = useState<MetallicSettings>({ ...DEFAULT_METALLIC });
  const [roughnessSettings, setRoughnessSettings] = useState<RoughnessSettings>({ ...DEFAULT_ROUGHNESS });

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
    if (normalRef.current) {
      const heightBuf = !customHeight && faceConfig ? computeHeightBuffer(faceConfig) : null;
      if (heightBuf) {
        generateNormalMapFromHeightBuffer(heightBuf, faceConfig!.size, faceConfig!.size, normalRef.current, normalSettings);
      } else {
        generateNormalMap(heightSource, normalRef.current, normalSettings);
      }
    }
    if (dispRef.current) generateDisplacementMap(heightSource, dispRef.current, dispSettings);
    if (aoRef.current) generateAOMap(heightSource, aoRef.current, aoSettings);
    if (specRef.current) generateSpecularMap(heightSource, specRef.current, specSettings);
    if (metallicRef.current) generateMetallicMap(heightSource, metallicRef.current, metallicSettings);
    if (roughnessRef.current) generateRoughnessMap(heightSource, roughnessRef.current, roughnessSettings);
  }, [enabled, heightSource, customHeight, faceConfig, normalSettings, dispSettings, aoSettings, specSettings, metallicSettings, roughnessSettings, version]);

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
                       activeMap === 'ao' ? aoRef :
                       activeMap === 'specular' ? specRef :
                       activeMap === 'metallic' ? metallicRef : roughnessRef;

  if (!enabled) {
    const canEnable = hasSource || !!customHeight;
    return (
      <div className="map-panel-toggle">
        <button
          className="btn-primary"
          onClick={() => setEnabled(true)}
          disabled={!canEnable}
          title={canEnable ? 'Generate Normal / Displacement / AO / Specular maps for this face' : 'Capture a texture to this face first, or upload a custom height map below'}
          style={{ opacity: canEnable ? 1 : 0.55, cursor: canEnable ? 'pointer' : 'not-allowed' }}
        >
          Generate Maps (Normal, Displacement, AO, Specular, Metallic, Roughness)
        </button>
        {!canEnable && (
          <div style={{ marginTop: 6 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) { handleHeightUpload(f); setEnabled(true); } e.target.value = ''; }}
            />
            <button className="btn-small" onClick={() => fileInputRef.current?.click()}>
              …or upload a custom height map
            </button>
          </div>
        )}
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
        {(['normal', 'displacement', 'ao', 'specular', 'metallic', 'roughness'] as MapType[]).map(t => (
          <button key={t} className={`type-btn ${activeMap === t ? 'active' : ''}`} onClick={() => setActiveMap(t)}>
            {t === 'normal' ? 'Normal' : t === 'displacement' ? 'Displace' : t === 'ao' ? 'AO' : t === 'specular' ? 'Specular' : t === 'metallic' ? 'Metallic' : 'Roughness'}
          </button>
        ))}
      </div>

      <div className="map-preview-row">
        <canvas ref={normalRef} className={`map-thumb ${activeMap === 'normal' ? 'active' : ''}`} />
        <canvas ref={dispRef} className={`map-thumb ${activeMap === 'displacement' ? 'active' : ''}`} />
        <canvas ref={aoRef} className={`map-thumb ${activeMap === 'ao' ? 'active' : ''}`} />
        <canvas ref={specRef} className={`map-thumb ${activeMap === 'specular' ? 'active' : ''}`} />
        <canvas ref={metallicRef} className={`map-thumb ${activeMap === 'metallic' ? 'active' : ''}`} />
        <canvas ref={roughnessRef} className={`map-thumb ${activeMap === 'roughness' ? 'active' : ''}`} />
      </div>

      {activeMap === 'normal' && (
        <div className="map-settings">
          <div className="settings-row">
            <label>Preset</label>
            <select
              value={normalPresetKey}
              onChange={e => {
                const key = e.target.value;
                const p = NORMAL_PRESETS[key];
                if (p) onNormalSettingsChange ? onNormalSettingsChange(p, key) : handleNormalSettingsChange(p);
              }}
            >
              <option value="" disabled>Choose…</option>
              {Object.entries(NORMAL_PRESET_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <SliderControl label="Strength" value={normalSettings.strength} min={0.01} max={5} step={0.01} onChange={v => handleNormalSettingsChange({ ...normalSettings, strength: v })} />
          <SliderControl label="Level" value={normalSettings.level} min={4} max={10} step={0.1} onChange={v => handleNormalSettingsChange({ ...normalSettings, level: v })} />
          <SliderControl label="Blur/Sharp" value={normalSettings.blurSharp} min={-32} max={32} step={1} onChange={v => handleNormalSettingsChange({ ...normalSettings, blurSharp: v })} />
          <div className="settings-row">
            <label>Filter</label>
            <select value={normalSettings.filterType} onChange={e => handleNormalSettingsChange({ ...normalSettings, filterType: e.target.value as 'sobel' | 'scharr' })}>
              <option value="sobel">Sobel</option><option value="scharr">Scharr</option>
            </select>
          </div>
          <div className="settings-row">
            <label>Invert</label>
            <label className="check-label"><input type="checkbox" checked={normalSettings.invertR} onChange={e => handleNormalSettingsChange({ ...normalSettings, invertR: e.target.checked })} /> R</label>
            <label className="check-label"><input type="checkbox" checked={normalSettings.invertG} onChange={e => handleNormalSettingsChange({ ...normalSettings, invertG: e.target.checked })} /> G</label>
            <label className="check-label"><input type="checkbox" checked={normalSettings.invertHeight} onChange={e => handleNormalSettingsChange({ ...normalSettings, invertHeight: e.target.checked })} /> H</label>
          </div>
          <div className="settings-row">
            <label className="check-label" title="Remap Z so that maximum tilt darkens fully (matches the standalone Normal Map page behaviour)">
              <input type="checkbox" checked={normalSettings.zRange} onChange={e => handleNormalSettingsChange({ ...normalSettings, zRange: e.target.checked })} /> Z Range
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

      {activeMap === 'metallic' && (
        <div className="map-settings">
          <SliderControl label="Strength" value={metallicSettings.strength} min={0} max={2} step={0.01} onChange={v => setMetallicSettings(s => ({ ...s, strength: v }))} />
          <SliderControl label="Saturation Weight" value={metallicSettings.saturationWeight} min={0} max={2} step={0.01} onChange={v => setMetallicSettings(s => ({ ...s, saturationWeight: v }))} />
          <SliderControl label="Brightness Weight" value={metallicSettings.brightnessWeight} min={0} max={1} step={0.01} onChange={v => setMetallicSettings(s => ({ ...s, brightnessWeight: v }))} />
          <div className="settings-row">
            <label><input type="checkbox" checked={metallicSettings.invert} onChange={e => setMetallicSettings(s => ({ ...s, invert: e.target.checked }))} /> Invert</label>
          </div>
        </div>
      )}

      {activeMap === 'roughness' && (
        <div className="map-settings">
          <SliderControl label="Strength" value={roughnessSettings.strength} min={0} max={2} step={0.01} onChange={v => setRoughnessSettings(s => ({ ...s, strength: v }))} />
          <SliderControl label="Contrast" value={roughnessSettings.contrast} min={-1} max={1} step={0.01} onChange={v => setRoughnessSettings(s => ({ ...s, contrast: v }))} />
          <div className="settings-row">
            <label><input type="checkbox" checked={roughnessSettings.invert} onChange={e => setRoughnessSettings(s => ({ ...s, invert: e.target.checked }))} /> Invert (output smoothness)</label>
          </div>
        </div>
      )}

      <div className="map-download-row">
        <button className="btn-primary" onClick={() => { const c = activeCanvas.current; if (c) downloadCanvas(c, `${filePrefix}_${activeMap}`, 'png'); }}>
          Download {activeMap === 'normal' ? 'Normal' : activeMap === 'displacement' ? 'Displacement' : activeMap === 'ao' ? 'AO' : activeMap === 'specular' ? 'Specular' : activeMap === 'metallic' ? 'Metallic' : 'Roughness'}
        </button>
        <button className="btn-primary" onClick={() => {
          if (normalRef.current) downloadCanvas(normalRef.current, `${filePrefix}_normal`, 'png');
          if (dispRef.current) downloadCanvas(dispRef.current, `${filePrefix}_displacement`, 'png');
          if (aoRef.current) downloadCanvas(aoRef.current, `${filePrefix}_ao`, 'png');
          if (specRef.current) downloadCanvas(specRef.current, `${filePrefix}_specular`, 'png');
          if (metallicRef.current) downloadCanvas(metallicRef.current, `${filePrefix}_metallic`, 'png');
          if (roughnessRef.current) downloadCanvas(roughnessRef.current, `${filePrefix}_roughness`, 'png');
        }}>Download All Maps</button>
      </div>
    </div>
  );
}
