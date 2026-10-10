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
- **NPC Sandbox**: http://localhost:4200/sandbox/npc-conversation/
- **Ollama API**: http://localhost:11434

## 🛠️ Development Tools

### Level Editor
Professional visual level creation tool:
- Auto-discovers game assets
- Manages game levels persistently  
- Multi-layer editing (background, collision, objects)
- Object placement (NPCs, interactive items, spawn points)

### NPC Sandbox
Test AI-driven NPC interactions:
- Dynamic NPC-to-NPC conversations
- Personality-based dialogue
- Topic-driven discussions

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
└── npc-conversation/  # NPC interaction testing

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


## Optional local inference integration

`AIService.getInstance().setLocalBackend(backend)` routes existing NPC/player
consumers through an implementation of `LocalAIBackend`. Clear it with
`setLocalBackend()` to resume the current `http://localhost:8080/api/chat`
server route. Local failures propagate to the caller; they do not trigger a
server request. Logger telemetry is separate and can still use HTTP.

`WorkerAIBackend` owns a supplied dedicated Web Worker. Requests use
`{ type: 'complete', id, request: { messages, tools } }`; replies use
`{ type: 'result', id, result: { message } }` or
`{ type: 'error', id, error: 'description' }`. The runtime must implement this
protocol and return content or valid tool calls. Model selection and any
provider-specific history conversion belong in that runtime.

The default 10-second deadline covers loading as well as generation. A timeout
or worker crash terminates the worker and rejects all outstanding requests.
Call `dispose()` when replacing a backend; the AI service does not own that
lifecycle. Create a new worker/backend after termination.

This is transport and integration groundwork: no model runtime or weights are
included, and offline generation/gameplay has not been validated. Focused
checks: `node node_modules/vitest/vitest.mjs run tests/unit`. Current upstream
main has six legacy sandbox suite import failures and 23 TypeScript diagnostics;
this change leaves those diagnostics unchanged. Full build/launch validation
remains open.
