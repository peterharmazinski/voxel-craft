# VoxelCraft Roadmap

Features are grouped by effort and priority. Items within each tier are roughly ordered by impact.

---

## Tier 1 — Quick wins (low effort, high daily-use value)

### Randomize all seeds
Single button / keyboard shortcut that re-rolls Top, Side, and Bottom seeds simultaneously. Currently R only randomizes the active face. Would turn preset exploration from a three-step chore into a one-press action.

### Copy face settings
Push the current face's full config (generator type + all params + seed) to one or all other faces. Needed constantly: start Side from the Top config, then adjust colors; or lock all three faces to the same generator for uniform blocks.

### Save custom presets to the library
Promote the current workbench config (one or all three faces) into a named entry in the preset grid that persists across projects. Currently only `.voxelcraft` project files preserve custom configs — there's no way to build a personal preset library.

---

## Tier 2 — Medium effort, strong creative value

### Generator layering (2-layer stack per face)
Each face is currently limited to one generator. A second optional layer with a blend mode (Multiply, Overlay, Screen, Add, Mask) would unlock combinations like StoneWall + PerlinNoise detail, or CartoonOre on top of a Brick base. Limited to two layers to keep the UI manageable.

### Variant batch generator
Given one preset, generate a grid of N variations (different seeds, or small parameter offsets) in a single click. Select the best one and promote it. Eliminates the manual re-roll loop when hunting for a good result.

### Color palette lock
Define a shared N-color palette and constrain all generators to it via nearest-neighbor color snapping. Critical for pixel art / retro styles where the whole block set needs to stay within a consistent budget. Per-project setting, opt-in.

### Manual touch-up (pixel paint layer)
A thin paint layer on top of the generated texture: basic brush, eraser, fill bucket, color picker from the texture. No full pixel editor — just enough to fix the one spot the generator got wrong. Stored as a non-destructive overlay that re-applies after regeneration.

---

## Tier 3 — Export targets

### ✅ Minecraft resource pack export
Package one or more blocks with the correct folder structure and naming (`assets/minecraft/textures/block/<name>.png`) as a ZIP, ready to drop into a resource pack. Optionally include a `pack.mcmeta`. Block name editable before export.

Outputs: per-face PNGs (`<name>_top/side/bottom.png`), a `block/<name>.json` cube model, and `pack.mcmeta` with configurable MC version format (1.17–1.21). Triggered via the **MC** button in the Export section.

### Texture atlas / tileset export
Pack multiple selected blocks onto a single power-of-2 sheet (e.g. 8 blocks × 3 faces = 24 tiles on a 512×512 atlas). Output includes the atlas PNG and a JSON manifest mapping block names to UV rects. Standard requirement for most game engine setups.

### ✅ Voxel Play 3 (VP3) export
Export textures in the format expected by Unity's Voxel Play 3 engine:

- **Texture output**: Top, Side, Bottom faces at the resolution configured in the VP3 `VoxelDefinition` (typically 64×64 or 128×128). Separate PNGs named `<blockId>_top`, `<blockId>_side`, `<blockId>_bottom`.
- **VoxelDefinition stub**: A `.cs` or `.asset` sidecar with the texture slot assignments pre-filled and common VP3 fields stubbed out (`renderType`, `canBeCollected`, `resistancePoints`, `gpuInstancing`, `tintColor`). Lets you drag textures and the stub straight into a Unity project and wire them with minimal manual steps.
- **Normal map export mode**: Three options, selectable per export:
  - **None** — no normal maps exported; smallest ZIP, fastest export.
  - **Smart** (default) — bake a normal only for faces where the diffuse has enough contrast to benefit. A face passes if luminance standard deviation > ~0.06 **and** average alpha > 0.8. Generators that typically pass: StoneWall, Brick, CartoonOre, Bark, Wood. Generators that typically skip: Gradient, Clouds, Frosted Glass / low-persistence PerlinNoise, solid-color fills.
  - **All** — bake and include normals for every face unconditionally.
  - Output files named `<blockId>_top_normal.png`, `<blockId>_side_normal.png`, `<blockId>_bottom_normal.png`. The `.voxeldef.json` sidecar includes a `normalStrength` field (0–1, default 0.8) so the Unity import wizard can set the normal intensity on the VP3 material.
- **Emission maps**: Include workbench-generated emission maps alongside diffuse textures, named `<blockId>_top_emissive.png` etc. to match VP3's expected suffixes.
- **Batch mode**: Export all open projects at once into a single ZIP structured as `<blockId>/` folders, one per block.

Implemented: diffuse + smart/all/none normal baking (height-buffer path where available) + optional emission maps + `.voxeldef.json` sidecar. Triggered via the **VP3** button in the Export section. Batch mode (multi-project) is not yet implemented.

### Game engine material stubs (Unity / Godot)
- **Unity**: `.mat` asset file referencing the exported textures via relative paths, preset to the URP Lit shader with Metallic/Smoothness/Normal slots pre-assigned.
- **Godot**: `.tres` StandardMaterial3D resource with albedo, normal, and emission textures pre-linked.

---

## Tier 4 — Lower priority / longer term

- **Idle 3D preview rotation** — Slow auto-spin on the isometric preview cube so all faces are visible without manual camera control.
- **Import PNG as face** — Drop any external PNG directly onto a face slot in the workbench without going through a generator. Currently only available in voxel mode.
- **Heightmap round-trip** — Generate a heightmap from any face and feed it back as a displacement source for another face or as a sculpting base.
- **Community preset packs** — Browse and install curated preset packs (Medieval, Sci-Fi, Fantasy, etc.) from an online index without leaving the app.
- **Collaboration / cloud sync** — Share a project link; multiple users edit the same block set in real time.
