# RPG Game Systems Analysis & Recommendations

## Executive Summary

The current RPG system has fundamental architectural issues that make scene switching problematic. The core problem is **tight coupling between scenes and their entities**, leading to state persistence issues, memory leaks, and broken functionality when transitioning between scenes.

## Current System Architecture

### Scene Hierarchy
```
BaseScene (UI, Chat)
├── GameplayScene (Player, Movement, NPCs, Pathfinding)
    ├── TownScene (Level Loading, Portals, NPCs)
    ├── LibraryScene (Level Loading, Portals, NPCs)
    ├── HospitalScene (Level Loading, Portals, NPCs)
    └── [Other Scenes...]
```

### Core Systems Analysis

#### 1. Scene Management System
**Current Implementation:**
- Each scene creates its own instances of everything
- No centralized state management
- Scene transitions use Phaser's `scene.start()` which destroys current scene
- Custom `shutdown()` method attempts cleanup but has timing issues

**Problems:**
- NPCs continue running after scene destruction
- Player object gets destroyed/recreated causing input binding issues
- Pathfinding instances become stale
- Memory leaks from incomplete cleanup

#### 2. NPC System (SmartNPC)
**Current Implementation:**
- Each NPC is a complex 1700+ line class
- NPCs are created per-scene with unique IDs
- AI loops run independently with timers
- Conversation state is per-NPC instance

**Problems:**
- NPCs are recreated on scene return, losing state
- Multiple instances with different IDs cause confusion
- AI loops don't properly stop on scene transitions
- No persistence of NPC state across scenes

#### 3. Movement & Pathfinding System
**Current Implementation:**
- Each scene creates its own Pathfinding instance
- Player movement handlers bound to scene-specific pathfinding
- Click-to-move setup in GameplayScene.createPlayer()

**Problems:**
- Pathfinding instance replacement breaks player input bindings
- Scene-specific pathfinding doesn't account for cross-scene movement
- Player recreation loses movement state

#### 4. Portal System
**Current Implementation:**
- PortalService manages scene transitions
- Stores transition data in Phaser registry
- Calls custom shutdown before scene.start()

**Problems:**
- Timing issues between shutdown and scene creation
- No guarantee of proper cleanup completion
- Registry data can become stale

## Root Cause Analysis

### The Fundamental Issue: Scene-Centric Architecture

The current architecture treats each scene as an isolated world, but the game needs **persistent entities** that exist across scenes. This creates several cascading problems:

1. **Entity Lifecycle Mismatch**: NPCs and player should persist across scenes, but scenes destroy everything
2. **State Fragmentation**: Each scene recreates state instead of restoring it
3. **Timing Dependencies**: Cleanup and initialization happen asynchronously with no coordination
4. **Resource Leaks**: Incomplete cleanup leads to zombie processes and memory leaks

## Recommended Architecture Overhaul

### 1. Entity-Centric Architecture

Move from scene-centric to entity-centric design:

```
GameManager (Singleton)
├── EntityManager
│   ├── Player (Persistent)
│   ├── NPCManager
│   │   ├── NPC Instances (Persistent)
│   │   └── NPC State Store
│   └── ObjectManager
├── SceneManager
│   ├── Scene Instances (Lightweight)
│   └── Scene State Store
├── SystemManager
│   ├── MovementSystem
│   ├── PathfindingSystem
│   ├── ConversationSystem
│   └── AISystem
└── StateManager
    ├── Global State
    ├── Scene States
    └── Entity States
```

### 2. Persistent Entity System

#### Player Entity
```typescript
class PersistentPlayer {
  private sprite: Phaser.GameObjects.Sprite;
  private currentScene: string;
  private position: { x: number, y: number };
  private state: PlayerState;
  
  // Move between scenes without destruction
  transferToScene(newScene: GameplayScene): void;
  
  // Maintain input bindings across scenes
  rebindInputs(scene: GameplayScene): void;
}
```

#### NPC Manager
```typescript
class NPCManager {
  private npcs: Map<string, PersistentNPC> = new Map();
  private sceneNPCs: Map<string, string[]> = new Map();
  
  // Get or create NPC (never duplicate)
  getNPC(id: string): PersistentNPC;
  
  // Move NPCs between scenes
  transferNPCsToScene(npcIds: string[], scene: GameplayScene): void;
  
  // Pause/resume NPCs based on scene
  pauseNPCs(npcIds: string[]): void;
  resumeNPCs(npcIds: string[]): void;
}
```

### 3. System-Based Architecture

#### Movement System
```typescript
class MovementSystem {
  private pathfinding: GlobalPathfinding;
  private player: PersistentPlayer;
  
  // Handle movement across all scenes
  handlePlayerMovement(): void;
  
  // Update pathfinding for scene changes
  updatePathfindingForScene(scene: GameplayScene): void;
}
```

