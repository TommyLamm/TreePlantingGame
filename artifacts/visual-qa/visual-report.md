# Plan 08 visual QA

Captured with `scripts/capture-visual-qa.mjs` against the local Vite build using Chrome CDP. The final JSON is [report-final.json](./report-final.json); `*-final.png` files are the matching screenshots.

| Scenario | Result | Notes |
| --- | --- | --- |
| 1440×900 day / peaceful | pass | Tree remains central; objective and growth rails stay outside the scene. |
| 1440×900 night / storm event | pass | Weather effect copy, event timing interaction, companion, and no horizontal overflow. |
| 1440×900 reduced motion | pass | Reduced-motion media emulation; no network or console failures. |
| 768×1024 onboarding | pass | Overlay is readable with visible focus-sized controls. |
| 768×1024 event | pass | Event panel clears the tree and remains within the viewport. |
| 375×812 objectives | pass | Horizontal objective strip, compact growth rings, 44px+ controls, no overflow. |
| 375×812 storm event | pass | Compact event controls clear the tree and status panel. |
| 375×812 mini-game modal | pass | Memory Match / Quick Water choices keep the modal inside the viewport. |
| 375×812 garden visit | pass | Daily help state, progress, operation, reward copy, and gift action are visible. |

Every captured scenario reported zero network failures and zero runtime console errors. The mini-game result and garden-help modal states are covered by the client render/build path and their dedicated presentation components; Plan 09 owns the final focus-trap/ARIA audit.
