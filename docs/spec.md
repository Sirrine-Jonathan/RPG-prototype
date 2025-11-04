# Technical Specification: Whispering Stones RPG

## Architecture Overview

### Core Stack
- **Engine:** Phaser 3.70+ with TypeScript 5.0+
- **Build:** Vite for fast development and optimized production builds
- **PWA:** Workbox for service worker management
- **AI Integration:** OpenAI API for advanced NPCs, fallback to local templates

### Project Structure
```
src/
├── core/
│   ├── GameManager.ts          # Main game controller
│   ├── SceneManager.ts         # Scene transitions and state
│   └── SaveManager.ts          # Game state persistence
├── scenes/
│   ├── LocationScene.ts        # Base class for all locations
│   ├── locations/              # Individual location scenes
│   ├── DialogueScene.ts        # NPC conversation overlay
│   ├── InventoryScene.ts       # Item management
│   └── PuzzleScene.ts          # Interactive puzzle base
├── entities/
│   ├── Player.ts               # Player character controller
│   ├── NPC.ts                  # Base NPC class
│   └── InteractableObject.ts   # Clickable game objects
├── systems/
│   ├── DialogueSystem.ts       # Conversation management
│   ├── InventorySystem.ts      # Item collection/usage
│   ├── PuzzleSystem.ts         # Puzzle state tracking
│   └── ProgressSystem.ts       # Story progression logic
├── ai/
│   ├── NPCBrain.ts            # AI conversation controller
│   ├── templates/             # Fallback dialogue templates
│   └── context/               # Game state context for AI
├── data/
│   ├── characters.json        # NPC definitions and base dialogue
│   ├── locations.json         # Location layouts and objects
│   ├── puzzles.json           # Puzzle configurations
│   └── story.json             # Story beats and progression gates
└── assets/
    ├── sprites/               # Character and object graphics
    ├── backgrounds/           # Location background images
    └── audio/                 # Sound effects and music
```

## Core Systems Implementation

### 1. Scene Management System

**LocationScene Base Class:**
```typescript
abstract class LocationScene extends Phaser.Scene {
  protected npcs: Map<string, NPC>
  protected interactables: Map<string, InteractableObject>
  protected unlocked: boolean = false
  
  abstract getRequiredProgress(): string[]
  abstract initializeLocation(): void
  
  checkAccess(): boolean {
    return ProgressSystem.hasCompleted(this.getRequiredProgress())
  }
}
```

**Location Unlock Logic:**
- Police Station: Always accessible
- Hospital Database: Requires befriending Janet
- Museum Basement: Requires passphrase puzzle completion
- Cave Exterior: Requires symbol collection puzzle
- Cave Interior: Requires all previous puzzles

### 2. NPC AI System

**Dual-Mode AI Architecture:**
```typescript
class NPCBrain {
  private useAdvancedAI: boolean
  private templates: DialogueTemplate[]
  private context: GameContext
  
  async generateResponse(input: string): Promise<string> {
    if (this.useAdvancedAI && navigator.onLine) {
      return await this.callOpenAI(input, this.context)
    }
    return this.templateResponse(input)
  }
}
```

**Context-Aware Conversations:**
- NPCs remember previous interactions
- Dialogue changes based on completed puzzles
- Trust levels affect information sharing
- Society members become hostile when exposed

### 3. Puzzle System Framework

**Base Puzzle Interface:**
```typescript
interface Puzzle {
  id: string
  type: 'sequence' | 'social' | 'stealth' | 'logic'
  requirements: string[]
  unlocks: string[]
  
  checkSolution(input: any): boolean
  onComplete(): void
}
```

**Puzzle Types:**
- **Sequence Puzzles:** ATM code (visual pattern recognition)
- **Social Puzzles:** Building trust, extracting information
- **Stealth Puzzles:** Timing-based infiltration
- **Logic Puzzles:** Symbol translation, evidence correlation

### 4. Game State Management

**Progress Tracking:**
```typescript
class ProgressSystem {
  private static flags: Set<string> = new Set()
  private static relationships: Map<string, number> = new Map()
  
  static setFlag(flag: string): void
  static hasFlag(flag: string): boolean
  static updateRelationship(npc: string, delta: number): void
}
```

**Save System:**
- Auto-save on puzzle completion and location changes
- Manual save slots (3 slots)
- Cloud sync via localStorage with optional account linking
- Save data includes: progress flags, inventory, NPC relationships

## Mobile-First Design

### Touch Controls
- **Tap to Move:** Point-and-click navigation with pathfinding
- **Tap to Interact:** Single tap on NPCs/objects
- **Inventory Gesture:** Swipe up from bottom to open inventory
- **Menu Access:** Hamburger menu in top-left corner

### Responsive UI
```typescript
class UIManager {
  private screenSize: 'phone' | 'tablet' | 'desktop'
  
  adaptLayout(): void {
    // Adjust UI element sizes and positions
    // Scale dialogue boxes and inventory grids
    // Modify touch target sizes for accessibility
  }
}
```

