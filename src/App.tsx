import { useState, useCallback } from 'react'
import TextureGenerator from './pages/TextureGenerator'
import NormalMapGenerator from './pages/NormalMapGenerator'
import VoxelBlock from './pages/VoxelBlock'
import BlockWorkbench from './pages/BlockWorkbench'

type Page = 'texture' | 'normalmap' | 'voxelblock' | 'workbench'

const VALID_PAGES: Page[] = ['texture', 'normalmap', 'voxelblock', 'workbench'];

function loadPage(): Page {
  const saved = localStorage.getItem('tt_page');
  return saved && VALID_PAGES.includes(saved as Page) ? saved as Page : 'texture';
}

export default function App() {
  const [page, setPageState] = useState<Page>(loadPage);
  const setPage = useCallback((p: Page) => {
    setPageState(p);
    localStorage.setItem('tt_page', p);
  }, []);

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
        </div>
      </nav>
      <main className="app-main">
        {page === 'texture' && <TextureGenerator />}
        {page === 'workbench' && <BlockWorkbench />}
        {page === 'voxelblock' && <VoxelBlock />}
        {page === 'normalmap' && <NormalMapGenerator />}
      </main>
    </div>
  )
}
