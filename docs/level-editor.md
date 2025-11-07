# Level Editor Specification

## Overview

The Level Editor is a web-based tool for creating and editing game levels that are directly consumed by the RPG game engine. It provides a complete workflow from level design to in-game testing, featuring a TypeScript frontend editor with an Express.js backend for asset management and level persistence.

## Architecture

### Frontend (TypeScript/HTML5 Canvas)
- **Location**: `sandbox/level-editor/main.ts`
- **Technology**: TypeScript, HTML5 Canvas, DOM manipulation
- **Port**: Served via backend at `http://localhost:3001`

### Backend (Express.js)
- **Location**: `sandbox/level-editor/server.js`
- **Technology**: Node.js, Express, CORS
- **Port**: `3001`
- **Purpose**: Asset discovery, level CRUD operations, static file serving

### Game Integration
- **LevelLoader**: `src/systems/LevelLoader.ts` - Loads editor-created levels into Phaser scenes
- **LevelTestScene**: `src/scenes/LevelTestScene.ts` - Test environment for level validation

## Current Features

### 1. Asset Management
- **Dynamic Asset Discovery**: Scans `/public/assets` directory recursively
- **Tileset Loading**: Supports PNG, JPG, JPEG, GIF, BMP, WEBP formats
- **Asset Metadata**: File size, modification date, path information
- **Live Refresh**: Manual asset list refresh capability

### 2. Level Creation & Editing
- **Grid-Based Editing**: 32px tile size with configurable dimensions
- **Multi-Layer Support**:
  - **Background Layer**: Visual tiles for environment
  - **Collision Layer**: Physics collision data (0=walkable, 1=solid, -1=empty)
- **Irregular Shapes**: Uses -1 values for empty/void areas
- **Zoom Controls**: 10%-500% zoom with mouse wheel support
- **Grid Toggle**: Show/hide editing grid

### 3. Painting Tools
- **Paint Tool**: Place selected tiles
- **Erase Tool**: Remove tiles (set to -1)
- **Fill Tool**: Flood fill areas (planned)
- **Object Tool**: Place interactive game objects

### 4. Object Placement System
- **Object Types**:
  - **NPCs**: merchant, guard, villager
  - **Interactive Objects**: chest, door, sign
  - **Spawn Points**: player spawn location
- **Visual Indicators**: Emoji-based object representation
- **Properties**: Extensible key-value properties per object
- **Drag & Drop**: Click to place, right-click to remove

### 5. Level Management
- **CRUD Operations**: Create, Read, Update, Delete levels
- **JSON Format**: Structured level data with metadata
- **Auto-Save**: Manual save with timestamp tracking
- **Level Browser**: List all available levels with metadata

### 6. Game Integration
- **Round-Trip Workflow**: Edit → Save → Load in game → Test
- **LevelLoader Class**: Seamless integration with Phaser.js
- **Physics Integration**: Automatic collision setup
- **Object Spawning**: NPCs, interactive objects, player positioning

## Level Data Format

```typescript
interface LevelData {
    name: string;           // Human-readable level name
    width: number;          // Grid width in tiles
    height: number;         // Grid height in tiles
    tileSize: number;       // Tile size in pixels (32)
    tileset: string;        // Tileset identifier
    tilesetPath: string;    // Path to tileset image
    layers: {
        background: number[][];  // Visual tile IDs (-1 = empty)
        collision: number[][];   // Collision data (0/1/-1)
        objects: PlacedObject[]; // Interactive objects
    };
    lastModified?: string;  // ISO timestamp
}

interface PlacedObject {
    id: string;                    // Unique object identifier
    type: 'npc' | 'interactive' | 'spawn';
    subtype: string;               // Specific object variant
    x: number;                     // Grid X coordinate
    y: number;                     // Grid Y coordinate
    properties?: { [key: string]: any }; // Custom properties
}
```

## Development Workflow

### 1. Starting the Editor
```bash
npm run dev        # Full stack (app + ollama + editor)
npm run dev:editor # Editor only
```

### 2. Level Creation Process
1. **Asset Selection**: Choose tileset from discovered assets
2. **Level Setup**: Configure dimensions and basic properties
3. **Background Design**: Paint visual tiles using selected tileset
4. **Collision Setup**: Define walkable/solid areas
5. **Object Placement**: Add NPCs, interactive objects, spawn points
6. **Save & Test**: Save level and test in game via LevelTestScene

### 3. Game Integration Testing
- Load `LevelTestScene` in game
- Press `1` for test_room, `2` for town_square
- Arrow keys to move player
- Verify collision, object placement, spawn points

## API Endpoints

### Assets
- `GET /api/assets` - List all available tilesets
- `GET /assets/*` - Serve static asset files

### Levels
- `GET /api/levels` - List all levels with metadata
- `GET /api/levels/:id` - Load specific level data
- `POST /api/levels/:id` - Save/update level
- `DELETE /api/levels/:id` - Delete level

