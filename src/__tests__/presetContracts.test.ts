/**
 * Preset contract tests — guard against regressions like the commit that
 * broke sand by switching Turbulence → FractalNoise with scale=9-12, which
 * produced visible vertical stripes instead of organic sandy grain.
 *
 * Uses source-text assertions so there are no React/browser import issues.
 * All contracts are locked by exact key names inside BlockWorkbench.tsx.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const SRC = readFileSync(
  join(import.meta.dirname, '../pages/BlockWorkbench.tsx'),
  'utf-8',
);

/**
 * Extract the source block for a single preset key.
 *
 * Uses format-specific search patterns to avoid matching category maps or
 * other objects that reuse preset key names:
 *  - WORKBENCH_PRESETS: `  key: {\n    label:` (object literal)
 *  - CUSTOM_TEXTURE_PRESETS: `  key: _texPreset(` (function call)
 *
 * Slices from the key start to the next sibling key at the same 2-space
 * indent level.
 */
function extractPreset(key: string): string {
  // Try WORKBENCH_PRESETS object-literal format first
  let startIdx = SRC.indexOf(`\n  ${key}: {\n    label:`);

  // Fall back to CUSTOM_TEXTURE_PRESETS function-call format
  if (startIdx === -1) {
    startIdx = SRC.indexOf(`\n  ${key}: _texPreset(`);
  }

  if (startIdx === -1) {
    throw new Error(`Preset "${key}" not found in WORKBENCH_PRESETS or CUSTOM_TEXTURE_PRESETS`);
  }

  // Find the next sibling key at the same 2-space indent (end of this preset)
  const searchFrom = startIdx + key.length + 4;
  const nextSiblingRe = /\n  [a-z_]+:/g;
  nextSiblingRe.lastIndex = searchFrom;
  const next = nextSiblingRe.exec(SRC);

  const end = next ? next.index : startIdx + 2000;
  return SRC.slice(startIdx, end);
}

// ─── Sand presets — must stay Turbulence with scale ≥ 25 ──────────────────────
//
// The PerlinNoise generator in FractalNoise mode sums |noise| across octaves,
// producing ridged bright columns at low scale values. Turbulence adds
// sin((x/scale)+total) which breaks column structure into organic grain.
// Scale < 25 at 256px collapses to ~2 dominant features and makes stripes
// visible even in Turbulence mode.

const SAND_PRESETS = ['beach_sand', 'wet_sand', 'sand_block', 'red_sand'] as const;

describe('Sand preset contracts', () => {
  for (const key of SAND_PRESETS) {
    describe(key, () => {
      it('uses Turbulence noise type (not FractalNoise)', () => {
        const block = extractPreset(key);
        const fractalInstances = block.match(/noiseType:\s*['"]FractalNoise['"]/g) ?? [];
        expect(
          fractalInstances,
          `${key}: found FractalNoise — sand must use Turbulence to avoid visible column stripes`,
        ).toHaveLength(0);

        const turbInstances = block.match(/noiseType:\s*['"]Turbulence['"]/g) ?? [];
        expect(
          turbInstances.length,
          `${key}: no Turbulence noiseType found — every face must declare it`,
        ).toBeGreaterThan(0);
      });

      it('has scale ≥ 25 on every face', () => {
        const block = extractPreset(key);
        const scaleMatches = [...block.matchAll(/\bscale:\s*(\d+)/g)];
        expect(
          scaleMatches.length,
          `${key}: no scale field found`,
        ).toBeGreaterThan(0);

        for (const m of scaleMatches) {
          const scale = parseInt(m[1], 10);
          expect(
            scale,
            `${key}: scale=${scale} is below 25 — low scale + Turbulence reduces grain density`,
          ).toBeGreaterThanOrEqual(25);
        }
      });

      it('has octaves ≤ 5', () => {
        const block = extractPreset(key);
        const octaveMatches = [...block.matchAll(/\boctaves:\s*(\d+)/g)];
        for (const m of octaveMatches) {
          const octaves = parseInt(m[1], 10);
          expect(
            octaves,
            `${key}: octaves=${octaves} exceeds 5 — high octave count fights the grain look`,
          ).toBeLessThanOrEqual(5);
        }
      });
    });
  }
});

// ─── Light-source preset glow contracts ───────────────────────────────────────
//
// These presets represent light-emitting blocks. They must carry a glow field
// so the workbench bloom pipeline activates automatically when the preset is
// selected — no extra clicks required.

const GLOW_REQUIRED_PRESETS = ['lava', 'redstone_ore', 'emerald_ore'] as const;

describe('Light-source preset glow contracts', () => {
  for (const key of GLOW_REQUIRED_PRESETS) {
    describe(key, () => {
      it('has a glow field', () => {
        const block = extractPreset(key);
        expect(
          block,
          `${key}: missing glow field — light-source presets must auto-enable bloom`,
        ).toMatch(/\bglow:\s*\{/);
      });

      it('has glow intensity > 0', () => {
        const block = extractPreset(key);
        const m = block.match(/\bglow:\s*\{[^}]*intensity:\s*([\d.]+)/);
        expect(m, `${key}: glow.intensity not found`).not.toBeNull();
        if (m) {
          expect(
            parseFloat(m[1]),
            `${key}: glow.intensity must be > 0`,
          ).toBeGreaterThan(0);
        }
      });
    });
  }
});

// ─── ORE_DESCRIPTORS light sources — glow field parity ────────────────────────
//
// Every light-source entry in ORE_DESCRIPTORS must carry a glow field so the
// workbench bloom pipeline auto-activates. This test locks the count so that:
//  - Adding a new light-source ore without a glow field → fails (you must add glow)
//  - Removing a glow from an existing ore → fails (was intentional, document why)
//  - Adding a non-light ore → count stays the same, test still passes

describe('ORE_DESCRIPTORS light source glow count', () => {
  it('matches the expected number of glow-carrying ore descriptors', () => {
    const start = SRC.indexOf('const ORE_DESCRIPTORS:');
    expect(start, 'ORE_DESCRIPTORS not found in source').toBeGreaterThan(-1);

    const end = SRC.indexOf('\n];', start) + 3;
    const block = SRC.slice(start, end);

    const glowCount = (block.match(/\bglow:\s*\{/g) ?? []).length;

    // Current count as of 2026-05-13:
    //   glowstone, hellstone, uranium, aether_crystal, arcane_crystal,
    //   sea_lantern, shroomlight, magma_block, jack_o_lantern,
    //   lit_redstone_lamp, end_rod, crying_obsidian, soul_lantern, beacon,
    //   lit_glowstone, bulb_incandescent, bulb_led, edison_bulb, iron_lantern,
    //   gas_lantern, hanging_lantern, paper_lantern, chinese_lantern,
    //   fairy_lights, cyber_grid, circuit_board, honey_block, alien_egg,
    //   poison_moss, toxic_sludge, venom_crystal, xenocrystal,
    //   mystic_runes, enchanted_stone, starcloth, shrine_stone  →  36
    //
    // To add a new light-source ore: add the glow field and increment this number.
    // To add a non-glowing ore: leave this number unchanged.
    expect(
      glowCount,
      'Number of glow-carrying entries in ORE_DESCRIPTORS changed — ' +
      'update this comment and count if the change is intentional',
    ).toBe(36);
  });
});