### Performance Optimization
- **Sprite Atlases:** Combine small graphics into texture atlases
- **Asset Streaming:** Load location assets on-demand
- **Memory Management:** Unload unused scenes and assets
- **Battery Optimization:** Reduce frame rate when idle

## Dependencies

### Core Dependencies
```json
{
  "dependencies": {
    "phaser": "^3.70.0",
    "ai": "^3.0.0",
    "@ai-sdk/openai": "^0.0.24",
    "workbox-webpack-plugin": "^7.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "@types/node": "^20.0.0",
    "dotenv": "^16.0.0"
  }
}
```

### Environment Configuration
- Uses `.env` file for LLM endpoint configuration
- Supports OpenAI, Anthropic, local Ollama, LM Studio
- Graceful fallback to template responses when AI unavailable

## AI Integration Specification

### LLM Service Integration
**Recommended Package:** `ai` by Vercel for provider flexibility

```typescript
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

class AIService {
  private provider: any
  
  constructor() {
    this.provider = createOpenAI({
      baseURL: process.env.LLM_BASE_URL,
      apiKey: process.env.LLM_API_KEY,
    })
  }
  
  async generateNPCResponse(
    character: Character,
    playerInput: string,
    gameContext: GameContext
  ): Promise<string> {
    try {
      const { text } = await generateText({
        model: this.provider(process.env.LLM_MODEL || 'gpt-3.5-turbo'),
        messages: [
          { role: 'system', content: this.buildSystemPrompt(character, gameContext) },
          { role: 'user', content: playerInput }
        ],
        maxTokens: 150,
        temperature: 0.7,
      })
      return text
    } catch (error) {
      console.warn('AI service failed, using fallback:', error)
      return this.templateResponse(character, playerInput, gameContext)
    }
  }
  
  private buildSystemPrompt(character: Character, context: GameContext): string {
    return `You are ${character.name} in a mystery RPG. 
    Location: ${context.currentLocation}
    Your personality: ${character.personality}
    Your role: ${character.role}
    Society member: ${character.societyMember}
    Player progress: ${context.completedPuzzles.join(', ')}
    Your current mood: ${character.getCurrentMood(context)}
    
    Respond in character. Keep responses under 100 words. 
    ${character.societyMember ? 'Be evasive about society activities.' : 'Be helpful but cautious.'}`
  }
}

**Context Building:**
- Current location and available NPCs
- Completed puzzles and story progress
- Player inventory and collected evidence
- NPC personality and current emotional state
- Society membership status and loyalty

### Fallback System
- Template-based responses for offline play
- Pre-written dialogue trees for critical story moments
- Graceful degradation when AI service unavailable

## PWA Implementation

### Service Worker Strategy
```typescript
// Cache-first for game assets
// Network-first for AI API calls
// Offline fallback for core gameplay
```

### Installation Features
- Add to home screen prompt
- Offline gameplay capability
- Background sync for save data
- Push notifications for story updates (optional)

## Data Management

### Game Data Structure
```json
{
  "characters": {
    "sheriff_martinez": {
      "name": "Sheriff Martinez",
      "location": "police_station",
      "personality": "protective, secretive",
      "society_member": true,
      "trust_threshold": 3,
      "dialogue_states": ["suspicious", "defensive", "hostile"]
    }
  },
  "locations": {
    "police_station": {
      "background": "police_station_bg.jpg",
      "interactables": ["evidence_locker", "desk", "bulletin_board"],
      "npcs": ["sheriff_martinez", "deputy_collins"],
      "unlock_requirements": []
    }
  }
}
```

### Puzzle Configuration
```json
{
  "atm_code_puzzle": {
    "type": "sequence",
    "location": "downtown_atm",
    "solution": [3, 7, 1, 9],
    "hints": ["worn_numbers", "graffiti_pattern"],
    "unlocks": ["museum_safe_access"],
    "story_impact": "reveals_society_members"
  }
}
```

## Development Phases

### Phase 1: Core Framework (Week 1-2)
- Basic Phaser setup with TypeScript
- Location scene system
- Simple NPC interactions
- Placeholder graphics

### Phase 2: Game Systems (Week 3-4)
- Inventory and dialogue systems
- Puzzle framework implementation
- Save/load functionality
- Mobile touch controls

### Phase 3: Content Integration (Week 5-6)
- All locations and NPCs
- Complete puzzle implementations
- Story progression logic
- Template-based AI responses

### Phase 4: AI Enhancement (Week 7-8)
- OpenAI API integration
- Context-aware conversations
- Advanced NPC behaviors
- Testing and refinement

### Phase 5: Polish & PWA (Week 9-10)
- Asset optimization
- PWA features implementation
- Performance tuning
- Cross-device testing

## Testing Strategy

### Automated Testing
- Unit tests for game systems
- Integration tests for puzzle logic
- AI response validation
- Save/load integrity tests

### Manual Testing
- Mobile device compatibility
- Touch interaction accuracy
- Story progression validation
- Performance on low-end devices

### Accessibility
- Screen reader compatibility
- High contrast mode support
- Adjustable text sizes
- Alternative input methods