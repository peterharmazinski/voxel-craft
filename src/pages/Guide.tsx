export default function Guide() {
  return (
    <div className="guide-page">
      <div className="guide-content">
        <header className="guide-header">
          <h1>VoxelCraft</h1>
          <p className="guide-subtitle">
            Procedural texture generation, 3D voxel block creation, and material map generation.
          </p>
        </header>

        <section className="guide-section">
          <h2>Getting Started</h2>
          <p>
            VoxelCraft has four tools. Use the navigation bar at the top to switch between them.
          </p>
          <div className="guide-cards">
            <div className="guide-card">
              <h3>Texture Generator</h3>
              <p>Create seamless, tileable textures from 14 procedural algorithms. Pick a type, tweak the parameters, and download.</p>
            </div>
            <div className="guide-card">
              <h3>Block Workbench</h3>
              <p>Build complete 3D voxel blocks by assigning textures to top, side, and bottom faces with a live isometric preview.</p>
            </div>
            <div className="guide-card">
              <h3>Voxel Block</h3>
              <p>Quick pixel-art style block generator with built-in presets for common Minecraft-style materials.</p>
            </div>
            <div className="guide-card">
              <h3>Normal Map Generator</h3>
              <p>Upload any image and generate Normal, Displacement, Ambient Occlusion, and Specular maps.</p>
            </div>
          </div>
        </section>

        <section className="guide-section">
          <h2>Texture Types</h2>
          <div className="guide-table-wrap">
            <table className="guide-table">
              <thead>
                <tr><th>Type</th><th>Best For</th></tr>
              </thead>
              <tbody>
                <tr><td>Perlin Noise</td><td>Organic surfaces — dirt, grass, clouds, lava, water</td></tr>
                <tr><td>Clouds</td><td>Sky and atmosphere</td></tr>
                <tr><td>Checker</td><td>Tiles, floors, patterns</td></tr>
                <tr><td>Brick</td><td>Walls, paths, stone surfaces</td></tr>
                <tr><td>Hexagon</td><td>Honeycomb, stylized stone</td></tr>
                <tr><td>Octagon</td><td>Decorative tiles</td></tr>
                <tr><td>Gradient</td><td>Color ramps, sky backgrounds</td></tr>
                <tr><td>Terrain</td><td>Heightmaps, topographic textures</td></tr>
                <tr><td>Textiles</td><td>Fabric, woven materials</td></tr>
                <tr><td>Tiles</td><td>Floor and wall tiles with grout</td></tr>
                <tr><td>Wood</td><td>Planks and tree rings</td></tr>
                <tr><td>Bark</td><td>Tree trunk surfaces</td></tr>
                <tr><td>Cartoon Ore</td><td>Stylized stone with embedded minerals</td></tr>
                <tr><td>Voxel / Pixel</td><td>Pixelated Minecraft-style textures</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="guide-section">
          <h2>Tips for Better Textures</h2>
          <div className="guide-tips">
            <div className="guide-tip">
              <strong>High contrast = more depth</strong>
              <span>Textures with strong light-to-dark variation produce better normal maps and more convincing 3D appearance.</span>
            </div>
            <div className="guide-tip">
              <strong>Start from presets</strong>
              <span>Each texture type has presets in the dropdown. Select one as a starting point, then tweak the settings.</span>
            </div>
            <div className="guide-tip">
              <strong>Multi-color gradients</strong>
              <span>In Perlin Noise, enable the gradient checkbox to map noise through multiple colors. Essential for lava (black → red → orange → yellow).</span>
            </div>
            <div className="guide-tip">
              <strong>Tree Rings mode</strong>
              <span>In the Wood generator, switch from "Linear Grain" to "Tree Rings" for log cross-sections.</span>
            </div>
            <div className="guide-tip">
              <strong>Seed controls randomization</strong>
              <span>Same seed always produces the same result. Change it for variations of the same style.</span>
            </div>
          </div>
        </section>

        <section className="guide-section">
          <h2>Block Workbench Workflow</h2>
          <ol className="guide-steps">
            <li><strong>Select a face</strong> — click the Top, Side, or Bottom thumbnails</li>
            <li><strong>Choose a block preset</strong> to instantly populate all three faces, or create a custom texture with the embedded generator</li>
            <li><strong>Click "Capture"</strong> to assign the current texture to the active face</li>
            <li><strong>Adjust normal mapping</strong> using the map panel (left side, below downloads)</li>
            <li><strong>Toggle "Normal Map Lighting"</strong> to see directional lighting on the block</li>
            <li><strong>Change background</strong> — use "Transparency" (checkerboard) for leaves and glass</li>
          </ol>
        </section>

        <section className="guide-section">
          <h2>Block Presets</h2>
          <div className="guide-preset-grid">
            <div className="guide-preset-group">
              <h4>Trees</h4>
              <p>Oak, Birch, Spruce, Jungle, Dark Oak, Acacia — rings on top/bottom, bark on sides</p>
            </div>
            <div className="guide-preset-group">
              <h4>Ores</h4>
              <p>Diamond, Iron, Gold, Emerald, Redstone, Coal, Copper</p>
            </div>
            <div className="guide-preset-group">
              <h4>Grass</h4>
              <p>Standard, Flowery, Mossy, Dry</p>
            </div>
            <div className="guide-preset-group">
              <h4>Ground</h4>
              <p>Sand, Red Sand, Gravel, Mud, Cobblestone</p>
            </div>
            <div className="guide-preset-group">
              <h4>Building</h4>
              <p>Stone Brick, Wood Planks, Tiled Floor, Hexagonal Stone, Woven Fabric</p>
            </div>
            <div className="guide-preset-group">
              <h4>Special</h4>
              <p>Lava (glowing gradient), Glass, Stained Glass, Leaves (Oak, Birch, Autumn, Cherry)</p>
            </div>
          </div>
        </section>

        <section className="guide-section">
          <h2>Normal Map Presets</h2>
          <div className="guide-table-wrap">
            <table className="guide-table">
              <thead>
                <tr><th>Preset</th><th>Effect</th></tr>
              </thead>
              <tbody>
                <tr><td>Subtle</td><td>Gentle surface variation</td></tr>
                <tr><td>Default</td><td>Balanced, general purpose</td></tr>
                <tr><td>Strong</td><td>Pronounced depth and relief</td></tr>
                <tr><td>Extreme</td><td>Maximum depth, dramatic shadows</td></tr>
                <tr><td>Smooth</td><td>Soft, rounded surfaces</td></tr>
                <tr><td>Sharp / Crisp</td><td>Hard edges, fine detail</td></tr>
                <tr><td>Inverted Depth</td><td>Bumps become dents</td></tr>
                <tr><td>Brick / Tile</td><td>Deep grout lines, flat faces</td></tr>
                <tr><td>Organic / Soft</td><td>Natural materials like wood or skin</td></tr>
                <tr><td>Metal / Flat</td><td>Barely-there surface detail</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="guide-section">
          <h2>Making Textures Look 3D</h2>
          <div className="guide-tips">
            <div className="guide-tip">
              <strong>Normal map presets</strong>
              <span>Use "Strong", "Extreme", or "Brick/Tile" for deeper relief on the block preview.</span>
            </div>
            <div className="guide-tip">
              <strong>Increase strength</strong>
              <span>The Strength slider in normal map settings controls how pronounced the surface detail appears.</span>
            </div>
            <div className="guide-tip">
              <strong>Choose high-contrast textures</strong>
              <span>Bark, brick, and cobblestone textures have natural contrast that produces great 3D effects.</span>
            </div>
            <div className="guide-tip">
              <strong>Transparency</strong>
              <span>Leaf and glass presets have alpha. Set background to "Transparency" to verify, and downloaded PNGs retain proper alpha channels.</span>
            </div>
          </div>
        </section>

        <section className="guide-section">
          <h2>Interactions</h2>
          <div className="guide-tips">
            <div className="guide-tip">
              <strong>Lit Preview</strong>
              <span>In the map panel, drag the mouse over the lit preview to move the light source direction.</span>
            </div>
            <div className="guide-tip">
              <strong>Settings persist</strong>
              <span>All settings are saved to your browser's localStorage. They survive page refreshes and revisits.</span>
            </div>
            <div className="guide-tip">
              <strong>Page memory</strong>
              <span>The app remembers which page you were last on and returns you there.</span>
            </div>
          </div>
        </section>

        <footer className="guide-footer">
          <div className="guide-credits">
            <h2>Credits</h2>
            <p>
              Based on two open-source tools by <strong>Christian Petry</strong>:
            </p>
            <div className="guide-credit-links">
              <a href="https://github.com/cpetry/TextureGenerator-Online" target="_blank" rel="noopener noreferrer">
                <span className="credit-name">TextureGenerator-Online</span>
                <span className="credit-desc">Browser-based procedural texture generator</span>
                <span className="credit-license">MIT License</span>
              </a>
              <a href="https://github.com/cpetry/NormalMap-Online" target="_blank" rel="noopener noreferrer">
                <span className="credit-name">NormalMap-Online</span>
                <span className="credit-desc">Browser-based normal map generator from height maps</span>
                <span className="credit-license">MIT License</span>
              </a>
            </div>
            <p className="guide-credit-note">
              The original noise algorithms, texture generation concepts, and normal/displacement/AO/specular map
              processing were created by Christian Petry. This project ports them to a modern React/TypeScript
              architecture and extends them with additional features.
            </p>
          </div>
          <div className="guide-tech">
            <p>Built with React + TypeScript + Vite. All rendering is CPU-based via Canvas 2D — no WebGL required.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
