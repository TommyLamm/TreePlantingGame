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

## Approved Implementation Measurements

Measurements below are the approved rendered ranges. Subject ratios refer to the
painted subject inside each transparent canvas, not the full PNG bounds.

- Mature tree canvas: 460px on desktop and tablet; 88vw (331px at 375px) on mobile.
- Person: 20-28px wide on its 1:2 canvas, keeping the painted figure near 20% of the mature tree subject height.
- House: 48-70px wide, with lower contrast and saturation than the main tree.
- Companion: 54-82px base canvas; butterfly 36-52px, deer 72-112px, phoenix 62-92px.
- Desktop HUD: 106px across two edge-aligned rows in the 1440x900 acceptance capture.
- Status panel: 390px maximum width; 76px calm without combo, 98px calm with combo, and 199px during an event.
- Primary tool targets: 44px by 44px. Event action targets: at least 48px by 52px.

## Responsive Behavior

- At 900px and below, event actions remain on one row. The status panel expands up to 390px so all six actions remain visible on tablet.
- Event scenes at 900px and below reserve 12.5rem beneath the stage so the tree never intersects the expanded status panel.
- At 640px and below, the status panel uses 10px left/right insets and respects `env(safe-area-inset-bottom)`.
- Mobile environment/resource rows stay at the top edge. Tools use internal horizontal scrolling while preserving 44px targets; the document itself must not scroll horizontally.
- Mobile event actions use six 48px-wide controls in one row. Internal scrolling remains available for longer translations, with the native scrollbar visually hidden.
- Reduced-motion mode removes tree, companion, particle, burst, button, and progress movement while preserving state color and readable layout.

## Final Visual QA

- Evidence: `artifacts/visual-qa/` and `artifacts/visual-qa/report.json`.
- Accepted viewports: 1440x900 day/calm, 1440x900 night/event, 768x1024 day/event, 375x812 day/calm, and 375x812 night/storm.
- Every accepted capture has no document-level horizontal overflow, no tree/status intersection, no main-HUD emoji, no console error, and no failed network request.
