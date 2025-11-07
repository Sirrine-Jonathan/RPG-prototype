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
