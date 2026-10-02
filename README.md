# 🎮 Whispering Stones RPG

A sophisticated RPG with AI-driven NPCs, dynamic conversations, and a professional level editor.

## 🚀 Quick Start

### Development Mode (Full Stack)
```bash
npm run dev
```
Starts: Main app + Ollama + Level Editor

### Production Mode
```bash
npm start  
```
Starts: Main app + Ollama

### Individual Services
```bash
npm run dev:app      # Main RPG game (port 4200)
npm run dev:ollama   # Ollama AI service (port 11434)  
npm run dev:editor   # Level Editor backend (port 3001)
```

## 🌐 Access Points

- **Main Game**: http://localhost:4200
- **Level Editor**: http://localhost:4200/sandbox/level-editor/
- **Ollama API**: http://localhost:11434

## 🛠️ Development Tools

### Level Editor
Professional visual level creation tool:
- Auto-discovers game assets
- Manages game levels persistently  
- Multi-layer editing (background, collision, objects)
- Object placement (NPCs, interactive items, spawn points)

The old NPC conversation sandbox has been retired. NPC behavior now lives in
the main game; historical sandbox tests are preserved in
[docs/legacy-sandbox-tests](docs/legacy-sandbox-tests/README.md).

## 📁 Project Structure

```
src/                    # Main game source
├── entities/          # NPCs, interactive objects
├── scenes/            # Game scenes and levels
├── services/          # AI service, proximity detection
├── systems/           # Game state, asset management
└── ui/                # User interface components

sandbox/               # Development tools
├── level-editor/      # Visual level creation tool

levels/                # Game levels (JSON)
public/assets/         # Game assets (auto-scanned)
```

## 🎯 Features

- **AI-Driven NPCs** with dynamic personalities
- **Smart Conversations** between NPCs
- **Visual Level Editor** with asset management
- **Multi-Scene Architecture** with scene transitions
- **Professional Development Tools**

## 🔧 Build & Deploy

If local Ollama fails or does not respond within 10 seconds, NPCs use clearly
identified scripted greetings and replies to player speech. These replies do
not invent clues or perform game actions. Offline NPCs ignore other NPC speech
and idle prompts to prevent automatic reply loops. This is a limited fallback,
not a replacement for AI dialogue; a complete gameplay walkthrough is still needed.

Run the full active suite with `node node_modules/vitest/vitest.mjs run`.
It covers AI delivery and offline dialogue, logger recovery, keyboard/click
movement, chat focus, level boundaries, inventory transfers, and NPC indicators.
Retired sandbox tests are archived as reference, not counted as passing. These
unit tests do not establish full gameplay or launch readiness.

NPC event-processing regressions verify that plain AI replies reach the speech
handler, tool replies speak once, and failed AI requests use scripted player
dialogue without answering other NPCs.

The production browser smoke check asserts new-game startup, keyboard movement,
town/library entry and return, safe destination spawns, and town checkpoint
position/inventory restoration after a page reload, and removal of that checkpoint
and its evidence when New Game is selected. It also fails on uncaught
browser errors or missing assets and writes screenshots and `results.json`:

```bash
# Build into a separate directory to preserve existing build output.
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vite/bin/vite.js build --outDir build-gameplay-review
# Requires Playwright and its Chromium installation in your test environment.
node scripts/gameplay-check.cjs build-gameplay-review /path/to/gameplay-evidence
```

Set `RPG_BROWSER=firefox` or `RPG_BROWSER=webkit` to run the same checks
with another installed Playwright browser. Chromium remains the default;
`results.json` records the selected engine. Use a separate browser download
directory if a previous installer left an inaccessible lock:

```bash
PLAYWRIGHT_BROWSERS_PATH="$PWD/tools/rpg-firefox/browsers" node tools/rpg-browser/node_modules/playwright/cli.js install firefox
NODE_PATH="$PWD/tools/rpg-browser/node_modules" PLAYWRIGHT_BROWSERS_PATH="$PWD/tools/rpg-firefox/browsers" RPG_BROWSER=firefox node repos/RPG-prototype/scripts/gameplay-check.cjs repos/RPG-prototype/build-resume-validation artifacts/rpg-firefox-check
```

These alternative-browser commands run from the workspace root. A pass covers
only the engine reported in the evidence; it does not establish Chromium compatibility.

For a worker that cannot use the default npm cache, install the browser tooling
into a separate directory inside its writable workspace. From the workspace
root (the directory containing `repos/`):

```bash
npm install --prefix tools/rpg-browser --cache tools/npm-cache --no-audit --no-fund playwright@1.63.0
export PLAYWRIGHT_BROWSERS_PATH="$PWD/tools/rpg-browser/browsers"
node tools/rpg-browser/node_modules/playwright/cli.js install chromium
NODE_PATH="$PWD/tools/rpg-browser/node_modules" DEBUG=pw:browser node repos/RPG-prototype/scripts/gameplay-check.cjs repos/RPG-prototype/build-gameplay-review artifacts/rpg-browser-check > artifacts/rpg-browser-launch.log 2>&1
```

Verify the installer exit code as well as the harness result. Downloaded binaries
alone do not prove installation or browser startup succeeded. `DEBUG=pw:browser`
preserves the native launch diagnostics in the log when the summarized JSON
only reports that the browser closed. This macOS worker currently fails before
page creation with `required built-in appearance SystemAppearance not found`;
installing Playwright resolved module discovery but did not resolve that native
browser failure. Firefox and WebKit were also attempted in this worker; both
abort before page creation. Their installers download binaries but exit with
EPERM while removing the workspace lock. Alternative engines have not resolved
local gameplay validation. Run the check in a working browser environment before
claiming any browser gameplay coverage.

The check uses a fresh browser context, intercepts requests to serve the build
only; missing assets cannot fall back to this checkout's `public/` directory.
It blocks external requests including Ollama. It needs no listening server or personal browser profile. Portal entry
uses test teleports and checkpoint loading uses a synthetic inventory item;
these checks do not validate walkable portal routes, full dialogue, photo
acquisition, or story completion. Expected offline-service console errors are
recorded separately. A Chromium launch failure is recorded as
`blocked-before-gameplay`, with a nonzero exit code and no passing checks.

```bash
npm run build    # Build for production
npm run preview  # Preview production build
npm test         # Run tests
```

## 💡 Development Tips

- Use `npm run dev` for full development environment
- Level Editor auto-installs dependencies on first run
- Ollama models: run `ollama list` to see available models
- All services stop together with Ctrl+C

Built with TypeScript, Phaser 3, and modern web technologies.
