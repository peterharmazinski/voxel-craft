import { useState, useCallback, useEffect } from 'react'
import TextureGenerator from './pages/TextureGenerator'
import NormalMapGenerator from './pages/NormalMapGenerator'
import VoxelBlock from './pages/VoxelBlock'
import BlockWorkbench from './pages/BlockWorkbench'
import Guide from './pages/Guide'
import BrandLogo from './components/BrandLogo'

type Page = 'texture' | 'normalmap' | 'voxelblock' | 'workbench' | 'guide'

const TOOL_PAGES = ['texture', 'normalmap', 'voxelblock', 'workbench'] as const;
type ToolPage = typeof TOOL_PAGES[number];

type Theme = 'dark' | 'light' | 'contrast';
const THEMES: { id: Theme; label: string; icon: string }[] = [
  { id: 'dark', label: 'Dark', icon: '☾' },
  { id: 'light', label: 'Light', icon: '☀' },
  { id: 'contrast', label: 'High Contrast', icon: '◐' },
];

function loadPage(): Page {
  const saved = localStorage.getItem('tt_page');
  return saved && [...TOOL_PAGES, 'guide'].includes(saved as Page) ? saved as Page : 'workbench';
}

function loadTheme(): Theme {
  const saved = localStorage.getItem('voxelcraft_theme') as Theme | null;
  if (saved && (THEMES.map(t => t.id) as string[]).includes(saved)) return saved;
  // First-time visitors: respect the OS preference instead of forcing dark.
  if (typeof window !== 'undefined' && window.matchMedia) {
    if (window.matchMedia('(prefers-contrast: more)').matches) return 'contrast';
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  }
  return 'dark';
}

export default function App() {
  const [page, setPageState] = useState<Page>(loadPage);
  const [panelOpen, setPanelOpen] = useState(false);
  const [theme, setThemeState] = useState<Theme>(loadTheme);

  // Apply theme to <html> so the [data-theme] attribute selectors win
  // for every page. Persist the choice for the next visit.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('voxelcraft_theme', theme);
  }, [theme]);

  // Escape closes the side guide panel — standard dialog-ish a11y expectation.
  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanelOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelOpen]);

  const setPage = useCallback((p: Page) => {
    setPageState(p);
    localStorage.setItem('tt_page', p);
    if (p === 'guide') setPanelOpen(false);
  }, []);

  const togglePanel = useCallback(() => {
    if (page === 'guide') {
      setPageState('workbench');
      localStorage.setItem('tt_page', 'workbench');
      setPanelOpen(true);
    } else {
      setPanelOpen(o => !o);
    }
  }, [page]);

  const activeTool: ToolPage = (page !== 'guide' ? page : 'workbench') as ToolPage;

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <nav className="app-nav" aria-label="Primary">
        <div className="nav-brand">
          <BrandLogo size={22} className="nav-brand-logo" title="VoxelCraft" />
          <span>VoxelCraft</span>
        </div>
        <div className="nav-links">
          <button
            className={`nav-link ${page === 'workbench' ? 'active' : ''}`}
            onClick={() => setPage('workbench')}
          >
            Block Workbench
          </button>
          <button
            className={`nav-link ${page === 'guide' ? 'active' : ''}`}
            onClick={() => setPage('guide')}
          >
            Guide
          </button>
        </div>
        <div className="nav-right">
          <div className="theme-switcher" role="radiogroup" aria-label="Color theme">
            {THEMES.map(t => (
              <button
                key={t.id}
                className={`theme-btn ${theme === t.id ? 'active' : ''}`}
                onClick={() => setThemeState(t.id)}
                role="radio"
                aria-checked={theme === t.id}
                title={`${t.label} theme`}
                aria-label={`${t.label} theme`}
              >
                <span aria-hidden>{t.icon}</span>
              </button>
            ))}
          </div>
          <button
            className={`nav-help-btn ${panelOpen ? 'active' : ''}`}
            onClick={togglePanel}
            title={panelOpen ? 'Close guide panel' : 'Open guide as side panel'}
          >
            ?
          </button>
        </div>
      </nav>

      <div className={`app-body ${panelOpen && page !== 'guide' ? 'panel-open' : ''}`}>
        <main className="app-main" id="main-content" tabIndex={-1}>
          {page === 'guide' && <Guide />}
          {page !== 'guide' && activeTool === 'texture' && <TextureGenerator />}
          {page !== 'guide' && activeTool === 'workbench' && <BlockWorkbench />}
          {page !== 'guide' && activeTool === 'voxelblock' && <VoxelBlock />}
          {page !== 'guide' && activeTool === 'normalmap' && <NormalMapGenerator />}
        </main>

        {panelOpen && page !== 'guide' && (
          <>
            <div className="guide-panel-backdrop" onClick={() => setPanelOpen(false)} aria-hidden="true" />
            <aside className="guide-panel" aria-label="Guide" role="dialog" aria-modal="false">
              <div className="guide-panel-header">
                <span>Guide</span>
                <button
                  type="button"
                  className="guide-panel-close"
                  onClick={() => setPanelOpen(false)}
                  aria-label="Close guide panel"
                >×</button>
              </div>
              <div className="guide-panel-scroll">
                <Guide />
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  )
}