## File Structure

```
sandbox/level-editor/
├── main.ts           # Frontend editor implementation
├── index.html        # Editor UI layout
├── server.js         # Backend API server
├── package.json      # Dependencies
└── start.sh          # Startup script

src/systems/
├── LevelLoader.ts    # Game integration class
└── LevelDesigner.ts  # Legacy level generation

src/scenes/
└── LevelTestScene.ts # Level testing environment

levels/               # Saved level files
├── test_room.json
└── town_square.json

public/assets/        # Tileset assets
└── Modern_Exteriors_RPG_Maker_MV/
```

## Current Limitations

### 1. Tool Functionality
- **Fill Tool**: Not implemented (shows in UI but non-functional)
- **Undo/Redo**: No history system
- **Copy/Paste**: No region selection or duplication
- **Multi-Selection**: Cannot select/edit multiple tiles at once

### 2. Object System
- **Limited Object Types**: Only 3 categories with basic subtypes
- **No Custom Properties UI**: Properties must be edited manually in JSON
- **No Object Templates**: Each object placed individually
- **No Object Validation**: No constraints on placement rules

### 3. Asset Management
- **Manual Refresh**: Assets not auto-discovered on file changes
- **No Asset Preview**: Cannot preview tilesets before selection
- **No Asset Organization**: Flat list regardless of directory structure
- **No Asset Validation**: No checks for tileset compatibility

### 4. Level Management
- **No Level Templates**: Each level starts from scratch
- **No Level Validation**: No checks for required elements (spawn points)
- **No Backup System**: No automatic backups or version history
- **No Import/Export**: Cannot share levels between projects

## Future Enhancements (TODOs)

### High Priority

#### 1. Enhanced Object System
```typescript
// Planned object property editor
interface ObjectPropertyEditor {
    showPropertiesPanel(object: PlacedObject): void;
    updateObjectProperties(id: string, properties: any): void;
    validateObjectPlacement(type: string, x: number, y: number): boolean;
}
```

#### 2. Fill Tool Implementation
```typescript
// Flood fill algorithm for paint tool
private floodFill(startX: number, startY: number, targetTile: number, replacementTile: number): void {
    // Implement recursive or queue-based flood fill
}
```

#### 3. Level Validation System
```typescript
interface LevelValidator {
    validateLevel(level: LevelData): ValidationResult;
    checkRequiredElements(): string[];
    checkObjectConstraints(): string[];
}
```

### Medium Priority

#### 4. Undo/Redo System
```typescript
interface EditorHistory {
    pushState(action: EditorAction): void;
    undo(): void;
    redo(): void;
    canUndo(): boolean;
    canRedo(): boolean;
}
```

#### 5. Asset Preview & Management
- Tileset preview with tile selection overlay
- Asset thumbnails in selection dropdown
- Auto-refresh on file system changes
- Asset organization by category/folder

#### 6. Advanced Editing Tools
- Rectangle/circle selection tools
- Copy/paste regions
- Layer opacity controls
- Multi-tile brush patterns

### Low Priority

#### 7. Level Templates & Presets
- Room templates (tavern, shop, house)
- Terrain presets (grass, stone, water)
- Object groupings (furniture sets, NPC groups)

#### 8. Collaboration Features
- Level sharing/export
- Version control integration
- Multi-user editing (long-term)

#### 9. Performance Optimizations
- Canvas rendering optimizations
- Large level support (chunking)
- Asset caching improvements

## Testing Strategy

### Manual Testing Checklist
- [ ] Asset loading and tileset selection
- [ ] All painting tools function correctly
- [ ] Object placement and removal
- [ ] Level save/load operations
- [ ] Game integration via LevelTestScene
- [ ] Collision detection in game
- [ ] Object interaction in game

### Automated Testing (Planned)
- Unit tests for level data validation
- Integration tests for API endpoints
- E2E tests for editor workflow
- Performance tests for large levels

## Known Issues

1. **TypeScript Errors**: Uses `@ts-nocheck` to bypass compilation issues
2. **Asset Path Handling**: Inconsistent path separators on Windows
3. **Memory Usage**: Large tilesets may cause performance issues
4. **Browser Compatibility**: Tested primarily in Chrome/Firefox

## Dependencies

### Frontend
- TypeScript (compilation)
- HTML5 Canvas API
- Fetch API for backend communication

### Backend
- Express.js (web server)
- CORS (cross-origin requests)
- Node.js fs module (file operations)

### Game Integration
- Phaser.js (game engine)
- Custom LevelLoader system

## Conclusion

The Level Editor provides a solid foundation for RPG level creation with a complete editor-to-game workflow. While functional for basic level design, significant opportunities exist for enhanced usability, advanced editing features, and improved asset management. The modular architecture supports incremental improvements while maintaining compatibility with the existing game engine.

The tool successfully bridges the gap between level design and game implementation, enabling rapid iteration and testing of level designs within the actual game environment.
