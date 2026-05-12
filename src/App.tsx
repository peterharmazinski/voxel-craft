import { useState, useCallback } from 'react'
import TextureGenerator from './pages/TextureGenerator'
import NormalMapGenerator from './pages/NormalMapGenerator'
import VoxelBlock from './pages/VoxelBlock'
import BlockWorkbench from './pages/BlockWorkbench'
import Guide from './pages/Guide'

type Page = 'texture' | 'normalmap' | 'voxelblock' | 'workbench' | 'guide'

const TOOL_PAGES = ['texture', 'normalmap', 'voxelblock', 'workbench'] as const;
type ToolPage = typeof TOOL_PAGES[number];

function loadPage(): Page {
  const saved = localStorage.getItem('tt_page');
  return saved && [...TOOL_PAGES, 'guide'].includes(saved as Page) ? saved as Page : 'texture';
}

export default function App() {
  const [page, setPageState] = useState<Page>(loadPage);
  const [panelOpen, setPanelOpen] = useState(false);

  const setPage = useCallback((p: Page) => {
    setPageState(p);
    localStorage.setItem('tt_page', p);
    if (p === 'guide') setPanelOpen(false);
  }, []);

  const togglePanel = useCallback(() => {
    if (page === 'guide') {
      setPageState('texture');
      localStorage.setItem('tt_page', 'texture');
      setPanelOpen(true);
    } else {
      setPanelOpen(o => !o);
    }
  }, [page]);

  const activeTool: ToolPage = (page !== 'guide' ? page : 'texture') as ToolPage;

  return (
    <div className="app">
      <nav className="app-nav">
        <div className="nav-brand">VoxelCraft</div>
        <div className="nav-links">
          <button
            className={`nav-link ${page === 'texture' ? 'active' : ''}`}
            onClick={() => setPage('texture')}
          >
            Texture Generator
          </button>
          <button
            className={`nav-link ${page === 'workbench' ? 'active' : ''}`}
            onClick={() => setPage('workbench')}
          >
            Block Workbench
          </button>
          <button
            className={`nav-link ${page === 'voxelblock' ? 'active' : ''}`}
            onClick={() => setPage('voxelblock')}
          >
            Voxel Block
          </button>
          <button
            className={`nav-link ${page === 'normalmap' ? 'active' : ''}`}
            onClick={() => setPage('normalmap')}
          >
            Normal Map
          </button>
          <button
            className={`nav-link ${page === 'guide' ? 'active' : ''}`}
            onClick={() => setPage('guide')}
          >
            Guide
          </button>
        </div>
        <button
          className={`nav-help-btn ${panelOpen ? 'active' : ''}`}
          onClick={togglePanel}
          title={panelOpen ? 'Close guide panel' : 'Open guide as side panel'}
        >
          ?
        </button>
      </nav>

      <div className={`app-body ${panelOpen && page !== 'guide' ? 'panel-open' : ''}`}>
        <main className="app-main">
          {page === 'guide' && <Guide />}
          {page !== 'guide' && activeTool === 'texture' && <TextureGenerator />}
          {page !== 'guide' && activeTool === 'workbench' && <BlockWorkbench />}
          {page !== 'guide' && activeTool === 'voxelblock' && <VoxelBlock />}
          {page !== 'guide' && activeTool === 'normalmap' && <NormalMapGenerator />}
        </main>

        {panelOpen && page !== 'guide' && (
          <>
            <div className="guide-panel-backdrop" onClick={() => setPanelOpen(false)} />
            <aside className="guide-panel">
              <div className="guide-panel-header">
                <span>Guide</span>
                <button className="guide-panel-close" onClick={() => setPanelOpen(false)}>×</button>
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
