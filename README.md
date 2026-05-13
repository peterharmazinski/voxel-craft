# VoxelCraft

A modern React/TypeScript web application for procedural texture generation, 3D voxel block creation, and material map generation. Built with Vite.

## Credits

This project is based on and combines two open-source tools by **Christian Petry**:

- **[TextureGenerator-Online](https://github.com/cpetry/TextureGenerator-Online)** — Browser-based procedural texture generator (MIT License)
- **[NormalMap-Online](https://github.com/cpetry/NormalMap-Online)** — Browser-based normal map generator from height maps (MIT License)

The original noise algorithms, texture generation concepts, and normal/displacement/AO/specular map processing logic were created by Christian Petry. This project ports them from vanilla JavaScript to a modern React/TypeScript architecture and extends them with additional features.

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Features Overview

The app has four main views:

### 1. Texture Generator

Create procedural textures from scratch using various algorithms.

### 2. Block Workbench

Build complete 3D voxel blocks by assigning textures to top, side, and bottom faces with live isometric preview and integrated normal mapping.

### 3. Voxel Block (Legacy)

The original voxel block generator with pixel-art style rendering and built-in presets.

### 4. Normal Map Generator

Upload any image and generate Normal, Displacement, Ambient Occlusion, and Specular maps.

---

## How to Use

### Texture Generator

The Texture Generator creates seamless, tileable textures using procedural algorithms.

**Available texture types:**

| Type | Best For |
|------|----------|
| Perlin Noise | Organic surfaces — dirt, grass, clouds, lava, water |
| Clouds | Sky and atmosphere |
| Checker | Tiles, floors, patterns |
| Brick | Walls, paths, stone surfaces |
| Hexagon | Honeycomb, stylized stone |
| Octagon | Decorative tiles |
| Gradient | Color ramps, sky backgrounds |
| Terrain | Heightmaps, topographic textures |
| Textiles | Fabric, woven materials |
| Tiles | Floor and wall tiles with grout |
| Wood | Planks and tree rings |
| Bark | Tree trunk surfaces |
| Cartoon Ore | Stylized stone with embedded minerals |
| Voxel / Pixel | Pixelated Minecraft-style textures |

**Tips for better results:**

- **High contrast = more depth.** Textures with strong light-to-dark variation produce better normal maps.
- **Use presets as starting points.** Each texture type has presets in the dropdown — select one, then tweak.
- **Multi-color gradient** (Perlin Noise): Enable the checkbox to map noise through multiple colors instead of just two. Essential for materials like lava (black → red → orange → yellow).
- **Tree Rings mode** (Wood): Switch from "Linear Grain" to "Tree Rings" for log cross-sections.
- **Cutout** for transparency: Use the `cutout` parameter in render presets to punch holes in textures (leaves, lattice).
- **Seed** controls randomization. Same seed = same result. Change it to get variations.

### Block Workbench

The workbench combines texture generation with 3D block assembly.

**Workflow:**

1. **Select a face** (Top, Side, or Bottom) by clicking the face thumbnails
2. **Choose a block preset** to instantly populate all three faces, or...
3. **Create a custom texture** using the embedded Texture Generator (right panel)
4. **Click "Capture"** to assign the current texture to the active face
5. **Adjust normal mapping** using the MapPanel (left panel, below downloads)
6. **Toggle "Normal Map Lighting"** to see how the block looks with directional lighting
7. **Change background** to verify transparency (use "Transparency" for leaves/glass)

**Block presets available:**

- **Trees:** Oak, Birch, Spruce, Jungle, Dark Oak, Acacia (rings top/bottom + bark sides)
- **Ores:** Diamond, Iron, Gold, Emerald, Redstone, Coal, Copper
- **Grass:** Standard, Flowery, Mossy, Dry
- **Ground:** Sand, Red Sand, Gravel, Mud, Cobblestone
- **Building:** Stone Brick, Wood Planks, Tiled Floor, Hexagonal Stone, Woven Fabric
- **Special:** Lava (glowing gradient)
- **Transparent:** Glass, Stained Glass, Oak/Birch/Autumn/Cherry Leaves

**Making textures look 3D:**

- Use the **Normal Map presets** ("Strong", "Extreme", "Brick/Tile") for deeper relief
- Increase **Strength** in the normal map settings
- Choose textures with strong contrast (bark, brick, cobblestone)
- The **Brick/Tile preset** is specifically tuned for surfaces with grout lines

**Transparency:**

- Leaf presets and glass presets have built-in transparency
- Set background to **"Transparency"** (checkerboard) to verify alpha
- Downloaded PNGs will have proper alpha channels for use in game engines

### Normal Map Presets

| Preset | Effect |
|--------|--------|
| Subtle | Gentle surface variation |
| Default | Balanced, general purpose |
| Strong | Pronounced depth/relief |
| Extreme | Maximum depth, dramatic shadows |
| Smooth | Soft, rounded surfaces |
| Sharp / Crisp | Hard edges, fine detail |
| Inverted Depth | Bumps become dents |
| Brick / Tile | Deep grout lines, flat faces |
| Organic / Soft | Natural materials |
| Metal / Flat | Barely-there surface detail |

### Keyboard & Interactions

- **Lit Preview** (in MapPanel): Drag the mouse to move the light source
- All settings persist across page refreshes via localStorage
- The app remembers your last active page

---

## Technical Details

- **Framework:** React 18 + TypeScript + Vite
- **Rendering:** HTML5 Canvas 2D API (all generation is CPU-based, no WebGL required)
- **Noise:** Simplex noise implementation with seamless tiling support
- **State:** Custom `useLocalState` hook for localStorage persistence
- **No external runtime dependencies** beyond React

## License

**This project is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE).**

In plain English:

- ✅ Free for personal projects, hobby work, learning, academic research, charity, and government use.
- ❌ **No commercial use of any kind** — that includes selling textures generated by this tool as products, embedding the app in a paid service, using it inside a for-profit company's internal toolchain, or any other revenue-generating activity, direct or indirect.
- 🏢 If you represent a company and want a commercial license, open an issue on this repository to start that conversation.

### Third-party acknowledgements

This project takes inspiration from and re-implements ideas from
the following MIT-licensed projects by Christian Petry. Their
upstream code remains under its original MIT terms — see the
[LICENSE](LICENSE) file for the full text.

- **[TextureGenerator-Online](https://github.com/cpetry/TextureGenerator-Online)**
- **[NormalMap-Online](https://github.com/cpetry/NormalMap-Online)**
