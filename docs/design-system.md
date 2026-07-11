# TreePlantingGame Visual System

## Art Direction

The game uses a cozy painted storybook style. The environment, tree, people,
decorations, companions, icons, and HUD must look painted by the same artist.

## Palette

- Forest ink: `#244634`
- Moss: `#6F8B4E`
- Parchment: `#F3E7C8`
- Amber: `#D98B2B`
- Charcoal green: `#23302B`
- Night ink: `#17283A`

## Lighting

- Primary light comes from the upper-right.
- Highlights are warm yellow-green.
- Shadows are desaturated green-gray, never pure black.
- Every grounded object has a compact contact shadow beneath it.

## Asset Style

- Soft painted edges; no pixel stair-steps or heavy black outlines.
- Transparent PNG for trees, people, houses, companions, and icons.
- Main tree carries the most detail. Supporting objects use lower contrast.
- Distant objects are less saturated and less sharp than the main tree.

## Scale

- Mature tree visual height: 100% reference unit.
- Person visual height: 20-25% of mature tree height.
- House visual height: 30-38% of mature tree height.
- Butterfly visual width: 10-14% of mature tree width.

## HUD

- Panels use parchment or dark forest surfaces with subtle natural texture.
- Container radius: 14px. Button radius: 10px. Pills only for resource badges.
- Minimum interactive target: 44px by 44px.
- Body text contrast must meet WCAG AA.
- The center of the screen belongs to the tree; HUD stays near the edges.

## Motion

- Ambient motion duration: 4-12 seconds.
- Interaction feedback duration: 120-500 milliseconds.
- Animate transform and opacity only.
- Respect `prefers-reduced-motion`.

## Baseline

- Source capture: `C:/Users/lamyu/AppData/Local/Temp/codex-clipboard-ce0769ab-f12f-4513-88cc-8c143059e5ca.png`
- Primary defect: the detailed painted forest, flat scene sprites, sticker-like companion, and glass SaaS HUD use incompatible rendering languages.
- Acceptance order: tree first, growth status second, tools third.
