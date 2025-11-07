# 🎮 Smart RPG Level Editor

A game-aware level editor that automatically discovers assets and manages levels for your RPG project.

## ✨ Features

### 🎨 **Smart Asset Management**
- **Auto-discovery**: Scans `public/assets/` folder for all image files
- **Live updates**: Refreshes asset list when files are added/removed
- **Organized display**: Shows file sizes and paths for easy selection

### 🗺️ **Game-Aware Level Management**
- **Persistent storage**: Saves levels to `levels/` directory as JSON
- **Level browser**: Load, save, and manage all game levels
- **Version control friendly**: Human-readable JSON format

### 🛠️ **Professional Tools**
- **Multi-layer editing**: Background, collision, and object layers
- **Object placement**: Drag-and-drop NPCs, interactive objects, spawn points
- **Visual feedback**: Real-time preview with emoji icons
- **Zoom & pan**: Navigate large levels easily

## 🚀 Quick Start

1. **Start the backend server:**
   ```bash
   cd sandbox/level-editor
   ./start.sh
   ```

2. **Open the editor:**
   - Visit: `http://localhost:4200/sandbox/level-editor/`
   - Or run: `npm run dev` from project root

3. **Create your first level:**
   - Select a tileset from your assets
   - Paint terrain and collision
   - Place objects (NPCs, chests, doors)
   - Save with a descriptive name

## 📁 File Structure

```
levels/                    # Game levels (JSON)
├── town_square.json      # Sample level
└── ...

public/assets/            # Auto-scanned tilesets
├── Modern_Exteriors_RPG_Maker_MV/
├── Modern tiles_Free/
└── ...

sandbox/level-editor/
├── server.js            # Backend API
├── main.ts             # Frontend editor
├── index.html          # Editor UI
└── start.sh           # Startup script
```

## 🔧 API Endpoints

- `GET /api/assets` - List all available tilesets
- `GET /api/levels` - List all game levels
- `GET /api/levels/:id` - Load specific level
- `POST /api/levels/:id` - Save level
- `DELETE /api/levels/:id` - Delete level

## 🎯 Level JSON Format

```json
{
  "name": "Town Square",
  "width": 20,
  "height": 15,
  "tileSize": 32,
  "tileset": "/assets/tileset.png",
  "tilesetPath": "/assets/tileset.png",
  "layers": {
    "background": [[0, 1, 2], ...],
    "collision": [[0, 1, 0], ...],
    "objects": [
      {
        "id": "obj_0",
        "type": "npc",
        "subtype": "merchant",
        "x": 10,
        "y": 5,
        "properties": {}
      }
    ]
  }
}
```

## 🎮 Object Types

- **NPCs**: `merchant`, `guard`, `villager`
- **Interactive**: `chest`, `door`, `sign`
- **Spawn Points**: `player`

## 💡 Tips

- **Asset Organization**: Keep tilesets in organized folders under `public/assets/`
- **Level Naming**: Use descriptive names like `town_square`, `forest_entrance`
- **Collision Layer**: Use for pathfinding and physics boundaries
- **Right-click**: Remove objects quickly
- **Auto-save**: Changes are saved when you click "Save Level"

## 🔄 Workflow Integration

The editor is designed to integrate seamlessly with your game:

1. **Design levels** in the visual editor
2. **Export as JSON** to the `levels/` directory
3. **Load in game** using your level loading system
4. **Iterate quickly** with live asset updates

This smart editor eliminates the tedious parts of level creation while giving you full control over your game world design!