#### AI System
```typescript
class AISystem {
  private activeNPCs: Set<string> = new Set();
  
  // Centralized AI loop management
  startNPC(npcId: string): void;
  stopNPC(npcId: string): void;
  pauseAllNPCs(): void;
  resumeSceneNPCs(sceneId: string): void;
}
```

### 4. Scene Transition Protocol

#### Proper Scene Switching
```typescript
class SceneTransitionManager {
  async switchScene(fromScene: string, toScene: string, portalData: PortalData): Promise<void> {
    // 1. Pause all systems
    this.pauseSystems();
    
    // 2. Save current state
    await this.saveSceneState(fromScene);
    
    // 3. Transfer entities
    await this.transferEntities(fromScene, toScene);
    
    // 4. Switch scene
    await this.switchPhaserScene(toScene);
    
    // 5. Restore state
    await this.restoreSceneState(toScene);
    
    // 6. Resume systems
    this.resumeSystems();
  }
  
  private async pauseSystems(): Promise<void> {
    this.aiSystem.pauseAllNPCs();
    this.movementSystem.pause();
    // ... pause other systems
  }
}
```

## Implementation Strategy

### Phase 1: Foundation (Week 1)
1. **Create GameManager singleton**
   - Central coordination point
   - System registration and lifecycle management

2. **Implement EntityManager**
   - Player persistence across scenes
   - NPC registry and lifecycle management

3. **Create SystemManager**
   - Movement system extraction
   - AI system centralization

### Phase 2: Scene Refactoring (Week 2)
1. **Lightweight Scene Classes**
   - Remove entity creation from scenes
   - Scenes become view layers only
   - Entity positioning and rendering only

2. **Proper Scene Transitions**
   - Implement SceneTransitionManager
   - Coordinated pause/resume of systems
   - State persistence and restoration

### Phase 3: System Integration (Week 3)
1. **Pathfinding System**
   - Global pathfinding instance
   - Scene-aware collision detection
   - Cross-scene pathfinding support

2. **Conversation System**
   - Persistent conversation state
   - NPC memory across scenes
   - Global chat interface

### Phase 4: Testing & Optimization (Week 4)
1. **Comprehensive Testing**
   - Scene transition stress testing
   - Memory leak detection
   - Performance optimization

2. **Developer Experience**
   - Scene creation tools
   - Entity debugging tools
   - State inspection utilities

## Immediate Fixes for Current Issues

While implementing the full overhaul, these immediate fixes can resolve current problems:

### 1. Fix Scene Cleanup Timing
```typescript
// In PortalService.enterPortal()
private async enterPortal(portal: Portal): Promise<void> {
  // Ensure cleanup completes before scene switch
  if (this.scene.shutdown) {
    await new Promise(resolve => {
      this.scene.shutdown();
      // Wait for next frame to ensure cleanup
      this.scene.time.delayedCall(100, resolve);
    });
  }
  this.scene.scene.start(portal.targetScene);
}
```

### 2. Fix Player Recreation
```typescript
// In GameplayScene.create()
create() {
  // Check if player already exists globally
  const existingPlayer = GameManager.getInstance().getPlayer();
  if (existingPlayer) {
    this.player = existingPlayer.transferToScene(this);
  } else {
    this.createPlayer(x, y);
  }
  
  // Always reinitialize pathfinding BEFORE setting up input
  this.pathfinding = new Pathfinding(30, this.getSceneWidth(), this.getSceneHeight());
  this.setupInput(); // This will bind to the new pathfinding instance
}
```

### 3. Fix NPC Persistence
```typescript
// In scene create methods
create() {
  // Get existing NPCs for this scene or create new ones
  const sceneNPCs = NPCManager.getInstance().getNPCsForScene(this.scene.key);
  sceneNPCs.forEach(npc => {
    npc.transferToScene(this);
    this.proximityService.addNPC(npc);
  });
}
```

## Benefits of New Architecture

### 1. Reliability
- Eliminates scene transition bugs
- Prevents memory leaks
- Ensures consistent state

### 2. Performance
- Reduces entity recreation overhead
- Enables efficient resource management
- Allows for scene preloading

### 3. Developer Experience
- Predictable entity behavior
- Easier debugging and testing
- Cleaner separation of concerns

### 4. Scalability
- Supports complex multi-scene gameplay
- Enables save/load functionality
- Facilitates multiplayer architecture

## Conclusion

The current scene-centric architecture is fundamentally incompatible with the game's requirements for persistent entities and seamless scene transitions. The recommended entity-centric architecture with proper system management will resolve current issues and provide a solid foundation for future development.

The implementation should be done incrementally, starting with the foundation systems and gradually migrating existing functionality. This approach minimizes risk while providing immediate benefits.
