# Deep Modular Refactor Design

## Objective

Reduce duplicated code and split the oversized backend and frontend entry files into focused modules without changing externally observable behavior.

The refactor must preserve:

- every existing API path and HTTP method;
- response fields, status codes, and error messages;
- the `save.json` schema and migration behavior;
- gameplay rules and user-visible behavior;
- the existing local build and deployment workflow.

## Current Problems

- `server.js` combines configuration, persistence, migrations, game rules, request validation, routes, static hosting, and process lifecycle management in one file.
- `client/src/App.jsx` combines state management, polling, gameplay actions, modal state, audio effects, and most page composition.
- Store items, companions, prestige upgrades, and daily rewards are defined independently on the client and server, creating configuration drift risk.
- Backend routes repeatedly validate usernames, load users, update game state, mark persistence dirty, and translate exceptions into HTTP responses.
- Frontend API methods repeatedly construct identical JSON `POST` requests.
- The project has no automated contract tests to protect behavior during structural changes.

## Chosen Approach

Use horizontal layered modularization with a small shared static-data boundary.

This approach was selected over feature slices because the application has one highly shared user state, which would otherwise create cross-feature imports. A fully shared gameplay domain package was rejected because it would move security-sensitive server rules into a much larger change surface.

## Target Backend Architecture

```text
server.js
server/
  app.js
  config/
    gameData.js
  data/
    userRepository.js
  http/
    errors.js
    userContext.js
  routes/
    metaRoutes.js
    sessionRoutes.js
    progressionRoutes.js
    storeRoutes.js
    socialRoutes.js
  services/
    achievementService.js
    gameStateService.js
    progressionService.js
    rewardService.js
    socialService.js
shared/
  game-data.json
```

### Responsibilities

- `server.js` starts the HTTP server, installs shutdown handlers, and contains no game rules.
- `server/app.js` creates and configures Express, mounts route groups, and serves the built client.
- `userRepository.js` owns the in-memory user cache, migrations, dirty-state tracking, periodic persistence, and final flush.
- HTTP helpers validate request identity, load existing users, and translate known errors consistently.
- Route modules parse requests, call services, and preserve the existing response contract.
- Service modules own gameplay mutations and calculations. They depend on explicit user or configuration inputs rather than Express request/response objects.
- `game-data.json` contains only static data required by both client and server. Authoritative mutations, validation, rewards, and anti-abuse limits remain on the server.

## Target Frontend Architecture

```text
client/src/
  App.jsx
  state/
    gameReducer.js
  hooks/
    useGameSession.js
    useGameActions.js
    useGameModals.js
  components/game/
    GameHeader.jsx
    GameStage.jsx
    ActionPanel.jsx
    GameModals.jsx
  utils/
    api.js
```

### Responsibilities

- `App.jsx` composes the page and connects focused hooks to view components.
- `gameReducer.js` contains the initial game state and reducer with no UI rendering concerns.
- `useGameSession.js` owns login state, heartbeat polling, visibility recovery, and server synchronization.
- `useGameActions.js` owns user-triggered API operations and their state/audio/log side effects.
- `useGameModals.js` consolidates modal visibility and selected-modal data.
- Game view components receive state and callbacks through props and do not call APIs directly.
- `api.js` retains the public API method names while using shared GET/POST request helpers internally.

## Shared Static Data

The following definitions move to `shared/game-data.json`:

- store items;
- companions;
- prestige upgrades;
- daily rewards.

The JSON entries include server rule fields and client presentation fields. The backend ignores presentation-only fields. The frontend imports the shared definitions and continues exporting the existing constants, so component imports remain compatible.

Achievements are not moved because their server definitions include executable conditions. Weather display metadata and server weather modifiers also remain separate because they have different responsibilities.

## Request and Data Flow

```text
HTTP route
  -> request validation and user loading
  -> domain service
  -> repository dirty-state update
  -> response adapter using the existing schema
```

The repository remains the only module allowed to replace users in the cache or persist the cache. Services may mutate the user object supplied by the repository, matching current behavior, but must report whether persistent data changed.

On the frontend:

```text
view callback
  -> action hook
  -> API client
  -> reducer synchronization
  -> rerender
```

## Error Handling

- Known request errors use a small `HttpError` type carrying the existing status code and message.
- A single Express error middleware handles unexpected exceptions and returns the current `{ "error": "Server Error" }` response.
- Route-specific validation retains its current error text where clients may depend on it.
- Frontend request failures continue to throw `Error` objects containing the server message.
- Action hooks retain feature-specific presentation behavior, such as logging insufficient coins or displaying gift errors.

## Compatibility Strategy

- Existing endpoint paths and methods are characterization-tested before route code moves.
- Public API method names in `client/src/utils/api.js` remain unchanged.
- Default-user values and migration rules are captured in tests before extraction.
- `DB_FILE` and `PORT` environment variable behavior remains unchanged.
- Static client hosting continues to use `client/dist`.
- No new runtime dependency is required.

## Implementation Sequence

1. Add backend characterization tests using Node's built-in test runner and temporary database files.
2. Extract shared static data and update both consumers.
3. Extract backend repository and lifecycle management.
4. Extract backend services and grouped routes incrementally.
5. Reduce `server.js` to bootstrap code and verify all API contracts.
6. Extract the frontend reducer and API request helpers.
7. Extract session, action, and modal hooks.
8. Extract major page sections into game components and reduce `App.jsx` to composition.
9. Run full verification and inspect the final diff for compatibility and unnecessary abstractions.

## Verification

Backend verification:

- `node --check` for backend JavaScript files;
- Node test runner for migrations, services, and API contracts;
- temporary `DB_FILE` integration tests that never modify the real `save.json`;
- graceful startup and shutdown smoke test.

Frontend verification:

- Vite production build;
- reducer unit tests where logic can run without a browser;
- import and shared-data consistency checks.

Final structural checks:

- no duplicated shared configuration remains in `server.js` and `client/src/constants.js`;
- route modules do not implement persistence;
- service modules do not depend on Express;
- `server.js` and `App.jsx` are substantially smaller and have one clear responsibility each.

## Success Criteria

- All existing contract and characterization tests pass.
- The frontend production build succeeds.
- The backend passes syntax checks and integration smoke tests.
- Existing saves load without schema changes or data loss.
- API paths, response shapes, status codes, and documented error messages remain compatible.
- Shared game definitions have one source of truth.
- Entry files act as composition/bootstrap modules rather than containing domain logic.

## Out of Scope

- New gameplay features or balance changes.
- UI redesign or visual changes.
- Database technology replacement.
- Authentication, rate limiting, or deployment changes.
- TypeScript migration or introduction of a new frontend test framework.
