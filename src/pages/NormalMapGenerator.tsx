import { useCallback, useEffect, useRef, useState } from 'react';
import SliderControl from '../components/SliderControl';
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

type MapTab = 'normal' | 'displacement' | 'ao' | 'specular';

export default function NormalMapGenerator() {
  const heightCanvasRef = useRef<HTMLCanvasElement>(null);
  const normalCanvasRef = useRef<HTMLCanvasElement>(null);
  const displaceCanvasRef = useRef<HTMLCanvasElement>(null);
  const aoCanvasRef = useRef<HTMLCanvasElement>(null);
  const specularCanvasRef = useRef<HTMLCanvasElement>(null);
  const heightImgRef = useRef<HTMLImageElement | null>(null);

  const [activeTab, setActiveTab] = useState<MapTab>('normal');
  const [hasImage, setHasImage] = useState(false);
  const [imageSize, setImageSize] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const [normalSettings, setNormalSettings] = useState<NormalMapSettings>({ ...DEFAULT_NORMAL });
  const [dispSettings, setDispSettings] = useState<DisplacementSettings>({ ...DEFAULT_DISPLACEMENT });
  const [aoSettings, setAoSettings] = useState<AOSettings>({ ...DEFAULT_AO });
  const [specSettings, setSpecSettings] = useState<SpecularSettings>({ ...DEFAULT_SPECULAR });

  const processAllMaps = useCallback(() => {
    const img = heightImgRef.current;
    if (!img) return;
    if (normalCanvasRef.current) generateNormalMap(img, normalCanvasRef.current, normalSettings);
    if (displaceCanvasRef.current) generateDisplacementMap(img, displaceCanvasRef.current, dispSettings);
    if (aoCanvasRef.current) generateAOMap(img, aoCanvasRef.current, aoSettings);
    if (specularCanvasRef.current) generateSpecularMap(img, specularCanvasRef.current, specSettings);
  }, [normalSettings, dispSettings, aoSettings, specSettings]);

  useEffect(() => {
    if (hasImage) processAllMaps();
  }, [hasImage, processAllMaps]);

  const loadImage = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        heightImgRef.current = img;
        const hCanvas = heightCanvasRef.current;
        if (hCanvas) {
          hCanvas.width = img.naturalWidth;
          hCanvas.height = img.naturalHeight;
          const ctx = hCanvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
        }
        setImageSize(`${img.naturalWidth} × ${img.naturalHeight}`);
        setHasImage(true);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadImage(file);
  }, [loadImage]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImage(file);
  }, [loadImage]);

  const activeCanvas = activeTab === 'normal' ? normalCanvasRef :
                       activeTab === 'displacement' ? displaceCanvasRef :
                       activeTab === 'ao' ? aoCanvasRef : specularCanvasRef;

  const tabLabels: Record<MapTab, string> = {
    normal: 'Normal', displacement: 'Displacement', ao: 'Ambient Occ', specular: 'Specular',
  };

  return (
    <div className="page-layout">
      <div className="preview-column">
        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''} ${hasImage ? 'has-image' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('nmap-file-input')?.click()}
        >
          <canvas ref={heightCanvasRef} className={`height-canvas ${hasImage ? '' : 'hidden'}`} />
          {!hasImage && (
            <div className="drop-prompt">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
              <p>Drop a height map here or click to select</p>
            </div>
          )}
          <input id="nmap-file-input" type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
        </div>
        {hasImage && <div className="image-size">Size: {imageSize}</div>}
      </div>

      <div className="controls-column">
        <div className="map-tabs">
          {(Object.keys(tabLabels) as MapTab[]).map(tab => (
            <button key={tab} className={`type-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tabLabels[tab]}
            </button>
          ))}
        </div>

        {activeTab === 'normal' && (
          <div className="settings-panel">
            <h3>Normal Map Settings</h3>
            <SliderControl label="Strength" value={normalSettings.strength} min={0.01} max={5} step={0.01} onChange={v => setNormalSettings(s => ({ ...s, strength: v }))} />
            <SliderControl label="Level" value={normalSettings.level} min={4} max={10} step={0.1} onChange={v => setNormalSettings(s => ({ ...s, level: v }))} />
            <SliderControl label="Blur/Sharp" value={normalSettings.blurSharp} min={-32} max={32} step={1} onChange={v => setNormalSettings(s => ({ ...s, blurSharp: v }))} />
            <div title="Smooth the height source before gradient computation. Suppresses chevron/arrow artifacts on concentric rings and fine periodic patterns.">
              <SliderControl label="Pre-blur" value={normalSettings.preBlur ?? 0} min={0} max={8} step={1} onChange={v => setNormalSettings(s => ({ ...s, preBlur: v }))} />
            </div>
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
              <label className="check-label"><input type="checkbox" checked={normalSettings.invertHeight} onChange={e => setNormalSettings(s => ({ ...s, invertHeight: e.target.checked }))} /> Height</label>
            </div>
            <div className="settings-row">
              <label>Z Range</label>
              <label className="check-label"><input type="checkbox" checked={normalSettings.zRange} onChange={e => setNormalSettings(s => ({ ...s, zRange: e.target.checked }))} /> -1 to +1</label>
            </div>
            <button className="btn-small" onClick={() => setNormalSettings({ ...DEFAULT_NORMAL })}>Reset</button>
          </div>
        )}

        {activeTab === 'displacement' && (
          <div className="settings-panel">
            <h3>Displacement Settings</h3>
            <SliderControl label="Contrast" value={dispSettings.contrast} min={-1} max={1} step={0.01} onChange={v => setDispSettings(s => ({ ...s, contrast: v }))} />
            <SliderControl label="Blur/Sharp" value={dispSettings.blurSharp} min={-32} max={32} step={1} onChange={v => setDispSettings(s => ({ ...s, blurSharp: v }))} />
            <div className="settings-row">
              <label>Invert</label>
              <label className="check-label"><input type="checkbox" checked={dispSettings.invert} onChange={e => setDispSettings(s => ({ ...s, invert: e.target.checked }))} /></label>
            </div>
            <button className="btn-small" onClick={() => setDispSettings({ ...DEFAULT_DISPLACEMENT })}>Reset</button>
          </div>
        )}

        {activeTab === 'ao' && (
          <div className="settings-panel">
            <h3>Ambient Occlusion Settings</h3>
            <SliderControl label="Strength" value={aoSettings.strength} min={0} max={1} step={0.01} onChange={v => setAoSettings(s => ({ ...s, strength: v }))} />
            <SliderControl label="Mean" value={aoSettings.mean} min={0} max={1} step={0.01} onChange={v => setAoSettings(s => ({ ...s, mean: v }))} />
            <SliderControl label="Range" value={aoSettings.range} min={0} max={1} step={0.01} onChange={v => setAoSettings(s => ({ ...s, range: v }))} />
            <SliderControl label="Blur/Sharp" value={aoSettings.blurSharp} min={-32} max={32} step={1} onChange={v => setAoSettings(s => ({ ...s, blurSharp: v }))} />
            <div className="settings-row">
              <label>Invert</label>
              <label className="check-label"><input type="checkbox" checked={aoSettings.invert} onChange={e => setAoSettings(s => ({ ...s, invert: e.target.checked }))} /></label>
            </div>
            <button className="btn-small" onClick={() => setAoSettings({ ...DEFAULT_AO })}>Reset</button>
          </div>
        )}

        {activeTab === 'specular' && (
          <div className="settings-panel">
            <h3>Specular Settings</h3>
            <SliderControl label="Strength" value={specSettings.strength} min={0} max={1} step={0.01} onChange={v => setSpecSettings(s => ({ ...s, strength: v }))} />
            <SliderControl label="Mean" value={specSettings.mean} min={0} max={1} step={0.01} onChange={v => setSpecSettings(s => ({ ...s, mean: v }))} />
            <SliderControl label="Range" value={specSettings.range} min={0} max={1} step={0.01} onChange={v => setSpecSettings(s => ({ ...s, range: v }))} />
            <div className="settings-row">
              <label>Falloff</label>
              <select value={specSettings.falloff} onChange={e => setSpecSettings(s => ({ ...s, falloff: e.target.value as SpecularSettings['falloff'] }))}>
                <option value="no">No</option><option value="linear">Linear</option><option value="square">Square</option>
              </select>
            </div>
            <button className="btn-small" onClick={() => setSpecSettings({ ...DEFAULT_SPECULAR })}>Reset</button>
          </div>
        )}

        <div className="map-preview-section">
          <h3>Output Preview</h3>
          <div className="map-canvases">
            <canvas ref={normalCanvasRef} className={`map-canvas ${activeTab === 'normal' ? 'active' : ''}`} />
            <canvas ref={displaceCanvasRef} className={`map-canvas ${activeTab === 'displacement' ? 'active' : ''}`} />
            <canvas ref={aoCanvasRef} className={`map-canvas ${activeTab === 'ao' ? 'active' : ''}`} />
            <canvas ref={specularCanvasRef} className={`map-canvas ${activeTab === 'specular' ? 'active' : ''}`} />
          </div>
        </div>

        <div className="download-bar">
          <select defaultValue="png" id="nmap-filetype">
            <option value="png">PNG</option><option value="jpg">JPG</option>
          </select>
          <button className="btn-primary" onClick={() => {
            const c = activeCanvas.current;
            const ft = (document.getElementById('nmap-filetype') as HTMLSelectElement).value as 'png' | 'jpg';
            if (c) downloadCanvas(c, `${activeTab}_map`, ft);
          }} disabled={!hasImage}>Download</button>
          <button className="btn-primary" onClick={() => {
            const ft = (document.getElementById('nmap-filetype') as HTMLSelectElement).value as 'png' | 'jpg';
            if (normalCanvasRef.current) downloadCanvas(normalCanvasRef.current, 'normal_map', ft);
            if (displaceCanvasRef.current) downloadCanvas(displaceCanvasRef.current, 'displacement_map', ft);
            if (aoCanvasRef.current) downloadCanvas(aoCanvasRef.current, 'ao_map', ft);
            if (specularCanvasRef.current) downloadCanvas(specularCanvasRef.current, 'specular_map', ft);
          }} disabled={!hasImage}>Download All</button>
        </div>
      </div>
    </div>
  );
}
