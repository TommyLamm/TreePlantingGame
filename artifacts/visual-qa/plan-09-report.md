# Plan 09 final integration QA

## Automated verification

- Client: 206 passed, 0 failed.
- Server: 194 passed, 0 failed, 2 platform-specific signal tests skipped on Windows (196 total).
- Production build: passed with 86 transformed modules.
- Translation parity: `en`, `zh-CN`, and `zh-TW` each expose 355 keys.
- Final browser E2E: passed with no page or console errors. See `../final-integration-qa.json`.

## Visual matrix

The current screenshots cover:

- 1440x900 daytime peaceful, nighttime event, and reduced motion.
- 768x1024 onboarding and event interaction.
- 375x812 peaceful, storm event, mini-game modal, and garden-help result.

All seven matrix entries in `report.json` have no horizontal overflow, no tree/status overlap, no network failures, and no runtime exceptions. The two mobile modal screenshots were refreshed by the final real-server E2E after the 44px mobile target rule was applied.

## Accessibility browser audit

Store, collection, companions, daily reward, profile, leaderboard, prestige, mini-games, and statistics all passed:

- focus enters the dialog on open;
- Tab and Shift+Tab remain trapped;
- Escape closes the topmost dialog;
- focus returns to the invoking toolbar control.

Onboarding focus is isolated from concurrently mounted first-login rewards. The central tree, leaderboard garden visits, and profile avatar upload expose keyboard activation. Event feedback and activity logs use polite live regions.

## E2E flows

- Login -> onboarding -> objective completion -> repeated event resolution -> daily reward -> growth milestone (level 5).
- FinalA visits FinalB -> tends the garden -> FinalB heartbeat contains FinalA in `gardenHelp.helpers`.

## Manual screenshot review

The central tree remains the focal point, panels stay within every viewport, mobile actions are legible, night/event contrast remains readable, and the refreshed mini-game and garden modals do not clip or overflow.
